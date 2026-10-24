import { describe, expect, test } from 'vitest';
import { DIORAMA_DEFAULT_POSITION } from '../../src/config/constants';
import { LEVELS } from '../../src/levels';
import type { Level } from '../../src/lib/levelSchema';
import {
  frameToWorld,
  headRelativePlacement,
  offsetOrigin,
  originFromCenter,
  reachAt,
  type DioramaOffset,
  type Placement,
} from '../../src/lib/placement';
import { OFFSET_LIMITS } from '../../src/lib/settings';
import { essentialParts, essentialPoints, viewSpan } from '../../src/lib/viewExtent';
import { sub, type Vec3 } from '../../src/lib/vec';

/**
 * Field of view to fit (gap 55): Meta VR Glasses see 70 x 66 degrees straight
 * ahead, which Meta calls "an upper bound"; the p90 perceived view is 58 x 54
 * (developers.meta.com/horizon/essentials/field-of-view, updated 2026-09-25).
 * The tests assert 70 x 66. No layout can meet the p90 view in the study pose:
 * the playfield alone (cups, chutes and knobs, no plaque or strip) is 58.9
 * degrees wide there at the default offset, and 60.6 at Raise +6. In the Quest
 * pose at the default offset the playfield takes 54.2 x 41.5, and the plaque
 * above it brings the whole to 57.7 x 56.9.
 */
const FOV = { h: 70, v: 66 } as const;
const P90 = { h: 58, v: 54 } as const;

/** A seated head at the default XR origin, facing -z (tests/e2e/reach.e2e.mjs). */
const HEAD: Vec3 = [0, 1.15, 0];
const FORWARD: Vec3 = [0, 0, -1];

/** What Quest's passthrough does without a table: float in front of the player. */
const QUEST_POSE: Placement = headRelativePlacement(HEAD, FORWARD);
/** IWER, the desktop browser and VR: the virtual study's table. */
const STUDY_POSE: Placement = { center: [...DIORAMA_DEFAULT_POSITION] as Vec3, yaw: 0 };
const POSES = { 'Quest pose': QUEST_POSE, 'study pose': STUDY_POSE } as const;

/** The offset limits, one axis at a time (Nearer has its own, partial, check). */
const OFFSETS: Readonly<Record<string, DioramaOffset>> = {
  'the default offset': { up: 0, near: 0 },
  [`Raise +${OFFSET_LIMITS.up[1]}`]: { up: OFFSET_LIMITS.up[1], near: 0 },
  [`Lower ${OFFSET_LIMITS.up[0]}`]: { up: OFFSET_LIMITS.up[0], near: 0 },
  [`Farther ${OFFSET_LIMITS.near[0]}`]: { up: 0, near: OFFSET_LIMITS.near[0] },
};
const NEARER: DioramaOffset = { up: 0, near: OFFSET_LIMITS.near[1] };

/** The frame origin a pose and an offset give a level. */
const originOf = (pose: Placement, level: Level, offset: DioramaOffset): Vec3 =>
  offsetOrigin(originFromCenter(pose.center, pose.yaw, level.size[0]), pose.yaw, offset);

const fmt = (span: { h: number; v: number }) => `${span.h.toFixed(1)} x ${span.v.toFixed(1)}`;

/** The widest and tallest span over every level, and the level each came from (`atH`, `atV`). */
function worstSpan(pose: Placement, offset: DioramaOffset, face: 'level' | 'settings') {
  let worst = { h: 0, v: 0, atH: '', atV: '' };
  for (const level of LEVELS) {
    const span = viewSpan(HEAD, essentialPoints(level, originOf(pose, level, offset), pose.yaw, face));
    if (span.h > worst.h) worst = { ...worst, h: span.h, atH: level.id };
    if (span.v > worst.v) worst = { ...worst, v: span.v, atV: level.id };
  }
  return worst;
}

/** The widest playfield (cups, chutes and knobs; no plaque or strip) over every level, in degrees. */
const widestPlayfield = (pose: Placement, offset: DioramaOffset): number =>
  Math.max(
    ...LEVELS.map((level) => {
      const parts = essentialParts(level, 'level');
      const origin = originOf(pose, level, offset);
      const points = [...parts.cups, ...parts.chutes, ...parts.pegs].map((p) => frameToWorld(origin, pose.yaw, p));
      return viewSpan(HEAD, points).h;
    }),
  );

