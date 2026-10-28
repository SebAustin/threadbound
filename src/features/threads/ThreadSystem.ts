import {
  createSystem,
  Group,
  Mesh,
  PhysicsBody,
  PhysicsShape,
  PhysicsShapeType,
  PhysicsState,
  Pressed,
  Quaternion,
  RayInteractable,
  Vector3,
  type Entity,
  type Object3D,
} from '@iwsdk/core';
import { PEG, THREAD_TUNING } from '../../config/constants';
import { threadSource } from '../../lib/cueSpace';
import { THREAD_HIT_DIAMETER } from '../../lib/hitArea';
import { createTrail, push, reset, stableRelease } from '../../lib/releaseTrail';
import { segmentTransform } from '../../lib/threadGeometry';
import { checkNewThread, findSnapPeg, landingPeg, presetOnlyPegs, sameThread, spoolUsed, type PegPoint } from '../../lib/threadRules';
import { PENTATONIC_HZ, restitutionForLength, rootIndex } from '../../lib/threadTuning';
import { HIT_ORDER } from '../../lib/touchFeedback';
import { stringSynth } from '../audio/stringSynth';
import { devLog } from '../debug/devLog';
import type { DioramaFrame } from '../diorama/dioramaFrame';
import { GEOMETRIES, hitAreaMesh, MATERIALS } from '../diorama/palette';
import { Peg, SnapTarget, tagRelease, TapReleased, Thread, Touchable, TouchKinds } from '../puzzle/components';
import { puzzleStore, type PuzzleCommand } from '../puzzle/puzzleStore';
import { refuse } from '../puzzle/refuse';
import { setHitOrder } from '../input/hitOrder';
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
/** Radius of the invisible cylinder around a thread (lib/hitArea). */
const HIT_RADIUS = THREAD_HIT_DIAMETER / 2;

