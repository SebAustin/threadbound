import { createSystem, Vector3 } from '@iwsdk/core';
import { DIORAMA_DEFAULT_POSITION } from '../../config/constants';
import type { Level } from '../../lib/levelSchema';
import { offsetOrigin, originFromCenter, type DioramaOffset } from '../../lib/placement';
import { INITIAL_PROGRESS, loadProgress, recordCompletion, recordDaily, saveProgress } from '../../lib/progress';
import { browserStorage } from '../../lib/storage';
import { starsFor } from '../../lib/scoring';
import { resumeIndex } from '../../lib/resume';
import { restoreSteps } from '../../lib/solutionSteps';
import { playerThreadCount } from '../../lib/threadRules';
import type { Vec3 } from '../../lib/vec';
import { dailyIndex, today } from '../../lib/daily';
import { DAILY_LEVELS, isDailyIndex, LEVELS, PLAYABLE } from '../../levels';
import { buildDiorama } from '../diorama/buildDiorama';
import { DioramaFrame } from '../diorama/dioramaFrame';
import { disposeLevelEntity } from '../diorama/disposeLevelEntity';
import { Marble, Thread } from './components';
import { puzzleStore, type DailySession, type PuzzleCommand, type PuzzleState } from './puzzleStore';

interface FramePose {
  readonly origin: Vec3;
  readonly yaw: number;
}

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
    puzzleStore.update({ progress });
    this.cleanupFuncs.push(
      puzzleStore.onCommand((command) => this.handle(command)),
      puzzleStore.subscribe((state) => this.onStateChange(state)),
    );
    // Resume by solved level ids, not a stored index: adding levels never misplaces a save.
    this.loadLevel(resumeIndex(LEVELS, progress.best));
  }

  private handle(command: PuzzleCommand): void {
    const { levelIndex } = puzzleStore.get();
    switch (command.type) {
      case 'load':
        this.loadLevel(command.index);
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
        puzzleStore.update({ progress: INITIAL_PROGRESS });
        this.loadLevel(0);
        break;
      case 'place':
        // Only the table pose changes: rebuild there with the player's work intact.
        this.placedPose = { origin: command.origin, yaw: command.yaw };
        this.relocateSoon();
        break;
      case 'resetPlacement':
        this.placedPose = null;
        this.relocateSoon();
        break;
      default:
        break;
    }
  }

  /** Today's daily (or pool entry `index`), remembering which campaign level to return to. */
  private openDaily(index?: number): void {
    const { daily, levelIndex } = puzzleStore.get();
    const day = today();
    const pick = index ?? dailyIndex(day, DAILY_LEVELS.length);
    this.build(LEVELS.length + pick, { day, returnTo: daily?.returnTo ?? levelIndex }, false);
  }

  /** Load a level fresh. Restarting a daily keeps its session; any campaign level ends it. */
  private loadLevel(index: number): void {
    this.build(index, isDailyIndex(index) ? puzzleStore.get().daily : null, false);
  }

  private build(index: number, daily: DailySession | null, relocated: boolean): void {
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
    puzzleStore.diorama.nextButton.object3D!.visible = false;
    const pegPositions = Object.fromEntries(level.pegs.map((p) => [p.id, { x: p.x, y: p.y }]));
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
      melody: [],
    });
    puzzleStore.dispatch({ type: 'levelBuilt', relocated });
  }

  private onStateChange(state: PuzzleState): void {
    // A move during a drop waits for it to end: this check reruns on every change.
    const moved = this.relocatePending || (this.builtOffset !== null && state.settings.offset !== this.builtOffset);
    if (moved && state.status !== 'dropping') {
      this.relocate(state);
      return;
    }
    const next = puzzleStore.diorama?.nextButton.object3D;
    // Dailies stand alone: no Next, and they never unlock campaign levels.
    const hasNext = !state.daily && state.levelIndex < LEVELS.length - 1;
    if (next) next.visible = state.status === 'complete' && hasNext;
    if (state.status !== 'complete' || state.stars > 0 || !state.level) return;

    const used = playerThreadCount(state.threads);
    const stars = starsFor(used, state.level.par);
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
    puzzleStore.update({ stars, progress });
  }

  /** Rebuild at the new pose now, or once a drop in progress has finished. */
  private relocateSoon(): void {
    const state = puzzleStore.get();
    if (state.status === 'dropping') this.relocatePending = true;
    else this.relocate(state);
  }

  /** The player moved the diorama: rebuild it there exactly as they left it, solved or not. */
  private relocate(state: PuzzleState): void {
    const { level, levelIndex, threads, pegPositions, daily, status, scored, stars } = state;
    this.build(levelIndex, daily, true);
    if (!level) return;
    for (const step of restoreSteps(level, threads, pegPositions)) puzzleStore.dispatch(step);
    // Stars of 0 here means the solve isn't recorded yet; onStateChange records it.
    if (status === 'complete') puzzleStore.update({ status, scored, stars });
  }

  private teardown(): void {
    for (const marble of [...this.queries.marbles.entities]) marble.dispose({ disposeResources: false });
    for (const thread of [...this.queries.threads.entities]) thread.dispose({ disposeResources: false });
    for (const entity of puzzleStore.diorama?.entities ?? []) disposeLevelEntity(entity);
    puzzleStore.diorama = null;
  }
}
