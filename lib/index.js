/**
 * dsh-clock-context — inject the current date/time into DSH's runtime context.
 *
 * Why this exists: a language model has no clock. It only knows the time from
 * timestamps in tool output, log lines, or file mtimes it happens to read —
 * so it silently drifts, and an agent that has been idle for hours will still
 * reason as if it were the moment of the last message. This plugin registers a
 * dynamic runtime-context contribution whose `text()` is evaluated on every
 * assembly, giving the agent an authoritative "now" each turn.
 *
 * Implementation shape mirrors @deepseek-ai/dsh-sandbox-policy:
 * `apply(ctx)` -> `ctx.inject(['systemPrompt'], scope => scope.systemPrompt.context({...}))`.
 */

/** Plugin name, as declared in this package's cordis.patch.yml entry. */
export const name = 'dsh-clock-context';

/** Runtime-context entry name (namespaced so it cannot collide with other plugins). */
export const CONTEXT_NAME = 'clock:now';

/**
 * Default sort order for the contribution.
 *
 * Built-in context orders are SANDBOX_POLICY=110, APPROVAL_POLICY=115,
 * SUBAGENT_DELEGATION=120. The clock is context-setting information, so it is
 * placed first by default; override with `order` in the profile patch.
 */
export const DEFAULT_ORDER = 105;

const DEFAULTS = {
  label: 'Current date/time',
  locale: undefined,
  timeZone: undefined,
  includeUtc: true,
  includeEpoch: false,
  precision: 'second',
  hint: true,
  order: DEFAULT_ORDER,
  enabled: true,
};

const HINT =
  'Treat this as the authoritative clock: whenever you state or reason about ' +
  '"now", today, the current date, or how much time has passed, use this value — ' +
  'never infer the current time from earlier messages, log lines, or file timestamps, ' +
  'and never guess it.';

/** @param {number} value @param {number} width */
function pad(value, width = 2) {
  return String(value).padStart(width, '0');
}

/**
 * Offset of `timeZone` from UTC at `date`, in minutes.
 *
 * Uses the Intl round-trip: format the instant as if the zone were UTC, then
 * compare with the real instant. Handles DST because it is evaluated per call.
 *
 * @param {Date} date
 * @param {string | undefined} timeZone
 * @returns {number | undefined} minutes east of UTC, or undefined when unknown.
 */
export function zoneOffsetMinutes(date, timeZone) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(date);
    /** @type {Record<string, string>} */
    const bag = {};
    for (const part of parts) bag[part.type] = part.value;
    const asUtc = Date.UTC(
      Number(bag.year),
      Number(bag.month) - 1,
      Number(bag.day),
      Number(bag.hour) % 24,
      Number(bag.minute),
      Number(bag.second),
    );
    const drift = asUtc - (date.getTime() - (date.getTime() % 1000));
    return Math.round(drift / 60000);
  } catch {
    return undefined;
  }
}

/** @param {number} minutes */
function offsetLabel(minutes) {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  return `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** @param {string | undefined} timeZone */
function resolvedZone(timeZone) {
  if (timeZone) return timeZone;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

/**
 * Render the runtime-context line.
 *
 * Exported so it can be unit-tested without booting a profile.
 *
 * @param {Partial<typeof DEFAULTS>} [options]
 * @param {Date} [now] - injectable for tests.
 * @returns {string}
 */
export function renderClock(options = {}, now = new Date()) {
  const opts = { ...DEFAULTS, ...options };
  if (!opts.enabled) return '';

  const zone = resolvedZone(opts.timeZone);
  const offset = zoneOffsetMinutes(now, zone);

  let local;
  try {
    local = new Intl.DateTimeFormat(opts.locale, {
      timeZone: zone,
      hour12: false,
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      // Second-level precision makes the rendered snapshot change every turn,
      // which makes the harness re-record the snapshot every turn. Both are
      // cheap (the snapshot is a tail user-role message, so it does not
      // invalidate the cached prefix), but `precision: 'minute'` trades the
      // seconds away for a snapshot that only changes once a minute.
      ...(opts.precision === 'minute' ? {} : { second: '2-digit' }),
    }).format(now);
  } catch {
    local = now.toString();
  }

  const zoneBits = [zone, offset === undefined ? undefined : offsetLabel(offset)]
    .filter(Boolean)
    .join(', ');

  const parts = [`${opts.label}: ${local}${zoneBits ? ` (${zoneBits})` : ''}`];

  if (opts.includeUtc) {
    const iso = now.toISOString();
    parts.push(`UTC ${opts.precision === 'minute' ? iso.slice(0, 16) + 'Z' : iso.replace(/\.\d{3}Z$/, 'Z')}`);
  }
  if (opts.includeEpoch) {
    parts.push(`epoch ${Math.floor(now.getTime() / 1000)}`);
  }

  const head = `${parts.join(' · ')}.`;
  return opts.hint ? `${head} ${HINT}` : head;
}

/**
 * Register the clock contribution against the host context.
 *
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {Partial<typeof DEFAULTS>} [config] - from the profile patch entry.
 * @returns {void}
 */
export function apply(ctx, config) {
  const options = { ...DEFAULTS, ...(config ?? {}) };

  ctx.inject(['systemPrompt'], (scope) => {
    scope.systemPrompt.context({
      name: CONTEXT_NAME,
      order: options.order,
      text: () => renderClock(options),
    });
  });
}

export default { name, apply };
