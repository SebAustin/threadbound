import { describe, expect, test } from 'vitest';
import { createTrail, push, reset, stableRelease, TRAIL_SAMPLES, type ReleaseTrail } from '../../src/lib/releaseTrail';

const A = { x: 0.05, y: 0.24 };
const B = { x: 0.3, y: 0.13 };
/** A display frame at 60 Hz, in ms. */
const FRAME = 16;

/** A fresh trail with its grab at `from`, at time 0. */
function grabbedAt(from: { x: number; y: number }): ReleaseTrail {
  const trail = createTrail();
  reset(trail);
  push(trail, from.x, from.y, 0);
  return trail;
}

const releaseOf = (trail: ReleaseTrail) => stableRelease(trail, { x: Number.NaN, y: Number.NaN });

describe('stableRelease: a release that jumps off a held point keeps the held point', () => {
  test('a 200 ms hold at b, then a release frame 4 cm away, returns b (within 2 mm)', () => {
    const trail = grabbedAt(A);
    push(trail, B.x, B.y, 100);
    // The hand holds at b for 200 ms, wobbling under a millimetre.
    for (let t = 116; t <= 300; t += FRAME) push(trail, B.x + 0.0008 * Math.sin(t), B.y, t);
    push(trail, B.x + 0.04, B.y, 316);
    const out = releaseOf(trail);
    expect(Math.hypot(out.x - B.x, out.y - B.y)).toBeLessThan(0.002);
  });

  test('a jump (a at 0 ms, b at 16 ms, release at b) returns b', () => {
    const trail = grabbedAt(A);
    push(trail, B.x, B.y, FRAME);
    expect(releaseOf(trail)).toEqual(B);
  });

  test('a steady sweep with no hold returns the release point', () => {
    const trail = grabbedAt(A);
    let x = A.x;
    for (let t = FRAME; t <= 20 * FRAME; t += FRAME) {
      x += 0.01;
      push(trail, x, A.y, t);
    }
    expect(releaseOf(trail)).toEqual({ x, y: A.y });
  });

  test('a hold that ended 300 ms before the release returns the release point', () => {
    const trail = grabbedAt(A);
    const STEP = 25;
    for (let t = 25; t <= 200; t += STEP) push(trail, B.x, B.y, t);
    // Left b at 225 ms, then a steady sweep to the release at 525 ms.
    let x = B.x;
    for (let t = 225; t <= 525; t += STEP) {
      x += 0.01;
      push(trail, x, B.y, t);
    }
    expect(releaseOf(trail)).toEqual({ x, y: B.y });
  });

  test('a mouse that held still (no move events) at b for 200 ms, then jumped 4 cm on release, returns b', () => {
    const trail = grabbedAt(A);
    push(trail, B.x, B.y, 50);
    push(trail, B.x, B.y - 0.04, 250);
    push(trail, B.x, B.y - 0.04, 250);
    expect(releaseOf(trail)).toEqual(B);
  });

  test('a hold at the grab is the pinch itself: a flick off it right after returns the release point', () => {
    const trail = grabbedAt(A);
    for (let t = 20; t <= 200; t += 20) push(trail, A.x, A.y, t);
    push(trail, B.x, B.y, 260);
    push(trail, B.x, B.y, 276);
    expect(releaseOf(trail)).toEqual(B);
  });

  test('1000 pushes keep the same buffer object and length', () => {
    const trail = grabbedAt(A);
    const buffer = trail.samples;
    const length = buffer.length;
    for (let i = 0; i < 1000; i++) push(trail, i * 0.001, 0, i * FRAME);
    expect(trail.samples).toBe(buffer);
    expect(trail.samples.length).toBe(length);
    expect(length).toBe(TRAIL_SAMPLES * 3);
  });

  test('an empty trail leaves `out` as it was', () => {
    const trail = createTrail();
    expect(stableRelease(trail, { x: 1, y: 2 })).toEqual({ x: 1, y: 2 });
  });
});
