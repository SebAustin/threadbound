import { resumeIndex } from './resume';

/**
 * Prev/Next on the settings face: any level reached so far can be revisited (its
 * stars, its melody, a skipped level), but never one beyond the first level
 * neither solved nor skipped. From a daily, stepping lands back in the campaign
 * around where the player is up to.
 */
export function stepLevel(
  current: number,
  direction: 1 | -1,
  levels: readonly { readonly id: string }[],
  best: Readonly<Record<string, number>>,
  skipped: readonly string[],
): number {
  const reached = resumeIndex(levels, best, skipped);
  const from = current >= levels.length ? reached : current;
  return Math.min(reached, Math.max(0, from + direction));
}

/** The settings face's level readout (ASCII). */
export function levelSelectLabel(index: number, campaignLength: number): string {
  return index >= campaignLength ? 'Daily puzzle' : `Level ${index + 1} of ${campaignLength}`;
}
