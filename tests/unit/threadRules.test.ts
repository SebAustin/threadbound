import { describe, expect, test } from 'vitest';
import { PEG } from '../../src/config/constants';
import { LEVELS } from '../../src/levels';
import { createTrail, push, stableRelease } from '../../src/lib/releaseTrail';
import { checkNewThread, findSnapPeg, landingPeg, presetOnlyPegs } from '../../src/lib/threadRules';

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

describe('presetOnlyPegs: pegs only the snipped preset threads touch', () => {
  /** Ticket 11: each level's pegs that only anchor a preset thread its solution snips. */
  const EXPECTED: Readonly<Record<string, readonly string[]>> = {
    'w1-05': ['p', 'q'],
    'w1-06': ['g', 'h'],
    'w2-04': ['p', 'q'],
    'w2-05': ['p', 'q'],
    'w2-06': ['u', 'v'],
    'w4-06': ['u', 'v'],
  };

  test('across the 24 levels it returns exactly the 12 pegs, and none in World 3', () => {
    expect(LEVELS).toHaveLength(24);
    const found = Object.fromEntries(
      LEVELS.map((level) => [level.id, [...presetOnlyPegs(level)].sort()] as const).filter(([, pegs]) => pegs.length > 0),
    );
    expect(found).toEqual(EXPECTED);
    expect(Object.values(found).flat()).toHaveLength(12);
    for (const level of LEVELS.filter((l) => l.world === 3)) expect(presetOnlyPegs(level), level.id).toHaveLength(0);
  });

  test('a peg a kept preset or a solution thread touches is not preset-only', () => {
    const level = {
      pegs: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
      presetThreads: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }],
      solution: [{ from: 'c', to: 'b' }, { from: 'c', to: 'd' }],
    };
    expect([...presetOnlyPegs(level)]).toEqual(['a']);
  });

  test('once they are removed, no two knobs overlap at their authored positions', () => {
    const knob = PEG.knobRadius * 2;
    expect(knob).toBeCloseTo(0.033, 6);
    for (const level of LEVELS) {
      const presetOnly = presetOnlyPegs(level);
      const pegs = level.pegs.filter((p) => !presetOnly.includes(p.id));
      for (let i = 0; i < pegs.length; i++) {
        for (let j = i + 1; j < pegs.length; j++) {
          const gap = Math.hypot(pegs[i].x - pegs[j].x, pegs[i].y - pegs[j].y);
          expect(gap, `${level.id} ${pegs[i].id}/${pegs[j].id}`).toBeGreaterThanOrEqual(knob);
        }
      }
    }
  });
});

describe('landingPeg: where a released pull attaches', () => {
  const R = 0.03;

  test('a held point on a peg wins, even when the release frame jumped onto another', () => {
    expect(landingPeg([0.1, 0.005], [0.3, 0.2], pegs, 'a', R)).toBe('b');
  });

  test('a held point on no peg does not win: the release frame lands on its peg', () => {
    expect(landingPeg([0.2, 0.1], [0.3, 0.19], pegs, 'a', R)).toBe('c');
  });

  test('neither on a peg: nothing', () => {
    expect(landingPeg([0.2, 0.1], [0.2, 0.5], pegs, 'a', R)).toBeNull();
  });

  test("a hold on the own knob within snap reach of a neighbour is the pinch: a flick lands on its target, not the neighbour", () => {
    // Knobs 3.3 cm apart (the closest pair); the pinch held 1.2 cm off a's centre, 2.1 cm from n.
    const close = [{ id: 'a', x: 0, y: 0 }, { id: 'n', x: 0.033, y: 0 }, { id: 'b', x: 0.2, y: 0.1 }];
    const trail = createTrail();
    push(trail, 0, 0, 0);
    for (let t = 16; t <= 112; t += 16) push(trail, 0.012, 0, t);
    push(trail, 0.1, 0.05, 128);
    push(trail, 0.2, 0.1, 144);
    const held = stableRelease(trail, { x: 0, y: 0 }, { x: 0, y: 0, radius: PEG.knobRadius });
    expect(landingPeg([held.x, held.y], [0.2, 0.1], close, 'a', PEG.snapRadius)).toBe('b');
  });
});
