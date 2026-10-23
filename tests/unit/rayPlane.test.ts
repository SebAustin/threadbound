import { describe, expect, test } from 'vitest';
import { intersectRayWithPlaneZInto } from '../../src/lib/rayPlane';

const MISS = { x: 7, y: 8 };

describe('intersectRayWithPlaneZInto', () => {
  test('hits the plane straight in front of the ray', () => {
    const out = { x: 0, y: 0 };
    expect(intersectRayWithPlaneZInto(0.1, 0.2, 1, 0, 0, -1, 0, out)).toBe(true);
    expect(out).toEqual({ x: 0.1, y: 0.2 });
  });

  test('handles an angled ray and a plane off z = 0', () => {
    const out = { x: 0, y: 0 };
    expect(intersectRayWithPlaneZInto(0, 0, 1, 0.5, -0.25, -1, 0.2, out)).toBe(true);
    expect(out.x).toBeCloseTo(0.4);
    expect(out.y).toBeCloseTo(-0.2);
  });

  test('misses a ray parallel to the plane and leaves out untouched', () => {
    const out = { ...MISS };
    expect(intersectRayWithPlaneZInto(0, 0, 1, 1, 0, 0, 0, out)).toBe(false);
    expect(out).toEqual(MISS);
  });

  test('misses a plane behind the origin and leaves out untouched', () => {
    const out = { ...MISS };
    expect(intersectRayWithPlaneZInto(0, 0, 1, 0, 0, 1, 0, out)).toBe(false);
    expect(out).toEqual(MISS);
  });
});