/** The bus hears every pull start and end, so a relocation waits for the release. */
const DRAG_START: PuzzleCommand = { type: 'drag', active: true };
const DRAG_END: PuzzleCommand = { type: 'drag', active: false };

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
  /** Pegs that take a pinch: every peg but the preset-only ones (built without RayInteractable). */
  pinchablePegs: { required: [Peg, RayInteractable] },
  threads: { required: [Thread] },
  /** A thread pinched or clicked is snipped on release (every ray input; threads take no fingertip press). */
  pressedThreads: { required: [Thread, Pressed] },
  releasedThreads: { required: [Thread, TapReleased] },
}) {
  private drag: Drag | null = null;
  /** A pull ended: tell the bus on the next frame, outside the pointer handler (a relocation may follow). */
  private dragEnded = false;
  private preview!: Mesh;
  private dragPoint = { x: 0, y: 0 };
  private tmpDir = new Vector3();
  private tmpQuat = new Quaternion();
  /** Where a newly strung thread's pluck comes from, in world space (the synth copies it). */
  private tmpSource = new Vector3();
  /** Pegs a pull may attach to, listed once when it starts (and again if a rail peg settles). */
  private snapPegs: readonly PegPoint[] = [];
  /** The peg a release would attach to right now, tagged SnapTarget; null for none. */
  private snapTargetId: string | null = null;
  /** Reused on every pointer move: the pull's point, for findSnapPeg. */
  private readonly snapPoint: [number, number] = [0, 0];
  /** The pull's last samples, so a release that jumps off a held peg keeps the peg. */
  private readonly trail = createTrail();
  private readonly releasePoint = { x: 0, y: 0 };

  init(): void {
    this.preview = new Mesh(GEOMETRIES.unitCylinder, MATERIALS.threadPreview);
    this.preview.visible = false;
    this.preview.name = 'thread-preview';
    this.world.createTransformEntity(this.preview);

    this.cleanupFuncs.push(
      this.queries.pinchablePegs.subscribe('qualify', (e) => this.attachPeg(e)),
      // Snip after release, next frame: disposing a thread while a hand still holds it
      // leaves that pointer captured on a dead object and swallows its next pinch.
      this.queries.pressedThreads.subscribe('disqualify', tagRelease),
      puzzleStore.onCommand((command) => this.handleCommand(command)),
    );
    // 'qualify' only fires for future matches; pegs built earlier need wiring now.
    for (const peg of this.queries.pinchablePegs.entities) this.attachPeg(peg);
  }

  /**
   * Snap targets come from level data plus live rail positions, not ECS
   * bookkeeping (no lifecycle races).
   */
  private get pegPoints(): readonly PegPoint[] {
    const { level, pegPositions } = puzzleStore.get();
    return (level?.pegs ?? []).map((p) => ({ id: p.id, ...(pegPositions[p.id] ?? p) }));
  }

  /** One peg's live snap point, without building the whole list. */
  private pegPoint(id: string): PegPoint | undefined {
    const { level, pegPositions } = puzzleStore.get();
    const peg = level?.pegs.find((p) => p.id === id);
    return peg && { id, ...(pegPositions[id] ?? peg) };
  }

  /** Pegs a pull from `fromId` may attach to: every peg but itself and the preset-only ones. */
  private snapCandidates(fromId: string): readonly PegPoint[] {
    const level = puzzleStore.get().level;
    const presetOnly = level ? presetOnlyPegs(level) : [];
    return this.pegPoints.filter((p) => p.id !== fromId && !presetOnly.includes(p.id));
  }

  /**
   * Pointer listeners live on the peg's own meshes, which are discarded when the
   * level is torn down, so they need no explicit unsubscribe. A preset-only peg
   * takes no pinch, so it gets none (it never joins pinchablePegs).
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
      onPointer(child, 'pointercancel', (e) => this.cancelDrag(e));
    });
  }

  /** Tags the peg a release would attach to (TouchFeedbackSystem lights it); only when it changes. */
  private markSnapTarget(pegId: string | null): void {
    if (pegId === this.snapTargetId) return;
    const before = this.snapTargetId;
    this.snapTargetId = pegId;
    for (const peg of this.queries.pegs.entities) {
      if (!peg.active) continue;
      const id = peg.getValue(Peg, 'pegId');
      if (id === before) peg.removeComponent(SnapTarget);
      else if (id === pegId) peg.addComponent(SnapTarget);
    }
  }

  private startDrag(source: Entity, target: Object3D, e: SpatialPointerEvent): void {
    // A hidden diorama (placement is searching) takes no pinch, though rays still hit its meshes.
    if (this.drag || puzzleStore.get().dioramaHidden) return;
    stringSynth.unlock();
    stringSynth.play('pegGrab');
    e.stopPropagation();
    const x = source.getValue(Peg, 'x') ?? 0;
    const y = source.getValue(Peg, 'y') ?? 0;
    const pegId = source.getValue(Peg, 'pegId') ?? '';
    this.drag = { pegId, pointerId: e.pointerId, fromX: x, fromY: y, endX: x, endY: y, captureTarget: target };
    this.snapPegs = this.snapCandidates(pegId);
    // The grab is where the pinch itself landed (an oblique ray can land off the knob's centre, or beside it).
    const frame = puzzleStore.frame;
    const grab = frame ? pointerToDiorama(e, frame, this.dragPoint) : { x, y };
    reset(this.trail);
    push(this.trail, grab.x, grab.y, performance.now());
    capturePointer(target, e.pointerId);
    puzzleStore.dispatch(DRAG_START);
  }

  /** Allocation-free: runs on every pointer move of a pull. */
  private moveDrag(e: SpatialPointerEvent): void {
    const drag = this.drag;
    const frame = puzzleStore.frame;
    if (!drag || !frame || e.pointerId !== drag.pointerId) return;
    pointerToDiorama(e, frame, this.dragPoint);
    drag.endX = this.dragPoint.x;
    drag.endY = this.dragPoint.y;
    push(this.trail, drag.endX, drag.endY, performance.now());
    this.snapPoint[0] = drag.endX;
    this.snapPoint[1] = drag.endY;
    this.markSnapTarget(findSnapPeg(this.snapPoint, this.snapPegs, drag.pegId, PEG.snapRadius));
  }

  private endDrag(e: SpatialPointerEvent): void {
    const drag = this.drag;
    if (!drag || e.pointerId !== drag.pointerId) return;
    this.moveDrag(e);
    this.finishDrag(drag);
    // A release that jumped off a held peg keeps the peg (lib/releaseTrail); a hold on the
    // pull's own knob is the pinch, never an aim. Once per release, so it may allocate.
    const source = { x: drag.fromX, y: drag.fromY, radius: PEG.knobRadius };
    const { x, y } = stableRelease(this.trail, this.releasePoint, source);
    const targetId = landingPeg([x, y], [drag.endX, drag.endY], this.snapPegs, drag.pegId, PEG.snapRadius);
    if (targetId) {
      this.tryAddThread(drag.pegId, targetId);
      return;
    }
    // The release frame let go on (or beside) the peg it started from: a tap, not a miss, so no sound.
    if (Math.hypot(drag.endX - drag.fromX, drag.endY - drag.fromY) > PEG.snapRadius) stringSynth.play('dragMiss');
    devLog(`released at (${x.toFixed(3)}, ${y.toFixed(3)}) — no peg in reach`);
  }

  /** The input went away mid-pull (tracking lost, mode switch): drop the drag, make nothing. */
  private cancelDrag(e: SpatialPointerEvent): void {
    const drag = this.drag;
    if (!drag || e.pointerId !== drag.pointerId) return;
    this.finishDrag(drag);
  }

  /** A pull is over: no preview, no snap target, the pointer free; the bus hears it next frame. */
  private finishDrag(drag: Drag): void {
    this.drag = null;
    this.dragEnded = true;
    this.preview.visible = false;
    this.markSnapTarget(null);
    releasePointer(drag.captureTarget, drag.pointerId);
  }

  /** Player (or test/hint) thread: validated against the level's rules. */
  private tryAddThread(fromId: string, toId: string): void {
    const state = puzzleStore.get();
    const from = this.pegPoint(fromId);
    const to = this.pegPoint(toId);
    if (!from || !to) return;
    const spool = state.level?.spool;
    const check = checkNewThread(
      state.threads,
      fromId,
      toId,
      state.level?.maxThreads ?? 0,
      spool === undefined
        ? undefined
        : { remaining: spool - spoolUsed(state.threads, state.pegPositions), length: Math.hypot(to.x - from.x, to.y - from.y) },
    );
    if (!check.ok) {
      refuse(check.reason, 'thread');
      return;
    }
    this.createThread(from, to, { preset: false, pluck: true });
  }

  private createPresetThreads(): void {
    for (const link of puzzleStore.get().level?.presetThreads ?? []) {
      const from = this.pegPoint(link.from);
      const to = this.pegPoint(link.to);
      if (from && to) this.createThread(from, to, { preset: true, pluck: false });
    }
  }

  private handleCommand(command: PuzzleCommand): void {
    if (command.type === 'levelBuilt') {
      // The build already counted every drag as over; free the pointer before dropping the pull.
      if (this.drag) releasePointer(this.drag.captureTarget, this.drag.pointerId);
      this.drag = null;
      this.dragEnded = false;
      this.preview.visible = false;
      // The tagged peg went with the old build.
      this.snapTargetId = null;
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
      if (this.drag) this.snapPegs = this.snapCandidates(this.drag.pegId);
    }
  }

  /**
   * Positions a thread's group and stretches its children between two local points:
   * the visible mesh first (ThreadVibrationSystem scales children[0]), then its hit area.
   */
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
    group.children[1]?.scale.set(HIT_RADIUS, len, HIT_RADIUS);
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
    // Second, after the visible mesh: a thicker invisible cylinder that is easier to aim at.
    group.add(mesh, hitAreaMesh(GEOMETRIES.unitCylinder));
    setHitOrder(group, HIT_ORDER.thread);
    this.layoutThread(group, from.x, from.y, to.x, to.y);

    const root = rootIndex(seg.length);
    const pitch = PENTATONIC_HZ[root];
    const entity = this.world.createTransformEntity(group);
    entity.addComponent(Thread, {
      fromPeg: from.id,
      toPeg: to.id,
      ax: from.x,
      ay: from.y,
      bx: to.x,
      by: to.y,
      pitch,
      root,
      preset,
    });
    // Pinch only, never poke: a fingertip resting near the glass would snip.
    entity.addComponent(RayInteractable);
    entity.addComponent(Touchable, { kind: TouchKinds.thread });
    // The collider keeps the visible radius: the hit area is for aiming only.
    entity.addComponent(PhysicsShape, {
      shape: PhysicsShapeType.Capsules,
      dimensions: [THREAD_TUNING.radius, seg.length, 0],
      restitution: restitutionForLength(seg.length),
      friction: THREAD_TUNING.friction,
    });
    entity.addComponent(PhysicsBody, { state: PhysicsState.Static });

    puzzleStore.update({
      threads: [...puzzleStore.get().threads, { from: from.id, to: to.id, preset }],
      // The player's own thread is a success: it clears the refusal and the missed-drop line.
      ...(preset ? {} : { refusal: null, lastDropMissed: false }),
    });
    if (pluck) this.pluckStrung(frame, from, to, pitch);
  }

  /** A newly strung thread's pluck, heard from its middle (in an XR session; lib/cueSpace). */
  private pluckStrung(frame: DioramaFrame, from: PegPoint, to: PegPoint, pitch: number): void {
    const [x, y, z] = threadSource(from.x, from.y, to.x, to.y);
    stringSynth.play('thread', pitch, 1, frame.localToWorld(x, y, z, this.tmpSource));
  }

  private snip(entity: Entity): void {
    const from = entity.getValue(Thread, 'fromPeg');
    const to = entity.getValue(Thread, 'toPeg');
    puzzleStore.update({
      threads: puzzleStore.get().threads.filter((t) => !(t.from === from && t.to === to)),
      refusal: null,
      lastDropMissed: false,
    });
    stringSynth.play('snip');
    entity.dispose({ disposeResources: false });
  }

  update(): void {
    if (this.dragEnded) {
      this.dragEnded = false;
      puzzleStore.dispatch(DRAG_END);
    }
    this.snipReleased();
    this.updatePreview();
  }

  private snipReleased(): void {
    for (const entity of this.queries.releasedThreads.entities) {
      entity.removeComponent(TapReleased);
      // A hidden diorama's threads can still be hit by a ray; they aren't there for the player.
      if (!puzzleStore.get().dioramaHidden) this.snip(entity);
    }
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
