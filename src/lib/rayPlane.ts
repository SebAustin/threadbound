const EPSILON = 1e-9;

/**
 * Intersects a ray with the plane z = planeZ (both expressed in the same local frame)
 * and writes the hit's x, y into `out`. Allocation-free, for per-move drag handling.
 * Returns false, leaving `out` untouched, when the ray is parallel to the plane or
 * points away from it.
 */
export function intersectRayWithPlaneZInto(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  planeZ: number,
  out: { x: number; y: number },
): boolean {
  if (Math.abs(dz) < EPSILON) return false;
  const t = (planeZ - oz) / dz;
  if (t < 0) return false;
  out.x = ox + dx * t;
  out.y = oy + dy * t;
  return true;
}
