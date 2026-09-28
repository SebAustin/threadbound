import { describe, expect, test } from 'vitest';
import { starsFor } from '../../src/lib/scoring';

describe('starsFor (thread economy)', () => {
  test('three stars at or under par', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(0, 1)).toBe(3);
  });
  test('two stars one over par', () => expect(starsFor(3, 2)).toBe(2));
  test('one star otherwise — solving always earns something', () => expect(starsFor(6, 2)).toBe(1));
});
