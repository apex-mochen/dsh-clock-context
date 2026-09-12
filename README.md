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
    precision: minute         # 'second' (default) or 'minute'
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
| `precision` | `'second' \| 'minute'` | `'second'` | `'minute'` renders a snapshot that only changes once a minute |
| `hint` | boolean | `true` | Append the "use this, never guess" sentence |
| `order` | number | `105` | Sort order inside the runtime-context snapshot |
| `enabled` | boolean | `true` | Turn the contribution off without uninstalling |

The timezone offset is computed per call, so daylight-saving transitions are handled automatically.

> **On `precision`.** DSH only re-records a runtime-context snapshot when its text changes, so at
> second precision the snapshot is re-recorded every turn. That is cheap — the snapshot is a
> tail user-role message, so it does not invalidate the cached prefix — but if you prefer the
> lowest possible churn, `precision: minute` makes the text change at most once a minute.

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

## Design notes

Why the seams and shapes are what they are — the questions a reviewer would otherwise have to ask.

**Why `context()` and not `section()` or `variable()`.** The system-prompt seam offers three
registration points: `section` for static guidance, `variable` for values referenced as `{{name}}`
inside a section (and which throws when a referenced value is unset), and `context` for dynamic
runtime snapshots. A clock is exactly the third kind: a value that changes on its own and belongs in
the per-turn snapshot rather than in the static instructions. `variable` would also force the text to
be interpolated into some section, which is not what a standalone fact wants.

**Why a function, not a string.** `text` is a provider evaluated on every assembly. That is the whole
mechanism: a string captured at load time would freeze at the moment the profile booted, which is the
failure this plugin exists to prevent.

**Why `order: 105`.** The built-in context orders are `SANDBOX_POLICY = 110`,
`APPROVAL_POLICY = 115`, `SUBAGENT_DELEGATION = 120`. The clock is context-setting information, so
it goes first by default; the value is configurable.

**Why the entry is named `clock:now`.** Same-layer duplicate names throw, so contributions are
namespaced. `clock:` is this plugin's prefix.

**Why the provider is synchronous.** The seam type is `(context) => string` — it cannot await. That
is not a constraint we work around: reading `Date` needs no I/O, so there is nothing to prefetch.

**Why there is no `Config` schema.** The convention is to declare one with `schemastery`, and this
plugin deliberately does not, for two reasons. It imports nothing at runtime — every option is
optional and merged over defaults, so a schema would add a runtime dependency (or a resolution
failure risk) to validate nine booleans and strings. And the options are read per assembly, so an
invalid value degrades to the default rather than breaking the turn. If the marketplace prefers a
declared schema, that is a small addition, not a redesign — say so and it will be added.

**Why zero dependencies.** This plugin is loaded into every session of every profile it is installed
in. That position argues for the smallest possible surface: one file, Node built-ins only, nothing to
audit beyond it.

**Does a value that changes every turn bloat the session?** No. `RuntimeContextProjection.project()`
returns a candidate snapshot only when the rendered text differs from the retained one, and a new
snapshot supersedes the previous rather than joining it — the snapshot text says so itself
("This snapshot supersedes earlier runtime-context snapshots"). So a session holds one clock line,
not one per turn. Checked two ways: by reading the projection in `dsh-agent-loop`, and by running a
multi-turn headless task in which the agent was asked to count `Current date/time:` lines in its own
context — it reported exactly one.

## Compatibility

- DSH `0.1.x` (peer: `@deepseek-ai/cordis ^4.0.1`)
- Node.js 20+
- No runtime dependencies — only `Intl`.

## Relationship to existing plugins

If you already run [`liqiming-whu/dsh-environment-context`](https://github.com/liqiming-whu/dsh-environment-context),
you may not need this one: it injects **live time** as one item in a broader environment bundle
(weather, location, battery, device) and ships a settings page.

This plugin is deliberately narrower:

| | dsh-environment-context | dsh-clock-context |
|---|---|---|
| Scope | environment bundle (time + weather + location + battery + device) | time only |
| Frontend | settings page (`dsh.client`) | none — configured in the profile patch file |
| Dependencies | — | zero; the implementation is one file using only `Intl` |
| headless | — | works (no `webServer` dependency) |
| Precision control | — | `precision: 'second' \| 'minute'` |

Use whichever fits. If you want time plus the rest of the environment, use that one.

## Security

**Installing a DSH plugin grants it process-level access.** A plugin is loaded into the host
process and can read and modify anything the host can — it is not sandboxed.

This plugin is written to be auditable rather than trusted:

- **No dependencies.** The whole implementation is `lib/index.js` (about 150 lines) using only
  Node's built-in `Intl`. There is no `dependencies` block in `package.json` to audit.
- **No process, filesystem, or network access.** It starts nothing, reads nothing, writes nothing,
  and makes no requests. It registers one runtime-context string and stops there.
- **No timers.** Nothing runs between turns; the string is rendered on demand when the context is
  assembled.
- **Read it in one sitting:** [`lib/index.js`](./lib/index.js).

If you would rather not install it, the same effect can be had by telling your agent to run
`date` before any statement about the current time.

## License

MIT
