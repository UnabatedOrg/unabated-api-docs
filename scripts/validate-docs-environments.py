#!/usr/bin/env python3
"""Validate the environment boundaries of the two Scalar documentation sites."""

import argparse
import copy
import json
import re
from pathlib import Path
import sys
from urllib.parse import urlparse


ENVIRONMENTS = {
    "production": {
        "config": "scalar-docs/scalar.config.json",
        "domain": "docs.unabated.com",
        "subdomain": "unabated",
        "api": "https://data.unabated.com",
        "account": "https://tools.unabated.com/api-keys",
    },
    "dev": {
        "config": "scalar-docs/scalar.dev.config.json",
        "domain": "docs-sandbox.unabated.com",
        "subdomain": "unabated-sandbox",
        "api": "https://data-sandbox.unabated.com",
        "account": "https://becoming-tools.unabated.com/api-keys",
    },
}


def object_field(value, key, location, errors):
    child = value.get(key) if isinstance(value, dict) else None
    if not isinstance(child, dict):
        errors.append(f"{location}.{key}: expected an object")
        return {}
    return child


def local_references(value, location="config"):
    if isinstance(value, dict):
        for key, child in value.items():
            child_location = f"{location}.{key}"
            if key in ("filepath", "path") and isinstance(child, str):
                yield child_location, child
            yield from local_references(child, child_location)
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from local_references(child, f"{location}[{index}]")


