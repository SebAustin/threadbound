import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  dailyStarsOn,
  INITIAL_PROGRESS,
  loadProgress,
  MELODY_NOTES_MAX,
  recordCompletion,
  recordDaily,
  saveProgress,
  type Solve,
} from '../../src/lib/progress';
import { MELODY_STEP_SECONDS, replaySchedule, type Melody } from '../../src/lib/melody';
import { memoryStorage, type StorageLike } from '../../src/lib/storage';

const C4 = 261.63;
const E4 = 329.63;
const KEY = 'threadbound.progress.v1';
/** A tune with its drop times: one note every 0.3 s, starting 0.5 s into the drop. */
const tune = (notes: number[]): Melody => ({ notes, times: notes.map((_, i) => 0.5 + 0.3 * i) });
const solve = (levelId: string, levelIndex: number, stars: number, melody: Melody = tune([C4])): Solve => ({
  levelId,
  levelIndex,
  stars,
  levelCount: 6,
  melody,
});
const seeded = (save: unknown) => {
  const storage = memoryStorage();
  storage.setItem(KEY, JSON.stringify(save));
  return storage;
};

describe('recordCompletion', () => {
  test('stores stars and unlocks the next level without mutating input', () => {
    const before = INITIAL_PROGRESS;
    const after = recordCompletion(before, solve('w1-01', 0, 2));
    expect(after.best['w1-01']).toBe(2);
    expect(after.unlocked).toBe(1);
    expect(before.best['w1-01']).toBeUndefined();
  });

  test('keeps the best score, never lowers it', () => {
    const p = recordCompletion(INITIAL_PROGRESS, solve('w1-01', 0, 3));
    expect(recordCompletion(p, solve('w1-01', 0, 1)).best['w1-01']).toBe(3);
  });

  test('never unlocks past the last level', () => {
    const p = recordCompletion({ ...INITIAL_PROGRESS, unlocked: 5 }, solve('w1-06', 5, 3));
    expect(p.unlocked).toBe(5);
  });
});

describe('melody book: the tune a solve played is kept, with its timing', () => {
  test("a first solve saves that drop's notes and times", () => {
    expect(recordCompletion(INITIAL_PROGRESS, solve('w1-01', 0, 2, tune([C4, E4]))).melodies['w1-01']).toEqual(tune([C4, E4]));
  });

  test('an equal or better solve replaces it; a worse one keeps the old tune', () => {
    const first = recordCompletion(INITIAL_PROGRESS, solve('w1-01', 0, 2, tune([C4])));
    expect(recordCompletion(first, solve('w1-01', 0, 2, tune([E4]))).melodies['w1-01']).toEqual(tune([E4]));
    expect(recordCompletion(first, solve('w1-01', 0, 1, tune([E4]))).melodies['w1-01']).toEqual(tune([C4]));
  });

  test('a solve that played no notes leaves the book as it was', () => {
    expect(recordCompletion(INITIAL_PROGRESS, solve('w1-01', 0, 3, tune([]))).melodies['w1-01']).toBeUndefined();
    const kept = recordCompletion(INITIAL_PROGRESS, solve('w1-01', 0, 2, tune([C4])));
    expect(recordCompletion(kept, solve('w1-01', 0, 3, tune([]))).melodies['w1-01']).toEqual(tune([C4]));
  });

  test('a long melody is kept to its first notes, and the same number of times', () => {
    const long = tune(Array.from({ length: MELODY_NOTES_MAX + 5 }, () => C4));
    const kept = recordCompletion(INITIAL_PROGRESS, solve('w1-01', 0, 3, long)).melodies['w1-01'];
    expect(kept.notes).toHaveLength(MELODY_NOTES_MAX);
    expect(kept.times).toEqual(long.times.slice(0, MELODY_NOTES_MAX));
  });

  test('a solve whose times are bad keeps its notes and drops the times', () => {
    const kept = recordCompletion(INITIAL_PROGRESS, solve('w1-01', 0, 3, { notes: [C4, E4], times: [0.9, 0.2] }));
    expect(kept.melodies['w1-01']).toEqual({ notes: [C4, E4], times: [] });
  });

});

