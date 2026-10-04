import { z } from 'zod';
import { nextStreak, NO_STREAK } from './daily';
import { loadJson, saveJson, type StorageLike } from './storage';

const STORAGE_KEY = 'threadbound.progress.v1';

const ProgressSchema = z.object({
  /** Highest level index the player may open. */
  unlocked: z.number().int().min(0),
  /** Best stars per campaign level id. */
  best: z.record(z.string(), z.number().int().min(1).max(3)),
  /** Consecutive local days with a daily solve. Saves from before dailies load with none. */
  streak: z
    .object({ lastDay: z.string().nullable(), count: z.number().int().min(0) })
    .default({ lastDay: null, count: 0 }),
  /** Stars of the most recent daily, valid only on its day (boards return weekly; stars must not). */
  dailyBest: z
    .object({ day: z.string().nullable(), stars: z.number().int().min(0).max(3) })
    .default({ day: null, stars: 0 }),
});

export type Progress = Readonly<z.infer<typeof ProgressSchema>>;

const NO_DAILY = Object.freeze({ day: null, stars: 0 });

export const INITIAL_PROGRESS: Progress = Object.freeze({
  unlocked: 0,
  best: Object.freeze({}),
  streak: NO_STREAK,
  dailyBest: NO_DAILY,
});

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

/** A solve of the daily for local day `day` (the day it was opened): streak advanced, stars kept for that day. */
export function recordDaily(progress: Progress, stars: number, day: string): Progress {
  const sameDay = progress.dailyBest.day === day;
  return {
    ...progress,
    streak: nextStreak(progress.streak, day),
    dailyBest: { day, stars: sameDay ? Math.max(progress.dailyBest.stars, stars) : stars },
  };
}

/** Stars earned on `day`'s daily, 0 if it wasn't solved that day. */
export function dailyStarsOn(progress: Progress, day: string): number {
  return progress.dailyBest.day === day ? progress.dailyBest.stars : 0;
}

export function loadProgress(storage: StorageLike): Progress {
  return loadJson(storage, STORAGE_KEY, ProgressSchema, INITIAL_PROGRESS, 'progress');
}

export function saveProgress(storage: StorageLike, progress: Progress): void {
  saveJson(storage, STORAGE_KEY, progress, 'progress');
}
