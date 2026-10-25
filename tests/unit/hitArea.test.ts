import { describe, expect, test } from 'vitest';
import { HIT_AREA, SLIDER, THREAD_TUNING } from '../../src/config/constants';
import { hitAreaSize, minTargetSize, TAB_HIT_SIZE, THREAD_HIT_DIAMETER } from '../../src/lib/hitArea';
import { frameToWorld, headRelativePlacement, offsetOrigin, originFromCenter } from '../../src/lib/placement';
import { OFFSET_LIMITS } from '../../src/lib/settings';
import { sub, type Vec3 } from '../../src/lib/vec';

/** A seated head, facing -z. */
const HEAD: Vec3 = [0, 1.2, 0];
const FORWARD: Vec3 = [0, 0, -1];
/** The campaign's diorama width. */
const WIDTH = 0.5;

/**
 * The farthest point a seated player aims at: the diorama's far bottom corner
 * (frame x 0, y 0, on the channel where threads lie), with the diorama floated
 * in front of the head (headRelativePlacement) and moved to the Farther limit.
 */
function worstSeatedDistance(): number {
  const { center, yaw } = headRelativePlacement(HEAD, FORWARD);
  const origin = offsetOrigin(originFromCenter(center, yaw, WIDTH), yaw, { up: 0, near: OFFSET_LIMITS.near[0] });
  const corners = [frameToWorld(origin, yaw, [0, 0, 0]), frameToWorld(origin, yaw, [WIDTH, 0, 0])];
  return Math.max(...corners.map((c) => Math.hypot(...sub(c, HEAD))));
}

/** Degrees a target of `size` subtends at `distance`. */
const subtends = (size: number, distance: number) => (2 * Math.atan(size / 2 / distance) * 180) / Math.PI;

describe('minTargetSize: the size that subtends an angle', () => {
  test('is 2 d tan(deg / 2)', () => {
    expect(minTargetSize(1, 90)).toBeCloseTo(2, 6);
    expect(minTargetSize(0.5, 2.5)).toBeCloseTo(2 * 0.5 * Math.tan((1.25 * Math.PI) / 180), 9);
  });
});

describe('hitAreaSize: thin parts get a bigger invisible target', () => {
  const d = worstSeatedDistance();

  test('the worst seated distance used for hit areas covers the far bottom corner at Farther', () => {
    expect(HIT_AREA.worstDistance).toBeGreaterThanOrEqual(d);
  });

  test(`thread and tab hit sizes subtend at least ${HIT_AREA.minDegrees} degrees there (about 3.1 cm)`, () => {
    expect(subtends(THREAD_HIT_DIAMETER, d)).toBeGreaterThanOrEqual(HIT_AREA.minDegrees);
    expect(subtends(TAB_HIT_SIZE[0], d)).toBeGreaterThanOrEqual(HIT_AREA.minDegrees);
    expect(subtends(TAB_HIT_SIZE[1], d)).toBeGreaterThanOrEqual(HIT_AREA.minDegrees);
    expect(THREAD_HIT_DIAMETER).toBeGreaterThan(0.03);
    expect(THREAD_HIT_DIAMETER).toBeLessThan(0.033);
  });

  test('a thread or tab smaller than the minimum is enlarged to it', () => {
    expect(THREAD_HIT_DIAMETER).toBeGreaterThan(THREAD_TUNING.radius * 2);
    expect(TAB_HIT_SIZE[1]).toBeGreaterThan(SLIDER.handleSize[1]);
  });

  test('a visual size above the minimum comes back unchanged', () => {
    expect(hitAreaSize(0.05, d)).toBe(0.05);
  });

  test("a tab's half-extent stays under SLIDER.handleOffset, so it never covers its own peg's centre", () => {
    expect(TAB_HIT_SIZE[0] / 2).toBeLessThan(SLIDER.handleOffset);
    expect(TAB_HIT_SIZE[1] / 2).toBeLessThan(SLIDER.handleOffset);
  });
});