/** A direction from the head at azimuth `az` (right of -z) and elevation `el`, in degrees. */
function lookAt(az: number, el: number): Vec3 {
  const [a, e] = [(az * Math.PI) / 180, (el * Math.PI) / 180];
  return [HEAD[0] + Math.sin(a) * Math.cos(e), HEAD[1] + Math.sin(e), HEAD[2] - Math.cos(a) * Math.cos(e)];
}

describe('viewSpan: the angle a set of points takes up in a view turned to face them', () => {
  test('one point takes up no angle', () => {
    expect(viewSpan(HEAD, [lookAt(10, -30)])).toEqual({ h: 0, v: 0 });
  });

  test('points 35 degrees either side of straight ahead span 70', () => {
    const span = viewSpan(HEAD, [lookAt(-35, 0), lookAt(35, 0)]);
    expect(span.h).toBeCloseTo(70, 6);
    expect(span.v).toBeCloseTo(0, 6);
  });

  test('it centres on a pitched view: 60 degrees of azimuth 45 degrees down span about 41, not 60', () => {
    // Looking down 45 degrees, points 30 degrees either side are closer together on the display.
    const down = viewSpan(HEAD, [lookAt(-30, -45), lookAt(30, -45), lookAt(0, -25), lookAt(0, -65)]);
    const expected = 2 * Math.atan2(Math.sin(Math.PI / 6) * Math.SQRT1_2, 0.5 + Math.cos(Math.PI / 6) * 0.5);
    expect(down.h).toBeCloseTo((expected * 180) / Math.PI, 6);
    expect(down.v).toBeCloseTo(40, 6);
  });
});

describe('field of view: the level face, the ledge strip and the playfield fit 70 x 66 (gap 55)', () => {
  for (const [poseName, pose] of Object.entries(POSES)) {
    for (const [offsetName, offset] of Object.entries(OFFSETS)) {
      test(`${poseName}, ${offsetName}: every level fits`, () => {
        const worst = worstSpan(pose, offset, 'level');
        expect(worst.h, `widest ${fmt(worst)} (${worst.atH})`).toBeLessThanOrEqual(FOV.h);
        expect(worst.v, `tallest ${fmt(worst)} (${worst.atV})`).toBeLessThanOrEqual(FOV.v);
      });
    }
  }

  test('the p90 view (58 x 54) is stated, not asserted: the playfield alone is wider in the study pose', () => {
    expect(widestPlayfield(STUDY_POSE, OFFSETS['the default offset'])).toBeGreaterThan(P90.h);
  });
});

/**
 * Nearer +2 is a partial check: only the Quest pose with the level face up is
 * asserted. There everything essential spans 69.4 x 65.4 degrees (w2-03 is the
 * widest). The study pose isn't asserted: there the playfield alone (cups,
 * chutes, knobs) spans 70.8 degrees, whatever the plaque and the strip do, and
 * everything spans 75.5 x 73.5. The plaque and the strip widen the view even
 * though they sit inside the cups' spread: in the Quest pose w2-03's playfield
 * spans 64.1 degrees and everything 69.4, and w1-05's 46.2 and 68.1.
 */
describe(`field of view at Nearer +${NEARER.near}: a partial check`, () => {
  test('Quest pose: every level fits 70 x 66', () => {
    const worst = worstSpan(QUEST_POSE, NEARER, 'level');
    expect(worst.h, `widest ${fmt(worst)} (${worst.atH})`).toBeLessThanOrEqual(FOV.h);
    expect(worst.v, `tallest ${fmt(worst)} (${worst.atV})`).toBeLessThanOrEqual(FOV.v);
  });

  test('study pose: stated, not asserted, because the playfield alone is wider than 70', () => {
    expect(widestPlayfield(STUDY_POSE, NEARER)).toBeGreaterThan(FOV.h);
  });
});

