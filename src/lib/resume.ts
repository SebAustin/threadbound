/**
 * Where a returning player picks up: the first campaign level they haven't
 * solved, found by level id. Saves record ids, not positions, so adding levels
 * to a world never moves a player to the wrong level. With every level solved
 * it gives the last one, which is also Prev/Next's upper bound (levelSelect.ts);
 * the game itself reopens a finished campaign on the daily (resumeTarget).
 */
export function resumeIndex(
  levels: readonly { readonly id: string }[],
  best: Readonly<Record<string, number>>,
): number {
  const unsolved = levels.findIndex((level) => !(best[level.id] > 0));
  return unsolved >= 0 ? unsolved : Math.max(0, levels.length - 1);
}

/**
 * Every campaign level has a real solve (best stars above 0). Reads `best` only:
 * a level never played keeps it false, and stars for removed levels or dailies
 * don't count.
 */
export function campaignComplete(
  levels: readonly { readonly id: string }[],
  best: Readonly<Record<string, number>>,
): boolean {
  return levels.length > 0 && levels.every((level) => best[level.id] > 0);
}

/** What the game opens on: a campaign level, or today's daily for a finished campaign. */
export type ResumeTarget =
  | { readonly daily: false; readonly index: number }
  | { readonly daily: true; readonly returnTo: number };

/**
 * Where the game reopens: the first unsolved level, or, once the campaign is
 * finished, today's daily, whose sun returns to the last level.
 */
export function resumeTarget(
  levels: readonly { readonly id: string }[],
  best: Readonly<Record<string, number>>,
): ResumeTarget {
  if (campaignComplete(levels, best)) return { daily: true, returnTo: levels.length - 1 };
  return { daily: false, index: resumeIndex(levels, best) };
}
