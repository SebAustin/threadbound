import { describe, expect, test } from 'vitest';
import { LEVELS } from '../../src/levels';
import {
  hudModel,
  LEDGE_HINT_MAX_CHARS,
  NO_TABLE_HINT,
  REFUSAL_HINTS,
  playAllLabel,
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

  test('the melody book play-all reads "Play all (N)", or "Stop" while it plays', () => {
    expect(playAllLabel(2, false)).toBe('Play all (2)');
    expect(playAllLabel(2, true)).toBe('Stop');
  });

  test('the widest play-all fits the placeholder the face was sized with (Play all (24), ticket 12)', () => {
    expect(playAllLabel(LEVELS.length, false)).toBe('Play all (24)');
    for (let n = 1; n <= LEVELS.length; n++) expect(playAllLabel(n, false).length).toBeLessThanOrEqual('Play all (24)'.length);
    expect(playAllLabel(LEVELS.length, true).length).toBeLessThanOrEqual('Play all (24)'.length);
  });
});

describe('hint line: refusals are shown, not only heard', () => {
  test('a refused thread says why, ahead of any onboarding hint', () => {
    expect(hudModel({ ...base, hint: 'Pinch a peg', refusal: 'spool' }).hint).toBe('Not enough spool for that thread');
    expect(hudModel({ ...base, refusal: 'limit' }).hint).toBe('No threads left - pinch one to snip it');
    expect(hudModel({ ...base, refusal: 'duplicate' }).hint).toBe('Those pegs are already joined');
  });

  test('letting go on the same peg is a cancel, not a refusal', () => {
    expect(hudModel({ ...base, refusal: 'same-peg' }).hint).toBe('');
  });

  test('a daily says how to get back to the campaign: ledge buttons are pressed', () => {
    expect(hudModel({ ...base, daily: { streak: 2 } }).hint).toBe('Press the sun to return');
  });

  test('the thread limit says how to snip (Q46: snipping is not taught until w1-05), within the ledge hint length', () => {
    const limit = hudModel({ ...base, refusal: 'limit' }).hint;
    expect(limit).toBe('No threads left - pinch one to snip it');
    expect(limit.length).toBeLessThanOrEqual(LEDGE_HINT_MAX_CHARS);
  });
});

