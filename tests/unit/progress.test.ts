import { describe, expect, test } from 'vitest';
import { INITIAL_PROGRESS, loadProgress, recordCompletion, recordDaily, saveProgress } from '../../src/lib/progress';
import { memoryStorage, type StorageLike } from '../../src/lib/storage';

describe('recordCompletion', () => {
  test('stores stars and unlocks the next level without mutating input', () => {
    const before = INITIAL_PROGRESS;
    const after = recordCompletion(before, 'w1-01', 0, 2, 6);
    expect(after.best['w1-01']).toBe(2);
    expect(after.unlocked).toBe(1);
    expect(before.best['w1-01']).toBeUndefined();
  });

  test('keeps the best score, never lowers it', () => {
    const p = recordCompletion(INITIAL_PROGRESS, 'w1-01', 0, 3, 6);
    expect(recordCompletion(p, 'w1-01', 0, 1, 6).best['w1-01']).toBe(3);
  });

  test('never unlocks past the last level', () => {
    const p = recordCompletion({ ...INITIAL_PROGRESS, unlocked: 5 }, 'w1-06', 5, 3, 6);
    expect(p.unlocked).toBe(5);
  });
});

describe('load/save', () => {
  test('round-trips through storage', () => {
    const storage = memoryStorage();
    const p = recordCompletion(INITIAL_PROGRESS, 'w1-01', 0, 3, 6);
    saveProgress(storage, p);
    expect(loadProgress(storage)).toEqual(p);
  });

  test('falls back to initial progress on corrupt data', () => {
    const storage = memoryStorage();
    storage.setItem('threadbound.progress.v1', '{not json');
    expect(loadProgress(storage)).toEqual(INITIAL_PROGRESS);
  });

  test('falls back on schema-invalid data', () => {
    const storage = memoryStorage();
    storage.setItem('threadbound.progress.v1', JSON.stringify({ unlocked: -4, best: 'x' }));
    expect(loadProgress(storage)).toEqual(INITIAL_PROGRESS);
  });

  test('survives storage that throws (private mode, blocked site data)', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadProgress(broken)).toEqual(INITIAL_PROGRESS);
    expect(() => saveProgress(broken, INITIAL_PROGRESS)).not.toThrow();
  });
});

describe('daily streak in progress', () => {
  test('a first daily solve starts the streak and keeps the stars apart from the campaign', () => {
    const p = recordDaily(INITIAL_PROGRESS, 'daily-w1-04', 3, '2026-11-01');
    expect(p.streak).toEqual({ lastDay: '2026-11-01', count: 1 });
    expect(p.best['daily-w1-04']).toBe(3);
    expect(p.unlocked).toBe(0);
  });

  test('the next day grows it', () => {
    const p = recordDaily(recordDaily(INITIAL_PROGRESS, 'daily-a', 2, '2026-11-01'), 'daily-b', 1, '2026-11-02');
    expect(p.streak.count).toBe(2);
  });

  test('saves from before the daily puzzle still load, with no streak', () => {
    const storage = memoryStorage();
    storage.setItem('threadbound.progress.v1', JSON.stringify({ unlocked: 3, best: { 'w1-01': 3 } }));
    expect(loadProgress(storage)).toEqual({ unlocked: 3, best: { 'w1-01': 3 }, streak: { lastDay: null, count: 0 } });
  });
});
