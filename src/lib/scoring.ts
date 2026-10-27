/** Stars one level can earn (ADR 0005). */
export const STARS_PER_LEVEL = 3;

export interface SolveScore {
  /** Threads the player placed (presets don't count). */
  readonly threadsUsed: number;
  readonly par: number;
  /** Drops since the level loaded or restarted, the solving drop included. */
  readonly drops: number;
}

/**
 * ADR 0005: one star for the solve, one for par threads or fewer, one for solving
 * on the first drop since the level loaded or restarted.
 */
export function starsFor({ threadsUsed, par, drops }: SolveScore): 1 | 2 | 3 {
  const economy = threadsUsed <= par ? 1 : 0;
  const foresight = drops === 1 ? 1 : 0;
  return (1 + economy + foresight) as 1 | 2 | 3;
}

/** The campaign's star total: best stars per campaign level only, out of three each. */
export function starTotal(
  levels: readonly { readonly id: string }[],
  best: Readonly<Record<string, number>>,
): { readonly earned: number; readonly possible: number } {
  const earned = levels.reduce((sum, level) => sum + Math.min(STARS_PER_LEVEL, best[level.id] ?? 0), 0);
  return { earned, possible: STARS_PER_LEVEL * levels.length };
}
