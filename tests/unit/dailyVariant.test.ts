import { describe, expect, test } from 'vitest';
import { parseLevel, solutionLength } from '../../src/lib/levelSchema';
import { dailyVariant } from '../../src/lib/dailyVariant';
import { DAILY_LEVELS, LEVELS } from '../../src/levels';

const relay = LEVELS.find((l) => l.id === 'w1-04')!;

describe('dailyVariant: a campaign level replayed on a tight spool', () => {
  test('keeps the board and its solution, under its own id and the name it is given', () => {
    const daily = dailyVariant(relay, 'Pass It On');
    // The id stays daily-<base>, so saves and dailies.sh don't change.
    expect(daily.id).toBe('daily-w1-04');
    expect(daily.name).toBe('Pass It On');
    expect(daily.pegs).toEqual(relay.pegs);
    expect(daily.solution).toEqual(relay.solution);
  });

  test('the spool barely covers the stored solution (whole centimetres, at least 1 cm spare)', () => {
    const daily = dailyVariant(relay, 'Pass It On');
    const need = solutionLength(relay);
    expect(daily.spool).toBeGreaterThanOrEqual(need + 0.01 - 1e-9);
    expect(daily.spool).toBeLessThanOrEqual(need * 1.05 + 0.02);
    expect(Math.round(daily.spool! * 100)).toBeCloseTo(daily.spool! * 100);
  });

  test('every daily level is a valid level whose solution fits its spool', () => {
    expect(DAILY_LEVELS).toHaveLength(7);
    for (const level of DAILY_LEVELS) expect(parseLevel(level).ok).toBe(true);
    expect(new Set(DAILY_LEVELS.map((l) => l.id)).size).toBe(7);
  });
});

describe("the daily's own names (CONTEXT.md Daily)", () => {
  const names = DAILY_LEVELS.map((l) => l.name);
  const campaign = new Set(LEVELS.map((l) => l.name.toLowerCase()));

  test('are unique', () => {
    expect(new Set(names).size).toBe(names.length);
  });

  test('are plain ASCII, at most 14 characters (as long as "Over and Under", one plaque line)', () => {
    for (const name of names) {
      expect(name, name).toMatch(/^[\x20-\x7E]+$/);
      expect(name.length, name).toBeLessThanOrEqual('Over and Under'.length);
    }
  });

  test('are never a campaign name', () => {
    for (const name of names) expect(campaign.has(name.toLowerCase()), name).toBe(false);
  });

  test('never say "challenge" (the Daily _Avoid_ list)', () => {
    for (const name of names) expect(name.toLowerCase(), name).not.toContain('challenge');
  });
});
