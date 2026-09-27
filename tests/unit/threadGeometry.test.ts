import { describe, expect, test } from 'vitest';
import {
  closestPointOnSegment,
  segmentTransform,
} from '../../src/lib/threadGeometry';

function rotateY(q: readonly number[]): [number, number, number] {
  // Rotate the unit +Y axis by quaternion q = [x, y, z, w].
  const [x, y, z, w] = q;
  return [
    2 * (x * y - w * z),
    1 - 2 * (x * x + z * z),
    2 * (y * z + w * x),
  ];
}

describe('segmentTransform', () => {
  test('returns midpoint and length of a horizontal segment', () => {
    const t = segmentTransform([0, 0, 0], [0.2, 0, 0]);
    expect(t).not.toBeNull();
    expect(t!.midpoint).toEqual([0.1, 0, 0]);
    expect(t!.length).toBeCloseTo(0.2);
  });

  test('quaternion aligns local +Y with the segment direction', () => {
    const t = segmentTransform([0, 0, 0], [0.3, 0.4, 0])!;
    const axis = rotateY(t.quaternion);
    expect(axis[0]).toBeCloseTo(0.6);
    expect(axis[1]).toBeCloseTo(0.8);
    expect(axis[2]).toBeCloseTo(0);
  });

  test('handles a segment pointing straight down (antiparallel to +Y)', () => {
    const t = segmentTransform([0, 1, 0], [0, 0, 0])!;
    const axis = rotateY(t.quaternion);
    expect(axis[1]).toBeCloseTo(-1);
  });

  test('returns null for a degenerate zero-length segment', () => {
    expect(segmentTransform([1, 1, 1], [1, 1, 1])).toBeNull();
  });
});

describe('closestPointOnSegment', () => {
  test('projects onto the segment interior', () => {
    const r = closestPointOnSegment([0.5, 1, 0], [0, 0, 0], [1, 0, 0]);
    expect(r.point).toEqual([0.5, 0, 0]);
    expect(r.distance).toBeCloseTo(1);
    expect(r.t).toBeCloseTo(0.5);
  });

  test('clamps to the endpoints', () => {
    const r = closestPointOnSegment([-2, 0, 0], [0, 0, 0], [1, 0, 0]);
    expect(r.point).toEqual([0, 0, 0]);
    expect(r.t).toBe(0);
  });

  test('works for a degenerate segment', () => {
    const r = closestPointOnSegment([0, 3, 4], [0, 0, 0], [0, 0, 0]);
    expect(r.distance).toBeCloseTo(5);
  });
});
