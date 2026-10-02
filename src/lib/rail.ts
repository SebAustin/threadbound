import type { Vec2 } from './vec';

export interface Rail {
  readonly axis: 'x' | 'y';
  readonly min: number;
  readonly max: number;
}

/** Slides a peg along its rail toward `target`, never leaving the rail. */
export function clampToRail(
  peg: { readonly x: number; readonly y: number },
  rail: Rail,
  target: Vec2,
): { x: number; y: number } {
  const clamp = (v: number) => Math.min(rail.max, Math.max(rail.min, v));
  return rail.axis === 'x' ? { x: clamp(target[0]), y: peg.y } : { x: peg.x, y: clamp(target[1]) };
}
