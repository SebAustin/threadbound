import { z } from 'zod';
import { nextStreak, NO_STREAK } from './daily';
import { loadJson, saveJson, type StorageLike } from './storage';

const STORAGE_KEY = 'threadbound.progress.v1';

/** Longest melody kept per level; a busy drop would otherwise drone on when replayed. */
export const MELODY_NOTES_MAX = 16;

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
  /** Melody book: the notes each campaign level's best solve played (Hz). */
  melodies: z
    .record(z.string(), z.array(z.number().positive()).max(MELODY_NOTES_MAX))
    .default({}),
});

export type Progress = Readonly<z.infer<typeof ProgressSchema>>;

const NO_DAILY = Object.freeze({ day: null, stars: 0 });

export const INITIAL_PROGRESS: Progress = Object.freeze({
  unlocked: 0,
  best: Object.freeze({}),
  streak: NO_STREAK,
  dailyBest: NO_DAILY,
  melodies: Object.freeze({}),
});

/** A finished campaign level, as progress records it. */
export interface Solve {
  readonly levelId: string;
  readonly levelIndex: number;
  readonly stars: number;
  readonly levelCount: number;
  /** Notes the drop played, in order (Hz). */
  readonly melody: readonly number[];
}

export function recordCompletion(progress: Progress, solve: Solve): Progress {
  const previous = progress.best[solve.levelId] ?? 0;
  // The book keeps the tune of the best solve; ties take the newest.
  const melodies =
    solve.stars >= previous
      ? { ...progress.melodies, [solve.levelId]: solve.melody.slice(0, MELODY_NOTES_MAX) }
      : progress.melodies;
  return {
    ...progress,
    unlocked: Math.max(progress.unlocked, Math.min(solve.levelIndex + 1, solve.levelCount - 1)),
    best: { ...progress.best, [solve.levelId]: Math.max(previous, solve.stars) },
    melodies,
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
