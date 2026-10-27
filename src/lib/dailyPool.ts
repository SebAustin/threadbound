import { dailyIndex } from './daily';
import type { Level } from './levelSchema';
import { SORTING_COLORS } from './marbleColors';

/**
 * Which daily a player gets (CONTEXT.md Daily: it only uses mechanics the player
 * has already reached). Pure: levels and best stars in, a pool index out.
 */

/**
 * What a board asks of the player beyond pinch-pull and the chute: snipping preset
 * threads, sorting colors, sliding rail pegs. The tight spool isn't one: every daily
 * has it, and its readout and refusal line explain it.
 */
export type Mechanic = 'snip' | 'color' | 'rail';

/** In the order the campaign teaches them (w1-05, w2-01, w3-01). */
const MECHANICS: readonly Mechanic[] = ['snip', 'color', 'rail'];

type Board = Pick<Level, 'presetThreads' | 'chutes' | 'goals' | 'pegs'>;

const isSorting = (color: string | undefined): boolean =>
  color !== undefined && (SORTING_COLORS as readonly string[]).includes(color);

const NEEDS: Readonly<Record<Mechanic, (board: Board) => boolean>> = {
  snip: (board) => board.presetThreads.length > 0,
  color: (board) => board.chutes.some((c) => isSorting(c.color)) || board.goals.some((g) => isSorting(g.color)),
  rail: (board) => board.pegs.some((p) => p.rail !== undefined),
};

/** The mechanics a board needs, in teaching order. */
export function levelMechanics(board: Board): Mechanic[] {
  return MECHANICS.filter((mechanic) => NEEDS[mechanic](board));
}

/**
 * The union of the mechanics of every solved campaign level (best > 0). A skipped
 * level earns no best, so a skipped teaching level leaves its mechanic unreached.
 */
export function reachedMechanics(
  levels: readonly (Board & { readonly id: string })[],
  best: Readonly<Record<string, number>>,
): Mechanic[] {
  const solved = levels.filter((level) => (best[level.id] ?? 0) > 0);
  return MECHANICS.filter((mechanic) => solved.some((level) => NEEDS[mechanic](level)));
}

/**
 * Today's pool index: `dailyIndex(day, eligible.length)` among the entries whose
 * mechanics are all reached. With everything reached that is `dailyIndex(day, pool.length)`,
 * so finished players keep the plain rotation. An empty eligible set falls back to it too.
 */
export function dailyPick(day: string, pool: readonly Board[], reached: readonly Mechanic[]): number {
  const eligible = pool.flatMap((board, index) =>
    levelMechanics(board).every((mechanic) => reached.includes(mechanic)) ? [index] : [],
  );
  if (eligible.length === 0) return dailyIndex(day, pool.length);
  return eligible[dailyIndex(day, eligible.length)];
}
