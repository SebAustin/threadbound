import { AIM_PLANE_Z, CHUTE, CONTROLS, DIORAMA, DIORAMA_DEFAULT_POSITION, HUD } from '../config/constants';
import { LEDGE_BUTTON_Z, LEDGE_BUTTONS, LEDGE_FRONT_Z, ledgeButtonX } from './ledge';
import type { Level } from './levelSchema';
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

/**
 * The base's real footprint on a table, from the marble channel (frame z = 0): the case
 * reaches 3 cm behind it, the ledge 8 cm in front of it.
 */
export const FOOTPRINT = {
  back: DIORAMA.channelHalfDepth + DIORAMA.slab,
  front: LEDGE_FRONT_Z,
} as const;
/** The side walls stand just outside the level's width. */
const FOOTPRINT_SIDE_MARGIN = DIORAMA.wallThickness;
const FIT_EPSILON = 1e-6;

export interface Placement {
  /**
   * Centre of the base's top along the marble channel: the frame origin's height. On a
   * table that is DIORAMA.slab above the surface, so the base rests on it.
   */
  readonly center: Vec3;
  /** Rotation about +Y so the diorama's front (+z) faces the player. */
  readonly yaw: number;
}

/** Seated-reach limits (meters) from Meta's hands guidelines and the airplane-seat test. */
const MIN_SURFACE_HEIGHT = 0.45;
const MAX_SURFACE_HEIGHT = 1.15;
const MIN_BELOW_EYES = 0.15;
/**
 * A table is accepted only while everything a player touches on it (reachAt) is within
 * this distance of the head. It is set by ray-pinch reach from a chair, not by literal
 * arm's reach: the user's decisions on Oct 25 (Q47, revising Q41's 2 ft, and Q50), so an
 * ordinary desk is accepted. A 0.74 m desk with its near edge 0.50 m from a seated head is
 * then accepted on every level (w4-06's peg v, at 0.685 m, is why it is 0.69, not 0.68);
 * farther, the diorama floats within reach instead.
 */
export const ACCEPT_REACH = 0.69;
const MIN_DEPTH = 0.2;
const TABLE_LABELS = new Set(['table', 'desk']);
/** Score penalty (≈ meters) for a surface fully to the side; scales with off-axis angle. */
const FACING_WEIGHT = 0.8;
/** The diorama standing more than 60 degrees off the player's heading is not on "their" table. */
const MIN_FACING_COS = 0.5;
/**
 * Score bonus (≈ meters) for a plane labelled table or desk. It stays below the facing
 * penalty at the gate (FACING_WEIGHT * (1 - MIN_FACING_COS) / 2 = 0.2), so a desk well off
 * to the side can't beat an unlabelled table straight ahead.
 */
const TABLE_LABEL_BONUS = 0.15;
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
    [-halfWidth, -FOOTPRINT.back],
    [halfWidth, -FOOTPRINT.back],
    [halfWidth, FOOTPRINT.front],
    [-halfWidth, FOOTPRINT.front],
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

/**
 * As close to the player's edge as the base's real footprint allows (the ledge's front on
 * the near edge), facing them, with the whole base on the surface and resting on it.
 */
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
  const lx = clamp(nx + (dx / len) * FOOTPRINT.front, frame.min[0], frame.max[0]);
  const lz = clamp(nz + (dz / len) * FOOTPRINT.front, frame.min[1], frame.max[1]);
  // Face the player from the first spot; with the facing fixed, one shift fits the base exactly.
  const [wx, wz] = frame.toWorld(lx, lz);
  const yaw = facingYaw([wx, frame.top, wz], head);
  const halfWidth = dioramaWidth / 2 + FOOTPRINT_SIDE_MARGIN;
  const shift = fitShift(frame, footprintLocal(frame, [wx, frame.top, wz], yaw, halfWidth));
  if (!shift) return null;
  const [fx, fz] = frame.toWorld(lx + shift[0], lz + shift[1]);
  // The frame origin is the base's top: lift it by the slab so the base sits on the surface, not in it.
  return { center: [fx, frame.top + DIORAMA.slab, fz], yaw };
}

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
 * Lower is better: how far away and how far off the heading the diorama would stand, less
 * a little for a plane labelled as a table. Null when it would stand more than ~60 degrees
 * off the heading, or when anything a player touches would be past ACCEPT_REACH.
 */
