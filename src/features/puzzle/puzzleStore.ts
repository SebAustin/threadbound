import { NO_ATTEMPTS } from '../../lib/attempts';
import type { Level } from '../../lib/levelSchema';
import { EMPTY_MELODY, type Melody } from '../../lib/melody';
import { INITIAL_PROGRESS, type Progress } from '../../lib/progress';
import { DEFAULT_SETTINGS, type Settings } from '../../lib/settings';
import type { RefusalReason, ThreadLink } from '../../lib/threadRules';
import type { Vec3, PegPositions } from '../../lib/vec';
import type { BuiltDiorama } from '../diorama/buildDiorama';
import type { DioramaFrame } from '../diorama/dioramaFrame';

export type PuzzleStatus = 'idle' | 'dropping' | 'complete';

/** What a passthrough placement stands the diorama on: a detected table, or nothing (it floats). */
export type PlacementSurface = 'table' | 'floating';

/**
 * Why a diorama was (re)built: a fresh level, the same level moved (offset or
 * table placement), or a level stepped to from the settings face.
 */
export type BuildReason = 'fresh' | 'relocated' | 'browsing';

/** An open daily puzzle: the day it belongs to, and the campaign level to return to. */
export interface DailySession {
  readonly day: string;
  readonly returnTo: number;
}

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
  readonly pegPositions: PegPositions;
  /** Simulation frozen because the player can't see it (see PauseSystem). */
  readonly paused: boolean;
  readonly settings: Settings;
  /** Set while a daily puzzle is open. */
  readonly daily: DailySession | null;
  /** Why the player's last thread or slide was refused; cleared by their next success. */
  readonly refusal: RefusalReason | null;
  /** The melody a solve played (notes in Hz, drop times in seconds), published when the level completes; empty until then. */
  readonly melody: Melody;
  /**
   * Passthrough placement is searching: the diorama, its plaque, its ledge strip, its threads
   * and the ghost hand stay hidden, and it takes no input (PlacementSystem sets it).
   */
  readonly dioramaHidden: boolean;
  /** What the last passthrough placement stood it on; null at the default pose (the study's table). */
  readonly surface: PlacementSurface | null;
  /** Thread pulls and tab slides in progress: a relocation waits for them, as it waits for a drop. */
  readonly drags: number;
  /** Drops since this level loaded or restarted (lib/attempts): one drop earns the first-drop star. */
  readonly drops: number;
  /** Drops in a row that ended without a solve (lib/attempts): three offer the skip. */
  readonly missedDrops: number;
  /**
   * The last drop ended without a solve and nothing has changed since: a drop, a build, a
   * thread added or snipped, or a slide clears it. The ledge then says what to try next.
   */
  readonly lastDropMissed: boolean;
  /** This completion is the campaign level's first solve (its best was 0): the ledge points to the stars. */
  readonly firstSolve: boolean;
  /**
   * The session loaded a save with a campaign solve, and the player hasn't dropped or opened
   * the daily yet: the ledge says today's daily is ready. Never saved.
   */
  readonly returnVisit: boolean;
  /** The melody book is playing from the settings face (MarbleSystem starts and ends it). */
  readonly bookPlaying: boolean;
}

/** Everything that changes the puzzle goes through here: buttons, placement, tests. */
export type PuzzleCommand =
  /** `browsing`: stepped to from the settings face (which stays open). */
  | { readonly type: 'load'; readonly index: number; readonly browsing?: boolean }
  | { readonly type: 'restart' }
  | { readonly type: 'next' }
  /** Forget all stars and unlocks, back to level 1 (first-time experience). */
  | { readonly type: 'resetProgress' }
  /** Today's daily puzzle (or a given pool index, for tests and replays). */
  | { readonly type: 'daily'; readonly index?: number }
  /** The sun button: open today's daily, or from a daily go back to the campaign. */
  | { readonly type: 'toggleDaily' }
  /** Change and persist player settings. */
  | { readonly type: 'settings'; readonly patch: Partial<Settings> }
  /** Replay this level's melody from the melody book (the plaque's stars). */
  | { readonly type: 'playMelody' }
  /** Play every tune in the melody book, in campaign order (the settings face's play-all). Not during a drop. */
  | { readonly type: 'playBook' }
  /** Stop the melody book mid-play. */
  | { readonly type: 'stopBook' }
  /** Flip the plaque between the level face and the settings face. */
  | { readonly type: 'toggleSettings' }
  /** The settings face's Skip: move on to the next level unsolved (ignored unless it is offered). */
  | { readonly type: 'skip' }
  | { readonly type: 'drop' }
  /** Emitted once a drop solves the level, after the solve's state is published: the celebration starts. */
  | { readonly type: 'solved' }
  /** Emitted when a marble settles in cup `cup` (its index in the level's `goals`) that doesn't accept it. */
  | { readonly type: 'cupRejected'; readonly cup: number }
  /** Emitted when a replay (a solve's, or the melody book's) sounds saved note `index`. */
  | { readonly type: 'melodyNote'; readonly index: number }
  | { readonly type: 'addThread'; readonly from: string; readonly to: string }
  | { readonly type: 'snip'; readonly from: string; readonly to: string }
  | { readonly type: 'place'; readonly origin: Vec3; readonly yaw: number; readonly surface: PlacementSurface }
  /** Back to the virtual table (leaving mixed reality). */
  | { readonly type: 'resetPlacement' }
  /** Placement hides the diorama while it searches, and shows it once placed. */
  | { readonly type: 'dioramaHidden'; readonly hidden: boolean }
  /** A thread pull or tab slide started (active) or ended. */
  | { readonly type: 'drag'; readonly active: boolean }
  /** Final slide of a rail peg (player release, or a solution replay). Clamped to the rail. */
  | { readonly type: 'movePeg'; readonly pegId: string; readonly x: number; readonly y: number }
  /** Live preview while a rail peg is dragged: visuals only, physics catches up on release. */
  | { readonly type: 'pegPreview'; readonly pegId: string; readonly x: number; readonly y: number }
  /** Emitted after a rail peg's position (and collider) changed. */
  | { readonly type: 'pegMoved'; readonly pegId: string }
  /** Emitted after a level's diorama is (re)built, and why. */
  | { readonly type: 'levelBuilt'; readonly reason: BuildReason };

type CupRejected = Extract<PuzzleCommand, { type: 'cupRejected' }>;
type MelodyNote = Extract<PuzzleCommand, { type: 'melodyNote' }>;
const cupRejectedCommands: CupRejected[] = [];
const melodyNoteCommands: MelodyNote[] = [];

/** The `cupRejected` event for a cup, built once per index, so a frame that emits it allocates nothing. */
export function cupRejected(cup: number): CupRejected {
  return (cupRejectedCommands[cup] ??= Object.freeze({ type: 'cupRejected', cup }));
}

/** The `melodyNote` event for a saved note, built once per index. */
export function melodyNote(index: number): MelodyNote {
  return (melodyNoteCommands[index] ??= Object.freeze({ type: 'melodyNote', index }));
}

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
  settings: DEFAULT_SETTINGS,
  daily: null,
  refusal: null,
  melody: EMPTY_MELODY,
  dioramaHidden: false,
  surface: null,
  drags: 0,
  ...NO_ATTEMPTS,
  lastDropMissed: false,
  firstSolve: false,
  returnVisit: false,
  bookPlaying: false,
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
