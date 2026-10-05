import { describe, expect, test } from 'vitest';
import { parseLevel } from '../../src/lib/levelSchema';

const valid = {
  id: 'w1-01',
  name: 'First Thread',
  world: 1,
  size: [0.5, 0.4],
  chutes: [{ x: 0.12, y: 0.36, count: 2 }],
  maxThreads: 2,
  par: 1,
  pegs: [
    { id: 'p1', x: 0.08, y: 0.22 },
    { id: 'p2', x: 0.3, y: 0.14 },
  ],
  goals: [{ x: 0.4, width: 0.08 }],
  solution: [{ from: 'p1', to: 'p2' }],
};

describe('parseLevel', () => {
  test('accepts a valid level', () => {
    const result = parseLevel(valid);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.level.pegs).toHaveLength(2);
  });

  test('rejects duplicate peg ids', () => {
    const result = parseLevel({
      ...valid,
      pegs: [
        { id: 'p1', x: 0.1, y: 0.1 },
        { id: 'p1', x: 0.2, y: 0.1 },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/duplicate peg id/i);
  });

  test('rejects pegs outside the diorama bounds', () => {
    const result = parseLevel({
      ...valid,
      pegs: [{ id: 'p1', x: 0.9, y: 0.1 }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/outside/i);
  });

  test('rejects par greater than maxThreads', () => {
    const result = parseLevel({ ...valid, par: 5 });
    expect(result.ok).toBe(false);
  });

  test('rejects malformed input with a readable message', () => {
    const result = parseLevel({ id: 3 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });
});

describe('parseLevel v2 fields', () => {
  test('defaults walls and preset threads to empty', () => {
    const r = parseLevel(valid);
    expect(r.ok && r.level.walls).toEqual([]);
    expect(r.ok && r.level.presetThreads).toEqual([]);
  });

  test('rejects threads that reference unknown pegs', () => {
    const r = parseLevel({ ...valid, solution: [{ from: 'p1', to: 'nope' }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/unknown peg/i);
  });

  test('rejects walls outside the diorama', () => {
    const r = parseLevel({ ...valid, walls: [{ x: 0.45, y: 0.1, w: 0.2, h: 0.05 }] });
    expect(r.ok).toBe(false);
  });

  test('rejects a solution that uses more threads than allowed', () => {
    const r = parseLevel({
      ...valid,
      maxThreads: 1,
      par: 1,
      solution: [
        { from: 'p1', to: 'p2' },
        { from: 'p2', to: 'p1' },
      ],
    });
    expect(r.ok).toBe(false);
  });
});

describe('solution vs presets', () => {
  test('kept presets do not count toward the solution thread limit', () => {
    const r = parseLevel({
      ...valid,
      maxThreads: 1,
      par: 1,
      presetThreads: [{ from: 'p1', to: 'p2' }],
      solution: [
        { from: 'p2', to: 'p1' },
        { from: 'p1', to: 'p3' },
      ],
      pegs: [...valid.pegs, { id: 'p3', x: 0.2, y: 0.3 }],
    });
    expect(r.ok).toBe(true);
  });
});

describe('level hint: one plaque line teaching a new mechanic', () => {
  test('a short ASCII hint is kept', () => {
    const r = parseLevel({ ...valid, hint: 'Pinch a thread to snip it' });
    expect(r.ok && r.level.hint).toBe('Pinch a thread to snip it');
  });

  test('a hint too long for one plaque line is refused', () => {
    expect(parseLevel({ ...valid, hint: 'x'.repeat(41) }).ok).toBe(false);
  });

  test('typographic characters the plaque font lacks are refused', () => {
    expect(parseLevel({ ...valid, hint: 'Pinch a peg’s tab' }).ok).toBe(false);
  });
});
