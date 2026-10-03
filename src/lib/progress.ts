import { z } from 'zod';
import { nextStreak, NO_STREAK } from './daily';
import { loadJson, saveJson, type StorageLike } from './storage';

const STORAGE_KEY = 'threadbound.progress.v1';

const ProgressSchema = z.object({
  /** Highest level index the player may open. */
  unlocked: z.number().int().min(0),
  /** Best stars per level id (daily puzzles under their own 'daily-' ids). */
  best: z.record(z.string(), z.number().int().min(1).max(3)),
  /** Consecutive local days with a daily solve. Saves from before dailies load with none. */
  streak: z
    .object({ lastDay: z.string().nullable(), count: z.number().int().min(0) })
    .default({ lastDay: null, count: 0 }),
});

export type Progress = Readonly<z.infer<typeof ProgressSchema>>;

export const INITIAL_PROGRESS: Progress = Object.freeze({ unlocked: 0, best: Object.freeze({}), streak: NO_STREAK });

export function recordCompletion(
  progress: Progress,
  levelId: string,
  levelIndex: number,
  stars: number,
  levelCount: number,
): Progress {
  const previous = progress.best[levelId] ?? 0;
  return {
    ...progress,
    unlocked: Math.max(progress.unlocked, Math.min(levelIndex + 1, levelCount - 1)),
    best: { ...progress.best, [levelId]: Math.max(previous, stars) },
  };
}

/** A daily solve on local day `today`: best stars kept apart from the campaign, streak advanced. */
export function recordDaily(progress: Progress, levelId: string, stars: number, today: string): Progress {
  const previous = progress.best[levelId] ?? 0;
  return {
    ...progress,
    best: { ...progress.best, [levelId]: Math.max(previous, stars) },
    streak: nextStreak(progress.streak, today),
  };
}

export function loadProgress(storage: StorageLike): Progress {
  return loadJson(storage, STORAGE_KEY, ProgressSchema, INITIAL_PROGRESS, 'progress');
}

export function saveProgress(storage: StorageLike, progress: Progress): void {
  saveJson(storage, STORAGE_KEY, progress, 'progress');
}
