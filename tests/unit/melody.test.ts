import { describe, expect, test } from 'vitest';
import { LEVELS } from '../../src/levels';
import {
  CADENCE_HZ,
  CADENCE_STRUM_SECONDS,
  climbIndex,
  MELODY_STEP_SECONDS,
  MelodyClimb,
  replaySchedule,
  threadRoots,
} from '../../src/lib/melody';
import { positionAlong } from '../../src/lib/rail';
import { sameThread } from '../../src/lib/threadRules';
import { DEFAULT_PITCH_HZ, DEFAULT_ROOT, PENTATONIC_HZ, pitchForLength, rootIndex } from '../../src/lib/threadTuning';
import type { Level } from '../../src/lib/levelSchema';

const SCALE = PENTATONIC_HZ.length;
const TOP = SCALE - 1;
const [, , , , A4, C5, D5, E5, G5, A5] = PENTATONIC_HZ;
const byId = (id: string) => {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`no level ${id}`);
  return level;
};
const ats = (items: readonly { at: number }[]) => items.map((i) => i.at);
const firstBounces = (root: number, n: number) => Array.from({ length: n }, (_, k) => climbIndex(root, k));

describe('climbIndex: a thread climbs one note per bounce', () => {
  test('bounce 0 plays the root, and each bounce climbs one step to the top', () => {
    for (let root = 0; root < SCALE; root++) {
      for (let k = 0; root + k <= TOP; k++) expect(climbIndex(root, k), `root ${root}, bounce ${k}`).toBe(root + k);
    }
  });

  test('after the top comes root - 1, then down to C4', () => {
    expect(firstBounces(8, 10)).toEqual([8, 9, 7, 6, 5, 4, 3, 2, 1, 0]);
    expect(firstBounces(4, 10)).toEqual([4, 5, 6, 7, 8, 9, 3, 2, 1, 0]);
    expect(firstBounces(TOP, 10)).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
  });

  test('a C4 root has nothing below it: it climbs to the top and restarts', () => {
    expect(firstBounces(0, 11)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
  });

  test('for every root, the first 10 bounces play 10 distinct notes, then the cycle repeats', () => {
    for (let root = 0; root < SCALE; root++) {
      expect(new Set(firstBounces(root, SCALE)).size, `root ${root}`).toBe(SCALE);
      for (let k = 0; k < 2 * SCALE; k++) expect(climbIndex(root, k + SCALE)).toBe(climbIndex(root, k));
    }
  });
});

describe('MelodyClimb: one shared climb per thread, per drop', () => {
  test('bounces from different marbles on one thread continue a single climb', () => {
    const climb = new MelodyClimb();
    // Thread 7 (root A4) is hit by three marbles in turn: the climb doesn't restart per marble.
    expect([climb.next(7, 4), climb.next(7, 4), climb.next(7, 4)]).toEqual([4, 5, 6]);
  });

  test('two threads climb independently', () => {
    const climb = new MelodyClimb();
    expect([climb.next(1, 4), climb.next(2, 8), climb.next(1, 4), climb.next(2, 8), climb.next(2, 8)]).toEqual([4, 8, 5, 9, 7]);
  });

  test('after reset(), the same bounce sequence plays the same notes', () => {
    const climb = new MelodyClimb();
    const play = () => [climb.next(1, 2), climb.next(3, 9), climb.next(1, 2), climb.next(3, 9)];
    const first = play();
    climb.reset();
    expect(play()).toEqual(first);
  });
});

/** Peg positions once the level's slides are applied, computed independently of the code under test. */
function solvedPositions(level: Level): Record<string, { x: number; y: number }> {
  const positions = Object.fromEntries(level.pegs.map((p) => [p.id, { x: p.x, y: p.y }]));
  for (const slide of level.slides) {
    const peg = level.pegs.find((p) => p.id === slide.peg);
    if (peg?.rail) positions[peg.id] = positionAlong(peg, peg.rail, slide.to);
  }
  return positions;
}

describe('threadRoots: every preset and solution thread, at its solved length', () => {
  test.each(LEVELS.map((l) => [l.id, l] as const))('%s: each root matches pitchForLength', (_id, level) => {
    const positions = solvedPositions(level);
    const links = [...level.presetThreads, ...level.solution.filter((s) => !level.presetThreads.some((p) => sameThread(p, s)))];
    const roots = threadRoots(level);
    expect(roots).toHaveLength(links.length);
    for (const link of links) {
      const found = roots.find((r) => sameThread(r, link));
      const a = positions[link.from];
      const b = positions[link.to];
      expect(found, `${link.from}-${link.to}`).toBeDefined();
      expect(PENTATONIC_HZ[found!.root]).toBe(pitchForLength(Math.hypot(b.x - a.x, b.y - a.y)));
    }
  });

  test('a preset thread in w1-05 climbs like a player thread with the same root', () => {
    const level = byId('w1-05');
    const preset = threadRoots(level).find((r) => r.preset);
    expect(preset).toBeDefined();
    const climb = new MelodyClimb();
    const presetNotes = Array.from({ length: SCALE }, () => climb.next(100, preset!.root));
    const playerNotes = Array.from({ length: SCALE }, () => climb.next(200, preset!.root));
    expect(presetNotes).toEqual(playerNotes);
    expect(presetNotes).toEqual(firstBounces(preset!.root, SCALE));
  });
});

/** The notes a level's stored solution plays when each marble bounces once on its (single) solution thread. */
function oneBouncePerMarble(level: Level): number[] {
  const solution = threadRoots(level).filter((r) => level.solution.some((s) => sameThread(s, r)));
  expect(solution).toHaveLength(1);
  const climb = new MelodyClimb();
  return Array.from({ length: level.marbles }, () => PENTATONIC_HZ[climb.next(0, solution[0].root)]);
}

describe('the stored solutions play a tune, not one repeated note', () => {
  test('w1-01 plays A4 C5 D5', () => {
    const notes = oneBouncePerMarble(byId('w1-01'));
    expect(notes).toEqual([A4, C5, D5]);
    expect(new Set(notes).size).toBeGreaterThanOrEqual(3);
  });

  test('w1-03 (root G5, one below the top) plays G5 A5 E5', () => {
    const notes = oneBouncePerMarble(byId('w1-03'));
    expect(notes).toEqual([G5, A5, E5]);
    expect(new Set(notes).size).toBeGreaterThanOrEqual(3);
  });

  test("rootIndex is pitchForLength's scale index", () => {
    for (const len of [0, 0.05, 0.0825, 0.12, 0.2731, 0.33, 0.45, 2]) expect(PENTATONIC_HZ[rootIndex(len)]).toBe(pitchForLength(len));
  });

  test("an untuned thread's root is the default pitch's note", () => {
    expect(PENTATONIC_HZ[DEFAULT_ROOT]).toBe(DEFAULT_PITCH_HZ);
  });
});

describe('CADENCE_HZ: the chord a solve closes on', () => {
  test('is C5 E5 G5, already in the scale', () => {
    expect(CADENCE_HZ).toEqual([C5, E5, G5]);
    for (const hz of CADENCE_HZ) expect(PENTATONIC_HZ).toContain(hz);
  });
});

describe('replaySchedule: when each replayed note sounds', () => {
  const timed = { notes: [A4, C5, D5], times: [0.8, 1.1, 1.75] };

  test('keeps the real offsets between notes, in order, each note tagged with its index', () => {
    const schedule = replaySchedule(timed, false);
    expect(schedule.map((s) => s.hz)).toEqual(timed.notes);
    expect(schedule.map((s) => s.cue)).toEqual(['melody', 'melody', 'melody']);
    expect(schedule.map((s) => s.note)).toEqual([0, 1, 2]);
    const at = ats(schedule);
    expect(at[1] - at[0]).toBeCloseTo(0.3, 9);
    expect(at[2] - at[1]).toBeCloseTo(0.65, 9);
    expect([...at].sort((p, q) => p - q)).toEqual(at);
  });

  test('without endOnCadence it ends on the last note', () => {
    const schedule = replaySchedule(timed, false);
    expect(schedule.at(-1)).toMatchObject({ hz: D5, cue: 'melody', note: 2 });
  });

  test('with endOnCadence it ends on the cadence, one beat after the last note', () => {
    const schedule = replaySchedule(timed, true);
    const melody = schedule.filter((s) => s.cue === 'melody');
    const cadence = schedule.filter((s) => s.cue === 'cadence');
    expect(melody).toHaveLength(3);
    expect(cadence.map((s) => s.hz)).toEqual([...CADENCE_HZ]);
    expect(cadence.map((s) => s.note)).toEqual([-1, -1, -1]);
    const last = melody[2].at;
    expect(cadence[0].at - last).toBeCloseTo(MELODY_STEP_SECONDS, 9);
    expect(cadence[1].at - cadence[0].at).toBeCloseTo(CADENCE_STRUM_SECONDS, 9);
    expect(schedule.slice(-3)).toEqual(cadence);
  });

  test('a cadence pitch equal to a melody pitch still comes back as a cadence cue', () => {
    // C5 is both the tune's second note and the cadence's first.
    const schedule = replaySchedule(timed, true);
    const c5 = schedule.filter((s) => s.hz === C5);
    expect(c5.map((s) => [s.cue, s.note])).toEqual([['melody', 1], ['cadence', -1]]);
  });

});

describe('replaySchedule: entries without usable times, and empty tunes', () => {
  test('an entry without times (an old save) uses the fixed 0.22 s step', () => {
    const at = ats(replaySchedule({ notes: [A4, C5, D5], times: [] }, false));
    expect(MELODY_STEP_SECONDS).toBeCloseTo(0.22, 9);
    expect(at[1] - at[0]).toBeCloseTo(MELODY_STEP_SECONDS, 9);
    expect(at[2] - at[1]).toBeCloseTo(MELODY_STEP_SECONDS, 9);
  });

  test('times of the wrong length or going backwards fall back to the fixed step', () => {
    for (const times of [[0.5, 0.6], [0.5, 0.4, 0.9]]) {
      const at = ats(replaySchedule({ notes: [A4, C5, D5], times }, false));
      expect(at[2] - at[1]).toBeCloseTo(MELODY_STEP_SECONDS, 9);
    }
  });

  test('an empty tune gives the cadence alone, or nothing', () => {
    const empty = { notes: [], times: [] };
    expect(replaySchedule(empty, false)).toEqual([]);
    const cadence = replaySchedule(empty, true);
    expect(cadence.map((s) => [s.hz, s.cue, s.note])).toEqual(CADENCE_HZ.map((hz) => [hz, 'cadence', -1]));
  });
});
