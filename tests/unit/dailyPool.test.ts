import { describe, expect, test } from 'vitest';
import { DAILY_LEVELS, LEVELS } from '../../src/levels';
import { dailyIndex, localDayKey } from '../../src/lib/daily';
import { dailyPick, levelMechanics, reachedMechanics, type Mechanic } from '../../src/lib/dailyPool';

const level = (id: string) => {
  const found = LEVELS.find((l) => l.id === id);
  if (!found) throw new Error(`no level ${id}`);
  return found;
};

/** Every campaign id up to and including `last`, solved with 3 stars. */
const solvedThrough = (last: string): Record<string, number> => {
  const end = LEVELS.findIndex((l) => l.id === last);
  return Object.fromEntries(LEVELS.slice(0, end + 1).map((l) => [l.id, 3]));
};

/** 28 consecutive local days from Oct 1, 2026. */
const DAYS = Array.from({ length: 28 }, (_, i) => localDayKey(new Date(2026, 9, 1 + i)));
const EVERYTHING: readonly Mechanic[] = ['snip', 'color', 'rail'];

describe('levelMechanics: what a board asks beyond pinch-pull and the chute', () => {
  test('Snip snips, Fork sorts colors, Slide slides (and snips its preset), Short Spool needs none', () => {
    expect(levelMechanics(level('w1-05'))).toEqual(['snip']);
    expect(levelMechanics(level('w2-01'))).toEqual(['color']);
    expect(levelMechanics(level('w3-01'))).toEqual(['snip', 'rail']);
    // The tight spool isn't gated: every daily has one, and its readout and refusal explain it.
    expect(levelMechanics(level('w4-01'))).toEqual([]);
  });
});

describe('reachedMechanics: the union over solved campaign levels', () => {
  test('nothing is reached on an empty save', () => {
    expect(reachedMechanics(LEVELS, {})).toEqual([]);
  });

  test('snip and color are reached after w1-01 to w2-01 (their teaching levels w1-05 and w2-01)', () => {
    expect(reachedMechanics(LEVELS, solvedThrough('w2-01'))).toEqual(['snip', 'color']);
  });

  test('a skipped teaching level stays unreached (skips earn no best)', () => {
    expect(reachedMechanics(LEVELS, solvedThrough('w1-04'))).toEqual([]);
  });

  test('everything is reached once the rail is (w3-01)', () => {
    expect(reachedMechanics(LEVELS, solvedThrough('w3-01'))).toEqual(EVERYTHING);
  });
});

describe('dailyPick: only boards whose mechanics the player has reached', () => {
  test('a fresh save picks only w1-02 or w1-04 on each of 28 days', () => {
    const picked = DAYS.map((day) => DAILY_LEVELS[dailyPick(day, DAILY_LEVELS, [])].id);
    for (const id of picked) expect(['daily-w1-02', 'daily-w1-04']).toContain(id);
    // Both turn up: the rotation still varies day to day.
    expect(new Set(picked).size).toBe(2);
  });

  test("with everything reached it equals dailyIndex(day, 7), so finished players keep today's rotation", () => {
    for (const day of DAYS) expect(dailyPick(day, DAILY_LEVELS, EVERYTHING)).toBe(dailyIndex(day, 7));
  });

  test('picks only eligible entries for a partly reached save', () => {
    const reached = reachedMechanics(LEVELS, solvedThrough('w2-01'));
    for (const day of DAYS) {
      const pick = DAILY_LEVELS[dailyPick(day, DAILY_LEVELS, reached)];
      expect(levelMechanics(pick).every((m) => reached.includes(m)), pick.id).toBe(true);
    }
  });

  test('a pool with nothing eligible falls back to the plain rotation rather than no daily', () => {
    const railsOnly = DAILY_LEVELS.filter((l) => levelMechanics(l).includes('rail'));
    for (const day of DAYS) expect(dailyPick(day, railsOnly, [])).toBe(dailyIndex(day, railsOnly.length));
  });

  test('at least two pool entries need no mechanic, so a new player always has a daily', () => {
    expect(DAILY_LEVELS.filter((l) => levelMechanics(l).length === 0).length).toBeGreaterThanOrEqual(2);
  });
});
