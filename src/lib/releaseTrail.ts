/**
 * A pinch that opens jerks the ray: a hand held still on a peg can report its
 * release a few centimetres off. The last drag samples tell a held point from a
 * deliberate sweep, so the release can land where the hand was holding.
 * Fixed storage: pushing a sample (every pointer move of a pull) allocates nothing.
 */

/** Samples kept: about a quarter of a second of a pull at 60 Hz. */
export const TRAIL_SAMPLES = 16;
const STRIDE = 3;

export const RELEASE_TRAIL = {
  /** Meters: samples this close to the hold's last point are holding still. */
  holdRadius: 0.006,
  /** A hold lasts at least this long (ms), from its first sample until the pointer moved off. */
  minHoldMs: 60,
  /** The hold must have ended at most this long (ms) before the release. */
  maxGapMs: 150,
} as const;

export interface ReleaseTrail {
  /** Ring of (x, y, ms) samples, oldest overwritten first. */
  readonly samples: Float64Array;
  /** Samples pushed since the last reset; the newest is at (count - 1) % TRAIL_SAMPLES. */
  count: number;
  /** The first sample since the reset: where the pinch landed on its peg. */
  grabX: number;
  grabY: number;
}

/** The peg a pull started from: a hold on it is the pinch itself, never an aim. */
export interface SourcePeg {
  readonly x: number;
  readonly y: number;
  /** Meters: a held point this close to (x, y) is on the peg (its knob). */
  readonly radius: number;
}

export function createTrail(): ReleaseTrail {
  return { samples: new Float64Array(TRAIL_SAMPLES * STRIDE), count: 0, grabX: 0, grabY: 0 };
}

/** Forgets every sample (a new pull starts). */
export function reset(trail: ReleaseTrail): void {
  trail.count = 0;
}

/** Records where the pull is (frame meters) at `ms`. The first push after a reset is the grab. */
export function push(trail: ReleaseTrail, x: number, y: number, ms: number): void {
  if (trail.count === 0) {
    trail.grabX = x;
    trail.grabY = y;
  }
  const at = (trail.count % TRAIL_SAMPLES) * STRIDE;
  trail.samples[at] = x;
  trail.samples[at + 1] = y;
  trail.samples[at + 2] = ms;
  trail.count += 1;
}

/** Offset into `samples` of the `i`th kept sample, oldest first. */
function offsetOf(trail: ReleaseTrail, i: number): number {
  const kept = Math.min(trail.count, TRAIL_SAMPLES);
  return ((trail.count - kept + i) % TRAIL_SAMPLES) * STRIDE;
}

const near = (ax: number, ay: number, bx: number, by: number) =>
  Math.hypot(ax - bx, ay - by) <= RELEASE_TRAIL.holdRadius;

/** Whether a held point is the pinch itself: where the pinch landed, or anywhere on the source peg. */
function isPinch(trail: ReleaseTrail, x: number, y: number, source: SourcePeg | undefined): boolean {
  if (near(x, y, trail.grabX, trail.grabY)) return true;
  return source !== undefined && Math.hypot(x - source.x, y - source.y) <= source.radius;
}

/** First kept sample of the still run ending at sample `end`: each within holdRadius of `end`. */
function holdStart(trail: ReleaseTrail, end: number): number {
  const s = trail.samples;
  const e = offsetOf(trail, end);
  let start = end;
  while (start > 0) {
    const o = offsetOf(trail, start - 1);
    if (!near(s[o], s[o + 1], s[e], s[e + 1])) break;
    start -= 1;
  }
  return start;
}

/**
 * Where a pull lands. The newest sample is the release. If the pointer held still
 * (within holdRadius for at least minHoldMs, until the next sample moved off) and
 * that hold ended within maxGapMs of the release, the held point wins; otherwise
 * the release stands, so jumps and deliberate flicks behave as before. A hold
 * where the pinch landed, or anywhere on `source` (the pull's own knob, which a
 * pinch may land up to its rim from the centre), is the pinch itself, not an aim,
 * and never wins. Writes into `out`.
 */
export function stableRelease(
  trail: ReleaseTrail,
  out: { x: number; y: number },
  source?: SourcePeg,
): { x: number; y: number } {
  const kept = Math.min(trail.count, TRAIL_SAMPLES);
  if (kept === 0) return out;
  const s = trail.samples;
  const last = offsetOf(trail, kept - 1);
  out.x = s[last];
  out.y = s[last + 1];
  const releasedAt = s[last + 2];
  for (let end = kept - 2; end >= 0; end--) {
    const leftAt = s[offsetOf(trail, end + 1) + 2];
    if (releasedAt - leftAt > RELEASE_TRAIL.maxGapMs) break;
    const e = offsetOf(trail, end);
    const heldFor = leftAt - s[offsetOf(trail, holdStart(trail, end)) + 2];
    if (heldFor >= RELEASE_TRAIL.minHoldMs && !isPinch(trail, s[e], s[e + 1], source)) {
      out.x = s[e];
      out.y = s[e + 1];
      return out;
    }
  }
  return out;
}
