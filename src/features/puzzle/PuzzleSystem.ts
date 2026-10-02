import { createSystem, Vector3 } from '@iwsdk/core';
import { DIORAMA_DEFAULT_POSITION } from '../../config/constants';
import type { Level } from '../../lib/levelSchema';
import { originFromCenter } from '../../lib/placement';
import { browserStorage, loadProgress, recordCompletion, saveProgress } from '../../lib/progress';
import { starsFor } from '../../lib/scoring';
import type { Vec3 } from '../../lib/vec';
import { LEVELS } from '../../levels';
import { buildDiorama } from '../diorama/buildDiorama';
import { DioramaFrame } from '../diorama/dioramaFrame';
import { disposeLevelEntity } from '../diorama/disposeLevelEntity';
import { Marble, Thread } from './components';
import { puzzleStore, type PuzzleCommand, type PuzzleState } from './puzzleStore';

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
  /** Explicit table placement (AR); null means use the default virtual-table pose. */
  private placedPose: FramePose | null = null;

  init(): void {
    const progress = loadProgress(this.storage);
    puzzleStore.update({ progress });
    this.cleanupFuncs.push(
      puzzleStore.onCommand((command) => this.handle(command)),
      puzzleStore.subscribe((state) => this.onStateChange(state)),
    );
    this.loadLevel(Math.min(progress.unlocked, LEVELS.length - 1));
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
      case 'place':
        // Only the table pose changes; rebuild the current level there.
        this.placedPose = { origin: command.origin, yaw: command.yaw };
        this.loadLevel(levelIndex);
        break;
      case 'resetPlacement':
        this.placedPose = null;
        this.loadLevel(levelIndex);
        break;
      default:
        break;
    }
  }

  private loadLevel(index: number): void {
    const level = LEVELS[index];
    if (!level) {
      console.error(`[Threadbound] no level at index ${index}`);
      return;
    }
    this.teardown();
    const pose = this.placedPose ?? defaultPose(level);
    const frame = new DioramaFrame(new Vector3(...pose.origin), pose.yaw);
    puzzleStore.frame = frame;
    puzzleStore.diorama = buildDiorama(this.world, frame, level);
    puzzleStore.diorama.nextButton.object3D!.visible = false;
    const pegPositions = Object.fromEntries(level.pegs.map((p) => [p.id, { x: p.x, y: p.y }]));
    puzzleStore.update({ level, levelIndex: index, threads: [], status: 'idle', scored: 0, stars: 0, pegPositions });
    puzzleStore.dispatch({ type: 'levelBuilt' });
  }

  private onStateChange(state: PuzzleState): void {
    const next = puzzleStore.diorama?.nextButton.object3D;
    const hasNext = state.levelIndex < LEVELS.length - 1;
    if (next) next.visible = state.status === 'complete' && hasNext;
    if (state.status !== 'complete' || state.stars > 0 || !state.level) return;

    const used = state.threads.filter((t) => !t.preset).length;
    const stars = starsFor(used, state.level.par);
    const progress = recordCompletion(state.progress, state.level.id, state.levelIndex, stars, LEVELS.length);
    saveProgress(this.storage, progress);
    puzzleStore.update({ stars, progress });
  }

  private teardown(): void {
    for (const marble of [...this.queries.marbles.entities]) marble.dispose({ disposeResources: false });
    for (const thread of [...this.queries.threads.entities]) thread.dispose({ disposeResources: false });
    for (const entity of puzzleStore.diorama?.entities ?? []) disposeLevelEntity(entity);
    puzzleStore.diorama = null;
  }
}
