import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { canonicalize, canonicalizeOrigins, renderCodeSamples, validateOpenApi } from './generate-public-docs-exports.mjs';

const script = fileURLToPath(new URL('./generate-public-docs-exports.mjs', import.meta.url));
const productionConfig = fileURLToPath(new URL('../scalar-docs/scalar.config.json', import.meta.url));
const runtime = process.env.SCALAR_RUNTIME_DIR || path.join(os.homedir(), '.scalar/isolate');
const fixture = () => ({
  openapi: '3.0.3',
  info: { title: 'Offline reference fixture', version: 'v1', description: 'Fixture API contract.' },
  servers: [{ url: 'https://data-sandbox.unabated.com' }],
  security: [{ ApiKey: [] }],
  paths: {
    '/api/v1/fixture/{id}': {
      servers: [{ url: 'https://data-sandbox.unabated.com' }],
      get: {
        summary: 'Read fixture',
        description: 'Read the [guide](https://docs-sandbox.unabated.com/guides/odds).',
        parameters: [{ name: 'id', in: 'path', required: true, description: 'Fixture identifier.', schema: { type: 'string' } }],
        responses: { '200': { description: 'Successful fixture response', content: { 'application/json': { schema: { $ref: '#/components/schemas/Envelope' }, example: { success: true, data: 'fixture-response-example' } } } } },
        'x-codeSamples': [
          { lang: 'curl', source: 'curl https://data-sandbox.unabated.com/api/v1/fixture/1' },
          { lang: 'JavaScript', source: 'fetch("https://data-sandbox.unabated.com/api/v1/fixture/1"); // fixture-javascript' },
          { lang: 'Python', source: 'requests.get("https://data-sandbox.unabated.com/api/v1/fixture/1") # fixture-python' },
        ],
      },
    },
    '/api/v1/fixture': {
      post: {
        summary: 'Write fixture',
        servers: [{ url: 'https://data-sandbox.unabated.com' }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' } } }, example: { text: 'fixture-request-example' } } } },
        responses: { '202': { description: 'Accepted fixture request' } },
        'x-code-samples': [{ lang: 'JavaScript', source: 'const example = "```"; // fixture-backticks' }],
      },
    },
  },
  components: {
    securitySchemes: { ApiKey: { type: 'apiKey', in: 'header', name: 'X-Api-Key' } },
    schemas: { Envelope: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'string' } } } },
  },
});

test('references resolve escaped JSON Pointer segments and reject absent/external targets', () => {
  const document = fixture();
  assert.equal(validateOpenApi(document), 2);
  document.components.schemas['A/B~C'] = { type: 'string' };
  document.paths['/api/v1/fixture/{id}'].get.parameters[0].schema = { $ref: '#/components/schemas/A~1B~0C' };
  assert.equal(validateOpenApi(document), 2);
  for (const ref of ['#/components/schemas/Absent', 'https://example.invalid/schema.json', '../schema.json']) {
    document.paths['/api/v1/fixture/{id}'].get.parameters[0].schema = { $ref: ref };
    assert.throws(() => validateOpenApi(document), /(?:Unresolved|Only local)/);
  }
});

test('canonical hosts are applied to all server scopes and sample extensions', () => {
  const document = JSON.parse(canonicalizeOrigins(JSON.stringify(fixture())));
  assert.equal(document.servers[0].url, 'https://data.unabated.com');
  assert.equal(document.paths['/api/v1/fixture/{id}'].servers[0].url, 'https://data.unabated.com');
  assert.equal(document.paths['/api/v1/fixture'].post.servers[0].url, 'https://data.unabated.com');
  const samples = renderCodeSamples(document);
  assert.equal(samples.count, 4);
  assert.match(samples.markdown, /fixture-javascript/);
  assert.match(samples.markdown, /fixture-python/);
  assert.match(samples.markdown, /````javascript\nconst example = "```";/);
  assert.doesNotMatch(samples.markdown, /data-sandbox/);
});

