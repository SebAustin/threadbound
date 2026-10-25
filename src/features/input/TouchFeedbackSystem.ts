import { createSystem, Hovered, Pressed, type Entity, type Material, type Mesh, type Object3D } from '@iwsdk/core';
import { PRESS_AXIS, PRESS_TRAVEL, touchState, type TouchKind, type TouchState } from '../../lib/touchFeedback';
import { HOT_MATERIALS, MATERIALS, TARGET_MATERIALS } from '../diorama/palette';
import { SnapTarget, Touchable } from '../puzzle/components';

/** What each touchable root mirrors in `userData.touch`, for the test hook. */
export interface TouchMirror {
  readonly kind: TouchKind;
  state: TouchState;
  /** Meters the visible parts are moved by right now (0 unless pressed). */
  travel: number;
}

const isHitArea = (object: Object3D) => object.userData.hitArea === true;

/** The material a part shows in `state`, from the one it rests in. */
function materialFor(rest: Material, state: TouchState, kind: TouchKind): Material {
  if (state === 'rest') return rest;
  // A thread about to be snipped looks like the drag preview: a thread about to go.
  if (state === 'press' && kind === 'thread') return MATERIALS.threadPreview;
  if (state === 'target') return TARGET_MATERIALS.get(rest) ?? HOT_MATERIALS.get(rest) ?? rest;
  return HOT_MATERIALS.get(rest) ?? rest;
}

/**
 * Every control shows it is being touched: a part lights under a ray, gaze or
 * fingertip (Hovered), lights brighter as a pull's snap target (SnapTarget), and
 * a pressed part moves by its travel (Pressed). Reacts to tag changes only: no
 * polling, and nothing is allocated after a part is set up. Its hit area (an
 * invisible child) never lights or moves, so a fingertip keeps contact with a
 * sinking button cap.
 */
export class TouchFeedbackSystem extends createSystem({
  touchables: { required: [Touchable] },
  hovered: { required: [Touchable, Hovered] },
  pressed: { required: [Touchable, Pressed] },
  targeted: { required: [Touchable, SnapTarget] },
}) {
  /** Each visible part's own material, recorded when its root is set up. */
  private readonly restMaterials = new WeakMap<Object3D, Material>();

  init(): void {
    const refresh = (entity: Entity) => this.refresh(entity);
    this.cleanupFuncs.push(
      this.queries.touchables.subscribe('qualify', (entity) => this.setUp(entity)),
      this.queries.hovered.subscribe('qualify', refresh),
      this.queries.hovered.subscribe('disqualify', refresh),
      this.queries.pressed.subscribe('qualify', refresh),
      this.queries.pressed.subscribe('disqualify', refresh),
      this.queries.targeted.subscribe('qualify', refresh),
      this.queries.targeted.subscribe('disqualify', refresh),
    );
    // 'qualify' only fires for future matches; parts built earlier need setting up now.
    for (const entity of this.queries.touchables.entities) this.setUp(entity);
  }

  private setUp(entity: Entity): void {
    const root = entity.object3D;
    if (!root || root.userData.touch) return;
    const kind = entity.getValue(Touchable, 'kind') as TouchKind;
    const mirror: TouchMirror = { kind, state: 'rest', travel: 0 };
    root.userData.touch = mirror;
    for (const part of root.children) {
      const material = (part as Mesh).material;
      if (!isHitArea(part) && material && !Array.isArray(material)) this.restMaterials.set(part, material);
    }
  }

  /** Shows the part's current state. Parts disposed mid-press (Restart, Next, a snip) are skipped. */
  private refresh(entity: Entity): void {
    if (!entity.active) return;
    const root = entity.object3D;
    if (!root) return;
    if (!root.userData.touch) this.setUp(entity);
    const mirror = root.userData.touch as TouchMirror;
    const state = touchState({
      hovered: entity.hasComponent(Hovered),
      pressed: entity.hasComponent(Pressed),
      target: entity.hasComponent(SnapTarget),
    });
    if (state === mirror.state) return;
    mirror.state = state;
    this.light(root, state, mirror.kind);
    this.move(root, mirror, state === 'press' ? PRESS_TRAVEL[mirror.kind] : 0);
  }

  private light(root: Object3D, state: TouchState, kind: TouchKind): void {
    for (const part of root.children) {
      const rest = this.restMaterials.get(part);
      if (rest) (part as Mesh).material = materialFor(rest, state, kind);
    }
  }

  /** Moves the visible parts (never the hit area) to `travel` along the kind's axis, toward negative. */
  private move(root: Object3D, mirror: TouchMirror, travel: number): void {
    const delta = travel - mirror.travel;
    if (delta === 0) return;
    mirror.travel = travel;
    const axis = PRESS_AXIS[mirror.kind];
    for (const part of root.children) {
      if (!isHitArea(part)) part.position[axis] -= delta;
    }
  }
}
