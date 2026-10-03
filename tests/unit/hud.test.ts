import { describe, expect, test } from 'vitest';
import { hudModel, settingsModel } from '../../src/lib/hud';

const levels = [{ world: 1 }, { world: 1 }, { world: 2 }, { world: 2 }, { world: 2 }];
const base = {
  levels,
  levelIndex: 3,
  title: 'Over and Under',
  threadsUsed: 1,
  maxThreads: 3,
  par: 2,
  bestStars: 0,
  solved: false,
  hint: '',
};

describe('hudModel: what the diorama plaque says', () => {
  test('names the level and its place within its world (ASCII only)', () => {
    const hud = hudModel(base);
    expect(hud.title).toBe('Over and Under');
    expect(hud.worldLabel).toBe('World 2 - 2/3');
  });

  test('shows the thread budget against par', () => {
    expect(hudModel(base).threadsLabel).toBe('Threads 1/3 - par 2');
  });

  test('lights one chip per best star', () => {
    expect(hudModel({ ...base, bestStars: 2 }).stars).toEqual([true, true, false]);
    expect(hudModel(base).stars).toEqual([false, false, false]);
  });

  test('carries the onboarding hint, if any', () => {
    expect(hudModel(base).hint).toBe('');
    expect(hudModel({ ...base, hint: 'Pinch the chute' }).hint).toBe('Pinch the chute');
  });

  test('World 4 levels show the spool left, in whole centimetres', () => {
    expect(hudModel({ ...base, spool: { used: 0.123, total: 0.3 } }).spoolLabel).toBe('Spool 18/30 cm');
    expect(hudModel(base).spoolLabel).toBe('');
  });

  test('a solved level says so', () => {
    expect(hudModel(base).status).toBe('playing');
    expect(hudModel({ ...base, solved: true }).status).toBe('solved');
  });
});

describe('settingsModel: the plaque settings face', () => {
  test('labels each toggle with its current state (ASCII)', () => {
    expect(settingsModel({ slowMotion: false, offset: { up: 0, near: 0 } }).slowLabel).toBe('Slow-mo: Off');
    expect(settingsModel({ slowMotion: true, offset: { up: 0, near: 0 } }).slowLabel).toBe('Slow-mo: On');
  });

  test('shows where the diorama has been moved, in signed steps', () => {
    expect(settingsModel({ slowMotion: false, offset: { up: 2, near: -1 } }).offsetLabel).toBe('Height +2   Distance -1');
    expect(settingsModel({ slowMotion: false, offset: { up: 0, near: 0 } }).offsetLabel).toBe('Height 0   Distance 0');
  });
});
