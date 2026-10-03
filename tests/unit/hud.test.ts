import { describe, expect, test } from 'vitest';
import { hudModel } from '../../src/lib/hud';

const levels = [{ world: 1 }, { world: 1 }, { world: 2 }, { world: 2 }, { world: 2 }];
const base = {
  levels,
  levelIndex: 3,
  title: 'Over and Under',
  threadsUsed: 1,
  maxThreads: 3,
  par: 2,
  bestStars: 0,
  solved: false,
};

describe('hudModel: what the diorama plaque says', () => {
  test('names the level and its place within its world (ASCII only)', () => {
    const hud = hudModel(base);
    expect(hud.title).toBe('Over and Under');
    expect(hud.worldLabel).toBe('World 2 - 2/3');
  });

  test('shows the thread budget against par', () => {
    expect(hudModel(base).threadsLabel).toBe('Threads 1/3 - par 2');
  });

  test('lights one chip per best star', () => {
    expect(hudModel({ ...base, bestStars: 2 }).stars).toEqual([true, true, false]);
    expect(hudModel(base).stars).toEqual([false, false, false]);
  });

  test('a solved level says so', () => {
    expect(hudModel(base).status).toBe('playing');
    expect(hudModel({ ...base, solved: true }).status).toBe('solved');
  });
});
