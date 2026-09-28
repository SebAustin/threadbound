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
import { puzzleStore, type PuzzleCommand } from '../puzzle/puzzleStore';
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
      this.queries.hoveredPegs.subscribe('qualify', (e) => this.setKnob(e, true)),
      this.queries.hoveredPegs.subscribe('disqualify', (e) => this.setKnob(e, false)),
      this.queries.threads.subscribe('qualify', (e) => this.attachThread(e)),
      puzzleStore.onCommand((command) => this.handleCommand(command)),
    );
    // 'qualify' only fires for future matches; pegs built earlier need wiring now.
    for (const peg of this.queries.pegs.entities) this.attachPeg(peg);
    for (const thread of this.queries.threads.entities) this.attachThread(thread);
  }

  /** Snap targets come from level data, not ECS bookkeeping (no lifecycle races). */
  private get pegPoints(): readonly PegPoint[] {
    return puzzleStore.get().level?.pegs ?? [];
  }

  /**
   * Pointer listeners live on the peg's own meshes, which are discarded when the
   * level is torn down, so they need no explicit unsubscribe.
   */
  private attachPeg(entity: Entity): void {
    const object = entity.object3D;
    if (!object) return;
    // Listen on the child meshes: events bubble from the hit mesh upward, and
    // IWSDK's InputSystem stops them at the entity root after tagging Pressed.
    object.traverse((child) => {
      if (child === object || !(child as Mesh).isMesh) return;
      onPointer(child, 'pointerdown', (e) => this.startDrag(entity, child, e));
      onPointer(child, 'pointermove', (e) => this.moveDrag(e));
      onPointer(child, 'pointerup', (e) => this.endDrag(e));
    });
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
    if (hit) {
      drag.endX = hit[0];
      drag.endY = hit[1];
      return;
    }
    // Ray nearly parallel to (or level with) the diorama, e.g. a hand held beside
    // the glass: fall back to the capture-plane hit, which sits just in front.
    frame.worldToLocal(e.point, this.tmpOrigin);
    drag.endX = this.tmpOrigin.x;
    drag.endY = this.tmpOrigin.y;
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
    this.tryAddThread(drag.pegId, targetId);
  }

  /** Player (or test/hint) thread: validated against the level's rules. */
  private tryAddThread(fromId: string, toId: string): void {
    const state = puzzleStore.get();
    const check = checkNewThread(state.threads, fromId, toId, state.level?.maxThreads ?? 0);
    if (!check.ok) {
      console.info(`[Threadbound] thread rejected: ${check.reason}`);
      return;
    }
    const from = this.pegPoints.find((p) => p.id === fromId);
    const to = this.pegPoints.find((p) => p.id === toId);
    if (from && to) this.createThread(from, to, false);
  }

  private createPresetThreads(): void {
    for (const link of puzzleStore.get().level?.presetThreads ?? []) {
      const from = this.pegPoints.find((p) => p.id === link.from);
      const to = this.pegPoints.find((p) => p.id === link.to);
      if (from && to) this.createThread(from, to, true);
    }
  }

  private handleCommand(command: PuzzleCommand): void {
    if (command.type === 'levelBuilt') {
      this.drag = null;
      this.preview.visible = false;
      this.createPresetThreads();
    } else if (command.type === 'addThread') {
      this.tryAddThread(command.from, command.to);
    } else if (command.type === 'snip') {
      const match = [...this.queries.threads.entities].find((t) => {
        const a = t.getValue(Thread, 'fromPeg');
        const b = t.getValue(Thread, 'toPeg');
        return (a === command.from && b === command.to) || (a === command.to && b === command.from);
      });
      if (match) this.snip(match);
    }
  }

  private createThread(from: PegPoint, to: PegPoint, preset: boolean): void {
    const frame = puzzleStore.frame;
    const seg = segmentTransform([from.x, from.y, 0], [to.x, to.y, 0]);
    if (!frame || !seg) return;

    const group = new Group();
    group.name = `thread-${from.id}-${to.id}`;
    const mesh = new Mesh(GEOMETRIES.unitCylinder, preset ? MATERIALS.threadPreset : MATERIALS.thread);
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
      preset,
    });
    entity.addComponent(RayInteractable);
    entity.addComponent(PhysicsShape, {
      shape: PhysicsShapeType.Capsules,
      dimensions: [THREAD_TUNING.radius, seg.length, 0],
      restitution: restitutionForLength(seg.length),
      friction: THREAD_TUNING.friction,
    });
    entity.addComponent(PhysicsBody, { state: PhysicsState.Static });

    puzzleStore.update({
      threads: [...puzzleStore.get().threads, { from: from.id, to: to.id, preset }],
    });
    if (!preset) stringSynth.pluck(pitch, 0.8);
  }

  private attachThread(entity: Entity): void {
    const object = entity.object3D;
    if (!object) return;
    onPointer(object, 'click', (e) => {
      e.stopPropagation();
      this.snip(entity);
    });
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
