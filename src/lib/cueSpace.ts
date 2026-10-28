/**
 * Where a cue is heard from (week 8 ticket 16, ADR 0006). Plucks and cup chimes come from their
 * place on the diorama, in its own frame (x right, y up from the base, z = 0 is the marble channel
 * plane); callers turn these points into world space. In an XR session the head is tracked, so a
 * positional cue with a place goes through a panner there. Everything else plays as before.
 */
import { GOAL } from '../config/constants';
import type { Cue } from './soundCues';
import type { Vec3 } from './vec';

/** A cup's span along the base (the diorama's cup ranges carry these). */
export interface CupSpan {
  readonly minX: number;
  readonly maxX: number;
}

/** A place a cue comes from: a frame point, or a world point. */
export type CueSource = Vec3 | { readonly x: number; readonly y: number; readonly z: number };

/** Through a panner at its source, or straight to the master as before. */
export type CueRoute = 'spatial' | 'mono';

/**
 * Spatial notes allowed to ring at once: HRTF panners cost more than plain gains, and their cost on
 * Quest is unmeasured, so a pile-up's extra notes play mono. The ticket's first guess was 8, but a
 * note rings for its whole 1.4 s buffer and w1-01's solve already overlaps 11 positional notes (the
 * strung thread, the bounces, the chimes and the strum), so 8 sent its sixth bounce and two cadence
 * notes mono. The busiest solve measured (w1-04, every thread strung at once) peaks at 16.
 */
export const MAX_SPATIAL_VOICES = 16;

/**
 * Panner settings. Every seated source is within reach (placement's ACCEPT_REACH, under 1 m), so
 * inside the reference distance: a positional cue is panned, but its volume never changes.
 */
export const PANNER = {
  panningModel: 'HRTF',
  distanceModel: 'inverse',
  refDistance: 1,
  rolloffFactor: 1,
} as const;

/** A thread is heard from its midpoint in the channel plane, the same whichever way round it is given. */
export function threadSource(ax: number, ay: number, bx: number, by: number): Vec3 {
  return [(ax + bx) / 2, (ay + by) / 2, 0];
}

/** A cup is heard from its centre at half its wall height. */
export function cupSource(cup: CupSpan): Vec3 {
  return [(cup.minX + cup.maxX) / 2, GOAL.wallHeight / 2, 0];
}

/** The cadence is heard from the mean of the cup centres; null with no cups. */
export function cadenceSource(cups: readonly CupSpan[]): Vec3 | null {
  if (cups.length === 0) return null;
  let x = 0;
  for (const cup of cups) x += (cup.minX + cup.maxX) / 2;
  return [x / cups.length, GOAL.wallHeight / 2, 0];
}

/**
 * 'spatial' only for a positional cue with a source, inside an XR session (the head is tracked
 * only there), while fewer than MAX_SPATIAL_VOICES spatial notes ring. Otherwise 'mono'.
 */
export function cueRoute(cue: Cue, source: CueSource | null | undefined, immersive: boolean, liveSpatial: number): CueRoute {
  const placed = cue.positional === true && source !== null && source !== undefined;
  return placed && immersive && liveSpatial < MAX_SPATIAL_VOICES ? 'spatial' : 'mono';
}
