import { createSystem, Vector3 } from '@iwsdk/core';
import { DIORAMA_DEFAULT_POSITION } from '../../config/constants';
import { afterBuild, NO_ATTEMPTS } from '../../lib/attempts';
import type { Level } from '../../lib/levelSchema';
import { EMPTY_MELODY } from '../../lib/melody';
import { offsetOrigin, originFromCenter, type DioramaOffset } from '../../lib/placement';
import { INITIAL_PROGRESS, loadProgress, recordCompletion, recordDaily, recordSkip, saveProgress } from '../../lib/progress';
import { browserStorage } from '../../lib/storage';
import { starsFor } from '../../lib/scoring';
import { hasCampaignSolve, resumeTarget } from '../../lib/resume';
import { restoreSteps } from '../../lib/solutionSteps';
import { playerThreadCount } from '../../lib/threadRules';
import type { Vec3 } from '../../lib/vec';
import { today } from '../../lib/daily';
import { dailyPick, reachedMechanics } from '../../lib/dailyPool';
import { DAILY_LEVELS, isDailyIndex, LEVELS, PLAYABLE } from '../../levels';
import { buildDiorama } from '../diorama/buildDiorama';
import { DioramaFrame } from '../diorama/dioramaFrame';
import { disposeLevelEntity } from '../diorama/disposeLevelEntity';
import { Marble, Thread } from './components';
import { puzzleStore, type BuildReason, type DailySession, type PuzzleCommand, type PuzzleState } from './puzzleStore';
import { skipOfferedOf } from './skipOffer';

interface FramePose {
  readonly origin: Vec3;
  readonly yaw: number;
}

/** A drop or a drag is in progress: a rebuild would cut it short, so a move waits. */
const busy = (state: PuzzleState) => state.status === 'dropping' || state.drags > 0;

/** Default spot on the virtual study's table (VR, browser, and AR without a table). */
function defaultPose(level: Level): FramePose {
  const [x, y, z] = DIORAMA_DEFAULT_POSITION;
  return { origin: originFromCenter([x, y, z], 0, level.size[0]), yaw: 0 };
}

