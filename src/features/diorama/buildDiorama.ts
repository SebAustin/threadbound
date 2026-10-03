import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  PhysicsBody,
  PhysicsShape,
  PhysicsShapeType,
  PhysicsState,
  PokeInteractable,
  Quaternion,
  RayInteractable,
  TorusGeometry,
  Vector3,
  type Entity,
  type Material,
  type Object3D,
  type World,
} from '@iwsdk/core';
import { CONTROLS, DIORAMA, GLYPH, GOAL, PEG, SLIDER } from '../../config/constants';
import type { SortingColor } from '../../lib/marbleColors';
import type { Chute as ChuteSpec, Level } from '../../lib/levelSchema';
import { handleOffset, type Rail } from '../../lib/rail';
import { Chute, ControlActions, ControlButton, Peg, SliderHandle, type ControlAction } from '../puzzle/components';
import type { DioramaFrame } from './dioramaFrame';
import { GEOMETRIES, glyphMesh, goalMaterial, MATERIALS, marbleMaterial } from './palette';

export interface GoalRange {
  readonly minX: number;
  readonly maxX: number;
  /** Only marbles of this color score here; undefined accepts every color. */
  readonly color?: SortingColor;
}

export interface BuiltDiorama {
  /** Everything created for this level, disposed together on teardown. */
  readonly entities: readonly Entity[];
  readonly goals: readonly GoalRange[];
  readonly goalMeshes: readonly Mesh[];
  /** Shown only once the puzzle is solved. */
  readonly nextButton: Entity;
}

const PEG_ROTATION = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
const IDENTITY = new Quaternion();

/** Places `object` at a diorama-local pose and wraps it in a world-level entity. */
function place(
  world: World,
  frame: DioramaFrame,
  object: Object3D,
  local: readonly [number, number, number],
  localRotation: Quaternion = IDENTITY,
): Entity {
  frame.localToWorld(local[0], local[1], local[2], object.position);
  frame.worldQuaternion(localRotation, object.quaternion);
  return world.createTransformEntity(object);
}

function staticBox(
  world: World,
  frame: DioramaFrame,
  size: readonly [number, number, number],
  center: readonly [number, number, number],
  material: Material | null,
): Entity {
  const mesh = new Mesh(new BoxGeometry(size[0], size[1], size[2]), material ?? undefined);
  mesh.visible = material !== null;
  const entity = place(world, frame, mesh, center);
  entity.addComponent(PhysicsShape, {
    shape: PhysicsShapeType.Box,
    dimensions: [size[0], size[1], size[2]],
    friction: 0.4,
  });
  entity.addComponent(PhysicsBody, { state: PhysicsState.Static });
  return entity;
}

function buildCase(world: World, frame: DioramaFrame, level: Level): Entity[] {
  const [w, h] = level.size;
  const { slab, channelHalfDepth: chd, wallThickness: wall } = DIORAMA;
  const depth = chd * 2;
  const outerW = w + wall * 2;
  return [
    staticBox(world, frame, [outerW, slab, depth + slab * 2], [w / 2, -slab / 2, 0], MATERIALS.cream),
    staticBox(world, frame, [outerW, h + slab, slab], [w / 2, h / 2, -(chd + slab / 2)], MATERIALS.walnut),
    // Invisible front glass keeps marbles in the channel; hands reach through it freely.
    staticBox(world, frame, [outerW, h + slab, slab], [w / 2, h / 2, chd + slab / 2], null),
    staticBox(world, frame, [wall, h, depth], [-wall / 2, h / 2, 0], MATERIALS.walnut),
    staticBox(world, frame, [wall, h, depth], [w + wall / 2, h / 2, 0], MATERIALS.walnut),
  ];
}

function buildPeg(world: World, frame: DioramaFrame, peg: Level['pegs'][number]): Entity {
  const depth = DIORAMA.channelHalfDepth * 2;
  const group = new Group();
  const pin = new Mesh(new CylinderGeometry(PEG.radius, PEG.radius, depth, 12), MATERIALS.brass);
  // After the X rotation, local +Y points toward the player: the knob sits in front of the glass.
  const knob = new Mesh(GEOMETRIES.pegKnob, MATERIALS.brass);
  knob.position.y = DIORAMA.channelHalfDepth + PEG.radius;
  knob.name = 'peg-knob';
  group.add(pin, knob);
  group.name = `peg-${peg.id}`;

  const entity = place(world, frame, group, [peg.x, peg.y, 0], PEG_ROTATION);
  entity.addComponent(Peg, { pegId: peg.id, x: peg.x, y: peg.y });
  entity.addComponent(RayInteractable);
  entity.addComponent(PhysicsShape, {
    shape: PhysicsShapeType.Cylinder,
    dimensions: [PEG.radius, depth, 0],
    friction: 0.3,
  });
  entity.addComponent(PhysicsBody, { state: PhysicsState.Static });
  return entity;
}

