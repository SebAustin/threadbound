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
import { segmentTransform } from '../../lib/threadGeometry';
import { checkNewThread, findSnapPeg, sameThread, type PegPoint } from '../../lib/threadRules';
import { pitchForLength, restitutionForLength } from '../../lib/threadTuning';
import { stringSynth } from '../audio/stringSynth';
import { devLog } from '../debug/devLog';
import { GEOMETRIES, MATERIALS } from '../diorama/palette';
import { Peg, Thread } from '../puzzle/components';
import { puzzleStore, type PuzzleCommand } from '../puzzle/puzzleStore';
import { pointerToDiorama } from '../input/pointerToDiorama';
import {
  capturePointer,
  onPointer,
  releasePointer,
  type SpatialPointerEvent,
} from '../input/pointerEvents';

const UP = new Vector3(0, 1, 0);
/** The drag preview is drawn thinner than a real thread. */
const PREVIEW_RADIUS = THREAD_TUNING.radius * 0.7;
const CREATE_VOLUME = 0.8;
const SNIP_VOLUME = 0.4;

const touchesPeg = (thread: Entity, pegId: string) =>
  thread.getValue(Thread, 'fromPeg') === pegId || thread.getValue(Thread, 'toPeg') === pegId;

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
  private dragPoint = { x: 0, y: 0 };
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

  /**
   * Snap targets come from level data plus live rail positions, not ECS
   * bookkeeping (no lifecycle races).
   */
  private get pegPoints(): readonly PegPoint[] {
    const { level, pegPositions } = puzzleStore.get();
    return (level?.pegs ?? []).map((p) => ({ id: p.id, ...(pegPositions[p.id] ?? p) }));
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
    pointerToDiorama(e, frame, this.dragPoint);
    drag.endX = this.dragPoint.x;
    drag.endY = this.dragPoint.y;
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
      devLog(`released at (${drag.endX.toFixed(3)}, ${drag.endY.toFixed(3)}) — no peg in reach`);
      return;
    }
    this.tryAddThread(drag.pegId, targetId);
  }

  /** Player (or test/hint) thread: validated against the level's rules. */
  private tryAddThread(fromId: string, toId: string): void {
    const state = puzzleStore.get();
    const check = checkNewThread(state.threads, fromId, toId, state.level?.maxThreads ?? 0);
    if (!check.ok) {
      devLog(`thread rejected: ${check.reason}`);
      return;
    }
    const from = this.pegPoints.find((p) => p.id === fromId);
    const to = this.pegPoints.find((p) => p.id === toId);
    if (from && to) this.createThread(from, to, { preset: false, pluck: true });
  }

  private createPresetThreads(): void {
    for (const link of puzzleStore.get().level?.presetThreads ?? []) {
      const from = this.pegPoints.find((p) => p.id === link.from);
      const to = this.pegPoints.find((p) => p.id === link.to);
      if (from && to) this.createThread(from, to, { preset: true, pluck: false });
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
      for (const t of this.queries.threads.entities) {
        const link = { from: t.getValue(Thread, 'fromPeg') ?? '', to: t.getValue(Thread, 'toPeg') ?? '' };
        if (sameThread(link, command)) return this.snip(t);
      }
    } else if (command.type === 'pegPreview') {
      this.previewPeg(command.pegId, command.x, command.y);
    } else if (command.type === 'pegMoved') {
      this.rebuildThreadsAt(command.pegId);
    }
  }

  /** Positions a thread's group and stretches its child mesh between two local points. */
  private layoutThread(group: Object3D, ax: number, ay: number, bx: number, by: number): void {
    const frame = puzzleStore.frame;
    if (!frame) return;
    this.tmpDir.set(bx - ax, by - ay, 0);
    const len = this.tmpDir.length();
    if (len < 1e-4) return;
    frame.localToWorld((ax + bx) / 2, (ay + by) / 2, 0, group.position);
    this.tmpQuat.setFromUnitVectors(UP, this.tmpDir.divideScalar(len));
    frame.worldQuaternion(this.tmpQuat, group.quaternion);
    group.children[0]?.scale.set(THREAD_TUNING.radius, len, THREAD_TUNING.radius);
  }

  /** Live drag preview: re-lay out attached threads (colliders follow on release). Allocation-free. */
  private previewPeg(pegId: string, x: number, y: number): void {
    for (const thread of this.queries.threads.entities) {
      if (!touchesPeg(thread, pegId)) continue;
      const fromIsPeg = thread.getValue(Thread, 'fromPeg') === pegId;
      const ax = fromIsPeg ? x : thread.getValue(Thread, 'ax') ?? 0;
      const ay = fromIsPeg ? y : thread.getValue(Thread, 'ay') ?? 0;
      const bx = fromIsPeg ? thread.getValue(Thread, 'bx') ?? 0 : x;
      const by = fromIsPeg ? thread.getValue(Thread, 'by') ?? 0 : y;
      if (thread.object3D) this.layoutThread(thread.object3D, ax, ay, bx, by);
    }
  }

  /** A rail peg settled: rebuild its threads so colliders, bounce and pitch match. */
  private rebuildThreadsAt(pegId: string): void {
    const touching = [...this.queries.threads.entities].filter((t) => touchesPeg(t, pegId)).map((t) => ({
      entity: t,
      from: t.getValue(Thread, 'fromPeg') ?? '',
      to: t.getValue(Thread, 'toPeg') ?? '',
      preset: t.getValue(Thread, 'preset') ?? false,
    }));
    if (touching.length === 0) return;
    const gone = (l: { from: string; to: string }) => touching.some((t) => t.from === l.from && t.to === l.to);
    puzzleStore.update({ threads: puzzleStore.get().threads.filter((l) => !gone(l)) });
    for (const t of touching) t.entity.dispose({ disposeResources: false });
    const points = this.pegPoints;
    for (const t of touching) {
      const from = points.find((p) => p.id === t.from);
      const to = points.find((p) => p.id === t.to);
      // Silent: the slider already plays its settle click; a pluck per thread would double up.
      if (from && to) this.createThread(from, to, { preset: t.preset, pluck: false });
    }
  }

  private createThread(
    from: PegPoint,
    to: PegPoint,
    { preset, pluck }: { readonly preset: boolean; readonly pluck: boolean },
  ): void {
    const frame = puzzleStore.frame;
    const seg = segmentTransform([from.x, from.y, 0], [to.x, to.y, 0]);
    if (!frame || !seg) return;

    const group = new Group();
    group.name = `thread-${from.id}-${to.id}`;
    const mesh = new Mesh(GEOMETRIES.unitCylinder, preset ? MATERIALS.threadPreset : MATERIALS.thread);
    group.add(mesh);
    this.layoutThread(group, from.x, from.y, to.x, to.y);

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
    if (pluck) stringSynth.pluck(pitch, CREATE_VOLUME);
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
    stringSynth.pluck(pitchForLength(THREAD_TUNING.maxLength), SNIP_VOLUME);
    entity.dispose({ disposeResources: false });
  }

  update(): void {
    this.updatePreview();
  }

  /** Live preview while dragging. Allocation-free: runs every frame of a drag. */
  private updatePreview(): void {
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
    this.preview.scale.set(PREVIEW_RADIUS, len, PREVIEW_RADIUS);
    frame.localToWorld((drag.fromX + drag.endX) / 2, (drag.fromY + drag.endY) / 2, 0, this.preview.position);
    this.tmpQuat.setFromUnitVectors(UP, this.tmpDir.divideScalar(len));
    frame.worldQuaternion(this.tmpQuat, this.preview.quaternion);
  }
}
