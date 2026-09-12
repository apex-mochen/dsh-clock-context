# Changelog

All notable changes to this plugin are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses
[semantic versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

## [0.1.0]

First release. Not yet published — the repository exists, the npm name is free, and the marketplace
entry is prepared.

### Added

- `lib/index.js`: a DSH plugin (`name` + `apply(ctx, config)`) that registers one dynamic
  runtime-context contribution, `clock:now`, via `scope.systemPrompt.context()`. The `text`
  provider is a function, so the value is re-evaluated on every assembly and cannot go stale.
- The injected line carries the local date and time, the IANA zone with its UTC offset (computed
  per call, so DST transitions are handled), the UTC instant, and a sentence telling the agent that
  this value is authoritative and must not be inferred from earlier messages or log timestamps.
- Options: `label`, `locale`, `timeZone`, `includeUtc`, `includeEpoch`, `precision`
  (`'second'` | `'minute'`), `hint`, `order`, `enabled`.
- `cordis.patch.yml`: the `dsh.bundle.patch` insert entry that makes the package installable.
- `lib/index.d.ts`: hand-written declarations for the public surface (no build step).
- `test/smoke.mjs`: 11 checks — entry shape, single-contribution registration, per-assembly
  re-evaluation, rendering, option handling, zone offsets including DST, host-zone fallback, and
  three packaging-contract checks (bundle manifest, patch name matching the package and the
  exported `name`, and the manifest pointing at the file that actually exists).
- CI on Node 20/22/24 with no install step, since there are no dependencies.

### Notes

- The implementation has **zero runtime dependencies** and touches no processes, files, network, or
  timers. This is a deliberate design choice for an always-loaded plugin: it should be auditable in
  one sitting.
- A related plugin already exists — `liqiming-whu/dsh-environment-context` injects live time as one
  item in a broader environment bundle (weather, location, battery, device) with a settings page.
  This one is deliberately narrower: time only, no frontend, configured through the profile patch.
