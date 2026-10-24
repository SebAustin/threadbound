import { z } from 'zod';
import type { DioramaOffset } from './placement';
import { loadJson, saveJson, type StorageLike } from './storage';

const SETTINGS_KEY = 'threadbound.settings.v1';

/**
 * Comfortable adjustment range, in steps (see OFFSET_STEP). Nearer stops at +2:
 * one step more puts the diorama past a 70-degree view (tests/unit/viewExtent.test.ts).
 */
export const OFFSET_LIMITS = { up: [-6, 6], near: [-2, 2] } as const;

type Limits = readonly [number, number];

/** A whole number of steps within `limits`; anything else is refused. */
const strictAxis = ([min, max]: Limits) => z.number().int().min(min).max(max);

/**
 * A saved number of steps, clamped to `limits`: Nearer once reached +3, and a
 * refused save falls back whole (storage.ts), which would lose slow motion too.
 */
const savedAxis = ([min, max]: Limits) =>
  z
    .number()
    .int()
    .transform((steps) => Math.min(max, Math.max(min, steps)));

/** The settings shape; `limit` decides what an offset outside the range does. */
const settingsSchema = (limit: (limits: Limits) => z.ZodType<number>) =>
  z.object({
    /** Marbles fall and release more slowly; every solution stays valid. */
    slowMotion: z.boolean(),
    /** Player adjustment of the diorama's height and distance, in whole steps. */
    offset: z
      .object({ up: limit(OFFSET_LIMITS.up), near: limit(OFFSET_LIMITS.near) })
      // Settings saved before offsets existed still load (keeping their other choices).
      .default({ up: 0, near: 0 }),
  });

/** What a settings change must satisfy: an out-of-range offset is refused. */
const SettingsSchema = settingsSchema(strictAxis);
/** What a save must satisfy: an out-of-range offset loads clamped. */
const SavedSettingsSchema = settingsSchema(savedAxis);

export type Settings = Readonly<z.infer<typeof SettingsSchema>>;

export const DEFAULT_SETTINGS: Settings = Object.freeze({ slowMotion: false, offset: Object.freeze({ up: 0, near: 0 }) });

/**
 * One step of the offset along `axis`, clamped to the comfortable range. At the
 * limit the same object comes back, so identity-based change checks see no move.
 */
export function stepOffset(offset: DioramaOffset, axis: keyof DioramaOffset, direction: 1 | -1): DioramaOffset {
  const [min, max] = OFFSET_LIMITS[axis];
  const value = Math.min(max, Math.max(min, offset[axis] + direction));
  return value === offset[axis] ? offset : { ...offset, [axis]: value };
}

/**
 * `settings` with `patch` applied, or `settings` unchanged if the result would be
 * invalid. Returns the merge rather than the parse result: zod clones, and callers
 * compare the untouched parts (the offset) by identity.
 */
export function applySettingsPatch(settings: Settings, patch: Partial<Settings>): Settings {
  const merged = { ...settings, ...patch };
  return SettingsSchema.safeParse(merged).success ? merged : settings;
}

export function loadSettings(storage: StorageLike): Settings {
  return loadJson(storage, SETTINGS_KEY, SavedSettingsSchema, DEFAULT_SETTINGS, 'settings');
}

export function saveSettings(storage: StorageLike, settings: Settings): void {
  saveJson(storage, SETTINGS_KEY, settings, 'settings');
}

/** Simulation speed in slow motion: everything takes 1.5x as long. */
const SLOW_TIME_SCALE = 2 / 3;

/**
 * Slow motion dilates time rather than changing physics: the simulation steps
 * through exactly the same fixed-step sequence, just slower, so every solution
 * plays out identically. (Scaling gravity does not: the solver's low-speed
 * contact handling uses absolute thresholds.)
 */
export function timeScale(slowMotion: boolean): number {
  return slowMotion ? SLOW_TIME_SCALE : 1;
}