function buildGoal(
  world: World,
  frame: DioramaFrame,
  goal: Level['goals'][number],
): { entities: Entity[]; range: GoalRange; mesh: Mesh } {
  const depth = DIORAMA.channelHalfDepth * 2;
  const wall = DIORAMA.wallThickness * 0.6;
  const half = goal.width / 2;
  const wallY = GOAL.wallHeight / 2;
  const left = staticBox(world, frame, [wall, GOAL.wallHeight, depth], [goal.x - half - wall / 2, wallY, 0], MATERIALS.walnut);
  const right = staticBox(world, frame, [wall, GOAL.wallHeight, depth], [goal.x + half + wall / 2, wallY, 0], MATERIALS.walnut);

  // Glowing floor inset: purely visual, the base slab is the collider.
  const floor = new Mesh(new BoxGeometry(goal.width, 0.002, depth), goalMaterial(goal.color, false));
  floor.name = 'goal-floor';
  const floorEntity = place(world, frame, floor, [goal.x, 0.001, 0]);
  // Shape marker on the front ledge, under the cup: visible even when the cup is full.
  const marker = goal.color ? glyphMesh(goal.color) : null;
  const markerEntities = marker
    ? [place(world, frame, marker, [goal.x, -DIORAMA.slab / 2, DIORAMA.channelHalfDepth + DIORAMA.slab + CONTROLS.ledgeDepth + GLYPH.standoff])]
    : [];
  return {
    entities: [left, right, floorEntity, ...markerEntities],
    range: { minX: goal.x - half, maxX: goal.x + half, color: goal.color },
    mesh: floor,
  };
}

function buildChute(world: World, frame: DioramaFrame, chute: ChuteSpec, index: number): Entity {
  const funnel = new Mesh(new CylinderGeometry(0.03, 0.014, 0.035, 16, 1, true), MATERIALS.brass);
  funnel.name = index === 0 ? 'chute' : `chute-${index}`;
  // A rim in the marble color tells the player what this chute releases.
  const rim = new Mesh(new TorusGeometry(0.03, 0.004, 6, 24), marbleMaterial(chute.color));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.0175;
  funnel.add(rim);
  const glyph = glyphMesh(chute.color);
  if (glyph) {
    // In front of the funnel, facing the player, so the chute's color is also a shape.
    glyph.position.set(0, 0, 0.03 + GLYPH.standoff);
    funnel.add(glyph);
  }
  const entity = place(world, frame, funnel, [chute.x, chute.y + 0.02, 0]);
  entity.addComponent(Chute);
  entity.addComponent(RayInteractable);
  return entity;
}

function buildWalls(world: World, frame: DioramaFrame, level: Level): Entity[] {
  const depth = DIORAMA.channelHalfDepth * 2;
  return level.walls.map((wall) =>
    staticBox(world, frame, [wall.w, wall.h, depth], [wall.x + wall.w / 2, wall.y + wall.h / 2, 0], MATERIALS.walnut),
  );
}

/** Walnut icon on each ledge button's cap, lying flat and readable from above. */
const BUTTON_ICONS: Readonly<Record<ControlAction, (r: number) => Mesh>> = {
  next: (r) => {
    const arrow = new Mesh(new ConeGeometry(r * 0.45, r * 0.9, 3), MATERIALS.walnut);
    arrow.rotation.z = -Math.PI / 2; // points to the right
    return arrow;
  },
  restart: (r) => {
    const loop = new Mesh(new TorusGeometry(r * 0.45, r * 0.12, 6, 20, Math.PI * 1.6), MATERIALS.walnut);
    loop.rotation.x = -Math.PI / 2;
    return loop;
  },
  settings: (r) => {
    // A hexagonal nut reads as "settings" without text.
    const nut = new Mesh(new TorusGeometry(r * 0.42, r * 0.16, 6, 6), MATERIALS.walnut);
    nut.rotation.x = -Math.PI / 2;
    return nut;
  },
};

