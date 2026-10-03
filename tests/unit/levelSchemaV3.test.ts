import { describe, expect, test } from 'vitest';
import { parseLevel } from '../../src/lib/levelSchema';

const base = {
  id: 'w2-01',
  name: 'Fork',
  world: 2,
  size: [0.5, 0.4],
  chutes: [
    { x: 0.2, y: 0.37, color: 'amber', count: 2 },
    { x: 0.3, y: 0.37, color: 'azure', count: 2 },
  ],
  maxThreads: 2,
  par: 2,
  pegs: [
    { id: 'a', x: 0.26, y: 0.25 },
    { id: 'b', x: 0.06, y: 0.16 },
  ],
  goals: [
    { x: 0.055, width: 0.09, color: 'amber' },
    { x: 0.445, width: 0.09, color: 'azure' },
  ],
  solution: [{ from: 'a', to: 'b' }],
};

describe('level schema v3: colored chutes and goals', () => {
  test('accepts multiple colored chutes and colored goals', () => {
    const r = parseLevel(base);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.level.chutes).toHaveLength(2);
  });

  test('total marbles is the sum of chute counts', () => {
    const r = parseLevel(base);
    expect(r.ok && r.level.marbles).toBe(4);
  });

  test('every marble color must have a cup that accepts it', () => {
    const r = parseLevel({ ...base, goals: [{ x: 0.055, width: 0.09, color: 'amber' }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/azure/);
  });

  test('a goal without a color accepts every marble', () => {
    const r = parseLevel({ ...base, goals: [{ x: 0.445, width: 0.09 }] });
    expect(r.ok).toBe(true);
  });
});

describe('level schema v3: rails', () => {
  const railLevel = {
    ...base,
    pegs: [
      { id: 'a', x: 0.4, y: 0.24, rail: { axis: 'x', min: 0.03, max: 0.45 } },
      { id: 'b', x: 0.3, y: 0.13 },
    ],
    solution: [{ from: 'a', to: 'b' }],
    slides: [{ peg: 'a', to: 0.05 }],
  };

  test('accepts rail pegs and solution slides', () => {
    expect(parseLevel(railLevel).ok).toBe(true);
  });

  test('rejects a peg that starts outside its rail', () => {
    const r = parseLevel({
      ...railLevel,
      pegs: [{ id: 'a', x: 0.5, y: 0.24, rail: { axis: 'x', min: 0.03, max: 0.45 } }, railLevel.pegs[1]],
    });
    expect(r.ok).toBe(false);
  });

  test('rejects slides on pegs without rails or beyond rail range', () => {
    expect(parseLevel({ ...railLevel, slides: [{ peg: 'b', to: 0.2 }] }).ok).toBe(false);
    expect(parseLevel({ ...railLevel, slides: [{ peg: 'a', to: 0.49 }] }).ok).toBe(false);
  });
});

describe('level schema v3: cup colors', () => {
  test('cups may only require a sorting color, never teal (teal uses an accept-any cup)', () => {
    // Every chute still has its cup; the extra teal-only cup is the sole problem.
    const r = parseLevel({ ...base, goals: [...base.goals, { x: 0.25, width: 0.06, color: 'teal' }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/goals\.2\.color/);
  });
});

describe('level schema v3: rail clearance', () => {
  test('rejects a rail that runs through another peg (a slide could collapse a thread)', () => {
    const r = parseLevel({
      ...base,
      pegs: [
        { id: 'a', x: 0.4, y: 0.24, rail: { axis: 'x', min: 0.03, max: 0.45 } },
        { id: 'b', x: 0.2, y: 0.245 },
      ],
      solution: [{ from: 'a', to: 'b' }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/rail of "a" runs through peg "b"/);
  });

  test('accepts a peg that sits clear of the rail', () => {
    const r = parseLevel({
      ...base,
      pegs: [
        { id: 'a', x: 0.4, y: 0.24, rail: { axis: 'x', min: 0.03, max: 0.45 } },
        { id: 'b', x: 0.2, y: 0.16 },
      ],
      solution: [{ from: 'a', to: 'b' }],
    });
    expect(r.ok).toBe(true);
  });
});