test('invalid operation shapes fail before Scalar can silently omit contracts', () => {
  for (const operation of [null, [], {}, { responses: {} }, { responses: [] }]) {
    const document = fixture();
    document.paths['/api/v1/fixture/{id}'].get = operation;
    assert.throws(() => validateOpenApi(document), /Incomplete OpenAPI operation/);
  }
  const document = fixture();
  document.info.title = 12;
  assert.throws(() => validateOpenApi(document), /complete OpenAPI/);
  document.info.title = 'Fixture';
  document.components.schemas.Envelope = null;
  assert.throws(() => validateOpenApi(document), /Invalid OpenAPI \$ref target/);
  const response = fixture();
  response.paths['/api/v1/fixture/{id}'].get.responses['200'] = null;
  assert.throws(() => validateOpenApi(response), /(?:Incomplete|Invalid) OpenAPI response/);
});

test('prose URL rewriting preserves code and does not rewrite hostname suffixes', () => {
  const input = '[guide](/guides/odds)\n`[inline](/keep)`\n```javascript\nconst text = "[sample](/keep)";\n```';
  assert.equal(canonicalize(input, '/start/quickstart'), input.replace('[guide](/guides/odds)', '[guide](https://docs.unabated.com/guides/odds)'));
  assert.equal(canonicalizeOrigins('https://data-sandbox.unabated.com.evil.invalid/path'), 'https://data-sandbox.unabated.com.evil.invalid/path');
  const multiTick = '``foo ` [link](/keep) bar``';
  assert.equal(canonicalize(multiTick, '/start/quickstart'), multiTick);
});

test('actual Scalar renderers produce deterministic complete exports and fail before writes', async t => {
  try { await fs.access(path.join(runtime, 'dist/preprocess/markdown.js')); }
  catch { t.skip('Install the Scalar CLI runtime or set SCALAR_RUNTIME_DIR to run the renderer integration check.'); return; }
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'public-docs-export-test-'));
  t.after(() => fs.rm(temporary, { recursive: true, force: true }));
  const specification = path.join(temporary, 'openapi.json');
  const output = path.join(temporary, 'output');
  await fs.writeFile(specification, JSON.stringify(fixture()));
  const run = (...extra) => spawnSync(process.execPath, [script, '--openapi-file', specification, '--scalar-runtime', runtime, '--output-dir', output, ...extra], { encoding: 'utf8', timeout: 30000 });
  const first = run();
  assert.equal(first.status, 0, first.stderr || first.stdout);
  const names = ['llms.txt', 'llms-full.txt'];
  const before = await Promise.all(names.map(name => fs.readFile(path.join(output, name), 'utf8')));
  const second = run();
  assert.equal(second.status, 0, second.stderr || second.stdout);
  assert.deepEqual(await Promise.all(names.map(name => fs.readFile(path.join(output, name), 'utf8'))), before);
  const checked = run('--check');
  assert.equal(checked.status, 0, checked.stderr || checked.stdout);
  const production = run('--config', productionConfig);
  assert.equal(production.status, 0, production.stderr || production.stdout);
  assert.deepEqual(await Promise.all(names.map(name => fs.readFile(path.join(output, name), 'utf8'))), before);
  assert.match(before[0], /https:\/\/docs\.unabated\.com\/start\/quickstart\/index\.md/);
  for (const expected of ['Your first odds request.', 'fixture-response-example', 'fixture-request-example', 'X-Api-Key', 'Fixture identifier.', 'fixture-javascript', 'fixture-python', 'fixture-backticks']) assert.ok(before[1].includes(expected), `Missing ${expected}`);
  assert.match(before[1], /operations=2; code-samples=4/);
  assert.doesNotMatch(before.join('\n'), /(?:docs|data)-sandbox\.unabated\.com|<(?:div|button|script)\b/);
  const invalid = fixture();
  invalid.paths['/api/v1/fixture/{id}'].get.parameters[0].schema = { $ref: '#/components/schemas/Absent' };
  await fs.writeFile(specification, JSON.stringify(invalid));
  const failed = run();
  assert.notEqual(failed.status, 0);
  assert.match(failed.stderr, /Unresolved OpenAPI \$ref/);
  assert.deepEqual(await Promise.all(names.map(name => fs.readFile(path.join(output, name), 'utf8'))), before);
});
