import {
  createSystem,
  Mesh,
  PhysicsBody,
  PhysicsShape,
  PhysicsShapeType,
  PhysicsState,
  Vector3,
  type Entity,
} from '@iwsdk/core';
import { GOAL, MARBLE, THREAD_TUNING } from '../../config/constants';
import { segmentDistanceSq2d } from '../../lib/segment2d';
import { spawnOffsetX } from '../../lib/spawnOffset';
import { stringSynth } from '../audio/stringSynth';
import { GEOMETRIES, MATERIALS } from '../diorama/palette';
import { Chute, Marble, Thread } from '../puzzle/components';
import { puzzleStore } from '../puzzle/puzzleStore';
import { onPointer } from '../threads/pointerEvents';

/** Contact band around a thread that counts as a "pluck". */
const CONTACT_DIST = MARBLE.radius + THREAD_TUNING.radius + 0.004;
const CONTACT_DIST_SQ = CONTACT_DIST * CONTACT_DIST;
/** Marble speed (m/s) that plays a bounce at full volume. */
const FULL_VOLUME_SPEED = 1.2;
const MELODY_STEP_SECONDS = 0.22;

/**
 * Chute release, goal scoring, lost-marble cleanup and the bounce→note mapping.
 * Havok exposes no collision callbacks, so contact is detected geometrically in
 * the diorama plane each frame (allocation-free).
 */
