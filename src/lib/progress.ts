import { z } from 'zod';
import { loadJson, saveJson, type StorageLike } from './storage';

const STORAGE_KEY = 'threadbound.progress.v1';

const ProgressSchema = z.object({
  /** Highest level index the player may open. */
  unlocked: z.number().int().min(0),
  /** Best stars per level id. */
  best: z.record(z.string(), z.number().int().min(1).max(3)),
});

export type Progress = Readonly<z.infer<typeof ProgressSchema>>;

export const INITIAL_PROGRESS: Progress = Object.freeze({ unlocked: 0, best: Object.freeze({}) });

export function recordCompletion(
  progress: Progress,
  levelId: string,
  levelIndex: number,
  stars: number,
  levelCount: number,
): Progress {
  const previous = progress.best[levelId] ?? 0;
  return {
    unlocked: Math.max(progress.unlocked, Math.min(levelIndex + 1, levelCount - 1)),
    best: { ...progress.best, [levelId]: Math.max(previous, stars) },
  };
}

export function loadProgress(storage: StorageLike): Progress {
  return loadJson(storage, STORAGE_KEY, ProgressSchema, INITIAL_PROGRESS, 'progress');
}

export function saveProgress(storage: StorageLike, progress: Progress): void {
  saveJson(storage, STORAGE_KEY, progress, 'progress');
}
