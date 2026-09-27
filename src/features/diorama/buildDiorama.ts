import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  PhysicsBody,
  PhysicsShape,
  PhysicsShapeType,
  PhysicsState,
  Quaternion,
  RayInteractable,
  Vector3,
  type Entity,
  type Material,
  type Object3D,
  type World,
} from '@iwsdk/core';
import { DIORAMA, GOAL, PEG } from '../../config/constants';
import type { Level } from '../../lib/levelSchema';
import { Chute, Peg } from '../puzzle/components';
import type { DioramaFrame } from './dioramaFrame';
import { GEOMETRIES, MATERIALS } from './palette';

export interface GoalRange {
  readonly minX: number;
  readonly maxX: number;
}

export interface BuiltDiorama {
  /** Everything created for this level, disposed together on teardown. */
  readonly entities: readonly Entity[];
  readonly goals: readonly GoalRange[];
  readonly goalMeshes: readonly Mesh[];
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
  const floor = new Mesh(new BoxGeometry(goal.width, 0.002, depth), MATERIALS.goal);
  floor.name = 'goal-floor';
  const floorEntity = place(world, frame, floor, [goal.x, 0.001, 0]);
  return {
    entities: [left, right, floorEntity],
    range: { minX: goal.x - half, maxX: goal.x + half },
    mesh: floor,
  };
}

function buildChute(world: World, frame: DioramaFrame, level: Level): Entity {
  const funnel = new Mesh(new CylinderGeometry(0.03, 0.014, 0.035, 16, 1, true), MATERIALS.brass);
  funnel.name = 'chute';
  const entity = place(world, frame, funnel, [level.chute.x, level.chute.y + 0.02, 0]);
  entity.addComponent(Chute);
  entity.addComponent(RayInteractable);
  return entity;
}

export function buildDiorama(world: World, frame: DioramaFrame, level: Level): BuiltDiorama {
  const goals = level.goals.map((g) => buildGoal(world, frame, g));
  return {
    entities: [
      ...buildCase(world, frame, level),
      ...level.pegs.map((p) => buildPeg(world, frame, p)),
      ...goals.flatMap((g) => g.entities),
      buildChute(world, frame, level),
    ],
    goals: goals.map((g) => g.range),
    goalMeshes: goals.map((g) => g.mesh),
  };
}