export class MarbleSystem extends createSystem({
  chutes: { required: [Chute] },
  marbles: { required: [Marble] },
  threads: { required: [Thread] },
}) {
  private pending = 0;
  private releaseTimer = 0;
  /** Thread entity indices each marble is currently touching, keyed by marble index. */
  private contacts = new Map<number, Set<number>>();
  /** Notes played during the current drop — the puzzle's "song". */
  private melody: number[] = [];
  /** Reused scratch list so lost marbles are disposed after, not during, iteration. */
  private lost: Entity[] = [];
  private tmpWorld = new Vector3();
  private tmpLocal = new Vector3();

  init(): void {
    this.cleanupFuncs.push(
      this.queries.chutes.subscribe('qualify', (chute) => this.attachChute(chute)),
      this.queries.marbles.subscribe('disqualify', (m) => this.contacts.delete(m.index)),
    );
    // 'qualify' only fires for future matches; a chute built earlier needs wiring now.
    for (const chute of this.queries.chutes.entities) this.attachChute(chute);
  }

  private attachChute(chute: Entity): void {
    const object = chute.object3D;
    if (!object) return;
    this.cleanupFuncs.push(onPointer(object, 'click', () => this.drop()));
  }

  /** Pinching the chute (re)starts a drop with the level's marbles. */
  drop(): void {
    const level = puzzleStore.get().level;
    if (!level) return;
    stringSynth.unlock();
    this.clearMarbles();
    this.resetGoalGlow();
    this.melody = [];
    this.pending = level.marbles;
    this.releaseTimer = 0;
    puzzleStore.update({ status: 'dropping', scored: 0 });
  }

  clearMarbles(): void {
    for (const marble of [...this.queries.marbles.entities]) {
      marble.dispose({ disposeResources: false });
    }
    this.pending = 0;
  }

  private spawnMarble(): void {
    const level = puzzleStore.get().level;
    const frame = puzzleStore.frame;
    if (!level || !frame) return;
    const mesh = new Mesh(GEOMETRIES.marble, MATERIALS.marble);
    mesh.name = 'marble';
    const index = level.marbles - this.pending;
    const x = level.chute.x + spawnOffsetX(index, MARBLE.spawnJitter);
    frame.localToWorld(x, level.chute.y, 0, mesh.position);
    const entity = this.world.createTransformEntity(mesh);
    entity.addComponent(Marble, { scored: false });
    entity.addComponent(PhysicsShape, {
      shape: PhysicsShapeType.Sphere,
      dimensions: [MARBLE.radius, 0, 0],
      restitution: MARBLE.restitution,
      friction: MARBLE.friction,
      density: MARBLE.density,
    });
    entity.addComponent(PhysicsBody, {
      state: PhysicsState.Dynamic,
      gravityFactor: MARBLE.gravityFactor,
      angularDamping: 0.2,
    });
    this.contacts.set(entity.index, new Set());
  }

  update(delta: number): void {
    if (this.pending > 0) {
      this.releaseTimer -= delta;
      if (this.releaseTimer <= 0) {
        this.spawnMarble();
        this.pending -= 1;
        this.releaseTimer = MARBLE.releaseInterval;
      }
    }
    const frame = puzzleStore.frame;
    if (!frame) return;
    for (const marble of this.queries.marbles.entities) {
      const object = marble.object3D;
      if (!object) continue;
      object.getWorldPosition(this.tmpWorld);
      frame.worldToLocal(this.tmpWorld, this.tmpLocal);
      if (this.tmpLocal.y < MARBLE.lostBelow) {
        this.lost.push(marble);
        continue;
      }
      this.detectPlucks(marble, this.tmpLocal.x, this.tmpLocal.y);
      this.detectGoal(marble, this.tmpLocal.x, this.tmpLocal.y);
    }
    for (const marble of this.lost) marble.dispose({ disposeResources: false });
    this.lost.length = 0;
  }

  private detectPlucks(marble: Entity, x: number, y: number): void {
    const touching = this.contacts.get(marble.index);
    if (!touching) return;
    for (const thread of this.queries.threads.entities) {
      const d2 = segmentDistanceSq2d(
        x,
        y,
        thread.getValue(Thread, 'ax') ?? 0,
        thread.getValue(Thread, 'ay') ?? 0,
        thread.getValue(Thread, 'bx') ?? 0,
        thread.getValue(Thread, 'by') ?? 0,
      );
      const inContact = d2 <= CONTACT_DIST_SQ;
      const wasInContact = touching.has(thread.index);
      if (inContact && !wasInContact) {
        touching.add(thread.index);
        const pitch = thread.getValue(Thread, 'pitch') ?? 440;
        stringSynth.pluck(pitch, this.speedOf(marble) / FULL_VOLUME_SPEED);
        this.melody.push(pitch);
      } else if (!inContact && wasInContact) {
        touching.delete(thread.index);
      }
    }
  }

  private speedOf(marble: Entity): number {
    const v = marble.getVectorView(PhysicsBody, '_linearVelocity');
    return Math.hypot(v[0], v[1], v[2]);
  }

  private detectGoal(marble: Entity, x: number, y: number): void {
    if (marble.getValue(Marble, 'scored')) return;
    const goals = puzzleStore.diorama?.goals ?? [];
    const index = goals.findIndex((g) => x > g.minX && x < g.maxX && y < GOAL.wallHeight);
    if (index < 0) return;
    marble.setValue(Marble, 'scored', true);
    const goalMesh = puzzleStore.diorama?.goalMeshes[index];
    if (goalMesh) goalMesh.material = MATERIALS.goalDone;

    const state = puzzleStore.get();
    const scored = state.scored + 1;
    const complete = state.level !== null && scored >= state.level.marbles;
    puzzleStore.update({ scored, status: complete ? 'complete' : state.status });
    if (complete) this.playMelody();
  }

  /** Replays the bounces that solved the puzzle: every solution is a song. */
  private playMelody(): void {
    const notes = this.melody.length > 0 ? this.melody.slice(0, 16) : [523.25];
    notes.forEach((hz, i) => {
      setTimeout(() => stringSynth.pluck(hz, 0.7), (i + 1) * MELODY_STEP_SECONDS * 1000);
    });
    console.info(`[Threadbound] puzzle complete — melody of ${notes.length} notes`);
  }

  private resetGoalGlow(): void {
    for (const mesh of puzzleStore.diorama?.goalMeshes ?? []) mesh.material = MATERIALS.goal;
  }
}
