import { describe, expect, test } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, timeScale } from '../../src/lib/settings';
import { memoryStorage } from '../../src/lib/storage';

describe('settings', () => {
  test('a first launch gets the defaults: normal speed', () => {
    expect(loadSettings(memoryStorage())).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.slowMotion).toBe(false);
  });

  test('round-trip through storage', () => {
    const storage = memoryStorage();
    saveSettings(storage, { ...DEFAULT_SETTINGS, slowMotion: true });
    expect(loadSettings(storage).slowMotion).toBe(true);
  });

  test('unreadable settings fall back to the defaults', () => {
    const storage = memoryStorage();
    storage.setItem('threadbound.settings.v1', '{"slowMotion": "yes"}');
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('timeScale: slow motion is the same simulation, played slower', () => {
  test('normal speed runs in real time', () => {
    expect(timeScale(false)).toBe(1);
  });

  test('slow motion runs the simulation at two thirds speed', () => {
    expect(timeScale(true)).toBeCloseTo(2 / 3);
  });
});
