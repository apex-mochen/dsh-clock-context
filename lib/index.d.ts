/**
 * Type declarations for dsh-clock-context.
 *
 * The implementation is plain ESM JavaScript; these declarations are written by
 * hand so consumers (and editors) get the plugin's public surface.
 */

import type { Context } from '@deepseek-ai/cordis';

/** Plugin name, as declared in `cordis.patch.yml`. */
export declare const name: 'dsh-clock-context';

/** Runtime-context entry name. */
export declare const CONTEXT_NAME: 'clock:now';

/** Default sort order of the contribution (before SANDBOX_POLICY = 110). */
export declare const DEFAULT_ORDER: 105;

/** Options accepted from the profile patch entry's `config:` block. */
export interface ClockOptions {
  /** Prefix of the injected line. @default "Current date/time" */
  label?: string;
  /** Locale passed to `Intl.DateTimeFormat`. @default the host's locale */
  locale?: string;
  /** IANA time zone for the rendered local time. @default the host's zone */
  timeZone?: string;
  /** Append the UTC instant. @default true */
  includeUtc?: boolean;
  /** Append unix seconds. @default false */
  includeEpoch?: boolean;
  /**
   * `'second'` re-renders every second, `'minute'` only once a minute.
   * @default "second"
   */
  precision?: 'second' | 'minute';
  /** Append the "this is the authoritative clock" sentence. @default true */
  hint?: boolean;
  /** Sort order inside the runtime-context snapshot. @default 105 */
  order?: number;
  /** Set `false` to keep the plugin installed but silent. @default true */
  enabled?: boolean;
}

/**
 * Offset of `timeZone` from UTC at `date`, in minutes east of UTC.
 * Returns `undefined` for an unknown zone.
 */
export declare function zoneOffsetMinutes(date: Date, timeZone?: string): number | undefined;

/**
 * Render the runtime-context line. Exported for testing; `now` is injectable.
 * Returns `''` when `enabled` is false.
 */
export declare function renderClock(options?: ClockOptions, now?: Date): string;

/** Register the clock contribution against the host context. */
export declare function apply(ctx: Context, config?: ClockOptions): void;

declare const plugin: { name: typeof name; apply: typeof apply };
export default plugin;
