import {
  createSystem,
  Group,
  Hovered,
  Mesh,
  PhysicsBody,
  PhysicsShape,
  PhysicsShapeType,
  PhysicsState,
  Quaternion,
  RayInteractable,
  Vector3,
  type Entity,
  type Object3D,
} from '@iwsdk/core';
import { PEG, THREAD_TUNING } from '../../config/constants';
import { intersectRayWithPlaneZ } from '../../lib/rayPlane';
import { segmentTransform } from '../../lib/threadGeometry';
import { checkNewThread, findSnapPeg, type PegPoint } from '../../lib/threadRules';
import { pitchForLength, restitutionForLength } from '../../lib/threadTuning';
import { stringSynth } from '../audio/stringSynth';
import { GEOMETRIES, MATERIALS } from '../diorama/palette';
import { Peg, Thread } from '../puzzle/components';
import { puzzleStore } from '../puzzle/puzzleStore';
import {
  capturePointer,
  onPointer,
  releasePointer,
  type SpatialPointerEvent,
} from './pointerEvents';

const UP = new Vector3(0, 1, 0);

interface Drag {
  readonly pegId: string;
  readonly pointerId: number;
  readonly source: Entity;
  /** Mesh holding pointer capture, so move/up keep arriving off-peg. */
  readonly captureTarget: Object3D;
  readonly fromX: number;
  readonly fromY: number;
  endX: number;
  endY: number;
}

/**
 * Core mechanic: pinch a peg, pull, release on another peg to stretch a thread.
 * Clicking/pinching an existing thread snips it.
 */
