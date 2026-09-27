import type { Vec3 } from './vec';

const EPSILON = 1e-9;

/**
 * Intersects a ray with the plane z = planeZ (both expressed in the same local frame).
 * Returns null when the ray is parallel to the plane or points away from it.
 */
export function intersectRayWithPlaneZ(
  origin: Vec3,
  direction: Vec3,
  planeZ: number,
): Vec3 | null {
  if (Math.abs(direction[2]) < EPSILON) return null;
  const t = (planeZ - origin[2]) / direction[2];
  if (t < 0) return null;
  return [origin[0] + direction[0] * t, origin[1] + direction[1] * t, planeZ];
}
