import {
  createSystem,
  PhysicsSystem,
  Vector3,
  type Entity,
  type Mesh,
  type Object3D,
} from '@iwsdk/core';
import { SLIDER } from '../../config/constants';
import { clampToRailInto, handleOffset, type Rail } from '../../lib/rail';
import { stringSynth } from '../audio/stringSynth';
import { capturePointer, onPointer, releasePointer, type SpatialPointerEvent } from '../input/pointerEvents';
import { pointerToDiorama } from '../input/pointerToDiorama';
import { Peg, SliderHandle } from '../puzzle/components';
import { puzzleStore, type PuzzleCommand } from '../puzzle/puzzleStore';
import { slideFitsSpool } from '../../lib/threadRules';
import { refuse } from '../puzzle/refuse';

interface SlideDrag {
  readonly pegId: string;
  readonly pointerId: number;
  readonly captureTarget: Object3D;
  x: number;
  y: number;
}

/**
 * World 3 rail pegs: pinch a peg's brass tab and slide it along its rail.
 * While dragging, only visuals move (peg, tab, attached threads); on release
 * the peg's static collider is teleported and its threads are rebuilt so
 * bounce and pitch match the new geometry.
 */
export class SliderSystem extends createSystem({
  handles: { required: [SliderHandle] },
  pegs: { required: [Peg] },
}) {
  private drag: SlideDrag | null = null;
  /** Scratch values reused on every pointer move (the drag path must not allocate). */
  private point = { x: 0, y: 0 };
  private clamped = { x: 0, y: 0 };
  private handleLocal = new Vector3();

  init(): void {
    this.cleanupFuncs.push(
      this.queries.handles.subscribe('qualify', (e) => this.attach(e)),
      puzzleStore.onCommand((command) => this.handleCommand(command)),
    );
    // 'qualify' only fires for future matches; handles built earlier need wiring now.
    for (const handle of this.queries.handles.entities) this.attach(handle);
  }

  private railOf(pegId: string): Rail | undefined {
    return puzzleStore.get().level?.pegs.find((p) => p.id === pegId)?.rail;
  }

  private positionOf(pegId: string): { x: number; y: number } | undefined {
    return puzzleStore.get().pegPositions[pegId];
  }

  /** Listeners live on the tab's own meshes and are discarded with them. */
  private attach(handle: Entity): void {
    const object = handle.object3D;
    const pegId = handle.getValue(SliderHandle, 'pegId') ?? '';
    if (!object) return;
    object.traverse((child) => {
      if (child === object || !(child as Mesh).isMesh) return;
      onPointer(child, 'pointerdown', (e) => this.start(pegId, child, e));
      onPointer(child, 'pointermove', (e) => this.move(e));
      onPointer(child, 'pointerup', (e) => this.end(e));
      onPointer(child, 'pointercancel', (e) => this.cancel(e));
    });
  }

  private start(pegId: string, target: Object3D, e: SpatialPointerEvent): void {
    const pos = this.positionOf(pegId);
    if (this.drag || !pos) return;
    e.stopPropagation();
    stringSynth.unlock();
    stringSynth.play('pegGrab');
    this.drag = { pegId, pointerId: e.pointerId, captureTarget: target, x: pos.x, y: pos.y };
    capturePointer(target, e.pointerId);
  }

  private move(e: SpatialPointerEvent): void {
    const drag = this.drag;
    const frame = puzzleStore.frame;
    const rail = drag && this.railOf(drag.pegId);
    if (!drag || !frame || !rail || e.pointerId !== drag.pointerId) return;
    pointerToDiorama(e, frame, this.point);
    // The pointer holds the tab, not the peg: remove the tab's offset first.
    const [ox, oy] = handleOffset(rail.axis);
    clampToRailInto(drag.x, drag.y, rail, this.point.x - ox, this.point.y - oy, this.clamped);
    drag.x = this.clamped.x;
    drag.y = this.clamped.y;
    this.placeVisuals(drag.pegId, drag.x, drag.y);
    puzzleStore.dispatch({ type: 'pegPreview', pegId: drag.pegId, x: drag.x, y: drag.y });
  }

  private end(e: SpatialPointerEvent): void {
    const drag = this.drag;
    if (!drag || e.pointerId !== drag.pointerId) return;
    this.move(e);
    this.drag = null;
    releasePointer(drag.captureTarget, drag.pointerId);
    puzzleStore.dispatch({ type: 'movePeg', pegId: drag.pegId, x: drag.x, y: drag.y });
  }

  /** The input went away mid-slide: the peg goes back to where it was. */
  private cancel(e: SpatialPointerEvent): void {
    const drag = this.drag;
    if (!drag || e.pointerId !== drag.pointerId) return;
    this.drag = null;
    releasePointer(drag.captureTarget, drag.pointerId);
    const home = this.positionOf(drag.pegId);
    if (home) this.placeVisuals(drag.pegId, home.x, home.y);
  }

  private handleCommand(command: PuzzleCommand): void {
    if (command.type === 'levelBuilt') this.drag = null;
    if (command.type !== 'movePeg') return;
    const rail = this.railOf(command.pegId);
    const current = this.positionOf(command.pegId);
    // Fixed pegs ignore movePeg; the schema guarantees solution slides target rail pegs.
    if (!rail || !current) return;
    const next = clampToRailInto(current.x, current.y, rail, command.x, command.y, { x: 0, y: 0 });
    const { pegPositions, threads, level } = puzzleStore.get();
    if (!slideFitsSpool(threads, pegPositions, command.pegId, next, level?.spool)) {
      // The drag preview already moved the peg; put it back where its threads still fit.
      this.placeVisuals(command.pegId, current.x, current.y);
      refuse('spool', 'slide');
      return;
    }
    puzzleStore.update({ pegPositions: { ...pegPositions, [command.pegId]: next }, refusal: null });
    this.placeVisuals(command.pegId, next.x, next.y);
    this.commitPhysics(command.pegId, next.x, next.y);
    stringSynth.play('settle');
    puzzleStore.dispatch({ type: 'pegMoved', pegId: command.pegId });
  }

  private findPeg(pegId: string): Entity | undefined {
    for (const peg of this.queries.pegs.entities) {
      if (peg.getValue(Peg, 'pegId') === pegId) return peg;
    }
    return undefined;
  }

  private findHandle(pegId: string): Entity | undefined {
    for (const handle of this.queries.handles.entities) {
      if (handle.getValue(SliderHandle, 'pegId') === pegId) return handle;
    }
    return undefined;
  }

  /** Moves the peg and its tab (render transforms only). */
  private placeVisuals(pegId: string, x: number, y: number): void {
    const frame = puzzleStore.frame;
    const rail = this.railOf(pegId);
    const peg = this.findPeg(pegId)?.object3D;
    const handle = this.findHandle(pegId)?.object3D;
    if (!frame || !rail) return;
    if (peg) frame.localToWorld(x, y, 0, peg.position);
    if (handle) {
      const [ox, oy] = handleOffset(rail.axis);
      // Keep the tab's depth; only slide it in the diorama plane.
      const local = frame.worldToLocal(handle.position, this.handleLocal);
      frame.localToWorld(x + ox, y + oy, local.z, handle.position);
    }
  }

  /** Teleports the peg's static collider and records its new local position. */
  private commitPhysics(pegId: string, x: number, y: number): void {
    const entity = this.findPeg(pegId);
    const object = entity?.object3D;
    if (!entity || !object) return;
    entity.setValue(Peg, 'x', x);
    entity.setValue(Peg, 'y', y);
    this.world.getSystem(PhysicsSystem)?.setBodyTransform(entity, {
      position: object.position,
      quaternion: object.quaternion,
    });
  }
}
