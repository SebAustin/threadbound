import { Box3, createSystem, Quaternion, Vector3, VisibilityState, XRPlane, type Object3D } from '@iwsdk/core';
import {
  choosePlacement,
  headRelativePlacement,
  originFromCenter,
  type Placement,
  type PlaneCandidate,
  type PlanePose,
} from '../../lib/placement';
import { shouldShowVirtualRoom } from '../../lib/xrMode';
import { devLog } from '../debug/devLog';
import { puzzleStore } from '../puzzle/puzzleStore';

/** How long to wait for a table plane before placing in front of the player. */
const SEARCH_TIMEOUT_SECONDS = 3;
const EVALUATE_EVERY_SECONDS = 0.25;

type Phase = 'inactive' | 'searching' | 'placed';

/** The slice of a native WebXR XRPlane we read. Its polygon is in plane space (x, z). */
interface NativePlaneInfo {
  orientation?: string;
  semanticLabel?: string;
  polygon?: ReadonlyArray<{ readonly x: number; readonly z: number }>;
}

function isNativePlane(value: unknown): value is NativePlaneInfo {
  return typeof value === 'object' && value !== null && 'orientation' in value;
}

/** Plane-space bounds of a polygon (x, z), or null if it is degenerate. */
function polygonBounds(
  polygon: NativePlaneInfo['polygon'],
): { min: [number, number]; max: [number, number] } | null {
  if (!polygon || polygon.length < 3) return null;
  const min: [number, number] = [Infinity, Infinity];
  const max: [number, number] = [-Infinity, -Infinity];
  for (const point of polygon) {
    min[0] = Math.min(min[0], point.x);
    min[1] = Math.min(min[1], point.z);
    max[0] = Math.max(max[0], point.x);
    max[1] = Math.max(max[1], point.z);
  }
  return { min, max };
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
  private where: 'table' | 'in front of you' | null = null;
  private planes = 0;

  /** Where the diorama was last placed in passthrough (null outside AR or before placing). */
  get placedOn(): 'table' | 'in front of you' | null {
    return this.where;
  }

  /** Detected planes seen at the last evaluation (scene understanding). */
  get planesSeen(): number {
    return this.planes;
  }
  private elapsed = 0;
  private sinceEvaluate = 0;
  private box = new Box3();
  private head = new Vector3();
  private forward = new Vector3();
  private quat = new Quaternion();
  private planeOrigin = new Vector3();
  private planeQuat = new Quaternion();
  private planeAxis = new Vector3();

  init(): void {
    this.cleanupFuncs.push(this.world.visibilityState.subscribe(() => this.onVisibility()));
  }

  private onVisibility(): void {
    const visibility = this.world.visibilityState.peek();
    if (visibility === VisibilityState.NonImmersive) {
      if (this.phase === 'placed') puzzleStore.dispatch({ type: 'resetPlacement' });
      this.phase = 'inactive';
      this.where = null;
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
    this.planes = candidates.length;
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
      const native: unknown = entity.getValue(XRPlane, '_plane');
      const object = entity.object3D;
      if (!isNativePlane(native) || !object) continue;
      this.box.setFromObject(object);
      if (this.box.isEmpty()) continue;
      result.push({
        orientation: native.orientation ?? '',
        label: native.semanticLabel,
        min: [this.box.min.x, this.box.min.y, this.box.min.z],
        max: [this.box.max.x, this.box.max.y, this.box.max.z],
        pose: this.poseOf(object, native),
      });
    }
    return result;
  }

  /**
   * The plane's own frame: world position, rotation about +Y, and its polygon's
   * bounds in plane space. A rotated table is a true rectangle there.
   */
  private poseOf(object: Object3D, native: NativePlaneInfo): PlanePose | undefined {
    const bounds = polygonBounds(native.polygon);
    if (!bounds) return undefined;
    object.getWorldPosition(this.planeOrigin);
    object.getWorldQuaternion(this.planeQuat);
    this.planeAxis.set(1, 0, 0).applyQuaternion(this.planeQuat);
    return {
      origin: [this.planeOrigin.x, this.planeOrigin.y, this.planeOrigin.z],
      yaw: Math.atan2(-this.planeAxis.z, this.planeAxis.x),
      min: bounds.min,
      max: bounds.max,
    };
  }

  private place(placement: Placement, width: number, where: 'table' | 'in front of you'): void {
    this.phase = 'placed';
    this.where = where;
    const origin = originFromCenter(placement.center, placement.yaw, width);
    devLog(`diorama placed ${where}`);
    puzzleStore.dispatch({ type: 'place', origin, yaw: placement.yaw });
  }
}
