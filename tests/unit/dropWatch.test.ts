import { describe, expect, test } from 'vitest';
import { DROP_QUIET_SECONDS, dropOver, isStalled, restTimer, STALL_SECONDS } from '../../src/lib/dropWatch';

describe('restTimer: how long a marble has been at rest', () => {
  test('accumulates while slow, resets as soon as it moves', () => {
    expect(restTimer(0.5, 0.1, 0.01)).toBeCloseTo(0.6);
    expect(restTimer(0.5, 0.1, 2)).toBe(0);
  });
});

describe('isStalled: a marble perched somewhere it should not be', () => {
  const perched = { restSeconds: STALL_SECONDS, y: 0.104, inCup: false };

  test('balanced on a peg above the floor for a moment is stalled', () => {
    expect(isStalled(perched)).toBe(true);
  });

  test('not before it has rested long enough to be sure', () => {
    expect(isStalled({ ...perched, restSeconds: STALL_SECONDS / 2 })).toBe(false);
  });

  test('resting on the diorama floor (a miss) is not stalled', () => {
    expect(isStalled({ ...perched, y: 0.013 })).toBe(false);
  });

  test('resting in a cup, even stacked, is not stalled', () => {
    expect(isStalled({ ...perched, y: 0.04, inCup: true })).toBe(false);
  });
});

describe('dropOver: an unsolved drop ends once everything has come to rest', () => {
  test('not while marbles are still to be released', () => {
    expect(dropOver({ allReleased: false, quietSeconds: 10 })).toBe(false);
  });

  test('not until every marble has been still for a while', () => {
    expect(dropOver({ allReleased: true, quietSeconds: DROP_QUIET_SECONDS / 2 })).toBe(false);
    expect(dropOver({ allReleased: true, quietSeconds: DROP_QUIET_SECONDS })).toBe(true);
  });
});
