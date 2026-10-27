import { describe, expect, test } from 'vitest';
import { starsFor, starTotal } from '../../src/lib/scoring';
import { LEVELS } from '../../src/levels';

// ADR 0005: one star for the solve, one for par threads or fewer, one for the first drop.
describe('starsFor: the solve, economy and foresight', () => {
  test('over par on a later drop earns the solve star only', () => {
    expect(starsFor({ threadsUsed: 3, par: 2, drops: 2 })).toBe(1);
  });

  test('par on a later drop earns two', () => {
    expect(starsFor({ threadsUsed: 2, par: 2, drops: 3 })).toBe(2);
  });

  test('over par on the first drop earns two', () => {
    expect(starsFor({ threadsUsed: 3, par: 2, drops: 1 })).toBe(2);
  });

  test('par or fewer on the first drop earns all three', () => {
    expect(starsFor({ threadsUsed: 2, par: 2, drops: 1 })).toBe(3);
    expect(starsFor({ threadsUsed: 0, par: 1, drops: 1 })).toBe(3);
  });
});

describe('starTotal: the settings face star total', () => {
  const ids = (...list: string[]) => list.map((id) => ({ id }));
  const campaign = ids('w1-01', 'w1-02', 'w1-03');

  test('sums campaign stars out of three per level', () => {
    expect(starTotal(campaign, { 'w1-01': 3, 'w1-03': 2 })).toEqual({ earned: 5, possible: 9 });
    expect(starTotal(campaign, {})).toEqual({ earned: 0, possible: 9 });
  });

  test('ignores daily and stale ids', () => {
    expect(starTotal(campaign, { 'w1-02': 1, 'daily-w1-02': 3, 'w9-99': 3 })).toEqual({ earned: 1, possible: 9 });
  });

  test('tops out at 72 on the real campaign', () => {
    const all = Object.fromEntries(LEVELS.map((l) => [l.id, 3]));
    expect(starTotal(LEVELS, { ...all, 'daily-w1-04': 3, 'w9-99': 3 })).toEqual({ earned: 72, possible: 72 });
  });
});
