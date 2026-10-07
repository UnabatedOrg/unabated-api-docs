#!/usr/bin/env node
/** Generate canonical, public LLM exports without changing Scalar hosting. */
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '..');
const DOCS_ORIGIN = 'https://docs.unabated.com';
const API_ORIGIN = 'https://data.unabated.com';
const METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);

export function canonicalizeOrigins(text) {
  return text
    .replace(/https?:\/\/(?:docs-sandbox\.unabated\.com|unabated(?:-sandbox)?\.apidocumentation\.com)(?![a-z0-9.-])/gi, DOCS_ORIGIN)
    .replace(/https?:\/\/data-sandbox\.unabated\.com(?![a-z0-9.-])/gi, API_ORIGIN);
}

export function canonicalize(text, route = '/') {
  const base = new URL(route, DOCS_ORIGIN);
  const absolute = value => /^(?:\.?\.?\/|#|\?)/.test(value)
    ? new URL(value, base).href : value;
  const links = text => text
    .replace(/\]\((<[^>]+>|[^\s)]+)([^)]*)\)/g, (_, target, suffix) => {
      const wrapped = target.startsWith('<');
      const url = wrapped ? target.slice(1, -1) : target;
      return `](${wrapped ? '<' : ''}${absolute(url)}${wrapped ? '>' : ''}${suffix})`;
    })
    .replace(/^(\[[^\]\n]+\]:\s*)(\/\S+|#[^\s]*|\?\S+)(.*)$/gm,
      (_, prefix, target, suffix) => `${prefix}${absolute(target)}${suffix}`);
  const prose = text => {
    let result = '', offset = 0;
    const ticks = /`+/g;
    while (offset < text.length) {
      ticks.lastIndex = offset;
      const opening = ticks.exec(text);
      if (!opening) return result + links(text.slice(offset));
      let closing;
      while ((closing = ticks.exec(text)) && closing[0].length !== opening[0].length) {}
      result += links(text.slice(offset, opening.index));
      if (closing) {
        const end = closing.index + closing[0].length;
        result += text.slice(opening.index, end);
        offset = end;
      } else {
        result += opening[0];
        offset = opening.index + opening[0].length;
      }
    }
    return result;
  };
  let fence;
  const result = [], buffer = [];
  const flush = () => { if (buffer.length) result.push(prose(buffer.splice(0).join('\n'))); };
  for (const line of canonicalizeOrigins(text).split('\n')) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) { flush(); fence = marker[1]; }
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length && !line.slice(marker[0].length).trim()) fence = undefined;
      result.push(line);
    } else if (fence) {
      result.push(line);
    } else {
      buffer.push(line);
    }
  }
  flush();
  return result.join('\n');
}

export function validateOpenApi(document) {
  if (!/^3\.[01]\.\d+$/.test(document.openapi ?? '') ||
      typeof document.info?.title !== 'string' || !document.info.title.trim() ||
      typeof document.info?.version !== 'string' || !document.info.version.trim() ||
      !document.paths || typeof document.paths !== 'object' || Array.isArray(document.paths)) {
    throw new Error('Expected a complete OpenAPI 3.0/3.1 document with info and paths.');
  }
  let operations = 0;
  for (const [route, item] of Object.entries(document.paths)) {
    if (!route.startsWith('/') || !item || typeof item !== 'object') {
      throw new Error(`Invalid OpenAPI path: ${route}`);
    }
    for (const [method, operation] of Object.entries(item)) {
      if (!METHODS.has(method)) continue;
      if (!operation || typeof operation !== 'object' || Array.isArray(operation) ||
          !operation.responses || typeof operation.responses !== 'object' ||
          Array.isArray(operation.responses) || !Object.keys(operation.responses).length) {
        throw new Error(`Incomplete OpenAPI operation: ${method} ${route}`);
      }
      const responses = Object.entries(operation.responses).filter(([status]) => !status.startsWith('x-'));
      if (!responses.length) throw new Error(`Incomplete OpenAPI responses: ${method} ${route}`);
      for (const [status, response] of responses) {
        if (!response || typeof response !== 'object' || Array.isArray(response) ||
            (!response.$ref && typeof response.description !== 'string')) {
          throw new Error(`Invalid OpenAPI response: ${method} ${route} ${status}`);
        }
      }
      operations += 1;
    }
  }
  if (!operations) throw new Error('The OpenAPI document has no operations.');
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    if ('$ref' in value) {
      const ref = value.$ref;
      if (typeof ref !== 'string' || !ref.startsWith('#/')) {
        throw new Error(`Only local OpenAPI $refs are allowed: ${ref}`);
      }
      let target = document;
      for (const segment of ref.slice(2).split('/')) {
        const key = decodeURIComponent(segment).replace(/~1/g, '/').replace(/~0/g, '~');
        if (!target || typeof target !== 'object' || !Object.hasOwn(target, key)) {
          throw new Error(`Unresolved OpenAPI $ref: ${ref}`);
        }
        target = target[key];
      }
      if (target === null || (typeof target !== 'object' && typeof target !== 'boolean')) {
        throw new Error(`Invalid OpenAPI $ref target: ${ref}`);
      }
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(document);
  return operations;
}

function codeFence(source, language) {
  const longest = Math.max(2, ...(source.match(/`+/g) ?? []).map(run => run.length));
  const fence = '`'.repeat(longest + 1);
  return `${fence}${language}\n${source.trimEnd()}\n${fence}`;
}

