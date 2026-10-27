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
  /** The ball on the peg's tip (1.5 x radius), on the knobs' plane: where a pinch lands. */
  knobRadius: 0.0165,
  length: 0.04,
  /** Pointer release within this distance of a peg attaches the thread to it. */
  snapRadius: 0.035,
} as const;

/**
 * Depth (diorama-local z) of the peg knobs and rail tabs: the surface players
 * actually aim at. Drag rays are intersected here, not with the back panel, or
 * a hand pointing up from below would land centimetres past the knob.
 */
export const AIM_PLANE_Z = DIORAMA.channelHalfDepth + PEG.radius;

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

/**
 * Invisible hit areas around thin parts (threads, tabs), so each is at least
 * as easy to aim at as a target of `minDegrees` (src/lib/hitArea.ts).
 */
export const HIT_AREA = {
  /** The smallest angle a ray target should subtend at the eye. */
  minDegrees: 2.5,
  /**
   * Meters from a seated head to the farthest point it aims at: the diorama's
   * far bottom corner, floated in front of the head and moved to Farther -2
   * (0.721 m, tests/unit/hitArea.test.ts), rounded up.
   */
  worstDistance: 0.73,
} as const;

/** Shape glyphs paired with sorting colors (colorblind-safe). */
export const GLYPH = {
  radius: 0.011,
  /** Gap in front of the chute / ledge face so the glyph never z-fights. */
  standoff: 0.002,
  /** The dark disc behind a glyph in high contrast: a ring of it shows around the glyph. */
  backingRadius: 0.015,
  /** The backing sits this far behind its glyph, still in front of the chute or ledge face. */
  backingGap: 0.001,
} as const;

/** Front ledge with pokeable Restart / Next buttons (no floating menus). */
export const CONTROLS = {
  ledgeDepth: 0.05,
  buttonRadius: 0.017,
  buttonHeight: 0.012,
  /**
   * Distance of each button from its side of the diorama. 6 cm keeps the outer
   * buttons within a seated 2 ft reach even at the Farther setting, measured in
   * the study pose (reach.e2e); the Quest pose is in tests/unit/viewExtent.test.ts.
   */
  buttonInset: 0.06,
  /** Gap between neighbouring ledge buttons (centre to centre). */
  buttonSpacing: 0.05,
} as const;

/** Plaque standing on the diorama's top edge (UIKit panel, centimetre units inside). */
export const HUD = {
  /** Gap between the back panel's top edge (and chute rims) and the plaque's bottom edge. */
  lift: 0.015,
  /** Flush with the back panel, behind the marble channel. */
  depth: -0.012,
  /**
   * The plaque's faces stay within these (public/ui/hud.uikitml; settings.e2e
   * measures them), so the field-of-view test can rely on them. 44 cm is inside
   * the cups' 48 cm spread, but the plaque still widens the view: it sits high,
   * so the view pitches up to take it in, and a point far above or below the
   * view's centre lands wider on the display than its x alone gives (w2-03,
   * Quest pose, default offset: playfield 54.2 degrees, with the plaque 57.7).
   */
  maxWidth: 0.44,
  /** Title, world label and stars in one row. */
  levelFaceMaxHeight: 0.07,
  /** Three rows of controls at least 22 mm tall, 12 mm apart. */
  settingsFaceMaxHeight: 0.1,
} as const;

/**
 * The strip on the ledge, between Daily and Next, holding the hint line and the
 * thread count (public/ui/ledge.uikitml). Frame meters and radians.
 */
export const LEDGE_STRIP = {
  /** Edge-to-edge gap to the Daily and Next buttons (Meta's 12 mm between interactables). */
  gap: 0.012,
  /** From its bottom edge, at the ledge front, to its back edge, along its face. */
  height: 0.045,
  /** Raised about 20 degrees from lying flat, toward the player (the button icons lean 30). */
  lean: 0.35,
  /** Its bottom edge sits this far above the ledge top, so it never z-fights. */
  lift: 0.001,
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
  /** Pinch point above the level's chute point. */
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
  /** The glowing inset is a thin visual layer resting on the base (the base is the collider). */
  insetThickness: 0.002,
} as const;

/** The brass funnel marbles drop from. */
export const CHUTE = {
  /** The funnel's centre sits this far above the level's chute point; pinches aim there. */
  lift: 0.02,
  topRadius: 0.03,
  bottomRadius: 0.014,
  height: 0.035,
  segments: 16,
  /** Colored rim around the funnel's top: the color of marbles it releases. */
  rimTube: 0.004,
} as const;

/** Contact friction of static parts: the case walls and the pegs. */
export const FRICTION = {
  walls: 0.4,
  pegs: 0.3,
} as const;

/** VR-fallback "cozy study" (world-space meters). Hidden over passthrough. */
export const VIRTUAL_ROOM = {
  background: 0x30221d,
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
