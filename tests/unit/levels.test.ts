import { describe, expect, test } from 'vitest';
import { LEVELS } from '../../src/levels';

describe('World 1 level data', () => {
  test('all six levels parse', () => {
    expect(LEVELS).toHaveLength(6);
  });

  test('ids are unique and ordered', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(['w1-01', 'w1-02', 'w1-03', 'w1-04', 'w1-05', 'w1-06']);
  });

  test('every level stays within the physics body budget', () => {
    for (const level of LEVELS) {
      // case(5) + pegs + goal walls(2 each) + walls + threads(max) + marbles
      const bodies = 5 + level.pegs.length + level.goals.length * 2 + level.walls.length
        + level.maxThreads + level.presetThreads.length + level.marbles;
      expect(bodies, level.id).toBeLessThanOrEqual(40);
    }
  });
});
