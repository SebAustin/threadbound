import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Quaternion, Vector3 } from '@iwsdk/core';
import { describe, expect, test } from 'vitest';
import { AIM_PLANE_Z, CHUTE } from '../../src/config/constants';
import { DioramaFrame } from '../../src/features/diorama/dioramaFrame';
import { headRelativePlacement, offsetOrigin, originFromCenter } from '../../src/lib/placement';
import { DEFAULT_SETTINGS } from '../../src/lib/settings';
import level from '../../src/levels/world1/01-first-thread.json';

// tests/e2e/prod-xr.mjs aims an emulated hand at fixed world points, because the production bundle
// has no test hook to ask where the knobs are. This recomputes those points from the game's own
// placement code, so a level or placement change can't leave the fixture silently stale.

interface Point {
  x: number;
  y: number;
  z: number;
}

interface ProdXrFixture {
  level: string;
  viewport: { width: number; height: number };
  enterXr: { x: number; y: number };
  head: { position: Point; orientation: Point & { w: number } };
  knobs: Record<string, Point>;
  chute: Point;
}

const FIXTURE_PATH = join(__dirname, '..', 'e2e', 'fixtures', 'prod-xr-w1-01.json');
/** 1 mm: tighter than any pinch target, looser than float noise. */
const TOLERANCE_M = 0.001;

const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as ProdXrFixture;

/** The diorama frame PlacementSystem builds for the scripted head pose (no table, so "in front of you"). */
function placedFrame(): DioramaFrame {
  const { position, orientation } = fixture.head;
  const head = [position.x, position.y, position.z] as const;
  // PlacementSystem.readHead: the head's forward is -z turned by its world rotation.
  const forward = new Vector3(0, 0, -1).applyQuaternion(
    new Quaternion(orientation.x, orientation.y, orientation.z, orientation.w),
  );
  const placement = headRelativePlacement(head, [forward.x, forward.y, forward.z]);
  // PlacementSystem.place, then PuzzleSystem.build with a fresh save's offset.
  const origin = originFromCenter(placement.center, placement.yaw, level.size[0]);
  const offset = offsetOrigin(origin, placement.yaw, DEFAULT_SETTINGS.offset);
  return new DioramaFrame(new Vector3(...offset), placement.yaw);
}

function expectNear(actual: Point, expected: Vector3): void {
  expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(TOLERANCE_M);
  expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(TOLERANCE_M);
  expect(Math.abs(actual.z - expected.z)).toBeLessThanOrEqual(TOLERANCE_M);
}

describe('prod-xr fixture for level 1', () => {
  test('names level 1 and the harness viewport', () => {
    expect(fixture.level).toBe(level.id);
    expect(fixture.viewport).toEqual({ width: 1280, height: 720 });
  });

  test('the head orientation is a unit quaternion', () => {
    const { x, y, z, w } = fixture.head.orientation;
    expect(Math.hypot(x, y, z, w)).toBeCloseTo(1, 6);
  });

  test('the Enter XR point lies on the 1280x720 canvas', () => {
    const { x, y } = fixture.enterXr;
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(fixture.viewport.width);
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThan(fixture.viewport.height);
  });

  test('knobs a and b sit on the aim plane where the placed frame puts them', () => {
    const frame = placedFrame();
    for (const id of ['a', 'b']) {
      const peg = level.pegs.find((p) => p.id === id);
      if (!peg) throw new Error(`level 1 has no peg ${id}`);
      expectNear(fixture.knobs[id], frame.localToWorld(peg.x, peg.y, AIM_PLANE_Z, new Vector3()));
    }
  });

  test('the chute point is the funnel centre where the placed frame puts it', () => {
    const [chute] = level.chutes;
    const frame = placedFrame();
    expectNear(fixture.chute, frame.localToWorld(chute.x, chute.y + CHUTE.lift, 0, new Vector3()));
  });

  test('a stale point fails: a knob 2 mm off is out of tolerance', () => {
    const peg = level.pegs[0];
    const expected = placedFrame().localToWorld(peg.x, peg.y, AIM_PLANE_Z, new Vector3());
    const stale = { x: expected.x + 0.002, y: expected.y, z: expected.z };
    expect(() => expectNear(stale, expected)).toThrow();
  });
});