export class ThreadSystem extends createSystem({
  pegs: { required: [Peg] },
  hoveredPegs: { required: [Peg, Hovered] },
  threads: { required: [Thread] },
}) {
  private drag: Drag | null = null;
  private pegPoints: PegPoint[] = [];
  private pegUnsubs = new Map<number, () => void>();
  private threadUnsubs = new Map<number, () => void>();
  private preview!: Mesh;
  private tmpOrigin = new Vector3();
  private tmpDir = new Vector3();
  private tmpQuat = new Quaternion();

  init(): void {
    this.preview = new Mesh(GEOMETRIES.unitCylinder, MATERIALS.threadPreview);
    this.preview.visible = false;
    this.preview.name = 'thread-preview';
    this.world.createTransformEntity(this.preview);

    this.cleanupFuncs.push(
      this.queries.pegs.subscribe('qualify', (e) => this.attachPeg(e)),
      this.queries.pegs.subscribe('disqualify', (e) => this.detachPeg(e)),
      this.queries.hoveredPegs.subscribe('qualify', (e) => this.setKnob(e, true)),
      this.queries.hoveredPegs.subscribe('disqualify', (e) => this.setKnob(e, false)),
      this.queries.threads.subscribe('qualify', (e) => this.attachThread(e)),
      this.queries.threads.subscribe('disqualify', (e) => this.detachThread(e)),
      () => this.pegUnsubs.forEach((off) => off()),
      () => this.threadUnsubs.forEach((off) => off()),
    );
    // 'qualify' only fires for future matches; pegs built earlier need wiring now.
    for (const peg of this.queries.pegs.entities) this.attachPeg(peg);
    for (const thread of this.queries.threads.entities) this.attachThread(thread);
  }

  private attachPeg(entity: Entity): void {
    const object = entity.object3D;
    if (!object) return;
    this.pegPoints = [
      ...this.pegPoints,
      {
        id: entity.getValue(Peg, 'pegId') ?? '',
        x: entity.getValue(Peg, 'x') ?? 0,
        y: entity.getValue(Peg, 'y') ?? 0,
      },
    ];
    // Listen on the child meshes: events bubble from the hit mesh upward, and
    // IWSDK's InputSystem stops them at the entity root after tagging Pressed.
    const offs: Array<() => void> = [];
    object.traverse((child) => {
      if (child === object || !(child as Mesh).isMesh) return;
      offs.push(
        onPointer(child, 'pointerdown', (e) => this.startDrag(entity, child, e)),
        onPointer(child, 'pointermove', (e) => this.moveDrag(e)),
        onPointer(child, 'pointerup', (e) => this.endDrag(e)),
      );
    });
    this.pegUnsubs.set(entity.index, () => offs.forEach((off) => off()));
  }

  private detachPeg(entity: Entity): void {
    const id = entity.getValue(Peg, 'pegId');
    this.pegPoints = this.pegPoints.filter((p) => p.id !== id);
    this.pegUnsubs.get(entity.index)?.();
    this.pegUnsubs.delete(entity.index);
  }

  private setKnob(entity: Entity, hot: boolean): void {
    const knob = entity.object3D?.getObjectByName('peg-knob') as Mesh | undefined;
    if (knob) knob.material = hot ? MATERIALS.brassHot : MATERIALS.brass;
  }

  private startDrag(source: Entity, target: Object3D, e: SpatialPointerEvent): void {
    if (this.drag) return;
    stringSynth.unlock();
    e.stopPropagation();
    const x = source.getValue(Peg, 'x') ?? 0;
    const y = source.getValue(Peg, 'y') ?? 0;
    this.drag = {
      pegId: source.getValue(Peg, 'pegId') ?? '',
      pointerId: e.pointerId,
      source,
      fromX: x,
      fromY: y,
      endX: x,
      endY: y,
      captureTarget: target,
    };
    capturePointer(target, e.pointerId);
  }

  private moveDrag(e: SpatialPointerEvent): void {
    const drag = this.drag;
    const frame = puzzleStore.frame;
    if (!drag || !frame || e.pointerId !== drag.pointerId) return;
    // Ray from the pointer origin through its live capture-plane hit. For the
    // desktop mouse the origin is the camera; for hands/controllers it's the ray pose.
    frame.worldToLocal(e.pointerPosition, this.tmpOrigin);
    this.tmpDir.subVectors(e.point, e.pointerPosition);
    frame.directionToLocal(this.tmpDir, this.tmpDir);
    const hit = intersectRayWithPlaneZ(
      [this.tmpOrigin.x, this.tmpOrigin.y, this.tmpOrigin.z],
      [this.tmpDir.x, this.tmpDir.y, this.tmpDir.z],
      0,
    );
    if (!hit) return;
    drag.endX = hit[0];
    drag.endY = hit[1];
  }

  private endDrag(e: SpatialPointerEvent): void {
    const drag = this.drag;
    if (!drag || e.pointerId !== drag.pointerId) return;
    this.moveDrag(e);
    this.drag = null;
    this.preview.visible = false;
    releasePointer(drag.captureTarget, drag.pointerId);

    const targetId = findSnapPeg([drag.endX, drag.endY], this.pegPoints, drag.pegId, PEG.snapRadius);
    if (!targetId) {
      console.info(`[Threadbound] released at (${drag.endX.toFixed(3)}, ${drag.endY.toFixed(3)}) — no peg in reach`);
      return;
    }
    const state = puzzleStore.get();
    const check = checkNewThread(state.threads, drag.pegId, targetId, state.level?.maxThreads ?? 0);
    if (!check.ok) {
      console.info(`[Threadbound] thread rejected: ${check.reason}`);
      return;
    }
    const from = this.pegPoints.find((p) => p.id === drag.pegId);
    const to = this.pegPoints.find((p) => p.id === targetId);
    if (from && to) this.createThread(from, to);
  }

  private createThread(from: PegPoint, to: PegPoint): void {
    const frame = puzzleStore.frame;
    const seg = segmentTransform([from.x, from.y, 0], [to.x, to.y, 0]);
    if (!frame || !seg) return;

    const group = new Group();
    group.name = `thread-${from.id}-${to.id}`;
    const mesh = new Mesh(GEOMETRIES.unitCylinder, MATERIALS.thread);
    mesh.scale.set(THREAD_TUNING.radius, seg.length, THREAD_TUNING.radius);
    group.add(mesh);
    frame.localToWorld(seg.midpoint[0], seg.midpoint[1], 0, group.position);
    this.tmpQuat.set(...seg.quaternion);
    frame.worldQuaternion(this.tmpQuat, group.quaternion);

    const pitch = pitchForLength(seg.length);
    const entity = this.world.createTransformEntity(group);
    entity.addComponent(Thread, {
      fromPeg: from.id,
      toPeg: to.id,
      ax: from.x,
      ay: from.y,
      bx: to.x,
      by: to.y,
      pitch,
    });
    entity.addComponent(RayInteractable);
    entity.addComponent(PhysicsShape, {
      shape: PhysicsShapeType.Capsules,
      dimensions: [THREAD_TUNING.radius, seg.length, 0],
      restitution: restitutionForLength(seg.length),
      friction: THREAD_TUNING.friction,
    });
    entity.addComponent(PhysicsBody, { state: PhysicsState.Static });

    puzzleStore.update({ threads: [...puzzleStore.get().threads, { from: from.id, to: to.id }] });
    stringSynth.pluck(pitch, 0.8);
  }

  private attachThread(entity: Entity): void {
    const object = entity.object3D;
    if (!object) return;
    const off = onPointer(object, 'click', (e) => {
      e.stopPropagation();
      this.snip(entity);
    });
    this.threadUnsubs.set(entity.index, off);
  }

  private detachThread(entity: Entity): void {
    this.threadUnsubs.get(entity.index)?.();
    this.threadUnsubs.delete(entity.index);
  }

  private snip(entity: Entity): void {
    const from = entity.getValue(Thread, 'fromPeg');
    const to = entity.getValue(Thread, 'toPeg');
    puzzleStore.update({
      threads: puzzleStore.get().threads.filter((t) => !(t.from === from && t.to === to)),
    });
    stringSynth.pluck(pitchForLength(THREAD_TUNING.maxLength), 0.4);
    entity.dispose({ disposeResources: false });
  }

  /** Live preview while dragging. Allocation-free: runs every frame of a drag. */
  update(): void {
    const drag = this.drag;
    const frame = puzzleStore.frame;
    if (!drag || !frame) return;
    this.tmpDir.set(drag.endX - drag.fromX, drag.endY - drag.fromY, 0);
    const len = this.tmpDir.length();
    if (len < 1e-4) {
      this.preview.visible = false;
      return;
    }
    this.preview.visible = true;
    this.preview.scale.set(THREAD_TUNING.radius * 0.7, len, THREAD_TUNING.radius * 0.7);
    frame.localToWorld((drag.fromX + drag.endX) / 2, (drag.fromY + drag.endY) / 2, 0, this.preview.position);
    this.tmpQuat.setFromUnitVectors(UP, this.tmpDir.divideScalar(len));
    frame.worldQuaternion(this.tmpQuat, this.preview.quaternion);
  }
}
