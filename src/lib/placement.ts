import type { Vec3 } from './vec';

export interface PlaneCandidate {
  readonly orientation: 'horizontal' | 'vertical' | string;
  readonly label?: string;
  /** World-space axis-aligned bounds of the detected plane. */
  readonly min: Vec3;
  readonly max: Vec3;
}

export interface Placement {
  /** Center of the diorama base, on the surface. */
  readonly center: Vec3;
  /** Rotation about +Y so the diorama's front (+z) faces the player. */
  readonly yaw: number;
}

/** Seated-reach limits (meters) from Meta's hands guidelines and the airplane-seat test. */
const MIN_SURFACE_HEIGHT = 0.45;
const MAX_SURFACE_HEIGHT = 1.15;
const MIN_BELOW_EYES = 0.15;
const MAX_REACH = 1.0;
const MIN_DEPTH = 0.2;
/** How far in from the near edge the diorama center sits so its base rests fully on the surface. */
const EDGE_INSET = 0.15;
const TABLE_LABELS = new Set(['table', 'desk']);
/** Score penalty (≈ meters) for a surface fully to the side; scales with off-axis angle. */
const FACING_WEIGHT = 0.8;
/** Surfaces more than ~60° off the player's heading are not "their" table. */
const MIN_FACING_COS = 0.5;
const HEAD_FORWARD = 0.45;
const HEAD_DROP = 0.42;

export function facingYaw(center: Vec3, viewer: Vec3): number {
  return Math.atan2(viewer[0] - center[0], viewer[2] - center[2]);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function isUsableSurface(p: PlaneCandidate, head: Vec3, width: number): boolean {
  if (p.orientation !== 'horizontal') return false;
  if (p.label === 'floor' || p.label === 'ceiling') return false;
  const top = p.max[1];
  if (top < MIN_SURFACE_HEIGHT || top > MAX_SURFACE_HEIGHT || top > head[1] - MIN_BELOW_EYES) {
    return false;
  }
  return p.max[0] - p.min[0] >= width * 0.8 && p.max[2] - p.min[2] >= MIN_DEPTH;
}

function nearestPointXZ(p: PlaneCandidate, head: Vec3): [number, number] {
  return [clamp(head[0], p.min[0], p.max[0]), clamp(head[2], p.min[2], p.max[2])];
}

function placeOn(p: PlaneCandidate, head: Vec3): Placement {
  const [nx, nz] = nearestPointXZ(p, head);
  const cx = (p.min[0] + p.max[0]) / 2;
  const cz = (p.min[2] + p.max[2]) / 2;
  // Push inward, away from the player; if the head is above the surface, aim at its middle.
  let dx = nx - head[0];
  let dz = nz - head[2];
  let len = Math.hypot(dx, dz);
  if (len < 1e-3) {
    dx = cx - head[0];
    dz = cz - head[2];
    len = Math.hypot(dx, dz) || 1;
  }
  const x = clamp(nx + (dx / len) * EDGE_INSET, p.min[0], p.max[0]);
  const z = clamp(nz + (dz / len) * EDGE_INSET, p.min[2], p.max[2]);
  const center: Vec3 = [x, p.max[1], z];
  return { center, yaw: facingYaw(center, head) };
}

/** Best table-like surface within seated reach, or null to fall back to head-relative. */
/** cos of the horizontal angle between `forward` and the direction to (x, z); 1 if undefined. */
function facingCos(head: Vec3, forward: Vec3 | undefined, x: number, z: number): number {
  if (!forward) return 1;
  const fLen = Math.hypot(forward[0], forward[2]);
  const dx = x - head[0];
  const dz = z - head[2];
  const dLen = Math.hypot(dx, dz);
  if (fLen < 1e-3 || dLen < 1e-3) return 1;
  return (forward[0] * dx + forward[2] * dz) / (fLen * dLen);
}

/**
 * Best table-like surface within seated reach, or null to fall back to
 * head-relative. With `forward`, surfaces ahead are preferred and anything
 * more than ~60° to the side (or behind) is ignored: floating the diorama in
 * front of a seated player beats making them turn to a side table.
 */
export function choosePlacement(
  planes: readonly PlaneCandidate[],
  head: Vec3,
  dioramaWidth: number,
  forward?: Vec3,
): Placement | null {
  let best: { plane: PlaneCandidate; score: number } | null = null;
  for (const plane of planes) {
    if (!isUsableSurface(plane, head, dioramaWidth)) continue;
    const [nx, nz] = nearestPointXZ(plane, head);
    const distance = Math.hypot(nx - head[0], nz - head[2]);
    if (distance > MAX_REACH) continue;
    const cx = (plane.min[0] + plane.max[0]) / 2;
    const cz = (plane.min[2] + plane.max[2]) / 2;
    const cos = facingCos(head, forward, cx, cz);
    if (cos < MIN_FACING_COS) continue;
    const score =
      distance +
      FACING_WEIGHT * ((1 - cos) / 2) -
      (plane.label && TABLE_LABELS.has(plane.label) ? 0.5 : 0);
    if (!best || score < best.score) best = { plane, score };
  }
  return best ? placeOn(best.plane, head) : null;
}

/** No usable table: float the diorama at lap/table height in front of the player. */
export function headRelativePlacement(head: Vec3, forward: Vec3): Placement {
  let fx = forward[0];
  let fz = forward[2];
  const len = Math.hypot(fx, fz);
  if (len < 1e-3) {
    fx = 0;
    fz = -1;
  } else {
    fx /= len;
    fz /= len;
  }
  const center: Vec3 = [head[0] + fx * HEAD_FORWARD, head[1] - HEAD_DROP, head[2] + fz * HEAD_FORWARD];
  return { center, yaw: facingYaw(center, head) };
}

/** DioramaFrame origin (bottom-left corner) for a base centered at `center`. */
export function originFromCenter(center: Vec3, yaw: number, width: number): Vec3 {
  const half = width / 2;
  return [center[0] - half * Math.cos(yaw), center[1], center[2] + half * Math.sin(yaw)];
}

/** One player adjustment step (meters): up/down, and toward/away along the diorama's facing. */
export const OFFSET_STEP = { up: 0.025, near: 0.04 } as const;

export interface DioramaOffset {
  /** Whole steps up (negative: down). */
  readonly up: number;
  /** Whole steps toward the player (negative: away). */
  readonly near: number;
}

/**
 * Frame origin moved by the player's offset. The diorama faces local +z, which
 * for a frame turned by `yaw` points along (sin yaw, 0, cos yaw) in the world.
 */
export function offsetOrigin(origin: Vec3, yaw: number, offset: DioramaOffset): Vec3 {
  const near = offset.near * OFFSET_STEP.near;
  return [origin[0] + near * Math.sin(yaw), origin[1] + offset.up * OFFSET_STEP.up, origin[2] + near * Math.cos(yaw)];
}
