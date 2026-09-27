/**
 * Deterministic horizontal nudge for the i-th marble of a drop. Perfectly
 * aligned spheres in a 2-D channel can balance in an unnatural column; tiny
 * alternating offsets break the symmetry while keeping runs reproducible.
 */
export function spawnOffsetX(index: number, maxJitter: number): number {
  if (index === 0) return 0;
  const side = index % 2 === 1 ? 1 : -1;
  const step = Math.ceil(index / 2); // 1,1,2,2,3,3…
  const fraction = 1 - 1 / (step + 1); // 0.5, 0.67, 0.75… → approaches 1
  return side * maxJitter * fraction;
}
