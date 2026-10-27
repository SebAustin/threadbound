/**
 * Drop counts for the current level (ADR 0005, CONTEXT.md Skip): `drops` since it
 * loaded or restarted (one drop earns the first-drop star), and `missedDrops`, the
 * run of drops that ended without a solve (three offer the skip). Pure: each
 * transition returns new counts.
 */
export interface Attempts {
  readonly drops: number;
  readonly missedDrops: number;
}

export const NO_ATTEMPTS: Attempts = Object.freeze({ drops: 0, missedDrops: 0 });

/** Misses in a row that offer the skip. */
export const MISSES_BEFORE_SKIP = 3;

/** The chute was pinched: one more drop, and a drop still in flight is abandoned, so it missed. */
export function dropStarted(attempts: Attempts, { inFlight }: { readonly inFlight: boolean }): Attempts {
  return { drops: attempts.drops + 1, missedDrops: attempts.missedDrops + (inFlight ? 1 : 0) };
}

/** A drop settled: a solve ends the run of misses, anything else adds one. */
export function dropEnded(attempts: Attempts, solved: boolean): Attempts {
  return { drops: attempts.drops, missedDrops: solved ? 0 : attempts.missedDrops + 1 };
}

/**
 * The diorama was rebuilt. A relocation (the same level moved) keeps both counts;
 * Restart (the same level, fresh) starts the drops again but keeps the run of
 * misses; a different level starts both again.
 */
export function afterBuild(
  attempts: Attempts,
  { relocated, sameLevel }: { readonly relocated: boolean; readonly sameLevel: boolean },
): Attempts {
  if (relocated) return { drops: attempts.drops, missedDrops: attempts.missedDrops };
  return sameLevel ? { drops: 0, missedDrops: attempts.missedDrops } : NO_ATTEMPTS;
}

/** Where the player is, as the skip offer needs it. */
export interface SkipContext {
  /** A daily is open: dailies stand alone, so there is nothing to skip to. */
  readonly daily: boolean;
  /** The level has a real solve in the save. */
  readonly solved: boolean;
  /** The level was skipped before. */
  readonly skipped: boolean;
  /** The campaign's last level. */
  readonly last: boolean;
}

/** Three or more misses in a row on a campaign level that is unsolved, not already skipped and not the last. */
export function skipOffered(attempts: Attempts, context: SkipContext): boolean {
  if (context.daily || context.solved || context.skipped || context.last) return false;
  return attempts.missedDrops >= MISSES_BEFORE_SKIP;
}
