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

/** Rail pegs (World 3): brass rail behind the channel, tab to pinch-and-slide. */
export const SLIDER = {
  railRadius: 0.003,
  /** Distance from the peg to its handle, perpendicular to the rail. */
  handleOffset: 0.03,
  handleSize: [0.024, 0.016, 0.01] as const,
  /** Walnut grip stripe on the tab, as a fraction of the tab's size (proud of its face). */
  gripScale: [0.7, 0.25, 1.1] as const,
  /** Rail segments; the rod is thin enough that 8 reads as round. */
  railSegments: 8,
  /** Soft G4 "click" when a slid peg settles into place. */
  settleHz: 392.0,
  settleVolume: 0.35,
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
  /** Max horizontal spawn nudge so stacked marbles never balance in a column. */
  spawnJitter: 0.002,
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
  /** Visible string vibration after a pluck: decay per second, wobble speed, thickness gain. */
  vibrationDecay: 3.5,
  vibrationRate: 55,
  vibrationGain: 0.9,
} as const;

/** Shape glyphs paired with sorting colors (colorblind-safe). */
export const GLYPH = {
  radius: 0.011,
  /** Gap in front of the chute / ledge face so the glyph never z-fights. */
  standoff: 0.002,
} as const;

/** Front ledge with pokeable Restart / Next buttons (no floating menus). */
export const CONTROLS = {
  ledgeDepth: 0.05,
  buttonRadius: 0.017,
  buttonHeight: 0.012,
  /** Distance of each button from its side of the diorama. */
  buttonInset: 0.05,
  /** Gap between neighbouring ledge buttons (centre to centre). */
  buttonSpacing: 0.05,
} as const;

/** Plaque standing on the diorama's top edge (UIKit panel, centimetre units inside). */
export const HUD = {
  /** Gap between the back panel's top edge (and chute rims) and the plaque's bottom edge. */
  lift: 0.015,
  /** Flush with the back panel, behind the marble channel. */
  depth: -0.012,
  playingColor: '#3d2f2a',
  solvedColor: '#b8862f',
  starOn: '#f2c14e',
  starOff: '#3d2f2a',
} as const;

/** Ghost-hand tutorial on level 1 (diorama-local meters). */
export const ONBOARDING = {
  color: 0xbfe8ff,
  maxOpacity: 0.75,
  tipRadius: 0.007,
  /** Fingertip separation when the ghost hand is open. */
  openGap: 0.02,
  /** Ghost fingertips hover this far in front of the peg knobs. */
  hover: 0.02,
  ringRadius: 0.024,
  ringTube: 0.0025,
  threadRadius: 0.003,
  /** Pinch point above a chute's mouth. */
  chuteLift: 0.035,
  emissiveIntensity: 0.8,
  /** Target rings glow steadily (independent of the ghost's fade) with a slow pulse. */
  ringOpacity: 0.55,
  ringPulse: 0.25,
  ringPulseRate: 3,
  tipSegments: [16, 12] as const,
  ringSegments: [8, 32] as const,
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
