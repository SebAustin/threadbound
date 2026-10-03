import { describe, expect, test } from 'vitest';
import { parseLevel, type Level } from '../../src/lib/levelSchema';
import { solutionSteps } from '../../src/lib/solutionSteps';

function level(overrides: Record<string, unknown>): Level {
  const r = parseLevel({
    id: 'w3-x',
    name: 'Test',
    world: 3,
    size: [0.5, 0.4],
    chutes: [{ x: 0.1, y: 0.37, count: 2 }],
    maxThreads: 2,
    par: 1,
    pegs: [
      { id: 'a', x: 0.2, y: 0.24, rail: { axis: 'x', min: 0.03, max: 0.45 } },
      { id: 'b', x: 0.3, y: 0.1 },
      { id: 'c', x: 0.45, y: 0.3 },
    ],
    goals: [{ x: 0.445, width: 0.09 }],
    solution: [{ from: 'a', to: 'b' }],
    ...overrides,
  });
  if (!r.ok) throw new Error(r.error);
  return r.level;
}

describe('solutionSteps: the command sequence that applies a stored solution', () => {
  test('a plain solution adds each thread', () => {
    expect(solutionSteps(level({}))).toEqual([{ type: 'addThread', from: 'a', to: 'b' }]);
  });

  test('slides come first, so attached threads are rebuilt at the new spot', () => {
    const steps = solutionSteps(level({ slides: [{ peg: 'a', to: 0.05 }] }));
    expect(steps[0]).toEqual({ type: 'movePeg', pegId: 'a', x: 0.05, y: 0.24 });
    expect(steps.at(-1)).toEqual({ type: 'addThread', from: 'a', to: 'b' });
  });

  test('presets the solution keeps (in either direction) are left alone; others are snipped', () => {
    const steps = solutionSteps(
      level({
        presetThreads: [
          { from: 'b', to: 'a' },
          { from: 'b', to: 'c' },
        ],
      }),
    );
    expect(steps).toEqual([{ type: 'snip', from: 'b', to: 'c' }]);
  });

  test('a y-axis slide keeps the peg x', () => {
    const steps = solutionSteps(
      level({
        pegs: [
          { id: 'a', x: 0.2, y: 0.2, rail: { axis: 'y', min: 0.1, max: 0.3 } },
          { id: 'b', x: 0.3, y: 0.1 },
        ],
        slides: [{ peg: 'a', to: 0.28 }],
      }),
    );
    expect(steps[0]).toEqual({ type: 'movePeg', pegId: 'a', x: 0.2, y: 0.28 });
  });
});