function scorePlacement(placement: Placement, plane: PlaneCandidate, head: Vec3, level: ReachLevel, forward?: Vec3): number | null {
  const [cx, , cz] = placement.center;
  const cos = facingCos(head, forward, cx, cz);
  if (cos < MIN_FACING_COS || reachAt(placement, head, level) > ACCEPT_REACH) return null;
  const distance = Math.hypot(cx - head[0], cz - head[2]);
  const label = plane.label && TABLE_LABELS.has(plane.label) ? TABLE_LABEL_BONUS : 0;
  return distance + FACING_WEIGHT * ((1 - cos) / 2) - label;
}

/**
 * Best table-like surface, or null to float the diorama in front of the player. Each
 * surface gets the placement placeOn finds, and is judged there: with `forward`, a
 * diorama more than ~60 degrees to the side (or behind) is refused, and surfaces ahead
 * are preferred. A surface is only accepted while every control stays within
 * ACCEPT_REACH of the head.
 */
export function choosePlacement(
  planes: readonly PlaneCandidate[],
  head: Vec3,
  level: ReachLevel,
  forward?: Vec3,
): Placement | null {
  let best: { placement: Placement; score: number } | null = null;
  for (const plane of planes) {
    const frame = surfaceFrame(plane);
    if (!isUsableSurface(plane, frame, head, level.size[0])) continue;
    const placement = placeOn(frame, head, level.size[0]);
    const score = placement && scorePlacement(placement, plane, head, level, forward);
    if (placement && score !== null && (!best || score < best.score)) best = { placement, score };
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

/**
 * World position of a frame-local point (x right, y up, z toward the player) for
 * a frame at `origin` turned by `yaw`: what DioramaFrame.localToWorld does.
 */
export function frameToWorld(origin: Vec3, yaw: number, local: Vec3): Vec3 {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [origin[0] + local[0] * c + local[2] * s, origin[1] + local[1], origin[2] - local[0] * s + local[2] * c];
}

/** The parts of a level that reach depends on. */
export type ReachLevel = Pick<Level, 'size' | 'pegs' | 'chutes'>;

/**
 * Frame-local points a player touches: each peg's knob, each chute's funnel
 * centre, the top of each ledge button's cap, and the plaque's stars. The stars
 * sit in the level face, so its two top corners stand in for them: a bound.
 */
function touchedPoints(level: ReachLevel): Vec3[] {
  const [w, h] = level.size;
  const plaqueTop = h + HUD.lift + HUD.levelFaceMaxHeight;
  return [
    ...level.pegs.map((p): Vec3 => [p.x, p.y, AIM_PLANE_Z]),
    ...level.chutes.map((c): Vec3 => [c.x, c.y + CHUTE.lift, 0]),
    ...LEDGE_BUTTONS.map((b): Vec3 => [ledgeButtonX(b, w), CONTROLS.buttonHeight, LEDGE_BUTTON_Z]),
    [w / 2 - HUD.maxWidth / 2, plaqueTop, HUD.depth],
    [w / 2 + HUD.maxWidth / 2, plaqueTop, HUD.depth],
  ];
}

/**
 * How far the head must reach (meters) for the farthest thing a player touches
 * on a level placed at `placement`: knobs, chutes, ledge buttons, plaque stars.
 */
export function reachAt(placement: Placement, head: Vec3, level: ReachLevel): number {
  const origin = originFromCenter(placement.center, placement.yaw, level.size[0]);
  let farthest = 0;
  for (const local of touchedPoints(level)) {
    const [x, y, z] = frameToWorld(origin, placement.yaw, local);
    farthest = Math.max(farthest, Math.hypot(x - head[0], y - head[1], z - head[2]));
  }
  return farthest;
}

/** Top of the virtual study's table, unmoved: it meets the base's underside at the study pose. */
export const STUDY_TABLE_TOP = DIORAMA_DEFAULT_POSITION[1] - DIORAMA.slab;

/** How the study table follows the player's offset: slid along z, and scaled about the floor. */
export interface StudyTableFit {
  readonly z: number;
  readonly scaleY: number;
}

/**
 * The study table's fit for an offset: Near steps slide it along z with the diorama (the
 * study pose faces +z); Up steps scale it about the floor, so its top stays flush with
 * the base's underside and its legs stay on the floor.
 */
export function studyTableFit(offset: DioramaOffset): StudyTableFit {
  return {
    z: offset.near * OFFSET_STEP.near,
    scaleY: (STUDY_TABLE_TOP + offset.up * OFFSET_STEP.up) / STUDY_TABLE_TOP,
  };
}
