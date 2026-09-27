/**
 * Tuning and budget constants. All distances are meters, in diorama-local space
 * unless stated otherwise (x right, y up from the base, z toward the player).
 */

/** Where the diorama sits in world space until AR table placement lands (seated, table height). */
export const DIORAMA_DEFAULT_POSITION = [0, 0.78, -0.42] as const;

export const DIORAMA = {
  /** Thickness of the back panel and base slab. */
  slab: 0.012,
  /** Half-depth of the marble channel between back panel and invisible front glass. */
  channelHalfDepth: 0.018,
  wallThickness: 0.01,
} as const;

export const PEG = {
  radius: 0.011,
  length: 0.04,
  /** Pointer release within this distance of a peg attaches the thread to it. */
  snapRadius: 0.035,
} as const;

export const MARBLE = {
  radius: 0.013,
  restitution: 0.4,
  friction: 0.2,
  density: 1,
  /** Lower gravity keeps marbles readable and reduces tunnelling through thin threads. */
  gravityFactor: 0.6,
  /** Seconds between marbles when the chute releases a batch. */
  releaseInterval: 0.45,
  /** Marbles further than this below the base are considered lost. */
  lostBelow: -0.15,
} as const;

export const THREAD_TUNING = {
  radius: 0.006,
  minLength: 0.05,
  maxLength: 0.45,
  /** Short, tight threads act like trampolines; long ones are slack. */
  maxRestitution: 0.95,
  minRestitution: 0.3,
  friction: 0.05,
} as const;

export const GOAL = {
  wallHeight: 0.035,
  floorThickness: 0.008,
} as const;

/** VR-fallback "cozy study" (world-space meters). Hidden over passthrough. */
export const VIRTUAL_ROOM = {
  background: 0x2b2130,
  tableTop: [1.1, 0.035, 0.7] as const,
  tableColor: 0x8a5a3c,
  legSize: 0.05,
  floorRadius: 4,
  floorColor: 0x3d2f2a,
  rugRadius: 1.1,
  rugColor: 0x6b3f4a,
} as const;

/** Performance budget enforced by design (no headset available to measure fps). */
export const PERF_BUDGET = {
  maxDrawCalls: 80,
  maxTriangles: 100_000,
  maxPhysicsBodies: 40,
} as const;
