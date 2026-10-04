import { describe, expect, test } from 'vitest';
import { LEVELS } from '../../src/levels';

describe('level data', () => {
  test('ids are unique', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('levels are ordered by world, then by id', () => {
    const ids = LEVELS.map((l) => l.id);
    expect([...ids].sort()).toEqual(ids);
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

describe('level registry', () => {
  test('every level file under src/levels is registered', async () => {
    const { readdirSync } = await import('node:fs');
    const { join } = await import('node:path');
    const root = join(__dirname, '../../src/levels');
    const files = readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .flatMap((d) => readdirSync(join(root, d.name)).filter((f) => f.endsWith('.json')));
    expect(LEVELS).toHaveLength(files.length);
  });

  test('the campaign is four worlds of six levels, in world order', () => {
    expect(LEVELS.map((l) => l.world)).toEqual([1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4]);
  });
});
