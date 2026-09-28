import { describe, expect, test } from 'vitest';
import { checkNewThread, findSnapPeg } from '../../src/lib/threadRules';

const pegs = [
  { id: 'a', x: 0, y: 0 },
  { id: 'b', x: 0.1, y: 0 },
  { id: 'c', x: 0.3, y: 0.2 },
];

describe('findSnapPeg', () => {
  test('returns the nearest peg within the snap radius', () => {
    expect(findSnapPeg([0.105, 0.01], pegs, 'a', 0.03)).toBe('b');
  });

  test('ignores the excluded source peg', () => {
    expect(findSnapPeg([0.001, 0], pegs, 'a', 0.03)).toBeNull();
  });

  test('returns null when nothing is in range', () => {
    expect(findSnapPeg([0.2, 0.5], pegs, 'a', 0.03)).toBeNull();
  });
});

describe('checkNewThread', () => {
  test('accepts a new pair under the limit', () => {
    expect(checkNewThread([], 'a', 'b', 3)).toEqual({ ok: true });
  });

  test('rejects connecting a peg to itself', () => {
    expect(checkNewThread([], 'a', 'a', 3)).toEqual({
      ok: false,
      reason: 'same-peg',
    });
  });

  test('rejects a duplicate pair regardless of direction', () => {
    expect(checkNewThread([{ from: 'b', to: 'a' }], 'a', 'b', 3)).toEqual({
      ok: false,
      reason: 'duplicate',
    });
  });

  test('rejects once the thread limit is reached', () => {
    expect(
      checkNewThread([{ from: 'a', to: 'b' }], 'b', 'c', 1),
    ).toEqual({ ok: false, reason: 'limit' });
  });
});

describe('checkNewThread with preset threads', () => {
  test('preset threads do not count toward the player limit', () => {
    expect(
      checkNewThread([{ from: 'a', to: 'c', preset: true }], 'a', 'b', 1),
    ).toEqual({ ok: true });
  });
});
