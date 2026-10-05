import type { Vec3 } from './vec';

/** A detected plane's own frame: its pose and its polygon's bounds in plane space. */
export interface PlanePose {
  /** Plane-space origin in world space (y is the surface height). */
  readonly origin: Vec3;
  /** Rotation of the plane about +Y. */
  readonly yaw: number;
  /** Polygon bounds in plane space (x, z). */
  readonly min: readonly [number, number];
  readonly max: readonly [number, number];
}

export interface PlaneCandidate {
  readonly orientation: 'horizontal' | 'vertical' | string;
  readonly label?: string;
  /** World-space axis-aligned bounds of the detected plane. */
  readonly min: Vec3;
  readonly max: Vec3;
  /** When known, the plane's true frame: a rotated table is a rectangle there, not a loose box. */
  readonly pose?: PlanePose;
}

/** Half the depth of the diorama's footprint on a table (case plus ledge, rounded up). */
export const FOOTPRINT_HALF_DEPTH = 0.1;
/** The side walls stand just outside the level's width. */
const FOOTPRINT_SIDE_MARGIN = 0.01;
const FIT_EPSILON = 1e-6;

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
/**
 * A table's near edge must be within this horizontal distance of the head: with
 * the edge inset, the diorama's centre then stays within a seated 2 ft. A table
 * farther away isn't the player's table; floating in front of them is better.
 */
const MAX_REACH = 0.45;
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

/** A surface in its own frame, where even a rotated table is an axis-aligned rectangle. */
interface SurfaceFrame {
  readonly top: number;
  readonly min: readonly [number, number];
  readonly max: readonly [number, number];
  toLocal(x: number, z: number): [number, number];
  toWorld(lx: number, lz: number): [number, number];
}

function surfaceFrame(p: PlaneCandidate): SurfaceFrame {
  if (!p.pose) {
    return {
      top: p.max[1],
      min: [p.min[0], p.min[2]],
      max: [p.max[0], p.max[2]],
      toLocal: (x, z) => [x, z],
      toWorld: (lx, lz) => [lx, lz],
    };
  }
  const { origin, yaw, min, max } = p.pose;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return {
    top: origin[1],
    min,
    max,
    toLocal: (x, z) => {
      const dx = x - origin[0];
      const dz = z - origin[2];
      return [dx * c - dz * s, dx * s + dz * c];
    },
    toWorld: (lx, lz) => [origin[0] + lx * c + lz * s, origin[2] - lx * s + lz * c],
  };
}

function isUsableSurface(p: PlaneCandidate, frame: SurfaceFrame, head: Vec3, width: number): boolean {
  if (p.orientation !== 'horizontal') return false;
  if (p.label === 'floor' || p.label === 'ceiling') return false;
  const top = frame.top;
  if (top < MIN_SURFACE_HEIGHT || top > MAX_SURFACE_HEIGHT || top > head[1] - MIN_BELOW_EYES) {
    return false;
  }
  const spanX = frame.max[0] - frame.min[0];
  const spanZ = frame.max[1] - frame.min[1];
  return Math.max(spanX, spanZ) >= width * 0.8 && Math.min(spanX, spanZ) >= MIN_DEPTH;
}

/** Nearest point of the surface to the head, in the surface's frame. */
function nearestLocal(frame: SurfaceFrame, head: Vec3): [number, number] {
  const [hx, hz] = frame.toLocal(head[0], head[2]);
  return [clamp(hx, frame.min[0], frame.max[0]), clamp(hz, frame.min[1], frame.max[1])];
}

/** The base's four corners, in the surface's frame, for a centre and facing. */
function footprintLocal(frame: SurfaceFrame, center: Vec3, yaw: number, halfWidth: number): [number, number][] {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const corners: [number, number][] = [];
  for (const [x, z] of [
    [-halfWidth, -FOOTPRINT_HALF_DEPTH],
    [halfWidth, -FOOTPRINT_HALF_DEPTH],
    [halfWidth, FOOTPRINT_HALF_DEPTH],
    [-halfWidth, FOOTPRINT_HALF_DEPTH],
  ]) {
    corners.push(frame.toLocal(center[0] + x * c + z * s, center[2] - x * s + z * c));
  }
  return corners;
}

/** How far (local x, z) to move so the corners fit the surface; null if they can't. */
function fitShift(frame: SurfaceFrame, corners: readonly [number, number][]): [number, number] | null {
  const shift: [number, number] = [0, 0];
  for (const axis of [0, 1] as const) {
    const lo = Math.min(...corners.map((c) => c[axis]));
    const hi = Math.max(...corners.map((c) => c[axis]));
    const under = frame.min[axis] - lo;
    const over = hi - frame.max[axis];
    if (under > FIT_EPSILON && over > FIT_EPSILON) return null;
    shift[axis] = under > FIT_EPSILON ? under : over > FIT_EPSILON ? -over : 0;
  }
  return shift;
}

/** Near the edge closest to the player, inset, facing them, and with the whole base on the surface. */
function placeOn(frame: SurfaceFrame, head: Vec3, dioramaWidth: number): Placement | null {
  const [hx, hz] = frame.toLocal(head[0], head[2]);
  const [nx, nz] = nearestLocal(frame, head);
  // Push inward, away from the player; if the head is above the surface, aim at its middle.
  let dx = nx - hx;
  let dz = nz - hz;
  let len = Math.hypot(dx, dz);
  if (len < 1e-3) {
    dx = (frame.min[0] + frame.max[0]) / 2 - hx;
    dz = (frame.min[1] + frame.max[1]) / 2 - hz;
    len = Math.hypot(dx, dz) || 1;
  }
  const lx = clamp(nx + (dx / len) * EDGE_INSET, frame.min[0], frame.max[0]);
  const lz = clamp(nz + (dz / len) * EDGE_INSET, frame.min[1], frame.max[1]);
  // Face the player from the first spot; with the facing fixed, one shift fits the base exactly.
  const [wx, wz] = frame.toWorld(lx, lz);
  const yaw = facingYaw([wx, frame.top, wz], head);
  const halfWidth = dioramaWidth / 2 + FOOTPRINT_SIDE_MARGIN;
  const shift = fitShift(frame, footprintLocal(frame, [wx, frame.top, wz], yaw, halfWidth));
  if (!shift) return null;
  const [fx, fz] = frame.toWorld(lx + shift[0], lz + shift[1]);
  return { center: [fx, frame.top, fz], yaw };
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
  let best: { placement: Placement; score: number } | null = null;
  for (const plane of planes) {
    const frame = surfaceFrame(plane);
    if (!isUsableSurface(plane, frame, head, dioramaWidth)) continue;
    // Rotation preserves distance, so reach is measured in the surface's frame.
    const [hx, hz] = frame.toLocal(head[0], head[2]);
    const [nx, nz] = nearestLocal(frame, head);
    const distance = Math.hypot(nx - hx, nz - hz);
    if (distance > MAX_REACH) continue;
    const [cx, cz] = frame.toWorld((frame.min[0] + frame.max[0]) / 2, (frame.min[1] + frame.max[1]) / 2);
    const cos = facingCos(head, forward, cx, cz);
    if (cos < MIN_FACING_COS) continue;
    const placement = placeOn(frame, head, dioramaWidth);
    if (!placement) continue;
    const score =
      distance +
      FACING_WEIGHT * ((1 - cos) / 2) -
      (plane.label && TABLE_LABELS.has(plane.label) ? 0.5 : 0);
    if (!best || score < best.score) best = { placement, score };
  }
  return best?.placement ?? null;
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
