/**
 * Where a returning player picks up: the first campaign level they haven't
 * solved or skipped, found by level id. Saves record ids, not positions, so
 * adding levels to a world never moves a player to the wrong level. With every
 * level solved or skipped it gives the last one, which is also Prev/Next's upper
 * bound (levelSelect.ts); the game itself reopens a finished campaign on the
 * daily (resumeTarget).
 */
export function resumeIndex(
  levels: readonly { readonly id: string }[],
  best: Readonly<Record<string, number>>,
  skipped: readonly string[] = [],
): number {
  const open = levels.findIndex((level) => !(best[level.id] > 0) && !skipped.includes(level.id));
  return open >= 0 ? open : Math.max(0, levels.length - 1);
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

/**
 * At least one campaign level has a real solve: what makes a session a return
 * visit, and what lets the sun signpost the daily. Dailies and stale ids don't count.
 */
export function hasCampaignSolve(
  levels: readonly { readonly id: string }[],
  best: Readonly<Record<string, number>>,
): boolean {
  return levels.some((level) => best[level.id] > 0);
}

/** What the game opens on: a campaign level, or today's daily for a finished campaign. */
export type ResumeTarget =
  | { readonly daily: false; readonly index: number }
  | { readonly daily: true; readonly returnTo: number };

/**
 * Where the game reopens: the first level neither solved nor skipped, or, once
 * the campaign is finished, today's daily, whose sun returns to the last level.
 * A skipped level is unsolved, so it holds the finish (and the daily) back.
 */
export function resumeTarget(
  levels: readonly { readonly id: string }[],
  best: Readonly<Record<string, number>>,
  skipped: readonly string[],
): ResumeTarget {
  if (campaignComplete(levels, best)) return { daily: true, returnTo: levels.length - 1 };
  return { daily: false, index: resumeIndex(levels, best, skipped) };
}
