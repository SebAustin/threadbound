import { z } from 'zod';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

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

/** Never throws: private browsing or blocked site data just means no saved progress. */
export function loadProgress(storage: StorageLike): Progress {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_PROGRESS;
    const parsed = ProgressSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : INITIAL_PROGRESS;
  } catch (error) {
    console.warn('[Threadbound] could not read saved progress', error);
    return INITIAL_PROGRESS;
  }
}

export function saveProgress(storage: StorageLike, progress: Progress): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.warn('[Threadbound] could not save progress', error);
  }
}

export function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  };
}

/** Browser localStorage when accessible, otherwise an in-memory stand-in. */
export function browserStorage(): StorageLike {
  try {
    const storage = globalThis.localStorage;
    if (storage) return storage;
  } catch (error) {
    console.warn('[Threadbound] localStorage unavailable', error);
  }
  return memoryStorage();
}
