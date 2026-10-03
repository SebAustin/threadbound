import {
  createSystem,
  Mesh,
  PhysicsBody,
  PhysicsManipulation,
  PhysicsShape,
  PhysicsShapeType,
  PhysicsState,
  Vector3,
  type Entity,
} from '@iwsdk/core';
import { GOAL, MARBLE, THREAD_TUNING } from '../../config/constants';
import { dropOver, isStalled, nudgeDirection, restTimer } from '../../lib/dropWatch';
import { goalAccepts } from '../../lib/goalMatch';
import { isMarbleColor } from '../../lib/marbleColors';
import { timeScale } from '../../lib/settings';
import { releaseOrder, type Release } from '../../lib/releaseOrder';
import { segmentDistanceSq2d } from '../../lib/segment2d';
import { spawnOffsetX } from '../../lib/spawnOffset';
import { stringSynth } from '../audio/stringSynth';
import { GEOMETRIES, goalMaterial, marbleMaterial } from '../diorama/palette';
import { Chute, Marble, Thread } from '../puzzle/components';
import { puzzleStore } from '../puzzle/puzzleStore';
import { onPointer } from '../input/pointerEvents';

/** Contact band around a thread that counts as a "pluck". */
const CONTACT_DIST = MARBLE.radius + THREAD_TUNING.radius + 0.004;
const CONTACT_DIST_SQ = CONTACT_DIST * CONTACT_DIST;
/** Marble speed (m/s) that plays a bounce at full volume. */
const FULL_VOLUME_SPEED = 1.2;
const MELODY_STEP_SECONDS = 0.22;
/** Highest marble center that still counts as "in the cup" (one stacked layer). */
const CUP_TOP = GOAL.wallHeight + MARBLE.radius;
/** Marbles count once they have (nearly) come to rest, not while flying over. */
const SETTLED_SPEED = 0.35;
/** A visible wobble even for a gentle touch. */
const MIN_PLUCK_ENERGY = 0.3;
/** Longest replayed melody; a busy drop would otherwise drone on. */
const MAX_MELODY_NOTES = 16;
/** C5 "ding" when a puzzle is solved without touching any thread. */
const FALLBACK_NOTE_HZ = 523.25;
const MELODY_VOLUME = 0.7;
const MARBLE_ANGULAR_DAMPING = 0.2;
/** Sideways speed (m/s) that tips a marble off an unstable perch, like a real wobble. */
const NUDGE_SPEED = 0.12;

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
  /** This drop's releases in round-robin chute order; `released` counts those spawned. */
  private queue: readonly Release[] = [];
  private released = 0;
  private releaseTimer = 0;
  /** Thread entity indices each marble is currently touching, keyed by marble index. */
  private contacts = new Map<number, Set<number>>();
  /** Notes played during the current drop — the puzzle's "song". */
  private melody: number[] = [];
  /** Reused scratch list so lost marbles are disposed after, not during, iteration. */
  private lost: Entity[] = [];
  private tmpWorld = new Vector3();
  private tmpLocal = new Vector3();
  private tmpNudge = new Vector3();
  /** Seconds each marble has been at rest, keyed by marble index. */
  private rest = new Map<number, number>();
  /** Nudges each marble has needed, keyed by marble index. */
  private nudges = new Map<number, number>();
  /** Seconds every marble of the drop has been at rest at once. */
  private quiet = 0;
  /** Solved melody being replayed, one note per step (paused with the system). */
  private replay: readonly number[] = [];
  private replayNext = 0;
  private replayTimer = 0;

  init(): void {
    this.cleanupFuncs.push(
      this.queries.chutes.subscribe('qualify', (chute) => this.attachChute(chute)),
      this.queries.marbles.subscribe('disqualify', (m) => {
        this.contacts.delete(m.index);
        this.rest.delete(m.index);
        this.nudges.delete(m.index);
      }),
      puzzleStore.onCommand((command) => {
        if (command.type === 'drop') this.drop();
        if (command.type === 'levelBuilt') {
          this.queue = [];
          this.released = 0;
          this.melody = [];
          this.replay = [];
        }
      }),
    );
    // 'qualify' only fires for future matches; a chute built earlier needs wiring now.
    for (const chute of this.queries.chutes.entities) this.attachChute(chute);
  }

  private attachChute(chute: Entity): void {
    const object = chute.object3D;
    if (!object) return;
    // Listen on the chute mesh itself; IWSDK only stops down/up, not click.
    onPointer(object, 'click', () => puzzleStore.dispatch({ type: 'drop' }));
  }

  /** Pinching the chute (re)starts a drop with the level's marbles. */
  private drop(): void {
    const level = puzzleStore.get().level;
    if (!level) return;
    stringSynth.unlock();
    this.clearMarbles();
    this.resetGoalGlow();
    this.melody = [];
    this.queue = releaseOrder(level.chutes);
    this.released = 0;
    this.releaseTimer = 0;
    this.quiet = 0;
    this.replay = [];
    puzzleStore.update({ status: 'dropping', scored: 0 });
  }

  private clearMarbles(): void {
    for (const marble of [...this.queries.marbles.entities]) {
      marble.dispose({ disposeResources: false });
    }
    this.queue = [];
    this.released = 0;
  }

  private spawnMarble(release: Release): void {
    const chute = puzzleStore.get().level?.chutes[release.chute];
    const frame = puzzleStore.frame;
    if (!chute || !frame) return;
    const mesh = new Mesh(GEOMETRIES.marble, marbleMaterial(chute.color));
    mesh.name = 'marble';
    mesh.userData.color = chute.color;
    const x = chute.x + spawnOffsetX(release.nth, MARBLE.spawnJitter);
    frame.localToWorld(x, chute.y, 0, mesh.position);
    const entity = this.world.createTransformEntity(mesh);
    entity.addComponent(Marble, { scored: false, color: chute.color });
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
      angularDamping: MARBLE_ANGULAR_DAMPING,
    });
    this.contacts.set(entity.index, new Set());
  }

  update(delta: number): void {
    // Simulation time: slow motion dilates releases and rest timers with physics.
    const simDelta = delta * timeScale(puzzleStore.get().settings.slowMotion);
    this.releaseDue(simDelta);
    this.replayDue(delta);
    const frame = puzzleStore.frame;
    if (!frame) return;
    let allResting = true;
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
      allResting = this.watchRest(marble, this.tmpLocal.x, this.tmpLocal.y, simDelta) && allResting;
    }
    for (const marble of this.lost) marble.dispose({ disposeResources: false });
    this.lost.length = 0;
    this.endDropIfSettled(allResting, simDelta);
  }

  private releaseDue(delta: number): void {
    if (this.released >= this.queue.length) return;
    this.releaseTimer -= delta;
    if (this.releaseTimer > 0) return;
    this.spawnMarble(this.queue[this.released]);
    this.released += 1;
    this.releaseTimer = MARBLE.releaseInterval;
  }

  /** Tracks rest, nudging a marble off an unstable perch. Returns whether it is at rest. */
  private watchRest(marble: Entity, x: number, y: number, delta: number): boolean {
    const resting = restTimer(this.rest.get(marble.index) ?? 0, delta, this.speedOf(marble));
    const inCup = this.cupAt(x, y) >= 0;
    if (!isStalled({ restSeconds: resting, y, inCup })) {
      this.rest.set(marble.index, resting);
      return resting > 0;
    }
    this.nudge(marble, x);
    this.rest.set(marble.index, 0);
    return false;
  }

  /** Sideways push in the diorama plane: toward the middle, then the other way. */
  private nudge(marble: Entity, x: number): void {
    const frame = puzzleStore.frame;
    const width = puzzleStore.get().level?.size[0];
    if (!frame || width === undefined) return;
    const attempt = this.nudges.get(marble.index) ?? 0;
    this.nudges.set(marble.index, attempt + 1);
    const side = nudgeDirection(x, width, attempt);
    this.tmpNudge.set(side * NUDGE_SPEED, 0, 0).applyQuaternion(frame.anchor.quaternion);
    marble.addComponent(PhysicsManipulation, { linearVelocity: [this.tmpNudge.x, this.tmpNudge.y, this.tmpNudge.z] });
  }

  /** An unsolved drop whose marbles have all stopped is over: the player can try again. */
  private endDropIfSettled(allResting: boolean, delta: number): void {
    if (puzzleStore.get().status !== 'dropping') return;
    this.quiet = allResting ? this.quiet + delta : 0;
    if (dropOver({ allReleased: this.released >= this.queue.length, quietSeconds: this.quiet })) {
      puzzleStore.update({ status: 'idle' });
    }
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
        const strength = this.speedOf(marble) / FULL_VOLUME_SPEED;
        stringSynth.pluck(pitch, strength);
        thread.setValue(Thread, 'energy', Math.min(1, Math.max(MIN_PLUCK_ENERGY, strength)));
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
    // Settled inside the cup: allows a second stacked layer, ignores fly-overs.
    const raw = marble.getValue(Marble, 'color');
    const color = isMarbleColor(raw) ? raw : 'teal';
    const index = this.cupAt(x, y);
    if (index < 0 || !goalAccepts(goals[index].color, color) || this.speedOf(marble) > SETTLED_SPEED) return;
    marble.setValue(Marble, 'scored', true);
    const goalMesh = puzzleStore.diorama?.goalMeshes[index];
    if (goalMesh) goalMesh.material = goalMaterial(goals[index].color, true);

    const state = puzzleStore.get();
    const scored = state.scored + 1;
    const complete = state.level !== null && scored >= state.level.marbles;
    puzzleStore.update({ scored, status: complete ? 'complete' : state.status });
    if (complete) this.playMelody();
  }

  /** Index of the cup a marble centre at (x, y) sits in, or -1 (one stacked layer allowed). */
  private cupAt(x: number, y: number): number {
    const goals = puzzleStore.diorama?.goals ?? [];
    if (y >= CUP_TOP) return -1;
    for (let i = 0; i < goals.length; i++) {
      if (x > goals[i].minX && x < goals[i].maxX) return i;
    }
    return -1;
  }

  /** Replays the bounces that solved the puzzle: every solution is a song. */
  private playMelody(): void {
    this.replay = this.melody.length > 0 ? this.melody.slice(0, MAX_MELODY_NOTES) : [FALLBACK_NOTE_HZ];
    this.replayNext = 0;
    this.replayTimer = MELODY_STEP_SECONDS;
  }

  private replayDue(delta: number): void {
    if (this.replayNext >= this.replay.length) return;
    this.replayTimer -= delta;
    if (this.replayTimer > 0) return;
    stringSynth.pluck(this.replay[this.replayNext], MELODY_VOLUME);
    this.replayNext += 1;
    this.replayTimer = MELODY_STEP_SECONDS;
  }

  private resetGoalGlow(): void {
    const diorama = puzzleStore.diorama;
    diorama?.goalMeshes.forEach((mesh, i) => {
      mesh.material = goalMaterial(diorama.goals[i]?.color, false);
    });
  }
}
