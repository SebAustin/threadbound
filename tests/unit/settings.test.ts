import { describe, expect, test } from 'vitest';
import { applySettingsPatch, DEFAULT_SETTINGS, loadSettings, saveSettings, stepOffset, timeScale } from '../../src/lib/settings';
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

describe('diorama offset', () => {
  test('defaults to no offset', () => {
    expect(DEFAULT_SETTINGS.offset).toEqual({ up: 0, near: 0 });
  });

  test('settings saved before offsets existed keep their slow motion choice', () => {
    const storage = memoryStorage();
    storage.setItem('threadbound.settings.v1', '{"slowMotion":true}');
    expect(loadSettings(storage)).toEqual({ slowMotion: true, offset: { up: 0, near: 0 } });
  });

  test('steps clamp to a comfortable range', () => {
    expect(stepOffset({ up: 6, near: 0 }, 'up', 1)).toEqual({ up: 6, near: 0 });
    expect(stepOffset({ up: -6, near: 0 }, 'up', -1)).toEqual({ up: -6, near: 0 });
    expect(stepOffset({ up: 0, near: 3 }, 'near', 1)).toEqual({ up: 0, near: 3 });
    expect(stepOffset({ up: 0, near: -2 }, 'near', -1)).toEqual({ up: 0, near: -2 });
    expect(stepOffset({ up: 0, near: 0 }, 'up', 1)).toEqual({ up: 1, near: 0 });
  });
});

describe('offset range and no-op steps', () => {
  test('height reaches 15 cm up or down, enough for a high or low table', () => {
    let offset = { up: 0, near: 0 };
    for (let i = 0; i < 6; i++) offset = stepOffset(offset, 'up', 1);
    expect(offset.up).toBe(6);
  });

  test('a step at the limit returns the very same offset, so nothing rebuilds', () => {
    const atTop = { up: 6, near: 0 };
    expect(stepOffset(atTop, 'up', 1)).toBe(atTop);
  });
});

describe('applySettingsPatch', () => {
  test('merges a valid patch', () => {
    expect(applySettingsPatch(DEFAULT_SETTINGS, { slowMotion: true })).toEqual({ ...DEFAULT_SETTINGS, slowMotion: true });
  });

  test('keeps untouched parts identical, so a slow-motion toggle never looks like a move', () => {
    expect(applySettingsPatch(DEFAULT_SETTINGS, { slowMotion: true }).offset).toBe(DEFAULT_SETTINGS.offset);
  });

  test('ignores a patch that would leave settings out of range', () => {
    expect(applySettingsPatch(DEFAULT_SETTINGS, { offset: { up: 40, near: 0 } })).toBe(DEFAULT_SETTINGS);
  });
});