export function renderCodeSamples(document) {
  const sections = [];
  let count = 0;
  for (const [route, item] of Object.entries(document.paths)) {
    for (const [method, operation] of Object.entries(item)) {
      if (!METHODS.has(method)) continue;
      const samples = operation['x-codeSamples'] ?? operation['x-code-samples'] ?? [];
      if (!Array.isArray(samples)) throw new Error(`Invalid code samples for ${method} ${route}`);
      if (!samples.length) continue;
      sections.push(`### ${method.toUpperCase()} ${route}`, '');
      for (const sample of samples) {
        if (typeof sample.source !== 'string' || !sample.lang) {
          throw new Error(`Incomplete code sample for ${method} ${route}`);
        }
        const languages = { shell: 'bash', bash: 'bash', curl: 'bash', javascript: 'javascript', python: 'python' };
        const language = languages[String(sample.lang).toLowerCase()] ?? String(sample.lang).replace(/[^a-z0-9_-]/gi, '').toLowerCase();
        sections.push(`**${sample.label || sample.lang}**`, '', codeFence(sample.source, language), '');
        count += 1;
      }
    }
  }
  return { count, markdown: count ? `## Request code samples\n\n${sections.join('\n')}` : '' };
}

function publishedRoutes(config, versionPrefix) {
  const pages = [];
  function visit(routes, prefix, section = 'Docs', hidden = false) {
    for (const [segment, page] of Object.entries(routes)) {
      const route = path.posix.join(prefix, segment);
      const excluded = hidden || page.hidden === true;
      const group = ['group', 'root-group'].includes(page.type);
      const nextSection = group && section === 'Docs' ? page.title || section : section;
      if (!excluded && ['page', 'openapi', 'openapi-single'].includes(page.type)) {
        pages.push({ page, route, section });
      }
      if (page.children) visit(page.children, route, nextSection, excluded);
      if (page.page && !excluded) pages.push({ page: page.page, route, section: nextSection });
    }
  }
  for (const [version, navigation] of Object.entries(config.versions)) {
    visit(navigation.routes, path.posix.join(config.siteConfig.subpath ?? '/', versionPrefix(version)));
  }
  return pages;
}

async function loadRuntime(directory) {
  const load = relative => import(pathToFileURL(path.join(directory, relative)).href);
  const preservation = await fs.readFile(path.join(directory, 'dist/postprocess/llms/write.js'), 'utf8');
  if (!preservation.includes("projectShipsFile(writer.distDir, 'llms.txt')") ||
      !preservation.includes("projectShipsFile(distDir, 'llms-full.txt')")) {
    throw new Error('This Scalar runtime does not preserve project-authored llms exports.');
  }
  const [config, schema, utility, markdown, writer, resolver, dom, registrator, api] = await Promise.all([
    load('node_modules/@scalar-org/scalar-config/dist/index.js'),
    load('node_modules/@scalar-org/scalar-config/dist/schema/schema.js'),
    load('node_modules/@scalar-org/scalar-config/dist/schema/utility.js'),
    load('dist/preprocess/markdown.js'), load('dist/writer.js'),
    load('dist/preprocess/path-resolver.js'), load('dist/helpers/register-happy-dom.js'),
    load('node_modules/@happy-dom/global-registrator/lib/index.js'),
    load('node_modules/@scalar/openapi-to-markdown/dist/index.js'),
  ]);
  return { ...config, ...schema, ...utility, ...markdown, ...writer, ...resolver, ...dom, ...registrator, ...api };
}

