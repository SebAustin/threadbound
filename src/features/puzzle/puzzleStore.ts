import type { Level } from '../../lib/levelSchema';
import { INITIAL_PROGRESS, type Progress } from '../../lib/progress';
import type { ThreadLink } from '../../lib/threadRules';
import type { Vec3 } from '../../lib/vec';
import type { BuiltDiorama } from '../diorama/buildDiorama';
import type { DioramaFrame } from '../diorama/dioramaFrame';

export type PuzzleStatus = 'idle' | 'dropping' | 'complete';

export interface PuzzleState {
  readonly level: Level | null;
  readonly levelIndex: number;
  readonly threads: readonly ThreadLink[];
  readonly status: PuzzleStatus;
  readonly scored: number;
  /** Stars earned by the most recent completion of this level, 0 if unsolved. */
  readonly stars: number;
  readonly progress: Progress;
  /** Live peg positions (diorama-local); rail pegs move away from their level data. */
  readonly pegPositions: Readonly<Record<string, { readonly x: number; readonly y: number }>>;
  /** Simulation frozen because the player can't see it (see PauseSystem). */
  readonly paused: boolean;
}

/** Everything that changes the puzzle goes through here: buttons, placement, tests. */
export type PuzzleCommand =
  | { readonly type: 'load'; readonly index: number }
  | { readonly type: 'restart' }
  | { readonly type: 'next' }
  /** Forget all stars and unlocks, back to level 1 (first-time experience). */
  | { readonly type: 'resetProgress' }
  | { readonly type: 'drop' }
  | { readonly type: 'addThread'; readonly from: string; readonly to: string }
  | { readonly type: 'snip'; readonly from: string; readonly to: string }
  | { readonly type: 'place'; readonly origin: Vec3; readonly yaw: number }
  /** Back to the virtual table (leaving mixed reality). */
  | { readonly type: 'resetPlacement' }
  /** Final slide of a rail peg (player release, or a solution replay). Clamped to the rail. */
  | { readonly type: 'movePeg'; readonly pegId: string; readonly x: number; readonly y: number }
  /** Live preview while a rail peg is dragged: visuals only, physics catches up on release. */
  | { readonly type: 'pegPreview'; readonly pegId: string; readonly x: number; readonly y: number }
  /** Emitted after a rail peg's position (and collider) changed. */
  | { readonly type: 'pegMoved'; readonly pegId: string }
  /** Emitted after a level's diorama is (re)built. */
  | { readonly type: 'levelBuilt' };

type Listener = (state: PuzzleState) => void;
type CommandListener = (command: PuzzleCommand) => void;

const INITIAL: PuzzleState = {
  level: null,
  levelIndex: 0,
  threads: [],
  status: 'idle',
  scored: 0,
  stars: 0,
  progress: INITIAL_PROGRESS,
  pegPositions: {},
  paused: false,
};

/**
 * Shared puzzle state plus a command bus. State snapshots are immutable; every
 * change replaces the snapshot and notifies listeners. The diorama frame and
 * built entities are live runtime objects held alongside, not inside, it.
 */
class PuzzleStore {
  private state: PuzzleState = INITIAL;
  private listeners = new Set<Listener>();
  private commandListeners = new Set<CommandListener>();
  frame: DioramaFrame | null = null;
  diorama: BuiltDiorama | null = null;

  get(): PuzzleState {
    return this.state;
  }

  update(patch: Partial<PuzzleState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.state);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispatch(command: PuzzleCommand): void {
    for (const listener of this.commandListeners) listener(command);
  }

  onCommand(listener: CommandListener): () => void {
    this.commandListeners.add(listener);
    return () => this.commandListeners.delete(listener);
  }
}

export const puzzleStore = new PuzzleStore();
