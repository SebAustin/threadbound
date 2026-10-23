import { describe, expect, test } from 'vitest';
import { clampToRailInto, handleOffset, type Rail, positionAlong } from '../../src/lib/rail';

const rail = { axis: 'x' as const, min: 0.05, max: 0.4 };

const clamp = (pegX: number, pegY: number, r: Rail, tx: number, ty: number) =>
  clampToRailInto(pegX, pegY, r, tx, ty, { x: 0, y: 0 });

describe('clampToRailInto: sliding a peg along its rail', () => {
  test('moves only along the rail axis', () => {
    expect(clamp(0.2, 0.3, rail, 0.25, 0.9)).toEqual({ x: 0.25, y: 0.3 });
  });
  test('clamps to the rail ends', () => {
    expect(clamp(0.2, 0.3, rail, 0.9, 0.3)).toEqual({ x: 0.4, y: 0.3 });
    expect(clamp(0.2, 0.3, rail, -1, 0.3)).toEqual({ x: 0.05, y: 0.3 });
  });
  test('vertical rails move y only', () => {
    expect(clamp(0.2, 0.1, { axis: 'y', min: 0.05, max: 0.3 }, 0.9, 0.2)).toEqual({ x: 0.2, y: 0.2 });
  });
});

describe('handleOffset (where a rail peg\'s tab hangs)', () => {
  test('below the peg on horizontal rails', () => {
    expect(handleOffset('x')).toEqual([0, -0.03]);
  });
  test('right of the peg on vertical rails', () => {
    expect(handleOffset('y')).toEqual([0.03, 0]);
  });
});

describe('clampToRailInto (allocation-free, used on every drag move)', () => {
  test('writes the clamped position into the given target and returns it', () => {
    const out = { x: 0, y: 0 };
    const result = clampToRailInto(0.2, 0.3, rail, 0.9, 0.7, out);
    expect(result).toBe(out);
    expect(out).toEqual({ x: 0.4, y: 0.3 });
  });
});

describe('positionAlong: where a rail peg sits when slid to a point along its rail', () => {
  test('x rails move x and keep y; y rails the reverse', () => {
    expect(positionAlong({ x: 0.2, y: 0.24 }, { axis: 'x', min: 0, max: 0.5 }, 0.05)).toEqual({ x: 0.05, y: 0.24 });
    expect(positionAlong({ x: 0.2, y: 0.24 }, { axis: 'y', min: 0, max: 0.4 }, 0.3)).toEqual({ x: 0.2, y: 0.3 });
  });
});
