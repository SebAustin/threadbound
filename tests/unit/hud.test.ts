import { describe, expect, test } from 'vitest';
import { LEVELS } from '../../src/levels';
import {
  hudModel,
  LEDGE_HINT_MAX_CHARS,
  NO_TABLE_HINT,
  REFUSAL_HINTS,
  settingsModel,
  STAR_STAGGER_SECONDS,
  starsLabel,
  starsShown,
  SKIP_LABEL,
} from '../../src/lib/hud';
import { onboardingHint, type OnboardingStep } from '../../src/lib/onboarding';

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

  test('shows the threads placed against the thread limit, and par', () => {
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

  test('a daily puzzle shows the streak instead of its place in a world', () => {
    expect(hudModel({ ...base, daily: { streak: 4 } }).worldLabel).toBe('Daily - streak 4');
    expect(hudModel({ ...base, daily: { streak: 0 } }).worldLabel).toBe('Daily puzzle');
  });

  test('a solved level says so', () => {
    expect(hudModel(base).status).toBe('playing');
    expect(hudModel({ ...base, solved: true }).status).toBe('solved');
  });
});

describe('settingsModel: the plaque settings face', () => {
  test('labels each toggle with its current state (ASCII)', () => {
    expect(settingsModel({ slowMotion: false, highContrast: false, offset: { up: 0, near: 0 } }).slowLabel).toBe('Slow-mo: Off');
    expect(settingsModel({ slowMotion: true, highContrast: false, offset: { up: 0, near: 0 } }).slowLabel).toBe('Slow-mo: On');
  });

  test('labels the high-contrast toggle Off or On (ticket 15)', () => {
    expect(settingsModel({ slowMotion: false, highContrast: false, offset: { up: 0, near: 0 } }).contrastLabel).toBe('High contrast: Off');
    expect(settingsModel({ slowMotion: false, highContrast: true, offset: { up: 0, near: 0 } }).contrastLabel).toBe('High contrast: On');
  });

  test('shows where the diorama has been moved, in signed steps', () => {
    expect(settingsModel({ slowMotion: false, highContrast: false, offset: { up: 2, near: -1 } }).offsetLabel).toBe('Height +2   Distance -1');
    expect(settingsModel({ slowMotion: false, highContrast: false, offset: { up: 0, near: 0 } }).offsetLabel).toBe('Height 0   Distance 0');
  });

  test('the star total reads earned out of possible (ASCII)', () => {
    expect(starsLabel(14, 72)).toBe('Stars 14/72');
    expect(starsLabel(0, 72)).toBe('Stars 0/72');
  });

  test('the skip offer reads "Skip level", which fits its placeholder', () => {
    expect(SKIP_LABEL).toBe('Skip level');
  });

  test('the widest star total fits the placeholder the face was sized with (Stars 72/72)', () => {
    expect(starsLabel(72, 72).length).toBeLessThanOrEqual('Stars 72/72'.length);
  });
});

describe('hint line: refusals are shown, not only heard', () => {
  test('a refused thread says why, ahead of any onboarding hint', () => {
    expect(hudModel({ ...base, hint: 'Pinch a peg', refusal: 'spool' }).hint).toBe('Not enough spool for that thread');
    expect(hudModel({ ...base, refusal: 'limit' }).hint).toBe('No threads left - snip one first');
    expect(hudModel({ ...base, refusal: 'duplicate' }).hint).toBe('Those pegs are already joined');
  });

  test('letting go on the same peg is a cancel, not a refusal', () => {
    expect(hudModel({ ...base, refusal: 'same-peg' }).hint).toBe('');
  });

  test('a daily says how to get back to the campaign', () => {
    expect(hudModel({ ...base, daily: { streak: 2 } }).hint).toBe('Poke the sun to return');
  });
});

