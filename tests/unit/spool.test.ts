import { describe, expect, test } from 'vitest';
import { parseLevel } from '../../src/lib/levelSchema';
import { checkNewThread, spoolUsed, slideFitsSpool } from '../../src/lib/threadRules';

const pegs = {
  a: { x: 0, y: 0 },
  b: { x: 0.3, y: 0 },
  c: { x: 0.3, y: 0.4 },
};

describe('spoolUsed: thread length the player has spent', () => {
  test('sums player threads only; presets come free with the level', () => {
    const threads = [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c', preset: true },
    ];
    expect(spoolUsed(threads, pegs)).toBeCloseTo(0.3);
  });

  test('uses live peg positions, so sliding a rail peg changes the spend', () => {
    expect(spoolUsed([{ from: 'a', to: 'c' }], pegs)).toBeCloseTo(0.5);
  });
});

describe('checkNewThread with a spool', () => {
  test('a thread that fits the remaining spool is allowed', () => {
    expect(checkNewThread([], 'a', 'b', 3, { remaining: 0.31, length: 0.3 })).toEqual({ ok: true });
  });

  test('a thread longer than the remaining spool is refused', () => {
    expect(checkNewThread([], 'a', 'c', 3, { remaining: 0.4, length: 0.5 })).toEqual({ ok: false, reason: 'spool' });
  });

  test('levels without a spool never refuse on length', () => {
    expect(checkNewThread([], 'a', 'c', 3)).toEqual({ ok: true });
  });
});

describe('level schema: spool', () => {
  const base = {
    id: 'w4-x',
    name: 'Spool',
    world: 4,
    size: [0.5, 0.4],
    chutes: [{ x: 0.1, y: 0.37, count: 2 }],
    maxThreads: 2,
    par: 1,
    pegs: [
      { id: 'a', x: 0.05, y: 0.24 },
      { id: 'b', x: 0.35, y: 0.24 },
    ],
    goals: [{ x: 0.445, width: 0.09 }],
    solution: [{ from: 'a', to: 'b' }],
  };

  test('accepts a solution that fits its spool', () => {
    expect(parseLevel({ ...base, spool: 0.31 }).ok).toBe(true);
  });

  test('refuses a level whose own solution overspends its spool', () => {
    const r = parseLevel({ ...base, spool: 0.29 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/solution needs .* of spool/i);
  });
});

describe('slideFitsSpool: a rail slide may not stretch threads past the spool', () => {
  const pegs = { a: { x: 0, y: 0 }, b: { x: 0.1, y: 0 } };
  const threads = [{ from: 'a', to: 'b', preset: false }];

  test('a slide that keeps the threads within the spool fits', () => {
    expect(slideFitsSpool(threads, pegs, 'b', { x: 0.15, y: 0 }, 0.15)).toBe(true);
  });

  test('a slide that stretches a thread past the spool does not', () => {
    expect(slideFitsSpool(threads, pegs, 'b', { x: 0.2, y: 0 }, 0.15)).toBe(false);
  });

  test('preset threads never count against the spool', () => {
    expect(slideFitsSpool([{ from: 'a', to: 'b', preset: true }], pegs, 'b', { x: 0.4, y: 0 }, 0.15)).toBe(true);
  });

  test('levels without a spool always fit', () => {
    expect(slideFitsSpool(threads, pegs, 'b', { x: 0.4, y: 0 }, undefined)).toBe(true);
  });
});
