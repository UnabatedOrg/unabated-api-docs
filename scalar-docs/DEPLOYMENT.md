# Documentation deployment

The two Scalar projects share the guides and assets in this repository. Both configuration files must exist on both `dev` and `main`; promoting content must preserve their environment settings.

| Scalar project | Tracked branch | Configuration path | Documentation site | Swagger source and request server |
| --- | --- | --- | --- | --- |
| Unabated API - Dev | `dev` | `scalar-docs/scalar.dev.config.json` | `docs-sandbox.unabated.com` | `https://data-sandbox.unabated.com/swagger/v1/swagger.json`; `https://data.unabated.com` |
| Unabated API | `main` | `scalar-docs/scalar.config.json` | `docs.unabated.com` | `https://data.unabated.com/swagger/v1/swagger.json`; `https://data.unabated.com` |

Tracked branches are selected in each project's Scalar **Settings → Git Sync**. Configuration paths are selected under **Settings → Advanced**. After the initial export PR is merged, switch the production project from the temporary import branch to `main`; merging that PR does not switch the tracked branch automatically.

This file is an internal deployment runbook and is not a published page. The dev site's private Swagger source allows review of upcoming reference changes. Both sites describe the customer API at `https://data.unabated.com` and link to `https://tools.unabated.com/api-keys`. Public guides, generated examples, page titles, and exports must not offer sandbox access. The request builder on the dev docs site also targets the customer API; do not submit a test request unless the intended production call is authorized.

## Make and review changes in dev

1. Change shared Markdown guides and assets on a development branch, then merge the reviewed changes into `dev`.
2. If changing navigation, routes, or reference presentation, make the same change in both configuration files. Keep docs domains, subdomains, and Swagger source URLs specific to each environment; customer request-builder servers and account links are identical.
3. Run the repository validator:

   ```bash
   python3 scripts/validate-docs-environments.py
   ```

4. In the dev Scalar project, verify the tracked branch is `dev` and the configuration path is `scalar-docs/scalar.dev.config.json`, then **Publish**. Review the result at [docs-sandbox.unabated.com](https://docs-sandbox.unabated.com).

For a local visual check, run `npx @scalar/cli project preview scalar-docs/scalar.dev.config.json --no-open`. Check the tier and language switches, copy controls, navigation, and a phone-sized viewport. Scalar's published site generates `/llms.txt`, `/llms-full.txt`, and Markdown pages; verify those exports after publication rather than treating the local preview as their delivery test.

When endpoint metadata changes, deploy the matching backend change to dev before publishing the reference. Check an odds operation and the signed SSE stream operation for tier badges, authentication, response media type, and code examples. The guide stylesheet, scripts, and authentic logo are shared assets in `scalar-docs/assets`.

Both projects initially have `publishOnMerge`, `publishPreviews`, and `pullRequestComments` explicitly set to `false`. Dev automatic publishing may be enabled later by changing its `publishOnMerge` setting. Production stays manual, and the validator enforces that boundary. Avoid changing publishing settings through both the editor and Git at the same time; these settings are stored in the configuration files.

## Promote approved changes to production

1. Open a `dev → main` PR. Review the shared content changes and run the validator on the proposed result. Both environment configurations should remain in the PR result.
2. Merge after approval. Production automatic publication is disabled, so merging does not publish the changed site.
3. Verify the production Scalar project tracks `main` and uses `scalar-docs/scalar.config.json`. After any related backend release is available, click **Publish** in that project.
4. Check [docs.unabated.com](https://docs.unabated.com), including a guide, an endpoint reference, and the request-builder server. Record the commit and Scalar deployment used for the release.

Do not replace the production configuration with the dev configuration during promotion, copy sandbox API URLs into production, or import the old sandbox notice over the shared guides. The content is promoted through Git; the two projects retain their own environment settings.

## Generated API reference

The backend generates the Swagger/OpenAPI document from its routes, schemas, comments, and example filters. Maintain endpoint descriptions, tier information, and generated examples in the backend rather than manually editing generated JSON. Authored walkthroughs and presentation live in this repository.

Scalar fetches each configured Swagger URL during the documentation build and bundles that document into the deployment. It does **not** fetch live Swagger again every time a reader opens a reference page. A backend API change appears in these docs after the matching site's next publication. Production publication must therefore follow the corresponding production backend release, even when the guide changes were already reviewed in dev.

## Roll back

If a published site has a problem, roll the affected Scalar project back to its prior known-good deployment. Keep the other project unchanged. Revert or correct the associated Git change before publishing again so the next deployment does not reintroduce the problem. A documentation rollback restores its bundled reference; it does not roll back backend code.

Scalar also provides deployment history and rollback through its CLI. See [CLI deployment and rollback](https://scalar.com/products/docs/deployment/cli), [publishing configuration](https://scalar.com/products/docs/configuration/scalar.config.json), and [OpenAPI build behavior](https://scalar.com/products/docs/configuration/navigation).

## Regenerate canonical agent exports before publishing

`scalar-docs/assets/llms.txt` and `scalar-docs/assets/llms-full.txt` are generated files. Their links always use `https://docs.unabated.com` and `https://data.unabated.com`, including when the files are served by the dev review site. Keep the dev Scalar hosting domain separate; changing `customDomain` changes deployment ownership rather than the export origin.

The installed Scalar Docs runtime (verified with 2.8.0) explicitly preserves a project-supplied `llms.txt` and `llms-full.txt` from `assetsDir` instead of overwriting them. [Scalar assets](https://scalar.com/products/docs/content/assets) are served at the site root, so these files become `/llms.txt` and `/llms-full.txt`. The generator uses Scalar's own guide Markdown preprocessor, including the HTML quickstart conversion, and its OpenAPI Markdown renderer. It supplements the reference with every backend `x-codeSamples` entry, which that renderer otherwise omits. It does not add an OpenAPI JSON snapshot to this repository.

After the matching backend release is deployed and its Swagger metadata is verified, fetch that site's anonymous Swagger source into a temporary file and regenerate. This example uses the dev review source; production publication requires the corresponding production backend release and source document.

```bash
swagger_file="$(mktemp -t unabated-docs-swagger)"
curl --fail --silent --show-error --max-time 60 \
  https://data-sandbox.unabated.com/swagger/v1/swagger.json \
  --output "$swagger_file"
node scripts/generate-public-docs-exports.mjs --openapi-file "$swagger_file"
node scripts/generate-public-docs-exports.mjs --openapi-file "$swagger_file" --check
rm -f "$swagger_file"
```

The script requires Node.js 24 or newer and an installed Scalar docs runtime at `~/.scalar/isolate` (or pass `--scalar-runtime`). The Scalar CLI supplies that runtime through `npx @scalar/cli project download-isolate`. Generation reads only the explicit local Swagger file and current guides/configuration; it makes no HTTP requests, uses no API key, and publishes nothing. External or unresolved schema references and failed guide conversion stop generation before replacing the exports. `--check` compares both files byte for byte against the current inputs, including source and contract fingerprints, so stale guide, navigation, reference, or generator changes fail validation. Run the generator tests with `node --test scripts/generate-public-docs-exports.test.mjs`.

Review the changed generated files with the source changes, then run `python3 scripts/validate-docs-environments.py`. After Scalar publication, confirm the two root exports contain canonical links and the latest tier/contract content. Native per-page `.md` exports remain generated by Scalar from the same canonical guide sources.