describe('hint line: teaching each new mechanic, and an ending', () => {
  test("a level that introduces a mechanic says so in one line", () => {
    expect(hudModel({ ...base, levelHint: 'Pinch a thread to snip it' }).hint).toBe('Pinch a thread to snip it');
  });

  test('onboarding and refusals still come first', () => {
    expect(hudModel({ ...base, hint: 'Pinch a peg', levelHint: 'x' }).hint).toBe('Pinch a peg');
    expect(hudModel({ ...base, refusal: 'limit', levelHint: 'x' }).hint).toBe('No threads left - pinch one to snip it');
  });

  test('solving the last level ends the campaign and points to the daily', () => {
    const campaign = Array.from({ length: 24 }, () => ({ world: 4 }));
    expect(hudModel({ ...base, levels: campaign, levelIndex: 23, campaignComplete: true }).hint).toBe(
      'All 24 solved - press the sun for a daily',
    );
  });

  test('a finished campaign shows the ending on any campaign level, not only the last', () => {
    const campaign = Array.from({ length: 24 }, () => ({ world: 4 }));
    expect(hudModel({ ...base, levels: campaign, levelIndex: 5, campaignComplete: true }).hint).toBe(
      'All 24 solved - press the sun for a daily',
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
    expect(hudModel({ ...base, noTable: true, refusal: 'limit' }).hint).toBe('No threads left - pinch one to snip it');
    expect(hudModel({ ...base, noTable: true, hint: 'Pinch a peg' }).hint).toBe('Pinch a peg');
    expect(hudModel({ ...base, noTable: true, levelHint: 'Pinch a thread to snip it' }).hint).toBe('Pinch a thread to snip it');
  });

  test('ranks above the ending and the daily line', () => {
    expect(hudModel({ ...base, noTable: true, levels: campaign, levelIndex: 23, campaignComplete: true }).hint).toBe(NO_TABLE_HINT);
    expect(hudModel({ ...base, noTable: true, daily: { streak: 2 } }).hint).toBe(NO_TABLE_HINT);
  });
});

const MISSED = 'Missed - pinch a thread to snip it, or restart';
const SKIP_POINTER = 'Stuck? Skip is on the settings face';
const FIRST_SOLVE = 'Pinch the stars to hear it again';
/** A drop that ended unsolved, with a thread still on the diorama. */
const missed = { lastDropMissed: true, hasThread: true };

describe('hint line: a missed drop says what to try next', () => {
  test('after an unsolved drop with a thread on the diorama, the ledge says to snip or restart', () => {
    expect(hudModel({ ...base, ...missed }).hint).toBe(MISSED);
  });

  test('the missed line needs a thread on the diorama: with none, onboarding shows', () => {
    const pinch = onboardingHint('pinch-pull');
    expect(hudModel({ ...base, lastDropMissed: true, hasThread: false, hint: pinch }).hint).toBe(pinch);
    expect(hudModel({ ...base, lastDropMissed: true, hasThread: false }).hint).toBe('');
  });

  test('a thread alone, with no missed drop, says nothing', () => {
    expect(hudModel({ ...base, hasThread: true }).hint).toBe('');
  });

  test('with the skip offered, the missed slot points to the settings face instead', () => {
    expect(hudModel({ ...base, ...missed, skipOffered: true }).hint).toBe(SKIP_POINTER);
  });

  test('the skip pointer needs a thread too: with none, onboarding still shows', () => {
    const pinch = onboardingHint('pinch-pull');
    expect(hudModel({ ...base, lastDropMissed: true, hasThread: false, skipOffered: true, hint: pinch }).hint).toBe(pinch);
  });

  test('the skip offer alone, with no missed drop, points nowhere', () => {
    expect(hudModel({ ...base, hasThread: true, skipOffered: true }).hint).toBe('');
  });
});

describe('hint line: return-visit signposts', () => {
  test('a first solve whose tune is in the book says how to hear it again', () => {
    expect(hudModel({ ...base, solved: true, firstSolve: true }).hint).toBe(FIRST_SOLVE);
    expect(hudModel({ ...base, solved: true }).hint).toBe('');
  });

  test("a returning player hears that today's daily is ready, with the streak", () => {
    expect(hudModel({ ...base, dailyReady: { streak: 2 } }).hint).toBe("Today's daily is ready - streak 2");
  });

  test("at streak 0 it says only that today's daily is ready", () => {
    expect(hudModel({ ...base, dailyReady: { streak: 0 } }).hint).toBe("Today's daily is ready");
  });

  test('never inside a daily: there the ledge says how to get back', () => {
    expect(hudModel({ ...base, daily: { streak: 2 }, dailyReady: { streak: 2 } }).hint).toBe('Press the sun to return');
  });
});

/**
 * The whole order (ticket 14): refusal, missed drop, onboarding, level hint, no table, ending,
 * first-solve stars, daily ready, then the daily's way back. One case per adjacent pair.
 */
describe('hint line: the priority order, one case per adjacent pair', () => {
  const campaign = Array.from({ length: 24 }, () => ({ world: 4 }));
  const ending = { levels: campaign, levelIndex: 23, campaignComplete: true };

  test('a refusal outranks the missed drop', () => {
    expect(hudModel({ ...base, ...missed, refusal: 'duplicate' }).hint).toBe('Those pegs are already joined');
  });

  test('the missed drop outranks onboarding (level 1 stops saying "Now pinch the chute" after a wrong thread)', () => {
    expect(hudModel({ ...base, ...missed, hint: onboardingHint('drop') }).hint).toBe(MISSED);
  });

  test('onboarding outranks the level hint', () => {
    expect(hudModel({ ...base, hint: 'Pinch a peg', levelHint: 'Pinch a thread to snip it' }).hint).toBe('Pinch a peg');
  });

  test('the level hint outranks no table', () => {
    expect(hudModel({ ...base, levelHint: 'Pinch a thread to snip it', noTable: true }).hint).toBe('Pinch a thread to snip it');
  });

  test('no table outranks the ending', () => {
    expect(hudModel({ ...base, ...ending, noTable: true }).hint).toBe(NO_TABLE_HINT);
  });

  test('the ending outranks the first-solve stars', () => {
    expect(hudModel({ ...base, ...ending, solved: true, firstSolve: true }).hint).toBe('All 24 solved - press the sun for a daily');
  });

  test('the first-solve stars outrank daily ready', () => {
    expect(hudModel({ ...base, solved: true, firstSolve: true, dailyReady: { streak: 2 } }).hint).toBe(FIRST_SOLVE);
  });

  test("daily ready never shows inside a daily, where the daily's way back does", () => {
    expect(hudModel({ ...base, dailyReady: { streak: 3 }, daily: { streak: 3 } }).hint).toBe('Press the sun to return');
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
    ['the missed line', hudModel({ ...base, ...missed }).hint],
    ['the skip pointer', hudModel({ ...base, ...missed, skipOffered: true }).hint],
    ['the first-solve line', hudModel({ ...base, solved: true, firstSolve: true }).hint],
    ['daily ready at streak 999', hudModel({ ...base, dailyReady: { streak: 999 } }).hint],
    ['daily ready at streak 0', hudModel({ ...base, dailyReady: { streak: 0 } }).hint],
  ];

  test('the new lines are the lengths the ticket measured (missed 46, skip pointer 35, daily ready 35, ending 41)', () => {
    expect(MISSED.length).toBe(46);
    expect(SKIP_POINTER.length).toBe(35);
    expect(hudModel({ ...base, dailyReady: { streak: 999 } }).hint.length).toBe(35);
    expect(hudModel({ ...base, levels: campaign, levelIndex: 23, campaignComplete: true }).hint.length).toBe(41);
    // Each new line is really produced here, so the length checks below aren't checking ''.
    for (const [name, hint] of hints.slice(-5)) expect(hint.length, name).toBeGreaterThan(0);
  });

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
