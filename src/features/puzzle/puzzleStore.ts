import type { Level } from '../../lib/levelSchema';
import type { ThreadLink } from '../../lib/threadRules';
import type { BuiltDiorama } from '../diorama/buildDiorama';
import type { DioramaFrame } from '../diorama/dioramaFrame';

export type PuzzleStatus = 'idle' | 'dropping' | 'complete';

export interface PuzzleState {
  readonly level: Level | null;
  readonly threads: readonly ThreadLink[];
  readonly status: PuzzleStatus;
  readonly scored: number;
}

type Listener = (state: PuzzleState) => void;

const INITIAL: PuzzleState = { level: null, threads: [], status: 'idle', scored: 0 };

/**
 * Shared puzzle state. State snapshots are immutable; every change replaces the
 * snapshot and notifies listeners. The diorama frame is a live runtime object and
 * is held alongside, not inside, the snapshot.
 */
class PuzzleStore {
  private state: PuzzleState = INITIAL;
  private listeners = new Set<Listener>();
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
}

export const puzzleStore = new PuzzleStore();
