import type { CueName } from '../../lib/soundCues';
import type { Point3 } from '../../lib/vec';

/**
 * One cue a game event asked for: which, at what pitch, when (seconds, `performance.now()` clock),
 * where it was heard from (world metres rounded to 1 mm, or null for a cue with no place) and
 * whether it went through a panner (only in an XR session, lib/cueSpace).
 */
export interface CueRecord {
  readonly name: CueName;
  readonly hz: number;
  readonly at: number;
  readonly source: Point3 | null;
  readonly spatial: boolean;
}

/**
 * Dev-only record of the cues events asked for, so E2E can check the sound
 * design (and its timing) without hearing it (audio needs a user gesture to unlock anyway).
 */
const log: CueRecord[] = [];
/** Bounded so a long dev session never grows it without limit. */
const MAX_LOG = 200;

const mm = (metres: number): number => Math.round(metres * 1000) / 1000;

export function recordCue(name: CueName, hz: number, source: Point3 | null, spatial: boolean): void {
  if (!import.meta.env.DEV) return;
  const place = source ? { x: mm(source.x), y: mm(source.y), z: mm(source.z) } : null;
  log.push({ name, hz, at: performance.now() / 1000, source: place, spatial });
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
