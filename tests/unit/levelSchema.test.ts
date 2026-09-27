import { describe, expect, test } from 'vitest';
import { parseLevel } from '../../src/lib/levelSchema';

const valid = {
  id: 'w1-01',
  name: 'First Thread',
  world: 1,
  size: [0.5, 0.4],
  chute: { x: 0.12, y: 0.36 },
  marbles: 2,
  maxThreads: 2,
  par: 1,
  pegs: [
    { id: 'p1', x: 0.08, y: 0.22 },
    { id: 'p2', x: 0.3, y: 0.14 },
  ],
  goals: [{ x: 0.4, width: 0.08 }],
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
