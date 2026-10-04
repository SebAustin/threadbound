import type { CueName } from '../../lib/soundCues';

/**
 * Dev-only record of the cues events asked for, so E2E can check the sound
 * design without hearing it (audio needs a user gesture to unlock anyway).
 */
const log: CueName[] = [];
/** Bounded so a long dev session never grows it without limit. */
const MAX_LOG = 200;

export function recordCue(name: CueName): void {
  if (!import.meta.env.DEV) return;
  log.push(name);
  if (log.length > MAX_LOG) log.shift();
}

/** Cues recorded since the last call, oldest first. */
export function drainCues(): CueName[] {
  return log.splice(0);
}
