import { describe, expect, test } from 'vitest';
import { releaseOrder } from '../../src/lib/releaseOrder';

describe('releaseOrder', () => {
  test('interleaves chutes round-robin so colored streams fall together', () => {
    const order = releaseOrder([{ count: 2 }, { count: 3 }]);
    expect(order).toEqual([
      { chute: 0, nth: 0 },
      { chute: 1, nth: 0 },
      { chute: 0, nth: 1 },
      { chute: 1, nth: 1 },
      { chute: 1, nth: 2 },
    ]);
  });

  test('single chute releases in sequence', () => {
    expect(releaseOrder([{ count: 3 }]).map((r) => r.nth)).toEqual([0, 1, 2]);
  });

  test('empty input releases nothing', () => {
    expect(releaseOrder([])).toEqual([]);
  });
});
