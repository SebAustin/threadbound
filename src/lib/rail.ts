import { SLIDER } from '../config/constants';
import type { Vec2 } from './vec';

export interface Rail {
  readonly axis: 'x' | 'y';
  readonly min: number;
  readonly max: number;
}

const clampTo = (rail: Rail, v: number) => Math.min(rail.max, Math.max(rail.min, v));

/** Slides a peg along its rail toward `target`, never leaving the rail. */
export function clampToRail(
  peg: { readonly x: number; readonly y: number },
  rail: Rail,
  target: Vec2,
): { x: number; y: number } {
  return clampToRailInto(peg.x, peg.y, rail, target[0], target[1], { x: 0, y: 0 });
}

/** Allocation-free clampToRail for per-move drag handling: writes into `out`. */
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
