import { SLIDER } from '../config/constants';
import type { Point2 } from './vec';

export interface Rail {
  readonly axis: 'x' | 'y';
  readonly min: number;
  readonly max: number;
}

const clampTo = (rail: Rail, v: number) => Math.min(rail.max, Math.max(rail.min, v));

/**
 * Slides a peg along its rail toward the target, never leaving the rail. Writes
 * into `out` so per-move drag handling allocates nothing.
 */
export function clampToRailInto(
  pegX: number,
  pegY: number,
  rail: Rail,
  targetX: number,
  targetY: number,
  out: { x: number; y: number },
): { x: number; y: number } {
  out.x = rail.axis === 'x' ? clampTo(rail, targetX) : pegX;
  out.y = rail.axis === 'y' ? clampTo(rail, targetY) : pegY;
  return out;
}

const OFFSET_X: readonly [number, number] = [0, -SLIDER.handleOffset];
const OFFSET_Y: readonly [number, number] = [SLIDER.handleOffset, 0];

/** Where a rail peg's tab hangs relative to the peg: below x-rails, right of y-rails. */
export function handleOffset(axis: Rail['axis']): readonly [number, number] {
  return axis === 'x' ? OFFSET_X : OFFSET_Y;
}

/** Position of a peg slid to `along` on its rail (the off-axis coordinate is kept). */
export function positionAlong(
  peg: Point2,
  rail: Rail,
  along: number,
): { x: number; y: number } {
  return rail.axis === 'x' ? { x: along, y: peg.y } : { x: peg.x, y: along };
}