/** Pokeable (near) and pinchable (ray) button resting on the front ledge. */
function buildButton(
  world: World,
  frame: DioramaFrame,
  x: number,
  action: ControlAction,
): Entity {
  const { buttonRadius: r, buttonHeight: h, ledgeDepth } = CONTROLS;
  const z = DIORAMA.channelHalfDepth + DIORAMA.slab + ledgeDepth / 2;
  const group = new Group();
  group.name = `button-${action}`;
  const cap = new Mesh(new CylinderGeometry(r, r, h, 24), action === 'next' ? MATERIALS.goal : MATERIALS.cream);
  cap.position.y = h / 2;
  const icon = BUTTON_ICONS[action](r);
  icon.position.y = h + 0.002;
  group.add(cap, icon);
  const entity = place(world, frame, group, [x, 0, z]);
  entity.addComponent(ControlButton, { action });
  entity.addComponent(RayInteractable);
  entity.addComponent(PokeInteractable);
  return entity;
}

function buildLedge(world: World, frame: DioramaFrame, level: Level): Entity[] {
  const { ledgeDepth } = CONTROLS;
  const w = level.size[0] + DIORAMA.wallThickness * 2;
  const ledge = new Mesh(new BoxGeometry(w, DIORAMA.slab, ledgeDepth), MATERIALS.walnut);
  const z = DIORAMA.channelHalfDepth + DIORAMA.slab + ledgeDepth / 2;
  return [place(world, frame, ledge, [level.size[0] / 2, -DIORAMA.slab / 2, z])];
}

/** Visual rail (no collider) just in front of the back panel, clear of the marble channel. */
function buildRail(world: World, frame: DioramaFrame, peg: Level['pegs'][number], rail: Rail): Entity[] {
  const length = rail.max - rail.min;
  const rod = new Mesh(new CylinderGeometry(SLIDER.railRadius, SLIDER.railRadius, length, SLIDER.railSegments), MATERIALS.brass);
  rod.name = `rail-${peg.id}`;
  const mid = (rail.min + rail.max) / 2;
  const z = -DIORAMA.channelHalfDepth + SLIDER.railRadius;
  const along = rail.axis === 'x'
    ? new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2)
    : IDENTITY;
  const railEntity = place(world, frame, rod, rail.axis === 'x' ? [mid, peg.y, z] : [peg.x, mid, z], along);

  const [ox, oy] = handleOffset(rail.axis);
  const [w, h, d] = SLIDER.handleSize;
  const tab = new Group();
  tab.name = `handle-${peg.id}`;
  const body = new Mesh(new BoxGeometry(w, h, d), MATERIALS.brass);
  const [gw, gh, gd] = SLIDER.gripScale;
  const grip = new Mesh(new BoxGeometry(w * gw, h * gh, d * gd), MATERIALS.walnut);
  tab.add(body, grip);
  const handleZ = DIORAMA.channelHalfDepth + PEG.radius;
  const handle = place(world, frame, tab, [peg.x + ox, peg.y + oy, handleZ]);
  handle.addComponent(SliderHandle, { pegId: peg.id });
  handle.addComponent(RayInteractable);
  return [railEntity, handle];
}

export function buildDiorama(world: World, frame: DioramaFrame, level: Level): BuiltDiorama {
  const goals = level.goals.map((g) => buildGoal(world, frame, g));
  const inset = CONTROLS.buttonInset;
  const nextButton = buildButton(world, frame, level.size[0] - inset, ControlActions.Next);
  return {
    entities: [
      ...buildCase(world, frame, level),
      ...buildWalls(world, frame, level),
      ...level.pegs.map((p) => buildPeg(world, frame, p)),
      ...level.pegs.flatMap((p) => (p.rail ? buildRail(world, frame, p, p.rail) : [])),
      ...goals.flatMap((g) => g.entities),
      ...level.chutes.map((c, i) => buildChute(world, frame, c, i)),
      ...buildLedge(world, frame, level),
      buildButton(world, frame, inset, ControlActions.Restart),
      buildButton(world, frame, inset + CONTROLS.buttonSpacing, ControlActions.Settings),
      nextButton,
    ],
    goals: goals.map((g) => g.range),
    goalMeshes: goals.map((g) => g.mesh),
    nextButton,
  };
}
