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
    if (parsed.success) return parsed.data;
    console.warn(`[Threadbound] saved ${what} did not match the current format; starting fresh`, parsed.error.issues);
    return fallback;
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

/**
 * Guest play: the page was opened with `?fresh=1` (only that value; `?fresh=0` or a
 * bare `?fresh` is ordinary play). For judges on a shared headset.
 */
export function isGuestPlay(search: string): boolean {
  return new URLSearchParams(search).get('fresh') === '1';
}

/** Guest play's one store for the page load, shared by progress and settings; made on first use. */
let guestStorage: StorageLike | null = null;

function guestPlayStorage(): StorageLike {
  if (!guestStorage) {
    guestStorage = memoryStorage();
    console.info('[Threadbound] guest play (?fresh=1): progress is neither read nor saved');
  }
  return guestStorage;
}

/**
 * Browser localStorage when accessible, otherwise an in-memory stand-in. In guest
 * play the saved progress and settings are never read or written: everything lives
 * in memory until the page closes.
 */
export function browserStorage(search: string = globalThis.location?.search ?? ''): StorageLike {
  if (isGuestPlay(search)) return guestPlayStorage();
  try {
    const storage = globalThis.localStorage;
    if (storage) return storage;
  } catch (error) {
    console.warn('[Threadbound] localStorage unavailable', error);
  }
  return memoryStorage();
}