describe('hint line: teaching each new mechanic, and an ending', () => {
  test("a level that introduces a mechanic says so in one line", () => {
    expect(hudModel({ ...base, levelHint: 'Pinch a thread to snip it' }).hint).toBe('Pinch a thread to snip it');
  });

  test('onboarding and refusals still come first', () => {
    expect(hudModel({ ...base, hint: 'Pinch a peg', levelHint: 'x' }).hint).toBe('Pinch a peg');
    expect(hudModel({ ...base, refusal: 'limit', levelHint: 'x' }).hint).toBe('No threads left - snip one first');
  });

  test('solving the last level ends the campaign and points to the daily', () => {
    const campaign = Array.from({ length: 24 }, () => ({ world: 4 }));
    expect(hudModel({ ...base, levels: campaign, levelIndex: 23, campaignComplete: true }).hint).toBe(
      'All 24 solved - poke the sun for a daily',
    );
  });

  test('a finished campaign shows the ending on any campaign level, not only the last', () => {
    const campaign = Array.from({ length: 24 }, () => ({ world: 4 }));
    expect(hudModel({ ...base, levels: campaign, levelIndex: 5, campaignComplete: true }).hint).toBe(
      'All 24 solved - poke the sun for a daily',
    );
    expect(hudModel({ ...base, levels: campaign, levelIndex: 5 }).hint).toBe('');
  });
});

describe('hint line: no table found in passthrough', () => {
  const campaign = Array.from({ length: 24 }, () => ({ world: 4 }));

  test('a floating diorama asks for Space Setup', () => {
    expect(NO_TABLE_HINT).toBe('No table found - run Space Setup');
    expect(hudModel({ ...base, noTable: true }).hint).toBe(NO_TABLE_HINT);
    expect(hudModel(base).hint).toBe('');
  });

  test('ranks below the refusal, onboarding and level hints', () => {
    expect(hudModel({ ...base, noTable: true, refusal: 'limit' }).hint).toBe('No threads left - snip one first');
    expect(hudModel({ ...base, noTable: true, hint: 'Pinch a peg' }).hint).toBe('Pinch a peg');
    expect(hudModel({ ...base, noTable: true, levelHint: 'Pinch a thread to snip it' }).hint).toBe('Pinch a thread to snip it');
  });

  test('ranks above the ending and the daily line', () => {
    expect(hudModel({ ...base, noTable: true, levels: campaign, levelIndex: 23, campaignComplete: true }).hint).toBe(NO_TABLE_HINT);
    expect(hudModel({ ...base, noTable: true, daily: { streak: 2 } }).hint).toBe(NO_TABLE_HINT);
  });
});

describe('hint line: every hint fits the ledge strip', () => {
  const STEPS: readonly OnboardingStep[] = ['pinch-pull', 'drop', 'watch', 'done'];
  const campaign = LEVELS.map((l) => ({ world: l.world }));
  const hints: readonly [string, string][] = [
    ...Object.entries(REFUSAL_HINTS).map(([reason, hint]): [string, string] => [`refusal ${reason}`, hint]),
    ...STEPS.map((step): [string, string] => [`onboarding ${step}`, onboardingHint(step)]),
    ...LEVELS.filter((l) => l.hint).map((l): [string, string] => [`level ${l.id}`, l.hint ?? '']),
    ['the ending', hudModel({ ...base, levels: campaign, levelIndex: campaign.length - 1, campaignComplete: true }).hint],
    ['the daily line', hudModel({ ...base, daily: { streak: 999 } }).hint],
    ['the no-table line', hudModel({ ...base, noTable: true }).hint],
  ];

  test.each(hints)('%s is at most LEDGE_HINT_MAX_CHARS (48) characters, in plain ASCII', (_name, hint) => {
    expect(LEDGE_HINT_MAX_CHARS).toBe(48);
    expect(hint.length).toBeLessThanOrEqual(LEDGE_HINT_MAX_CHARS);
    expect(hint).toMatch(/^[\x20-\x7E]*$/);
  });
});

describe('starsShown: after a fresh solve the stars refill one by one', () => {
  const step = STAR_STAGGER_SECONDS;

  test('the stagger is about a quarter of a second', () => {
    expect(step).toBeGreaterThanOrEqual(0.2);
    expect(step).toBeLessThanOrEqual(0.3);
  });

  test('starts empty, then adds one star per stagger step', () => {
    expect(starsShown(3, 0)).toBe(0);
    expect(starsShown(3, step * 0.99)).toBe(0);
    expect(starsShown(3, step * 1.01)).toBe(1);
    expect(starsShown(3, step * 2.01)).toBe(2);
    expect(starsShown(3, step * 3.01)).toBe(3);
  });

  test('never shows more than the best', () => {
    expect(starsShown(1, step * 10)).toBe(1);
    expect(starsShown(2, step * 2.5)).toBe(2);
    expect(starsShown(0, step * 5)).toBe(0);
  });

  test('shows the best at once when there is no fresh solve', () => {
    for (const best of [0, 1, 2, 3]) expect(starsShown(best, null)).toBe(best);
  });
});
