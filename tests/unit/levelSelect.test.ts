import { describe, expect, test } from 'vitest';
import { levelSelectLabel, stepLevel } from '../../src/lib/levelSelect';

const levels = ['w1-01', 'w1-02', 'w1-03', 'w1-04'].map((id) => ({ id }));
const solvedTwo = { 'w1-01': 3, 'w1-02': 2 };

describe('stepLevel: revisit any level reached so far, never skip ahead', () => {
  test('steps back to an earlier solved level', () => {
    expect(stepLevel(2, -1, levels, solvedTwo)).toBe(1);
  });

  test('steps forward up to the first unsolved level, no further', () => {
    expect(stepLevel(0, 1, levels, solvedTwo)).toBe(1);
    expect(stepLevel(1, 1, levels, solvedTwo)).toBe(2);
    expect(stepLevel(2, 1, levels, solvedTwo)).toBe(2);
  });

  test('stops at the first level', () => {
    expect(stepLevel(0, -1, levels, solvedTwo)).toBe(0);
  });

  test('a finished campaign can visit every level', () => {
    const all = Object.fromEntries(levels.map((l) => [l.id, 3]));
    expect(stepLevel(2, 1, levels, all)).toBe(3);
    expect(stepLevel(3, 1, levels, all)).toBe(3);
  });

  test('from a daily, stepping lands back in the campaign at the level reached', () => {
    expect(stepLevel(levels.length + 3, -1, levels, solvedTwo)).toBe(1);
    expect(stepLevel(levels.length + 3, 1, levels, solvedTwo)).toBe(2);
  });
});

describe('levelSelectLabel', () => {
  test('names the position in the campaign (ASCII)', () => {
    expect(levelSelectLabel(2, 24)).toBe('Level 3 of 24');
  });

  test('a daily reads as such', () => {
    expect(levelSelectLabel(30, 24)).toBe('Daily puzzle');
  });
});
