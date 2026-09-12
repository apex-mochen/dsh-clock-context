/**
 * Smoke test for dsh-clock-context — no test framework required.
 *
 *   node test/smoke.mjs
 */

import assert from 'node:assert/strict';
import { apply, CONTEXT_NAME, DEFAULT_ORDER, name, renderClock, zoneOffsetMinutes } from '../lib/index.js';

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

console.log(`\n${passed} checks passed.\n`);
