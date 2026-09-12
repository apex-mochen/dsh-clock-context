# dsh-clock-context

**Give your DSH agent a clock.**

DSH injects a *runtime context* snapshot into every turn (file policy, approval policy, …).
This plugin adds one more line to that snapshot — the **current date and time** — and the line is
re-evaluated on every assembly, so it is never stale.

```text
Current date/time: Saturday, 09/12/2026, 13:04:27 (Asia/Shanghai, UTC+08:00) · UTC 2026-09-12T05:04:27Z.
Treat this as the authoritative clock: whenever you state or reason about "now", today, the current
date, or how much time has passed, use this value — never infer the current time from earlier
messages, log lines, or file timestamps, and never guess it.
```

## Why this exists

A language model has no clock. It only learns the time from timestamps it happens to read — tool
output, log lines, file mtimes. The consequences are easy to spot once you look for them:

| Symptom | Real cause |
|---|---|
| Says "tonight" when it is actually tomorrow afternoon | Its last clock reading came from a log it read hours ago |
| Says "it's been about two hours" | That is an estimate, presented as fact |
| Writes "today" in a report that spans several days | It never had a "today" to begin with |

These are not reasoning errors — they are **missing input**. This plugin supplies the input, and the
trailing sentence tells the agent that the value is authoritative, which measurably reduces guessing.

## Install

From a GitHub repository:

```bash
dsh plugin --profile web add github:<owner>/dsh-clock-context
```

From npm (once published):

```bash
dsh plugin --profile web add dsh-clock-context
```

Then restart the profile (or rely on `patchReload: live`) and verify — see below.

## Configuration

Every option is optional. Set them in your profile's `cordis.patch.yml` (or in an overlay) under the
entry this bundle inserts:

```yaml
- id: dsh-clock-context
  config:
    timeZone: Asia/Shanghai   # any IANA zone; default: the host's zone
    locale: zh-CN             # default: the host's locale
    label: 当前时间            # default: "Current date/time"
    includeUtc: true          # default: true
    includeEpoch: false       # default: false (unix seconds)
    hint: true                # default: true (append the "authoritative clock" sentence)
    order: 105                # default: 105 (before SANDBOX_POLICY=110)
    enabled: true             # default: true
```

| Option | Type | Default | Meaning |
|---|---|---|---|
| `timeZone` | string | host zone | IANA zone for the rendered local time |
| `locale` | string | host locale | Passed to `Intl.DateTimeFormat` |
| `label` | string | `Current date/time` | Prefix of the injected line |
| `includeUtc` | boolean | `true` | Append the UTC instant |
| `includeEpoch` | boolean | `false` | Append unix seconds |
| `hint` | boolean | `true` | Append the "use this, never guess" sentence |
| `order` | number | `105` | Sort order inside the runtime-context snapshot |
| `enabled` | boolean | `true` | Turn the contribution off without uninstalling |

The timezone offset is computed per call, so daylight-saving transitions are handled automatically.

> **Note on `locale`.** It defaults to the host's locale, so a `zh-CN` machine renders
> `2026年09月12日星期六 13:12:21` while the label stays English. Set `locale: 'en-US'` for
> `Saturday, 09/12/2026, 13:12:21`, or set `label` to match the locale you choose.

## Verify it works

Ask the agent to read its own runtime context:

```text
Quote the line from your runtime context that gives the current date and time, verbatim.
```

If the plugin is active, the answer will contain a `Current date/time:` line with a timestamp within
a few seconds of your own clock. If the agent says it has no such line, check:

1. `dsh plugin --profile web ls` — is the package installed?
2. the profile's `cordis.patch.yml` — did the bundle's `insert` entry land?
3. the profile log — a load error would be reported at startup.

## How it works

`lib/index.js` exports `name` and `apply(ctx, config)`, the standard DSH plugin shape. The plugin
registers one dynamic runtime-context contribution:

```js
ctx.inject(['systemPrompt'], (scope) => {
  scope.systemPrompt.context({
    name: 'clock:now',
    order: options.order,
    text: () => renderClock(options),   // evaluated on every assembly
  });
});
```

The `text` callback is a function, not a string — that is what makes the value fresh on every turn.
Built-in context orders are `SANDBOX_POLICY=110`, `APPROVAL_POLICY=115`, `SUBAGENT_DELEGATION=120`;
the default `105` places the clock first.

## Compatibility

- DSH `0.1.x` (peer: `@deepseek-ai/cordis ^4.0.1`)
- Node.js 20+
- No runtime dependencies — only `Intl`.

## License

MIT
