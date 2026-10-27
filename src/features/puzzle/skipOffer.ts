import { MISSES_BEFORE_SKIP, skipOffered, type SkipContext } from '../../lib/attempts';
import { LEVELS } from '../../levels';
import type { PuzzleState } from './puzzleStore';

/** Reused: the plaque asks on every store change, and rail drags change the store per pointer move. */
const context: { -readonly [K in keyof SkipContext]: SkipContext[K] } = {
  daily: false,
  solved: false,
  skipped: false,
  last: false,
};

/** Whether the settings face offers the skip now (lib/attempts), derived from puzzle state. Allocation-free. */
export function skipOfferedOf(state: PuzzleState): boolean {
  const id = state.level?.id;
  if (id === undefined || state.missedDrops < MISSES_BEFORE_SKIP) return false;
  context.daily = state.daily !== null;
  context.solved = (state.progress.best[id] ?? 0) > 0;
  context.skipped = state.progress.skipped.includes(id);
  context.last = state.levelIndex >= LEVELS.length - 1;
  return skipOffered(state, context);
}
