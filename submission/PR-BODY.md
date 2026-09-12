# add dsh-clock-context

Adds a plugin that injects the current date and time into the runtime context on every turn.

- Repo: https://github.com/apex-mochen/dsh-clock-context
- Category: `session`
- Install: `dsh plugin --profile web add github:apex-mochen/dsh-clock-context`

## What it does

A language model has no clock. It only learns the time from timestamps it happens to read — tool
output, log lines, file mtimes — so an agent that has been idle for hours still reasons as if it
were the moment of the last message, and it will state an inferred time as if it had read one.

The plugin registers one dynamic runtime-context contribution
(`scope.systemPrompt.context({ name: 'clock:now', order: 105, text })`), so the value is
re-evaluated on every assembly and can never be stale. The injected line names the local time, the
IANA zone with its UTC offset (computed per call, so DST is handled), the UTC instant, and tells the
agent that this value is authoritative and must not be guessed.

## Notes for review

- `package.json` declares `dsh.bundle` (`{"bundle":{"patch":"./cordis.patch.yml"}}`), so it is
  installable via `dsh plugin add`.
- Entry is namespace form (`export const name` + `export function apply`); the `export default` is
  an object, not a bare function, so `unwrapExports` cannot drop the namespace siblings.
- No `!!js` anywhere in the patch.
- No waterfall listeners are registered, no tools are contributed, so agent default behaviour is
  untouched.
- Zero runtime dependencies — the implementation is ~150 lines of plain ESM using only `Intl`.
- No process spawn, no filesystem access, no network, no timers.
- `text()` is a sync provider, as required by the system-prompt seam.

## Verification performed locally

| Check | Command | Result |
|---|---|---|
| Unit tests (zone offsets, DST, precision, option handling) | `node test/smoke.mjs` | 8 checks passed |
| Static rules R1/R2 | `node scripts/static-rules.mjs .` | passed |
| Packed contents | `npm pack --dry-run` | 9 files, no stray artifacts |
| Runtime end-to-end | install the packed tarball into a `headless` profile, ask the agent to quote its runtime context | quoted timestamp was within 2s of the host clock |
| Web profile composition | `dsh --profile web --patch <probe> --dump-config` | inserts cleanly |
