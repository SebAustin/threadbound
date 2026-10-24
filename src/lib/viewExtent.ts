import { AIM_PLANE_Z, CHUTE, CONTROLS, GOAL, HUD } from '../config/constants';
import { LEDGE_BUTTON_Z, ledgeButtonX, ledgeStripPose } from './ledge';
import type { Level } from './levelSchema';
import { frameToWorld } from './placement';
import { dot, sub, type Vec3 } from './vec';

/**
 * How much of the view a layout takes up, for the field-of-view test (gap 55).
 * Angles are degrees; points are meters, frame-local unless named world.
 */
export interface ViewSpan {
  readonly h: number;
  readonly v: number;
}

const DEG = 180 / Math.PI;

/**
 * The angle `points` take up for a head at `head` that turns (yaw, then pitch,
 * no roll) to the middle of their azimuth and elevation ranges. Each point's
 * angle on each axis is its angle on a flat display facing that way, so `h` and
 * `v` compare directly with a headset's field of view.
 */
export function viewSpan(head: Vec3, points: readonly Vec3[]): ViewSpan {
  const offsets = points.map((p) => sub(p, head));
  const azimuths = offsets.map(([x, , z]) => Math.atan2(x, -z));
  const elevations = offsets.map(([x, y, z]) => Math.atan2(y, Math.hypot(x, z)));
  const yaw = (Math.max(...azimuths) + Math.min(...azimuths)) / 2;
  const pitch = (Math.max(...elevations) + Math.min(...elevations)) / 2;
  const [cy, sy, cp, sp] = [Math.cos(yaw), Math.sin(yaw), Math.cos(pitch), Math.sin(pitch)];
  const forward: Vec3 = [sy * cp, sp, -cy * cp];
  const right: Vec3 = [cy, 0, sy];
  const up: Vec3 = [-sy * sp, cp, cy * sp];
  const across = offsets.map((d) => Math.atan2(dot(d, right), dot(d, forward)));
  const upward = offsets.map((d) => Math.atan2(dot(d, up), dot(d, forward)));
  const range = (angles: readonly number[]) => (Math.max(...angles) - Math.min(...angles)) * DEG;
  return { h: range(across), v: range(upward) };
}

export type PlaqueFace = 'level' | 'settings';

/** The plaque face's corners: centred over the level, growing up from its bottom edge. */
function plaqueCorners(level: Level, face: PlaqueFace): Vec3[] {
  const [w, h] = level.size;
  const bottom = h + HUD.lift;
  const top = bottom + (face === 'level' ? HUD.levelFaceMaxHeight : HUD.settingsFaceMaxHeight);
  const [left, right] = [w / 2 - HUD.maxWidth / 2, w / 2 + HUD.maxWidth / 2];
  return [
    [left, bottom, HUD.depth],
    [right, bottom, HUD.depth],
    [right, top, HUD.depth],
    [left, top, HUD.depth],
  ];
}

/** Each cup's opening: its inner edges, from the floor to the top of its walls. */
const cupOpenings = (level: Level): Vec3[] =>
  level.goals.flatMap((g) =>
    [g.x - g.width / 2, g.x + g.width / 2].flatMap((x): Vec3[] => [
      [x, 0, 0],
      [x, GOAL.wallHeight, 0],
    ]),
  );

/** Each chute's rim, left and right, on the knobs' plane. */
const chuteRims = (level: Level): Vec3[] =>
  level.chutes.flatMap((c) => {
    const y = c.y + CHUTE.lift + CHUTE.height / 2;
    return [-1, 1].map((side): Vec3 => [c.x + side * CHUTE.topRadius, y, AIM_PLANE_Z]);
  });

/** Each peg's knob, plus both rail ends for a rail peg. */
const pegKnobs = (level: Level): Vec3[] =>
  level.pegs.flatMap((p): Vec3[] => {
    const knob: Vec3 = [p.x, p.y, AIM_PLANE_Z];
    if (!p.rail) return [knob];
    const ends = [p.rail.min, p.rail.max].map((v): Vec3 =>
      p.rail?.axis === 'x' ? [v, p.y, AIM_PLANE_Z] : [p.x, v, AIM_PLANE_Z],
    );
    return [knob, ...ends];
  });

/**
 * The settings button: its cap's top face, where a ray or a fingertip presses it
 * (the point xr-probe aims at), which flips the settings face back.
 */
function settingsButton(level: Level): Vec3[] {
  const { buttonRadius: r, buttonHeight: y } = CONTROLS;
  const x = ledgeButtonX('settings', level.size[0]);
  return [
    [x - r, y, LEDGE_BUTTON_Z],
    [x + r, y, LEDGE_BUTTON_Z],
    [x, y, LEDGE_BUTTON_Z - r],
    [x, y, LEDGE_BUTTON_Z + r],
  ];
}

/** Frame-local essential points by part: what must be in view with each plaque face up. */
export interface EssentialParts {
  readonly plaque: readonly Vec3[];
  readonly strip: readonly Vec3[];
  readonly cups: readonly Vec3[];
  readonly chutes: readonly Vec3[];
  readonly pegs: readonly Vec3[];
  readonly button: readonly Vec3[];
}

/**
 * With the level face up: the face, the ledge strip, every cup opening, the chute
 * rims and the peg knobs (rail ends included). With the settings face up: the face
 * and the ledge's settings button, which flips it back.
 */
export function essentialParts(level: Level, face: PlaqueFace): EssentialParts {
  const plaque = plaqueCorners(level, face);
  if (face === 'settings') return { plaque, strip: [], cups: [], chutes: [], pegs: [], button: settingsButton(level) };
  return {
    plaque,
    strip: ledgeStripPose(level.size[0]).corners,
    cups: cupOpenings(level),
    chutes: chuteRims(level),
    pegs: pegKnobs(level),
    button: [],
  };
}

/** World positions of every essential point for a frame at `origin` turned by `yaw`. */
export function essentialPoints(level: Level, origin: Vec3, yaw: number, face: PlaqueFace): Vec3[] {
  const parts = essentialParts(level, face);
  return [...parts.plaque, ...parts.strip, ...parts.cups, ...parts.chutes, ...parts.pegs, ...parts.button].map((p) =>
    frameToWorld(origin, yaw, p),
  );
}
