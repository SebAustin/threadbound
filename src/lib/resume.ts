/**
 * Where a returning player picks up: the first campaign level they haven't
 * solved, found by level id. Saves record ids, not positions, so adding levels
 * to a world never moves a player to the wrong board. A finished campaign
 * reopens on its last level.
 */
export function resumeIndex(
  levels: readonly { readonly id: string }[],
  best: Readonly<Record<string, number>>,
): number {
  const unsolved = levels.findIndex((level) => !(best[level.id] > 0));
  return unsolved >= 0 ? unsolved : Math.max(0, levels.length - 1);
}
