import type { z } from 'zod';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Never throws: private browsing, blocked site data, corrupt or outdated JSON
 * all just mean "use the fallback". `what` names the data in warnings.
 */
export function loadJson<T>(storage: StorageLike, key: string, schema: z.ZodType<T>, fallback: T, what: string): T {
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback;
  } catch (error) {
    console.warn(`[Threadbound] could not read saved ${what}`, error);
    return fallback;
  }
}

export function saveJson(storage: StorageLike, key: string, value: unknown, what: string): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`[Threadbound] could not save ${what}`, error);
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
