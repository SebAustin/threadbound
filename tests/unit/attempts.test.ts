import { describe, expect, test } from 'vitest';
import {
  afterBuild,
  dropEnded,
  dropStarted,
  NO_ATTEMPTS,
  skipOffered,
  type Attempts,
  type SkipContext,
} from '../../src/lib/attempts';

const at = (drops: number, missedDrops: number): Attempts => ({ drops, missedDrops });

describe('dropStarted: each pinch of the chute is a drop', () => {
  test('a drop counts, and a settled level adds no miss', () => {
    expect(dropStarted(NO_ATTEMPTS, { inFlight: false })).toEqual(at(1, 0));
    expect(dropStarted(at(2, 1), { inFlight: false })).toEqual(at(3, 1));
  });

  test('a drop still in flight when the chute is pinched again counts as missed', () => {
    expect(dropStarted(at(1, 0), { inFlight: true })).toEqual(at(2, 1));
  });

  test('never mutates its input', () => {
    const before = at(1, 1);
    dropStarted(before, { inFlight: true });
    expect(before).toEqual(at(1, 1));
  });
});

describe('dropEnded: a drop settles, solved or not', () => {
  test('an unsolved end adds a miss and keeps the drop count', () => {
    expect(dropEnded(at(1, 0), false)).toEqual(at(1, 1));
    expect(dropEnded(at(3, 2), false)).toEqual(at(3, 3));
  });

  test('a solve resets the run of misses and keeps the drop count', () => {
    expect(dropEnded(at(4, 3), true)).toEqual(at(4, 0));
  });
});

describe('afterBuild: what a rebuilt diorama keeps', () => {
  test('a different level resets both', () => {
    expect(afterBuild(at(3, 2), { relocated: false, sameLevel: false })).toEqual(NO_ATTEMPTS);
  });

  test('Restart (the same level, fresh) resets the drops and keeps the misses', () => {
    expect(afterBuild(at(3, 2), { relocated: false, sameLevel: true })).toEqual(at(0, 2));
  });

  test('a relocation keeps both', () => {
    expect(afterBuild(at(1, 2), { relocated: true, sameLevel: true })).toEqual(at(1, 2));
  });
});

describe('skipOffered: three misses in a row on a campaign level the player is stuck on', () => {
  const stuck: SkipContext = { daily: false, solved: false, skipped: false, last: false };

  test('not at two misses, yes at three and beyond', () => {
    expect(skipOffered(at(2, 2), stuck)).toBe(false);
    expect(skipOffered(at(3, 3), stuck)).toBe(true);
    expect(skipOffered(at(5, 4), stuck)).toBe(true);
  });

  test('never on a daily', () => {
    expect(skipOffered(at(3, 3), { ...stuck, daily: true })).toBe(false);
  });

  test('never on the last level (there is nothing to skip to)', () => {
    expect(skipOffered(at(3, 3), { ...stuck, last: true })).toBe(false);
  });

  test('never on a solved level or one already skipped', () => {
    expect(skipOffered(at(3, 3), { ...stuck, solved: true })).toBe(false);
    expect(skipOffered(at(3, 3), { ...stuck, skipped: true })).toBe(false);
  });
});