/**
 * The settings button counts as its cap's top face, where it is pressed. Taken
 * down to the ledge, the whole cap makes the study pose at Raise +6 66.6 tall.
 */
describe('field of view with the settings face up: the face and the settings button fit 70 x 66', () => {
  for (const [poseName, pose] of Object.entries(POSES)) {
    for (const [offsetName, offset] of Object.entries(OFFSETS)) {
      test(`${poseName}, ${offsetName}`, () => {
        const worst = worstSpan(pose, offset, 'settings');
        expect(worst.h, `widest ${fmt(worst)} (${worst.atH})`).toBeLessThanOrEqual(FOV.h);
        expect(worst.v, `tallest ${fmt(worst)} (${worst.atV})`).toBeLessThanOrEqual(FOV.v);
      });
    }
  }
});

/**
 * Where the segment from `from` to `to` crosses the strip's plane, in the strip's
 * own coordinates: `across` 0-1 from its left to its right edge, `up` 0-1 from its
 * front edge to its back edge. Null if the segment never reaches the plane.
 */
function crossing(from: Vec3, to: Vec3, strip: readonly Vec3[]) {
  const [frontLeft, frontRight, , backLeft] = strip;
  const across = sub(frontRight, frontLeft);
  const up = sub(backLeft, frontLeft);
  const normal: Vec3 = [
    across[1] * up[2] - across[2] * up[1],
    across[2] * up[0] - across[0] * up[2],
    across[0] * up[1] - across[1] * up[0],
  ];
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const d = sub(to, from);
  const t = dot(normal, sub(frontLeft, from)) / dot(normal, d);
  if (!(t >= 0 && t <= 1)) return null;
  const rel = sub([from[0] + d[0] * t, from[1] + d[1] * t, from[2] + d[2] * t], frontLeft);
  return { across: dot(rel, across) / dot(across, across), up: dot(rel, up) / dot(up, up) };
}

describe('the strip never hides a cup', () => {
  const tested = { ...OFFSETS, [`Nearer +${NEARER.near}`]: NEARER };
  for (const [poseName, pose] of Object.entries(POSES)) {
    for (const [offsetName, offset] of Object.entries(tested)) {
      test(`${poseName}, ${offsetName}: the line of sight to each cup's floor passes above the strip`, () => {
        for (const level of LEVELS) {
          const origin = originOf(pose, level, offset);
          const strip = essentialParts(level, 'level').strip.map((p) => frameToWorld(origin, pose.yaw, p));
          for (const goal of level.goals) {
            const floor = frameToWorld(origin, pose.yaw, [goal.x, 0, 0]);
            const hit = crossing(HEAD, floor, strip);
            // Over the strip's width, the sight line must cross its plane beyond the back edge.
            const blocked = hit !== null && hit.across >= 0 && hit.across <= 1 && hit.up <= 1;
            expect(blocked, `${level.id} cup at x ${goal.x}: ${JSON.stringify(hit)}`).toBe(false);
          }
        }
      });
    }
  }
});

/** A seated 2 ft (gap 56). */
const TWO_FEET = 0.61;

describe('reach in the Quest pose (gap 56): knobs, chutes, ledge buttons and the plaque stars', () => {
  test('at the default offset everything is within a seated 2 ft (the end buttons set it, about 0.60 m)', () => {
    const worst = Math.max(...LEVELS.map((level) => reachAt(QUEST_POSE, HEAD, level)));
    expect(worst).toBeLessThanOrEqual(TWO_FEET);
    expect(worst).toBeGreaterThan(0.59);
  });

  test(`at Farther ${OFFSET_LIMITS.near[0]} it is about 0.66 m: recorded for ticket 06 and the week 9 copy pass`, () => {
    const farther: Placement = {
      center: offsetOrigin(QUEST_POSE.center, QUEST_POSE.yaw, OFFSETS[`Farther ${OFFSET_LIMITS.near[0]}`]),
      yaw: QUEST_POSE.yaw,
    };
    const worst = Math.max(...LEVELS.map((level) => reachAt(farther, HEAD, level)));
    expect(worst).toBeCloseTo(0.66, 1);
    expect(worst).toBeGreaterThan(TWO_FEET);
  });
});
