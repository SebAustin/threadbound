import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { DIORAMA_DEFAULT_POSITION, LEDGE_STRIP } from '../../src/config/constants';
import { LEVELS } from '../../src/levels';
import { ledgeStripPose } from '../../src/lib/ledge';
import type { Level } from '../../src/lib/levelSchema';
import {
  choosePlacement,
  frameToWorld,
  headRelativePlacement,
  offsetOrigin,
  originFromCenter,
  type DioramaOffset,
  type PlaneCandidate,
  type Placement,
} from '../../src/lib/placement';
import { OFFSET_LIMITS } from '../../src/lib/settings';
import type { Vec3 } from '../../src/lib/vec';

/**
 * Week 8 ticket 17's legibility check: the ledge strip's hint line, read from the seated head.
 *
 * Meta's typography guidance (developers.meta.com/horizon/design/styles_typography) asks for a
 * font size "no smaller than 14px" for minimal legibility and 18px or larger for comfortable
 * reading, without saying what a px subtends. We read a px as one display pixel of the
 * lowest-resolution supported headset, Quest 2, at about 20 pixels per degree: 14 px is 0.70
 * degrees of font size (em), 18 px 0.90. Quest 3 (about 25 ppd) only makes text sharper.
 *
 * The strip lies on the ledge raised LEDGE_STRIP.lean toward the player, so its text is seen
 * at a slant: each line's em is measured as the angle between its bottom and top edges along
 * the strip's face, which includes that foreshortening.
 */
const DEG = 180 / Math.PI;
const PX_PER_DEGREE = 20;
const MIN_EM_DEG = 14 / PX_PER_DEGREE;
const COMFORT_EM_DEG = 18 / PX_PER_DEGREE;

/** A seated head at the default XR origin, facing -z (as in viewExtent.test.ts). */
const HEAD: Vec3 = [0, 1.15, 0];

/** The hint's font size, from public/ui/ledge.uikitml (cm: the strip is sized in centimetres). */
const HINT_FONT_CM = Number(/\.hint\s*\{[^}]*font-size:\s*([\d.]+)/.exec(readFileSync('public/ui/ledge.uikitml', 'utf8'))?.[1]);

/**
 * The hint's two lines along the strip's face, as distances (m) from its front edge: the count
 * line takes the bottom line height, the hint stacks above it (line height about 1.3 em).
 */
const LINE_HEIGHT_EMS = 1.3;
function hintLines(): [number, number][] {
  const em = HINT_FONT_CM / 100;
  const line = em * LINE_HEIGHT_EMS;
  const first = 0.001 + line;
  return [0, 1].map((n): [number, number] => [first + n * line, first + n * line + em]);
}

/** The smallest em (degrees) of either hint line on `level`, framed at `origin` turned by `yaw`. */
function hintEmDegrees(level: Level, origin: Vec3, yaw: number): number {
  const pose = ledgeStripPose(level.size[0]);
  const along = (s: number): Vec3 => [
    pose.bottom[0],
    pose.bottom[1] + s * Math.sin(LEDGE_STRIP.lean),
    pose.bottom[2] - s * Math.cos(LEDGE_STRIP.lean),
  ];
  return Math.min(
    ...hintLines().map(([from, to]) => angleAt(frameToWorld(origin, yaw, along(from)), frameToWorld(origin, yaw, along(to)))),
  );
}

function angleAt(a: Vec3, b: Vec3): number {
  const u = a.map((v, i) => v - HEAD[i]);
  const w = b.map((v, i) => v - HEAD[i]);
  const cos = (u[0] * w[0] + u[1] * w[1] + u[2] * w[2]) / (Math.hypot(...u) * Math.hypot(...w));
  return Math.acos(Math.min(1, cos)) * DEG;
}

const QUEST_POSE: Placement = headRelativePlacement(HEAD, [0, 0, -1]);
const STUDY_POSE: Placement = { center: [...DIORAMA_DEFAULT_POSITION] as Vec3, yaw: 0 };

/** The smallest hint em over every level at a pose and an offset, with the level it came from. */
function smallest(pose: Placement, offset: DioramaOffset): { deg: number; at: string } {
  let worst = { deg: Infinity, at: '' };
  for (const level of LEVELS) {
    const origin = offsetOrigin(originFromCenter(pose.center, pose.yaw, level.size[0]), pose.yaw, offset);
    const deg = hintEmDegrees(level, origin, pose.yaw);
    if (deg < worst.deg) worst = { deg, at: level.id };
  }
  return worst;
}

/** A 0.74 m desk straight ahead, its near edge `nearEdge` m from the head. */
const desk = (nearEdge: number): PlaneCandidate => ({
  orientation: 'horizontal',
  label: 'desk',
  min: [-0.6, 0.74, -nearEdge - 0.6],
  max: [0.6, 0.76, -nearEdge],
});

/** The farthest desk placement placement still accepts for `level` (its reach at ACCEPT_REACH). */
function farthestAccepted(level: Level): Placement {
  let last: Placement | null = null;
  for (let near = 0.2; near <= 1.0; near += 0.005) {
    const placed = choosePlacement([desk(near)], HEAD, level, [0, 0, -1]);
    if (!placed) break;
    last = placed;
  }
  if (!last) throw new Error(`no desk accepted for ${level.id}`);
  return last;
}

const fmt = (w: { deg: number; at: string }) => `${w.deg.toFixed(2)} deg (${w.at})`;

describe('legibility: the ledge hint line from the seated head (Meta: 14 px minimum, 18 px comfortable)', () => {
  test('the hint font size is read from the strip', () => {
    expect(HINT_FONT_CM).toBeGreaterThan(0);
  });

  for (const [name, pose] of Object.entries({ 'Quest pose': QUEST_POSE, 'study pose': STUDY_POSE })) {
    test(`${name}, default offset: every level's hint reads comfortably (18 px)`, () => {
      const worst = smallest(pose, { up: 0, near: 0 });
      expect(worst.deg, fmt(worst)).toBeGreaterThanOrEqual(COMFORT_EM_DEG);
    });

    test(`${name}, at every offset limit: every level's hint stays legible (14 px)`, () => {
      const limits: DioramaOffset[] = [
        { up: OFFSET_LIMITS.up[0], near: 0 },
        { up: OFFSET_LIMITS.up[1], near: 0 },
        { up: 0, near: OFFSET_LIMITS.near[0] },
        { up: 0, near: OFFSET_LIMITS.near[1] },
      ];
      for (const offset of limits) {
        const worst = smallest(pose, offset);
        expect(worst.deg, `${JSON.stringify(offset)}: ${fmt(worst)}`).toBeGreaterThanOrEqual(MIN_EM_DEG);
      }
    });
  }

  test('on the farthest desk placement accepts, every level\'s hint stays legible (14 px)', () => {
    for (const level of LEVELS) {
      const placed = farthestAccepted(level);
      const deg = hintEmDegrees(level, originFromCenter(placed.center, placed.yaw, level.size[0]), placed.yaw);
      expect(deg, `${level.id}: ${deg.toFixed(2)} deg`).toBeGreaterThanOrEqual(MIN_EM_DEG);
    }
  });
});
