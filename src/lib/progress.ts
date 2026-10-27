import { z } from 'zod';
import { nextStreak, NO_STREAK } from './daily';
import { timesFit, type Melody } from './melody';
import { loadJson, saveJson, type StorageLike } from './storage';

const STORAGE_KEY = 'threadbound.progress.v1';

/** Longest melody kept per level; a busy drop would otherwise drone on when replayed. */
export const MELODY_NOTES_MAX = 16;

const MelodyNotes = z.array(z.number().positive()).max(MELODY_NOTES_MAX);

/** Keeps times only when they fit the notes, so bad times never cost a player their save. */
const timedMelody = (notes: number[], times: readonly number[] | undefined): { notes: number[]; times: number[] } => ({
  notes,
  times: timesFit(notes.length, times) ? [...times] : [],
});

/**
 * A melody-book entry: a bare array of notes (saves from before timing) or `{ notes, times }`.
 * Both load as `{ notes, times }`; times that don't fit are dropped and the notes kept.
 */
const MelodyEntry = z
  .union([
    MelodyNotes,
    z.object({ notes: MelodyNotes, times: z.array(z.number()).optional().catch(undefined) }),
  ])
  .transform((entry) => (Array.isArray(entry) ? timedMelody(entry, undefined) : timedMelody(entry.notes, entry.times)));

const ProgressSchema = z.object({
  /**
   * Highest campaign index reached. Informational only: resume goes by solved ids
   * (see lib/resume), because indices shift when levels are added to a world.
   */
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
  /** Melody book: the tune each campaign level's best solve played (Hz), with when each note sounded. */
  melodies: z.record(z.string(), MelodyEntry).default({}),
  /**
   * Campaign level ids moved on from without a solve (CONTEXT.md Skip): they earn no stars and
   * stay unsolved. Saves from before skips load with none.
   */
  skipped: z.array(z.string()).default([]),
});

export type Progress = Readonly<z.infer<typeof ProgressSchema>>;

const NO_DAILY = Object.freeze({ day: null, stars: 0 });

export const INITIAL_PROGRESS: Progress = Object.freeze({
  unlocked: 0,
  best: Object.freeze({}),
  streak: NO_STREAK,
  dailyBest: NO_DAILY,
  melodies: Object.freeze({}),
  skipped: [],
});

/** A finished campaign level, as progress records it. */
export interface Solve {
  readonly levelId: string;
  readonly levelIndex: number;
  readonly stars: number;
  readonly levelCount: number;
  /** The tune the drop played: notes in order (Hz) and their drop times. */
  readonly melody: Melody;
}

export function recordCompletion(progress: Progress, solve: Solve): Progress {
  const previous = progress.best[solve.levelId] ?? 0;
  // The book keeps the tune of the best solve; ties take the newest. A silent solve has no tune to keep.
  const { notes, times } = solve.melody;
  const keep = solve.stars >= previous && notes.length > 0;
  // Times are checked against every note the drop played, then trimmed with them.
  const fit = timesFit(notes.length, times);
  const entry = { notes: notes.slice(0, MELODY_NOTES_MAX), times: fit ? times.slice(0, MELODY_NOTES_MAX) : [] };
  const melodies = keep ? { ...progress.melodies, [solve.levelId]: entry } : progress.melodies;
  return {
    ...progress,
    unlocked: Math.max(progress.unlocked, Math.min(solve.levelIndex + 1, solve.levelCount - 1)),
    best: { ...progress.best, [solve.levelId]: Math.max(previous, solve.stars) },
    melodies,
    // A solved level is no longer skipped.
    skipped: progress.skipped.includes(solve.levelId)
      ? progress.skipped.filter((id) => id !== solve.levelId)
      : progress.skipped,
  };
}

/** A campaign level moved on from without a solve. */
export interface Skip {
  readonly levelId: string;
  readonly levelIndex: number;
  readonly levelCount: number;
}

/** Records a skip once and unlocks the next level; best stars and the melody book stay as they were. */
export function recordSkip(progress: Progress, skip: Skip): Progress {
  return {
    ...progress,
    unlocked: Math.max(progress.unlocked, Math.min(skip.levelIndex + 1, skip.levelCount - 1)),
    skipped: progress.skipped.includes(skip.levelId) ? progress.skipped : [...progress.skipped, skip.levelId],
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
