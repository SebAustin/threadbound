import {
  createSystem,
  PhysicsSystem,
  type Entity,
  type Mesh,
  type Object3D,
} from '@iwsdk/core';
import { clampToRail, type Rail } from '../../lib/rail';
import { stringSynth } from '../audio/stringSynth';
import { handleOffset } from '../diorama/buildDiorama';
import { Peg, SliderHandle } from '../puzzle/components';
import { puzzleStore, type PuzzleCommand } from '../puzzle/puzzleStore';
import { capturePointer, onPointer, releasePointer, type SpatialPointerEvent } from '../threads/pointerEvents';
import { pointerToDiorama } from '../threads/pointerToDiorama';

const SETTLE_HZ = 392.0;

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
  private point = { x: 0, y: 0 };

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
    });
  }

  private start(pegId: string, target: Object3D, e: SpatialPointerEvent): void {
    const pos = this.positionOf(pegId);
    if (this.drag || !pos) return;
    e.stopPropagation();
    stringSynth.unlock();
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
    const next = clampToRail(drag, rail, [this.point.x - ox, this.point.y - oy]);
    drag.x = next.x;
    drag.y = next.y;
    this.placeVisuals(drag.pegId, next.x, next.y);
    puzzleStore.dispatch({ type: 'pegPreview', pegId: drag.pegId, x: next.x, y: next.y });
  }

  private end(e: SpatialPointerEvent): void {
    const drag = this.drag;
    if (!drag || e.pointerId !== drag.pointerId) return;
    this.move(e);
    this.drag = null;
    releasePointer(drag.captureTarget, drag.pointerId);
    puzzleStore.dispatch({ type: 'movePeg', pegId: drag.pegId, x: drag.x, y: drag.y });
  }

  private handleCommand(command: PuzzleCommand): void {
    if (command.type === 'levelBuilt') this.drag = null;
    if (command.type !== 'movePeg') return;
    const rail = this.railOf(command.pegId);
    const current = this.positionOf(command.pegId);
    if (!rail || !current) {
      console.info(`[Threadbound] peg "${command.pegId}" has no rail`);
      return;
    }
    const next = clampToRail(current, rail, [command.x, command.y]);
    const { pegPositions } = puzzleStore.get();
    puzzleStore.update({ pegPositions: { ...pegPositions, [command.pegId]: next } });
    this.placeVisuals(command.pegId, next.x, next.y);
    this.commitPhysics(command.pegId, next.x, next.y);
    stringSynth.pluck(SETTLE_HZ, 0.35);
    puzzleStore.dispatch({ type: 'pegMoved', pegId: command.pegId });
  }

  private findPeg(pegId: string): Entity | undefined {
    return [...this.queries.pegs.entities].find((p) => p.getValue(Peg, 'pegId') === pegId);
  }

  private findHandle(pegId: string): Entity | undefined {
    return [...this.queries.handles.entities].find((h) => h.getValue(SliderHandle, 'pegId') === pegId);
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
      const local = frame.worldToLocal(handle.position, handle.position.clone());
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
