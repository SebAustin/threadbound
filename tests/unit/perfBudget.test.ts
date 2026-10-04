import { describe, expect, test } from 'vitest';
import { budgetBreaches } from '../../src/lib/perfBudget';

const budget = { maxDrawCalls: 80, maxTriangles: 100_000, maxPhysicsBodies: 40 };

describe('budgetBreaches: a frame measured against the performance budget', () => {
  test('a frame within budget has no breaches', () => {
    expect(budgetBreaches({ drawCalls: 80, triangles: 99_999, physicsBodies: 12 }, budget)).toEqual([]);
  });

  test('each metric over its limit is named with its value and limit', () => {
    expect(budgetBreaches({ drawCalls: 81, triangles: 150_000, physicsBodies: 41 }, budget)).toEqual([
      'draw calls 81 > 80',
      'triangles 150000 > 100000',
      'physics bodies 41 > 40',
    ]);
  });
});
