import { Box3, createSystem, Quaternion, Vector3, VisibilityState, XRPlane } from '@iwsdk/core';
import {
  choosePlacement,
  headRelativePlacement,
  originFromCenter,
  type Placement,
  type PlaneCandidate,
} from '../../lib/placement';
import { shouldShowVirtualRoom } from '../../lib/xrMode';
import { devLog } from '../debug/devLog';
import { puzzleStore } from '../puzzle/puzzleStore';

/** How long to wait for a table plane before placing in front of the player. */
const SEARCH_TIMEOUT_SECONDS = 3;
const EVALUATE_EVERY_SECONDS = 0.25;

type Phase = 'inactive' | 'searching' | 'placed';

interface NativePlaneInfo {
  orientation?: string;
  semanticLabel?: string;
}

/**
 * Mixed reality: put the diorama on the player's real table, facing them.
 * Picks the best detected horizontal plane within seated reach; if none shows
 * up in time, floats it at table height in front of the player.
 */
export class PlacementSystem extends createSystem({
  planes: { required: [XRPlane] },
}) {
  private phase: Phase = 'inactive';
  private elapsed = 0;
  private sinceEvaluate = 0;
  private box = new Box3();
  private head = new Vector3();
  private forward = new Vector3();
  private quat = new Quaternion();

  init(): void {
    this.cleanupFuncs.push(this.world.visibilityState.subscribe(() => this.onVisibility()));
  }

  private onVisibility(): void {
    const visibility = this.world.visibilityState.peek();
    if (visibility === VisibilityState.NonImmersive) {
      if (this.phase === 'placed') puzzleStore.dispatch({ type: 'resetPlacement' });
      this.phase = 'inactive';
      return;
    }
    const passthrough = !shouldShowVirtualRoom(true, this.world.session?.environmentBlendMode);
    if (passthrough && this.phase === 'inactive') {
      this.phase = 'searching';
      this.elapsed = 0;
      this.sinceEvaluate = EVALUATE_EVERY_SECONDS;
    }
  }

  update(delta: number): void {
    if (this.phase !== 'searching') return;
    this.elapsed += delta;
    this.sinceEvaluate += delta;
    if (this.sinceEvaluate < EVALUATE_EVERY_SECONDS) return;
    this.sinceEvaluate = 0;

    const level = puzzleStore.get().level;
    if (!level) return;
    this.readHead();
    const head = [this.head.x, this.head.y, this.head.z] as const;
    const candidates = this.candidates();
    const forward = [this.forward.x, this.forward.y, this.forward.z] as const;
    const onTable = choosePlacement(candidates, head, level.size[0], forward);
    if (import.meta.env.DEV && (onTable || this.elapsed >= SEARCH_TIMEOUT_SECONDS)) {
      const fmt = (v: readonly number[]) => v.map((n) => n.toFixed(2)).join(',');
      const lines = candidates
        .filter((c) => c.orientation === 'horizontal')
        .map((c) => `${c.label || '?'} [${fmt(c.min)}]..[${fmt(c.max)}]`);
      devLog(`placement candidates: ${lines.join(' | ')}`);
    }
    if (onTable) {
      this.place(onTable, level.size[0], 'table');
    } else if (this.elapsed >= SEARCH_TIMEOUT_SECONDS) {
      this.place(headRelativePlacement(head, forward), level.size[0], 'in front of you');
    }
  }

  private readHead(): void {
    this.player.head.getWorldPosition(this.head);
    this.player.head.getWorldQuaternion(this.quat);
    this.forward.set(0, 0, -1).applyQuaternion(this.quat);
  }

  private candidates(): PlaneCandidate[] {
    const result: PlaneCandidate[] = [];
    for (const entity of this.queries.planes.entities) {
      const native = entity.getValue(XRPlane, '_plane') as NativePlaneInfo | undefined;
      const object = entity.object3D;
      if (!native || !object) continue;
      this.box.setFromObject(object);
      if (this.box.isEmpty()) continue;
      result.push({
        orientation: native.orientation ?? '',
        label: native.semanticLabel,
        min: [this.box.min.x, this.box.min.y, this.box.min.z],
        max: [this.box.max.x, this.box.max.y, this.box.max.z],
      });
    }
    return result;
  }

  private place(placement: Placement, width: number, where: string): void {
    this.phase = 'placed';
    const origin = originFromCenter(placement.center, placement.yaw, width);
    devLog(`diorama placed ${where}`);
    puzzleStore.dispatch({ type: 'place', origin, yaw: placement.yaw });
  }
}
