import { Box3, createSystem, Quaternion, Vector3, VisibilityState, XRPlane, type Object3D } from '@iwsdk/core';
import {
  choosePlacement,
  headRelativePlacement,
  originFromCenter,
  type Placement,
  type PlaneCandidate,
  type PlanePose,
} from '../../lib/placement';
import {
  createSearch,
  requestRestart,
  startSearch,
  stepSearch,
  stopSearch,
  type SearchFrame,
  type SearchPhase,
  type SearchPlace,
} from '../../lib/placementSearch';
import { playerThreadCount } from '../../lib/threadRules';
import { shouldShowVirtualRoom } from '../../lib/xrMode';
import { devLog } from '../debug/devLog';
import { puzzleStore } from '../puzzle/puzzleStore';

type Where = 'table' | 'in front of you';

/** The search's per-frame input, reused every frame (update() must not allocate). */
type MutableFrame = { -readonly [K in keyof SearchFrame]: SearchFrame[K] };

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
 * Mixed reality: put the diorama on the player's real table, facing them (lib/placementSearch
 * decides when). From the start of a passthrough session, and during every new search, the
 * diorama stays hidden until it is placed. With no table it floats in front of the player, and
 * a table that turns up while the level is untouched still takes it. A recenter (the reference
 * space's 'reset') searches again from the current head pose.
 */
export class PlacementSystem extends createSystem({
  planes: { required: [XRPlane] },
}) {
  private readonly search = createSearch();
  private readonly frameInput: MutableFrame = { delta: 0, paused: false, status: 'idle', playerThreads: 0, drags: 0 };
  private readonly findTable = (): Placement | null => this.evaluate();
  private where: Where | null = null;
  private planes = 0;
  private placeCount = 0;
  /** The dioramaHidden flag as last sent on the bus. */
  private sentHidden = false;
  private needsResetListener = false;
  private detachReset: (() => void) | null = null;
  private box = new Box3();
  private head = new Vector3();
  private forward = new Vector3();
  private quat = new Quaternion();
  private planeOrigin = new Vector3();
  private planeQuat = new Quaternion();
  private planeAxis = new Vector3();

  /** Where the diorama was last placed in passthrough (null outside AR or before placing). */
  get placedOn(): Where | null {
    return this.where;
  }

  /** Detected planes seen at the last evaluation (scene understanding). */
  get planesSeen(): number {
    return this.planes;
  }

  get phase(): SearchPhase {
    return this.search.phase;
  }

  /** `place` commands on the bus since this XR session started (since the page loaded, outside XR). */
  get placements(): number {
    return this.placeCount;
  }

  init(): void {
    this.xrManager.addEventListener('sessionstart', this.onSessionStart);
    this.xrManager.addEventListener('sessionend', this.onSessionEnd);
    this.cleanupFuncs.push(
      this.world.visibilityState.subscribe(() => this.onVisibility()),
      puzzleStore.onCommand((command) => {
        if (command.type === 'place') this.placeCount += 1;
      }),
      () => {
        this.xrManager.removeEventListener('sessionstart', this.onSessionStart);
        this.xrManager.removeEventListener('sessionend', this.onSessionEnd);
        this.onSessionEnd();
      },
    );
  }

  /** As IWSDK's EnvironmentSystem does: listen for 'reset', on a later frame if the space isn't there yet. */
  private readonly onSessionStart = (): void => {
    this.placeCount = 0;
    this.attachResetListener();
  };

  private readonly onSessionEnd = (): void => {
    this.detachReset?.();
    this.detachReset = null;
    this.needsResetListener = false;
  };

  private readonly onReset = (): void => {
    devLog('reference space reset: searching again');
    requestRestart(this.search);
  };

  private attachResetListener(): void {
    const space = this.xrManager.getReferenceSpace();
    this.needsResetListener = space === null;
    if (!space) return;
    space.addEventListener('reset', this.onReset);
    this.detachReset = () => space.removeEventListener('reset', this.onReset);
  }

  private onVisibility(): void {
    if (this.world.visibilityState.peek() === VisibilityState.NonImmersive) {
      if (this.where !== null) puzzleStore.dispatch({ type: 'resetPlacement' });
      this.where = null;
      stopSearch(this.search);
      this.syncHidden();
      return;
    }
    const passthrough = !shouldShowVirtualRoom(true, this.world.session?.environmentBlendMode);
    if (passthrough && this.search.phase === 'inactive') {
      startSearch(this.search);
      this.syncHidden();
    }
  }

  update(delta: number): void {
    if (this.needsResetListener) this.attachResetListener();
    if (this.search.phase === 'inactive') return;
    const state = puzzleStore.get();
    const input = this.frameInput;
    input.delta = delta;
    input.paused = state.paused;
    input.status = state.status;
    input.playerThreads = playerThreadCount(state.threads);
    input.drags = state.drags;
    const place = stepSearch(this.search, input, this.findTable);
    // Place first, so the rebuild happens hidden and its fade starts once the flag clears.
    if (place) this.place(place);
    this.syncHidden();
  }

  /** The dioramaHidden flag on the bus follows the search's. */
  private syncHidden(): void {
    if (this.search.hidden === this.sentHidden) return;
    this.sentHidden = this.search.hidden;
    puzzleStore.dispatch({ type: 'dioramaHidden', hidden: this.sentHidden });
  }

  /** Best table for the current level from the detected planes, or null. Runs at most 4 times a second. */
  private evaluate(): Placement | null {
    const level = puzzleStore.get().level;
    if (!level) return null;
    this.readHead();
    const candidates = this.candidates();
    this.planes = candidates.length;
    const head = [this.head.x, this.head.y, this.head.z] as const;
    const forward = [this.forward.x, this.forward.y, this.forward.z] as const;
    const onTable = choosePlacement(candidates, head, level, forward);
    if (import.meta.env.DEV && onTable) this.logCandidates(candidates);
    return onTable;
  }

  private logCandidates(candidates: readonly PlaneCandidate[]): void {
    const fmt = (v: readonly number[]) => v.map((n) => n.toFixed(2)).join(',');
    const lines = candidates
      .filter((c) => c.orientation === 'horizontal')
      .map((c) => `${c.label || '?'} [${fmt(c.min)}]..[${fmt(c.max)}]`);
    devLog(`placement candidates: ${lines.join(' | ')}`);
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

  /** On the table found, or floating in front of the head as it is now. */
  private place(place: SearchPlace<Placement>): void {
    const level = puzzleStore.get().level;
    if (!level) return;
    const where: Where = place.surface === 'table' ? 'table' : 'in front of you';
    let placement: Placement;
    if (place.surface === 'table') {
      placement = place.placement;
    } else {
      this.readHead();
      placement = headRelativePlacement([this.head.x, this.head.y, this.head.z], [this.forward.x, this.forward.y, this.forward.z]);
    }
    this.where = where;
    const origin = originFromCenter(placement.center, placement.yaw, level.size[0]);
    devLog(`diorama placed ${where} (${this.planes} planes seen)`);
    puzzleStore.dispatch({ type: 'place', origin, yaw: placement.yaw, surface: place.surface });
  }
}
