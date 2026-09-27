import { describe, expect, test } from 'vitest';
import { intersectRayWithPlaneZ } from '../../src/lib/rayPlane';

describe('intersectRayWithPlaneZ', () => {
  test('hits the plane in front of the ray', () => {
    const p = intersectRayWithPlaneZ([0.1, 0.2, 1], [0, 0, -1], 0);
    expect(p).toEqual([0.1, 0.2, 0]);
  });

  test('handles an oblique ray', () => {
    const p = intersectRayWithPlaneZ([0, 0, 1], [0.5, 0, -1], 0)!;
    expect(p[0]).toBeCloseTo(0.5);
    expect(p[2]).toBeCloseTo(0);
  });

  test('returns null when the ray is parallel to the plane', () => {
    expect(intersectRayWithPlaneZ([0, 0, 1], [1, 0, 0], 0)).toBeNull();
  });

  test('returns null when the plane is behind the ray', () => {
    expect(intersectRayWithPlaneZ([0, 0, 1], [0, 0, 1], 0)).toBeNull();
  });
});
