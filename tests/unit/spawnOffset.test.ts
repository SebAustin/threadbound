import { describe, expect, test } from 'vitest';
import { spawnOffsetX } from '../../src/lib/spawnOffset';

describe('spawnOffsetX', () => {
  test('first marble drops dead center', () => {
    expect(spawnOffsetX(0, 0.002)).toBe(0);
  });

  test('later marbles alternate sides so they never balance in a column', () => {
    const offsets = [1, 2, 3, 4].map((i) => spawnOffsetX(i, 0.002));
    expect(offsets[0]).toBeGreaterThan(0);
    expect(offsets[1]).toBeLessThan(0);
    expect(new Set(offsets).size).toBe(4);
  });

  test('stays within the jitter bound and is deterministic', () => {
    for (let i = 0; i < 20; i++) {
      expect(Math.abs(spawnOffsetX(i, 0.002))).toBeLessThanOrEqual(0.002);
      expect(spawnOffsetX(i, 0.002)).toBe(spawnOffsetX(i, 0.002));
    }
  });
});
