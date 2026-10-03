/** Wiping progress is irreversible: it takes two pokes within a short window. */

export const RESET_WINDOW_SECONDS = 4;

export interface ResetGuard {
  /** Seconds timestamp of the arming poke, null when disarmed. */
  readonly armedAt: number | null;
}

export const DISARMED: ResetGuard = Object.freeze({ armedAt: null });

const isArmed = (guard: ResetGuard, now: number) =>
  guard.armedAt !== null && now - guard.armedAt <= RESET_WINDOW_SECONDS;

export function resetPoke(guard: ResetGuard, now: number): { readonly guard: ResetGuard; readonly reset: boolean } {
  return isArmed(guard, now) ? { guard: DISARMED, reset: true } : { guard: { armedAt: now }, reset: false };
}

export function resetLabel(guard: ResetGuard, now: number): string {
  return isArmed(guard, now) ? 'Confirm reset' : 'Reset progress';
}
