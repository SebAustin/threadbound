import { add, clamp, dot, length, scale, sub, type Quat, type Vec3 } from './vec';

export interface SegmentTransform {
  readonly midpoint: Vec3;
  readonly length: number;
  /** Rotates local +Y (capsule/cylinder axis) onto the segment direction. */
  readonly quaternion: Quat;
}

const EPSILON = 1e-9;

/** Transform that stretches a Y-aligned capsule from `a` to `b`, or null if degenerate. */
export function segmentTransform(a: Vec3, b: Vec3): SegmentTransform | null {
  const d = sub(b, a);
  const len = length(d);
  if (len < EPSILON) return null;
  const dir = scale(d, 1 / len);
  return {
    midpoint: scale(add(a, b), 0.5),
    length: len,
    quaternion: quatFromUnitY(dir),
  };
}

/** Shortest-arc rotation from +Y to the unit vector `dir`. */
function quatFromUnitY(dir: Vec3): Quat {
  const cos = dir[1]; // dot([0,1,0], dir)
  if (cos < -1 + EPSILON) return [1, 0, 0, 0]; // 180° about X
  // axis = cross([0,1,0], dir) = [dir.z, 0, -dir.x]
  const x = dir[2];
  const z = -dir[0];
  const w = 1 + cos;
  const n = Math.sqrt(x * x + z * z + w * w);
  return [x / n, 0, z / n, w / n];
}

export interface ClosestPoint {
  readonly point: Vec3;
  /** Parametric position along the segment, 0 at `a`, 1 at `b`. */
  readonly t: number;
  readonly distance: number;
}

export function closestPointOnSegment(p: Vec3, a: Vec3, b: Vec3): ClosestPoint {
  const ab = sub(b, a);
  const denom = dot(ab, ab);
  const t = denom < EPSILON ? 0 : clamp(dot(sub(p, a), ab) / denom, 0, 1);
  const point = add(a, scale(ab, t));
  return { point, t, distance: length(sub(p, point)) };
}
