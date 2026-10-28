import { describe, expect, test } from 'vitest';
import { GOAL } from '../../src/config/constants';
import { cadenceSource, cueRoute, cupSource, MAX_SPATIAL_VOICES, PANNER, threadSource } from '../../src/lib/cueSpace';
import { ACCEPT_REACH } from '../../src/lib/placement';
import { CUES, type CueName } from '../../src/lib/soundCues';
import type { Vec3 } from '../../src/lib/vec';

const HALF_WALL = GOAL.wallHeight / 2;
const near = (actual: Vec3 | null, expected: Vec3) => {
  expect(actual).not.toBeNull();
  for (let i = 0; i < 3; i++) expect(actual![i]).toBeCloseTo(expected[i], 9);
};
const POSITIONAL: readonly CueName[] = ['bounce', 'thread', 'cupCorrect', 'cupWrong', 'cadence'];
const SOURCE: Vec3 = [0.2, 0.15, 0];

describe('threadSource: a pluck is heard from the middle of its thread', () => {
  test('the midpoint of the two pegs, in the marble channel plane (z = 0)', () => {
    near(threadSource(0.05, 0.24, 0.3, 0.13), [0.175, 0.185, 0]);
  });

  test('the same point whichever way round the thread is given', () => {
    near(threadSource(0.3, 0.13, 0.05, 0.24), threadSource(0.05, 0.24, 0.3, 0.13));
  });
});

describe('cupSource and cadenceSource: chimes come from the cups', () => {
  test("a cup chimes from its centre, at half its wall height", () => {
    near(cupSource({ minX: 0.4, maxX: 0.49 }), [0.445, HALF_WALL, 0]);
  });

  test('the cadence comes from the mean of the cup centres', () => {
    near(cadenceSource([{ minX: 0, maxX: 0.1 }, { minX: 0.3, maxX: 0.4 }, { minX: 0.45, maxX: 0.55 }]), [0.3, HALF_WALL, 0]);
  });

  test('with one cup the cadence comes from that cup, and with none from nowhere', () => {
    near(cadenceSource([{ minX: 0.4, maxX: 0.49 }]), cupSource({ minX: 0.4, maxX: 0.49 }));
    expect(cadenceSource([])).toBeNull();
  });
});

describe('cueRoute: only a placed cue in an XR session goes through a panner', () => {
  test('a bounce with a source, in a session, is spatial', () => {
    expect(cueRoute(CUES.bounce, SOURCE, true, 0)).toBe('spatial');
  });

  test('every positional cue is spatial in a session; every other cue is mono, even with a source', () => {
    for (const name of Object.keys(CUES) as CueName[]) {
      expect(cueRoute(CUES[name], SOURCE, true, 0), name).toBe(POSITIONAL.includes(name) ? 'spatial' : 'mono');
    }
  });

  test('the browser is mono: no head is tracked outside a session', () => {
    expect(cueRoute(CUES.bounce, SOURCE, false, 0)).toBe('mono');
  });

  test('a positional cue with no source is mono (a melody-book cadence)', () => {
    expect(cueRoute(CUES.cadence, undefined, true, 0)).toBe('mono');
    expect(cueRoute(CUES.cadence, null, true, 0)).toBe('mono');
  });

  test('a world point ({ x, y, z }) counts as a source too', () => {
    expect(cueRoute(CUES.cupCorrect, { x: 0, y: 1, z: -0.4 }, true, 0)).toBe('spatial');
  });

  test(`at most ${MAX_SPATIAL_VOICES} spatial notes ring at once; the next one is mono`, () => {
    // Every level's solve fits (the busiest measured window, w1-04's, rings 16 positional notes).
    expect(MAX_SPATIAL_VOICES).toBe(16);
    expect(cueRoute(CUES.bounce, SOURCE, true, MAX_SPATIAL_VOICES - 1)).toBe('spatial');
    expect(cueRoute(CUES.bounce, SOURCE, true, MAX_SPATIAL_VOICES)).toBe('mono');
    expect(cueRoute(CUES.bounce, SOURCE, true, MAX_SPATIAL_VOICES + 3)).toBe('mono');
  });

  test('ambience stays mono even with a source', () => {
    expect(cueRoute(CUES.ambience, SOURCE, true, 0)).toBe('mono');
  });
});

describe('PANNER: a seated player hears direction, never a volume change', () => {
  test('HRTF panning, inverse distance, a reference distance of at least 0.75 m', () => {
    expect(PANNER.panningModel).toBe('HRTF');
    expect(PANNER.distanceModel).toBe('inverse');
    expect(PANNER.refDistance).toBeGreaterThanOrEqual(0.75);
    expect(PANNER.rolloffFactor).toBe(1);
  });

  test('everything a seated player can reach is inside the reference distance, so its gain stays 1', () => {
    expect(ACCEPT_REACH).toBeLessThanOrEqual(PANNER.refDistance);
  });
});
