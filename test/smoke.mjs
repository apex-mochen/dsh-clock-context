/**
 * Smoke test for dsh-clock-context — no test framework required.
 *
 *   node test/smoke.mjs
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { apply, CONTEXT_NAME, DEFAULT_ORDER, name, renderClock, zoneOffsetMinutes } from '../lib/index.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const patchPath = new URL('../cordis.patch.yml', import.meta.url);
const patch = readFileSync(patchPath, 'utf8');

let passed = 0;

/** @param {string} label @param {() => void} fn */
function test(label, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${label}`);
  } catch (error) {
    console.error(`  ✗ ${label}`);
    throw error;
  }
}

console.log('dsh-clock-context smoke test\n');

test('plugin exports the DSH plugin shape', () => {
  assert.equal(typeof name, 'string');
  assert.equal(typeof apply, 'function');
  assert.ok(Number.isFinite(DEFAULT_ORDER));
  assert.match(CONTEXT_NAME, /^[a-z]+:[a-z-]+$/);
});

test('apply registers exactly one runtime-context contribution', () => {
  /** @type {any[]} */
  const registered = [];
  const ctx = {
    inject(services, callback) {
      assert.deepEqual(services, ['systemPrompt']);
      callback({
        systemPrompt: {
          context(contribution) {
            registered.push(contribution);
          },
        },
      });
    },
  };

  apply(ctx, {});

  assert.equal(registered.length, 1);
  assert.equal(registered[0].name, CONTEXT_NAME);
  assert.equal(registered[0].order, DEFAULT_ORDER);
  assert.equal(typeof registered[0].text, 'function');
  assert.equal(typeof registered[0].text(), 'string');
});

test('text() is re-evaluated, so the timestamp moves', async () => {
  /** @type {any[]} */
  const registered = [];
  const ctx = {
    inject(_services, callback) {
      callback({ systemPrompt: { context: (c) => registered.push(c) } });
    },
  };
  apply(ctx, {});
  const first = registered[0].text();
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const second = registered[0].text();
  assert.notEqual(first, second, 'two calls one second apart must differ');
});

test('renders local time, zone label and UTC', () => {
  const fixed = new Date('2026-09-12T05:04:27Z');
  const line = renderClock({ timeZone: 'Asia/Shanghai', locale: 'en-US' }, fixed);
  assert.match(line, /^Current date\/time: /);
  assert.match(line, /Asia\/Shanghai/);
  assert.match(line, /UTC\+08:00/);
  assert.match(line, /UTC 2026-09-12T05:04:27Z/);
  assert.match(line, /authoritative clock/);
  assert.ok(!line.includes('13:04:27Z'), 'local time must not be labelled as UTC');
});

test('includeUtc / includeEpoch / hint / label / enabled are honoured', () => {
  const fixed = new Date('2026-09-12T05:04:27Z');
  const bare = renderClock(
    { timeZone: 'UTC', includeUtc: false, hint: false, label: 'NOW' },
    fixed,
  );
  assert.match(bare, /^NOW: /);
  assert.ok(!bare.includes('UTC 2026'), 'UTC must be omitted');
  assert.ok(!bare.includes('authoritative clock'), 'hint must be omitted');

  const epoch = renderClock({ timeZone: 'UTC', includeEpoch: true }, fixed);
  assert.match(epoch, /epoch 1789189467/);

  assert.equal(renderClock({ enabled: false }, fixed), '');
});

test('precision "minute" drops seconds from both local and UTC output', () => {
  const a = new Date('2026-09-12T05:04:27Z');
  const b = new Date('2026-09-12T05:04:59Z');

  const secA = renderClock({ timeZone: 'UTC', locale: 'en-US' }, a);
  const secB = renderClock({ timeZone: 'UTC', locale: 'en-US' }, b);
  assert.notEqual(secA, secB, 'second precision must distinguish 27s from 59s');
  assert.match(secA, /UTC 2026-09-12T05:04:27Z/);

  const minA = renderClock({ timeZone: 'UTC', locale: 'en-US', precision: 'minute' }, a);
  const minB = renderClock({ timeZone: 'UTC', locale: 'en-US', precision: 'minute' }, b);
  assert.equal(minA, minB, 'minute precision must render identical text within a minute');
  assert.match(minA, /UTC 2026-09-12T05:04Z/);
  assert.ok(!/:\d\d:\d\d/.test(minA), 'no seconds anywhere in minute precision');
});

test('zoneOffsetMinutes matches known offsets and handles DST', () => {
  assert.equal(zoneOffsetMinutes(new Date('2026-09-12T05:04:27Z'), 'Asia/Shanghai'), 480);
  assert.equal(zoneOffsetMinutes(new Date('2026-09-12T05:04:27Z'), 'UTC'), 0);
  // Europe/Berlin: +120 in summer (CEST), +60 in winter (CET)
  assert.equal(zoneOffsetMinutes(new Date('2026-07-01T12:00:00Z'), 'Europe/Berlin'), 120);
  assert.equal(zoneOffsetMinutes(new Date('2026-01-01T12:00:00Z'), 'Europe/Berlin'), 60);
  assert.equal(zoneOffsetMinutes(new Date(), 'Not/AZone'), undefined);
});

test('falls back to the host zone when timeZone is omitted', () => {
  const line = renderClock({}, new Date('2026-09-12T05:04:27Z'));
  assert.match(line, /^Current date\/time: /);
  assert.ok(line.length > 60);
});

// ---------------------------------------------------------------------------
// Packaging contract. These guard the failure mode that is worst to hit in the
// wild: the plugin installs cleanly but never loads, because the name in
// cordis.patch.yml does not match the package name the loader resolves.
// ---------------------------------------------------------------------------

test('package.json declares the bundle manifest the market requires', () => {
  assert.equal(pkg.dsh?.bundle?.patch, './cordis.patch.yml');
  assert.equal(pkg.main, 'lib/index.js');
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.license, 'MIT');
  assert.ok(existsSync(new URL('../lib/index.js', import.meta.url)), 'main must exist');
  assert.ok(pkg.files.includes('lib'), 'files must ship lib/');
  assert.ok(pkg.files.includes('cordis.patch.yml'), 'files must ship the patch');
  for (const keyword of ['dsh', 'deepseek-harness', 'dsh-plugin']) {
    assert.ok(pkg.keywords.includes(keyword), `keywords must include "${keyword}"`);
  }
});

test('cordis.patch.yml inserts exactly this package, under this name', () => {
  assert.match(patch, /^-\s+insert:/m, 'patch must carry an insert list');

  const ids = [...patch.matchAll(/^\s+-\s+id:\s*(\S+)\s*$/gm)].map((m) => m[1]);
  const names = [...patch.matchAll(/^\s+name:\s*['"]?([^'"\n]+?)['"]?\s*$/gm)].map((m) => m[1]);

  assert.equal(ids.length, 1, 'patch must insert exactly one entry');
  assert.equal(names.length, 1, 'patch must name exactly one package');
  assert.equal(names[0], pkg.name, 'patch name must equal the package name');
  assert.equal(ids[0], pkg.name, 'entry id should equal the package name');
  assert.equal(names[0], name, 'patch name must equal the name the plugin exports');
});

test('the patch file the manifest points at is the one that exists', () => {
  const target = new URL(`../${pkg.dsh.bundle.patch.replace(/^\.\//, '')}`, import.meta.url);
  assert.ok(existsSync(target), `${pkg.dsh.bundle.patch} must exist`);
  assert.equal(readFileSync(target, 'utf8'), patch, 'resolved patch must be the file under test');
});

test('dev-install.ps1 keeps its UTF-8 BOM', () => {
  // Windows PowerShell 5.1 decodes a BOM-less file as ANSI, so the Chinese
  // strings in this script become mojibake and the parser fails — the script
  // silently stops working. Any editor that rewrites the file can drop the BOM,
  // which is exactly what happened once, so assert it here.
  const script = new URL('../dev-install.ps1', import.meta.url);
  assert.ok(existsSync(script), 'dev-install.ps1 must exist');
  const bytes = readFileSync(script);
  // eslint-disable-next-line no-control-regex
  assert.ok(/[^\x00-\x7F]/.test(bytes.toString('utf8')), 'script is expected to contain non-ASCII text');
  assert.deepEqual(
    [...bytes.subarray(0, 3)],
    [0xef, 0xbb, 0xbf],
    'dev-install.ps1 must start with a UTF-8 BOM (Windows PowerShell 5.1 needs it to read the Chinese)',
  );
});

console.log(`\n${passed} checks passed.\n`);
