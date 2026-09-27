import { describe, expect, test } from 'vitest';
import { segmentDistanceSq2d } from '../../src/lib/segment2d';

describe('segmentDistanceSq2d (allocation-free, used every frame)', () => {
  test('perpendicular distance to the segment interior', () => {
    expect(segmentDistanceSq2d(0.5, 0.2, 0, 0, 1, 0)).toBeCloseTo(0.04);
  });

  test('distance to the nearest endpoint beyond the segment', () => {
    expect(segmentDistanceSq2d(2, 0, 0, 0, 1, 0)).toBeCloseTo(1);
    expect(segmentDistanceSq2d(-3, 4, 0, 0, 1, 0)).toBeCloseTo(25);
  });

  test('degenerate segment behaves like a point', () => {
    expect(segmentDistanceSq2d(3, 4, 1, 1, 1, 1)).toBeCloseTo(13);
  });
});