export async function generate({ configPath, openapiPath, runtimeDir }) {
  const runtime = await loadRuntime(runtimeDir);
  const config = runtime.scalarConfigSchema.parse(JSON.parse(await fs.readFile(configPath, 'utf8')));
  const { internalConfig, pageMap } = await runtime.resolveConfig(config, { mode: 'preview' });
  const routes = publishedRoutes(internalConfig, runtime.getVersionPathPrefix);
  const references = routes.filter(({ page }) => page.type !== 'page');
  if (references.length !== 1) throw new Error('Expected exactly one public API reference.');
  const specText = await fs.readFile(openapiPath, 'utf8');
  const document = JSON.parse(specText);
  const operations = validateOpenApi(document);
  // Respect the customer-facing server override, including operation-specific servers.
  const canonicalDocument = JSON.parse(canonicalizeOrigins(JSON.stringify(document)));
  canonicalDocument.servers = [{ url: API_ORIGIN }];
  const samples = renderCodeSamples(canonicalDocument);
  const buildDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scalar-public-exports-'));
  const writer = runtime.writerFactory({ projectDir: path.dirname(configPath), buildDir,
    configPath: path.basename(configPath), root: config.root });
  const inputs = [JSON.stringify({ info: config.info, versions: config.versions,
    layout: config.siteConfig.layout, stripComments: config.siteConfig.llms?.stripComments }), await fs.readFile(scriptPath, 'utf8')];
  const sections = new Map();
  const full = [];
  const nativeFetch = globalThis.fetch;
  const NativeResponse = globalThis.Response;
  // Renderers fetch decorative SVGs; icons are absent from plain Markdown.
  // Do not let this offline generator fetch API data, external refs, or other URLs.
  const offlineFetch = async input => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (url.origin === 'https://cdn.scalar.com' && url.pathname.startsWith('/icons/') && url.pathname.endsWith('.svg')) {
      return new NativeResponse('<svg xmlns="http://www.w3.org/2000/svg"></svg>', { headers: { 'content-type': 'image/svg+xml' } });
    }
    throw new Error(`Network access is disabled during export: ${url.origin}`);
  };
  const logger = { warn: (...args) => { throw new Error(`Scalar Markdown export warning: ${args.map(String).join(' ')}`); } };
  try {
    runtime.registerHappyDom();
    globalThis.fetch = offlineFetch;
    for (const { page, route, section } of routes) {
      const links = sections.get(section) ?? [];
      sections.set(section, links);
      let markdown;
      if (page.type === 'page') {
        if (page.isMdx || page.isHtml || !page.filepath.endsWith('.md')) throw new Error(`Unsupported guide source: ${page.filepath}`);
        const content = await writer.readFileFromProject(page.filepath);
        inputs.push(`${route}\n${content}`);
        const assets = new Map();
        const resolve = (assetPath, localFilepath) => runtime.pathResolver({ assetPath, localFilepath, pageMap,
          writer, internalConfig, resolvedAssetsPathMap: assets });
        const processed = await runtime.buildMarkdownAndSave({ content, writer, page, internalConfig,
          pageUid: page.uid, pathResolver: resolve,
          pageLinkResolver: (assetPath, localFilepath) => runtime.resolvePageLinkForHtml({ assetPath, localFilepath,
            pageMap, writer, internalConfig, resolvedAssetsPathMap: assets }),
          resolveUidByPath: runtime.resolveUidByPathFactory({ internalConfig, pageMap }), logger });
        const result = await processed.fileGetter();
        if (!result.success) throw result.error;
        markdown = result.data.markdown;
        if (config.siteConfig.llms?.stripComments) markdown = markdown.replace(/<!--[\s\S]*?-->/g, '').replace(/^\[\/\/\]:\s*#.*$/gm, '');
        const mdRoute = `${route === '/' ? '' : route.replace(/\/$/, '')}/index.md`;
        links.push(`- [${page.title}](${DOCS_ORIGIN}${mdRoute})${page.description ? `: ${page.description}` : ''}`);
      } else {
        markdown = await runtime.createMarkdownFromOpenApi(canonicalDocument);
        if (samples.markdown) markdown += `\n\n${samples.markdown}`;
        links.push(`- [${page.title}](${DOCS_ORIGIN}${route})${page.description ? `: ${page.description}` : ''}`);
      }
      full.push(`Source: ${DOCS_ORIGIN}${route}\n\n${canonicalize(markdown, route).trim()}\n`);
    }
  } finally {
    if (runtime.GlobalRegistrator.isRegistered) await runtime.GlobalRegistrator.unregister();
    globalThis.fetch = nativeFetch;
    await fs.rm(buildDir, { recursive: true, force: true });
  }
  const digest = createHash('sha256').update(canonicalize(inputs.join('\n'), '/')).digest('hex');
  const specDigest = createHash('sha256').update(JSON.stringify(canonicalDocument)).digest('hex');
  const metadata = `<!-- Generated by scripts/generate-public-docs-exports.mjs; sources-sha256=${digest}; openapi-sha256=${specDigest}; operations=${operations}; code-samples=${samples.count}. Do not edit. -->\n\n`;
  const title = `# ${config.info?.title || 'Documentation'}\n\n${config.info?.description ? `> ${config.info.description}\n\n` : ''}`;
  const index = `${metadata}${title}${[...sections].map(([section, links]) => `## ${section}\n\n${links.join('\n')}\n`).join('\n')}`;
  const all = `${metadata}${title}${full.join('\n')}`;
  for (const content of [index, all]) {
    if (/\b(?:docs|data)-sandbox\.unabated\.com|unabated-sandbox\.apidocumentation\.com/i.test(content)) {
      throw new Error('A sandbox URL remains in the public export.');
    }
    if (/<(?:div|button|script)\b/i.test(content)) throw new Error('Raw interface HTML remains in the public export.');
  }
  return { 'llms.txt': index, 'llms-full.txt': all, pages: routes.length, operations, codeSamples: samples.count };
}

