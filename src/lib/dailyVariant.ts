import { solutionLength, type Level } from './levelSchema';

/** Spare thread a daily spool allows beyond the stored solution, at least. */
const MIN_SPARE_M = 0.01;

/**
 * The daily puzzle: a campaign board replayed on a spool that barely covers its
 * stored solution (rounded up to whole centimetres, 1-2 cm spare). Same physics
 * as the proven campaign level, so it is solvable by construction.
 */
export function dailyVariant(level: Level): Level {
  const spool = Math.ceil((solutionLength(level) + MIN_SPARE_M) * 100) / 100;
  return { ...level, id: `daily-${level.id}`, name: `${level.name}, tight`, spool };
}