def validate_environment(name, settings, repo_root, errors):
    config_path = repo_root / settings["config"]
    try:
        config = json.loads(config_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exception:
        errors.append(f"{name}: cannot read {settings['config']}: {exception}")
        return None, 0
    if not isinstance(config, dict):
        errors.append(f"{name}: configuration must be a JSON object")
        return None, 0

    site = object_field(config, "siteConfig", name, errors)
    for field, expected in (
        ("customDomain", settings["domain"]),
        ("subdomain", settings["subdomain"]),
    ):
        if site.get(field) != expected:
            errors.append(f"{name}.siteConfig.{field}: expected {expected!r}")

    for field in ("publishPreviews", "pullRequestComments"):
        if config.get(field) is not False:
            errors.append(f"{name}.{field}: must be explicitly false during setup")
    if name == "production" and config.get("publishOnMerge") is not False:
        errors.append("production.publishOnMerge: must be explicitly false; production is published manually")
    elif name == "dev" and not isinstance(config.get("publishOnMerge"), bool):
        errors.append("dev.publishOnMerge: must be an explicit boolean")

    versions = object_field(config, "versions", name, errors)
    if not versions:
        errors.append(f"{name}.versions: at least one version is required")
    for version_name, version in versions.items():
        location = f"{name}.versions.{version_name}"
        account_links = [item.get("to") for item in version.get("header", []) if item.get("title") == "Get your API key ↗"]
        if account_links != [settings["account"]]:
            errors.append(f"{location}.header: expected one API key link at {settings['account']!r}")
        routes = object_field(version, "routes", location, errors)
        reference = object_field(routes, "/reference", location + ".routes", errors)
        if reference.get("type") != "openapi":
            errors.append(f"{location}.routes./reference.type: expected 'openapi'")
        expected_source = settings["api"] + "/swagger/v1/swagger.json"
        if reference.get("url") != expected_source:
            errors.append(f"{location}.routes./reference.url: expected {expected_source!r}")
        reference_config = object_field(reference, "config", location + ".routes./reference", errors)
        if reference_config.get("documentDownloadType") != "none":
            errors.append(f"{location}.routes./reference.config.documentDownloadType: expected 'none'; readable guides do not require a JSON download")
        servers = reference_config.get("servers")
        urls = [server.get("url") for server in servers if isinstance(server, dict)] if isinstance(servers, list) else None
        if urls != [settings["api"]] or not isinstance(servers, list) or len(servers) != 1:
            errors.append(f"{location}.routes./reference.config.servers: expected exactly one server at {settings['api']!r}")

    checked_references = 0
    for location, target in local_references(config):
        # Remote asset URLs and fragments are not repository files.
        parsed = urlparse(target)
        if parsed.scheme or parsed.netloc or target.startswith("#"):
            continue
        checked_references += 1
        if not target or Path(target).is_absolute():
            errors.append(f"{name}.{location}: expected a nonempty relative file path")
            continue
        resolved = (config_path.parent / target).resolve()
        if not resolved.is_file():
            errors.append(f"{name}.{location}: referenced file does not exist: {target!r}")
    return config, checked_references


def shared_versions(config):
    """Remove only the documented environment differences before comparison."""
    versions = copy.deepcopy(config.get("versions", {}))
    for version in versions.values():
        if not isinstance(version, dict):
            continue
        for item in version.get("header", []):
            if item.get("title") == "Get your API key ↗":
                item.pop("to", None)
        routes = version.get("routes", {})
        reference = routes.get("/reference", {}) if isinstance(routes, dict) else {}
        if not isinstance(reference, dict):
            continue
        reference.pop("url", None)
        reference_config = reference.get("config", {})
        if isinstance(reference_config, dict):
            reference_config.pop("servers", None)
    return versions


def difference_paths(left, right, location="versions"):
    if type(left) is not type(right):
        yield location
    elif isinstance(left, dict):
        for key in sorted(set(left) | set(right)):
            path = f"{location}.{key}"
            if key not in left or key not in right:
                yield path
            else:
                yield from difference_paths(left[key], right[key], path)
    elif isinstance(left, list):
        if len(left) != len(right):
            yield location + ".length"
        for index, (left_child, right_child) in enumerate(zip(left, right)):
            yield from difference_paths(left_child, right_child, f"{location}[{index}]")
    elif left != right:
        yield location


def validate_content(config, config_path, errors):
    """Check only published sources, including HTML links and authored code blocks."""
    routes = set()
    pages = []

    def visit(children, prefix=""):
        for segment, route in children.items():
            path = prefix + segment
            routes.add(path)
            if route.get("type") == "page":
                pages.append(config_path.parent / route["filepath"])
            visit(route.get("children", {}), path)

    for version in config.get("versions", {}).values():
        visit(version.get("routes", {}))
    routes.update(redirect["from"] for redirect in config.get("siteConfig", {}).get("routing", {}).get("redirects", []) if ":" not in redirect["from"])
    routes.update({"/llms.txt", "/llms-full.txt"})
    deprecated = re.compile(r"web[ -]?sockets?|realtime\.(?:unabated|nimbeta|unibeta|unabeta)\.com", re.I)
    for page in pages:
        if not page.is_file():
            continue  # Missing files are reported by the environment boundary checks.
        text = page.read_text(encoding="utf-8")
        if deprecated.search(text):
            errors.append(f"{page.name}: deprecated transport or host remains in published content")
        if len(re.findall(r"^```", text, re.M)) % 2:
            errors.append(f"{page.name}: an authored code fence is not closed")
        links = re.findall(r"\]\((/[^\s)]+)\)", text) + re.findall(r'href="(/[^" ]+)"', text)
        for link in links:
            path = urlparse(link).path
            if path not in routes:
                errors.append(f"{page.name}: local documentation link has no route: {link}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="repository root (defaults to the parent of this script's directory)",
    )
    args = parser.parse_args()
    errors = []
    configs = {}
    reference_counts = {}
    for name, settings in ENVIRONMENTS.items():
        configs[name], reference_counts[name] = validate_environment(name, settings, args.repo_root, errors)

    if all(config is not None for config in configs.values()):
        differences = list(difference_paths(shared_versions(configs["production"]), shared_versions(configs["dev"])))
        if differences:
            errors.append("Shared navigation differs between configs; update both: " + ", ".join(differences[:10]))
            if len(differences) > 10:
                errors.append(f"Shared navigation has {len(differences) - 10} additional differences")
        validate_content(configs["dev"], args.repo_root / ENVIRONMENTS["dev"]["config"], errors)

    if errors:
        print("Documentation environment validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print("Documentation environment validation passed.")
    for name, settings in ENVIRONMENTS.items():
        print(f"- {name}: {settings['domain']}; {reference_counts[name]} local references resolved")
    print("- Shared versions/navigation match; production publication remains manual.")
    print("- Published page links, code fences, and deprecated transport checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