async function main() {
  const { values } = parseArgs({ options: {
    config: { type: 'string', default: path.join(repoRoot, 'scalar-docs/scalar.dev.config.json') },
    'openapi-file': { type: 'string' }, 'scalar-runtime': { type: 'string', default: path.join(os.homedir(), '.scalar/isolate') },
    'output-dir': { type: 'string', default: path.join(repoRoot, 'scalar-docs/assets') },
    check: { type: 'boolean', default: false }, help: { type: 'boolean', default: false },
  } });
  if (values.help) {
    console.log('Usage: node scripts/generate-public-docs-exports.mjs --openapi-file /tmp/verified-swagger.json [--check] [--config PATH] [--scalar-runtime PATH] [--output-dir PATH]\nUses installed Scalar Markdown renderers and an explicit local OpenAPI file. No HTTP requests or publication.');
    return;
  }
  if (!values['openapi-file']) throw new Error('Pass --openapi-file with the current, verified Swagger document in a temporary file.');
  const exports = await generate({ configPath: path.resolve(values.config), openapiPath: path.resolve(values['openapi-file']),
    runtimeDir: path.resolve(values['scalar-runtime']) });
  const outputDir = path.resolve(values['output-dir']);
  for (const name of ['llms.txt', 'llms-full.txt']) {
    const target = path.join(outputDir, name);
    if (values.check) {
      if (await fs.readFile(target, 'utf8').catch(() => null) !== exports[name]) throw new Error(`${name} is stale. Regenerate public documentation exports.`);
    } else {
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(target, exports[name]);
    }
  }
  console.log(`${values.check ? 'Verified' : 'Generated'} canonical LLM exports: ${exports.pages} pages/reference, ${exports.operations} API operations, ${exports.codeSamples} request code samples.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