/** Level lifecycle: load/restart/next, placement, teardown, stars and saved progress. */
export class PuzzleSystem extends createSystem({
  threads: { required: [Thread] },
  marbles: { required: [Marble] },
}) {
  private storage = browserStorage();
  /** A new pose arrived during a drop; the rebuild waits until the marbles settle. */
  private relocatePending = false;
  /** Explicit table placement (AR); null means use the default virtual-table pose. */
  private placedPose: FramePose | null = null;
  /** The player's height/distance adjustment the current diorama was built with. */
  private builtOffset: DioramaOffset | null = null;

  init(): void {
    const progress = loadProgress(this.storage);
    // A save with a campaign solve makes this a return visit: the ledge says when today's daily is ready.
    puzzleStore.update({ progress, returnVisit: hasCampaignSolve(LEVELS, progress.best) });
    this.cleanupFuncs.push(
      puzzleStore.onCommand((command) => this.handle(command)),
      puzzleStore.subscribe((state) => this.onStateChange(state)),
    );
    // Resume by solved level ids, not a stored index: adding levels never misplaces a save; skipped levels are passed over.
    // A finished campaign reopens on today's daily (solved or not), whose sun returns to the last level.
    const target = resumeTarget(LEVELS, progress.best, progress.skipped);
    if (target.daily) this.openDaily(undefined, target.returnTo);
    else this.loadLevel(target.index);
  }

  private handle(command: PuzzleCommand): void {
    const { levelIndex } = puzzleStore.get();
    switch (command.type) {
      case 'load':
        this.loadLevel(command.index, command.browsing ? 'browsing' : 'fresh');
        break;
      case 'restart':
        this.loadLevel(levelIndex);
        break;
      case 'next':
        this.loadLevel(Math.min(levelIndex + 1, LEVELS.length - 1));
        break;
      case 'daily':
        this.openDaily(command.index);
        break;
      case 'toggleDaily': {
        const { daily } = puzzleStore.get();
        if (daily) this.loadLevel(daily.returnTo);
        else this.openDaily();
        break;
      }
      case 'resetProgress':
        saveProgress(this.storage, INITIAL_PROGRESS);
        // A fresh start forgets the run of misses too, even on the level already open, and is no return visit.
        puzzleStore.update({ progress: INITIAL_PROGRESS, ...NO_ATTEMPTS, returnVisit: false });
        this.loadLevel(0);
        break;
      case 'skip':
        this.skip();
        break;
      case 'place':
        // Only the table pose changes: rebuild there with the player's work intact.
        this.placedPose = { origin: command.origin, yaw: command.yaw };
        puzzleStore.update({ surface: command.surface });
        this.relocateSoon();
        break;
      case 'resetPlacement':
        this.placedPose = null;
        puzzleStore.update({ surface: null, dioramaHidden: false });
        this.relocateSoon();
        break;
      default:
        this.handleFlag(command);
        break;
    }
  }

  /** The settings face's Skip, only while it is offered: saved as skipped (no stars), then on to the next level. */
  private skip(): void {
    const state = puzzleStore.get();
    if (!state.level || !skipOfferedOf(state)) return;
    const progress = recordSkip(state.progress, {
      levelId: state.level.id,
      levelIndex: state.levelIndex,
      levelCount: LEVELS.length,
    });
    saveProgress(this.storage, progress);
    puzzleStore.update({ progress });
    this.loadLevel(state.levelIndex + 1);
  }

  /** Flags other systems raise through the bus: the diorama hidden, a drag started or ended. */
  private handleFlag(command: PuzzleCommand): void {
    if (command.type === 'dioramaHidden') puzzleStore.update({ dioramaHidden: command.hidden });
    if (command.type === 'drag') {
      const drags = Math.max(0, puzzleStore.get().drags + (command.active ? 1 : -1));
      puzzleStore.update({ drags });
    }
  }

  /**
   * Today's daily (or pool entry `index`), remembering which campaign level to return to:
   * `returnTo` when given (a reopened finished campaign has no level of its own yet),
   * else the open daily's, else the current level. Today's pick only uses mechanics the
   * player has reached (lib/dailyPool), and opening it ends the return visit's line.
   */
  private openDaily(index?: number, returnTo?: number): void {
    const { daily, levelIndex, progress } = puzzleStore.get();
    const day = today();
    const pick = index ?? dailyPick(day, DAILY_LEVELS, reachedMechanics(LEVELS, progress.best));
    puzzleStore.update({ returnVisit: false });
    this.build(LEVELS.length + pick, { day, returnTo: returnTo ?? daily?.returnTo ?? levelIndex }, 'fresh');
  }

  /** Load a level fresh. Restarting a daily keeps its session; any campaign level ends it. */
  private loadLevel(index: number, reason: BuildReason = 'fresh'): void {
    this.build(index, isDailyIndex(index) ? puzzleStore.get().daily : null, reason);
  }

  private build(index: number, daily: DailySession | null, reason: BuildReason): void {
    const level = PLAYABLE[index];
    if (!level) {
      console.error(`[Threadbound] no level at index ${index}`);
      return;
    }
    this.teardown();
    // Every build uses the current pose and offset, so a deferred move is now done.
    this.relocatePending = false;
    const pose = this.placedPose ?? defaultPose(level);
    const { offset } = puzzleStore.get().settings;
    this.builtOffset = offset;
    const frame = new DioramaFrame(new Vector3(...offsetOrigin(pose.origin, pose.yaw, offset)), pose.yaw);
    puzzleStore.frame = frame;
    puzzleStore.diorama = buildDiorama(this.world, frame, level);
    const next = puzzleStore.diorama.nextButton.object3D;
    if (next) next.visible = false;
    const shadow = puzzleStore.diorama.contactShadow.object3D;
    // Floating, there is no table under the case to shadow.
    if (shadow) shadow.visible = puzzleStore.get().surface !== 'floating';
    const pegPositions = Object.fromEntries(level.pegs.map((p) => [p.id, { x: p.x, y: p.y }]));
    const before = puzzleStore.get();
    // A move keeps both drop counts, Restart keeps the run of misses, another level starts both again.
    const attempts = afterBuild(before, { relocated: reason === 'relocated', sameLevel: index === before.levelIndex });
    puzzleStore.update({
      level,
      levelIndex: index,
      threads: [],
      status: 'idle',
      scored: 0,
      stars: 0,
      pegPositions,
      daily,
      refusal: null,
      lastDropMissed: false,
      firstSolve: false,
      // A build stops the melody book (MarbleSystem silences it on levelBuilt).
      bookPlaying: false,
      melody: EMPTY_MELODY,
      // Every build drops any drag still open (its systems release their pointers on levelBuilt).
      drags: 0,
      ...attempts,
    });
    puzzleStore.dispatch({ type: 'levelBuilt', reason });
  }

  private onStateChange(state: PuzzleState): void {
    // A move during a drop or a drag waits for it to end: this check reruns on every change.
    const moved = this.relocatePending || (this.builtOffset !== null && state.settings.offset !== this.builtOffset);
    if (moved && !busy(state)) {
      this.relocate(state);
      return;
    }
    const next = puzzleStore.diorama?.nextButton.object3D;
    // Dailies stand alone: no Next, and they never unlock campaign levels.
    const hasNext = !state.daily && state.levelIndex < LEVELS.length - 1;
    if (next) next.visible = state.status === 'complete' && hasNext;
    if (state.status !== 'complete' || state.stars > 0 || !state.level) return;

    const stars = starsFor({ threadsUsed: playerThreadCount(state.threads), par: state.level.par, drops: state.drops });
    // Recorded with the solve: a campaign level solved for the first time points to its stars' tune.
    const firstSolve = !state.daily && (state.progress.best[state.level.id] ?? 0) === 0;
    const progress = state.daily
      ? recordDaily(state.progress, stars, state.daily.day)
      : recordCompletion(state.progress, {
          levelId: state.level.id,
          levelIndex: state.levelIndex,
          stars,
          levelCount: LEVELS.length,
          melody: state.melody,
        });
    saveProgress(this.storage, progress);
    puzzleStore.update({ stars, progress, firstSolve });
  }

  /** Rebuild at the new pose now, or once a drop or drag in progress has finished. */
  private relocateSoon(): void {
    const state = puzzleStore.get();
    if (busy(state)) this.relocatePending = true;
    else this.relocate(state);
  }

  /** The player moved the diorama: rebuild it there exactly as they left it, solved or not. */
  private relocate(state: PuzzleState): void {
    const { level, levelIndex, threads, pegPositions, daily, status, scored, stars, melody, drops, missedDrops, firstSolve } = state;
    this.build(levelIndex, daily, 'relocated');
    if (!level) return;
    for (const step of restoreSteps(level, threads, pegPositions)) puzzleStore.dispatch(step);
    // Stars of 0 here means the solve isn't recorded yet; onStateChange records it, tune and drop counts
    // included: they ride in the same update as the status, so a first-drop solve keeps its star.
    // (The build itself keeps both counts for a relocation: lib/attempts' afterBuild.)
    if (status === 'complete') puzzleStore.update({ status, scored, stars, melody, drops, missedDrops, firstSolve });
  }

  private teardown(): void {
    for (const marble of [...this.queries.marbles.entities]) marble.dispose({ disposeResources: false });
    for (const thread of [...this.queries.threads.entities]) thread.dispose({ disposeResources: false });
    for (const entity of puzzleStore.diorama?.entities ?? []) disposeLevelEntity(entity);
    puzzleStore.diorama = null;
  }
}
