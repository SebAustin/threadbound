import type { CueName } from '../../lib/soundCues';

/** One cue a game event asked for: which, at what pitch, and when (seconds, `performance.now()` clock). */
export interface CueRecord {
  readonly name: CueName;
  readonly hz: number;
  readonly at: number;
}

/**
 * Dev-only record of the cues events asked for, so E2E can check the sound
 * design (and its timing) without hearing it (audio needs a user gesture to unlock anyway).
 */
const log: CueRecord[] = [];
/** Bounded so a long dev session never grows it without limit. */
const MAX_LOG = 200;

export function recordCue(name: CueName, hz: number): void {
  if (!import.meta.env.DEV) return;
  log.push({ name, hz, at: performance.now() / 1000 });
  if (log.length > MAX_LOG) log.shift();
}

/** Cues recorded since the last drain, oldest first. Shares one log with `drainCueTrace`: either empties both. */
export function drainCueTrace(): CueRecord[] {
  return log.splice(0);
}

/** Names of the cues recorded since the last drain, oldest first (drains the same log as `drainCueTrace`). */
export function drainCues(): CueName[] {
  return drainCueTrace().map((record) => record.name);
}
