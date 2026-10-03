import { z } from 'zod';
import { loadJson, saveJson, type StorageLike } from './storage';

const SETTINGS_KEY = 'threadbound.settings.v1';

const SettingsSchema = z.object({
  /** Marbles fall and release more slowly; every solution stays valid. */
  slowMotion: z.boolean(),
});

export type Settings = Readonly<z.infer<typeof SettingsSchema>>;

export const DEFAULT_SETTINGS: Settings = Object.freeze({ slowMotion: false });

export function loadSettings(storage: StorageLike): Settings {
  return loadJson(storage, SETTINGS_KEY, SettingsSchema, DEFAULT_SETTINGS, 'settings');
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