describe('melody book: saved entries load, old and new', () => {
  test('saves from before the melody book load with an empty book', () => {
    expect(loadProgress(seeded({ unlocked: 1, best: { 'w1-01': 3 } })).melodies).toEqual({});
  });

  test('{ notes, times } round-trips through storage', () => {
    const storage = memoryStorage();
    saveProgress(storage, recordCompletion(INITIAL_PROGRESS, solve('w1-01', 0, 3, tune([C4, E4]))));
    expect(loadProgress(storage).melodies['w1-01']).toEqual(tune([C4, E4]));
  });

  test('a bare-array entry (an old save) loads, and replays at the fixed step', () => {
    const entry = loadProgress(seeded({ unlocked: 1, best: { 'w1-01': 3 }, melodies: { 'w1-01': [C4, E4, C4] } })).melodies['w1-01'];
    expect(entry).toEqual({ notes: [C4, E4, C4], times: [] });
    const at = replaySchedule(entry, false).map((s) => s.at);
    expect(at[1] - at[0]).toBeCloseTo(MELODY_STEP_SECONDS, 9);
    expect(at[2] - at[1]).toBeCloseTo(MELODY_STEP_SECONDS, 9);
  });

  test('bad times are dropped while the rest of the save stays', () => {
    const save = {
      unlocked: 2,
      best: { 'w1-01': 3, 'w1-02': 2 },
      streak: { lastDay: '2026-11-01', count: 4 },
      melodies: {
        'w1-01': { notes: [C4, E4], times: [0.5] },
        'w1-02': { notes: [C4, E4], times: [0.9, 0.4] },
        'w1-03': { notes: [E4], times: 'soon' },
        'w1-04': { notes: [C4], times: [0.2] },
      },
    };
    const loaded = loadProgress(seeded(save));
    expect(loaded.best).toEqual(save.best);
    expect(loaded.streak).toEqual(save.streak);
    expect(loaded.melodies).toEqual({
      'w1-01': { notes: [C4, E4], times: [] },
      'w1-02': { notes: [C4, E4], times: [] },
      'w1-03': { notes: [E4], times: [] },
      'w1-04': { notes: [C4], times: [0.2] },
    });
  });
});

describe('load/save', () => {
  // Restores the console.warn spy below even when one of its assertions fails.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('round-trips through storage', () => {
    const storage = memoryStorage();
    const p = recordCompletion(INITIAL_PROGRESS, solve('w1-01', 0, 3));
    saveProgress(storage, p);
    expect(loadProgress(storage)).toEqual(p);
  });

  test('falls back to initial progress on corrupt data', () => {
    const storage = memoryStorage();
    storage.setItem('threadbound.progress.v1', '{not json');
    expect(loadProgress(storage)).toEqual(INITIAL_PROGRESS);
  });

  test('falls back on schema-invalid data', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const storage = memoryStorage();
    storage.setItem('threadbound.progress.v1', JSON.stringify({ unlocked: -4, best: 'x' }));
    expect(loadProgress(storage)).toEqual(INITIAL_PROGRESS);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('saved progress');
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
    const p = recordDaily(INITIAL_PROGRESS, 3, '2026-11-01');
    expect(p.streak).toEqual({ lastDay: '2026-11-01', count: 1 });
    expect(dailyStarsOn(p, '2026-11-01')).toBe(3);
    expect(p.best).toEqual({});
    expect(p.unlocked).toBe(0);
  });

  test('the next day grows it', () => {
    const p = recordDaily(recordDaily(INITIAL_PROGRESS, 2, '2026-11-01'), 1, '2026-11-02');
    expect(p.streak.count).toBe(2);
  });

  test("a daily's stars belong to its day: a better retry counts, a later day starts unlit", () => {
    const day1 = recordDaily(recordDaily(INITIAL_PROGRESS, 1, '2026-11-01'), 3, '2026-11-01');
    expect(dailyStarsOn(day1, '2026-11-01')).toBe(3);
    expect(dailyStarsOn(recordDaily(day1, 1, '2026-11-01'), '2026-11-01')).toBe(3);
    expect(dailyStarsOn(day1, '2026-11-08')).toBe(0);
  });

  test('saves from before the daily puzzle still load, with no streak', () => {
    const storage = memoryStorage();
    storage.setItem('threadbound.progress.v1', JSON.stringify({ unlocked: 3, best: { 'w1-01': 3 } }));
    expect(loadProgress(storage)).toEqual({
      unlocked: 3,
      best: { 'w1-01': 3 },
      streak: { lastDay: null, count: 0 },
      dailyBest: { day: null, stars: 0 },
      melodies: {},
    });
  });
});
