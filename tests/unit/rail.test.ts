import { describe, expect, test } from 'vitest';
import { clampToRail, clampToRailInto, handleOffset } from '../../src/lib/rail';

const rail = { axis: 'x' as const, min: 0.05, max: 0.4 };

describe('clampToRail', () => {
  test('moves only along the rail axis', () => {
    expect(clampToRail({ x: 0.2, y: 0.3 }, rail, [0.25, 0.9])).toEqual({ x: 0.25, y: 0.3 });
  });
  test('clamps to the rail ends', () => {
    expect(clampToRail({ x: 0.2, y: 0.3 }, rail, [0.9, 0.3])).toEqual({ x: 0.4, y: 0.3 });
    expect(clampToRail({ x: 0.2, y: 0.3 }, rail, [-1, 0.3])).toEqual({ x: 0.05, y: 0.3 });
  });
  test('vertical rails move y only', () => {
    expect(clampToRail({ x: 0.2, y: 0.1 }, { axis: 'y', min: 0.05, max: 0.3 }, [0.9, 0.2])).toEqual({ x: 0.2, y: 0.2 });
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
