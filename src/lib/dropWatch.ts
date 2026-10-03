/**
 * Watching a drop come to rest. Physics can hold a marble in an unstable
 * balance (e.g. on a peg's crest, where every thread ends) that a real marble
 * would roll off; stalled marbles get nudged. A drop whose marbles have all
 * stopped without solving is over, so the player can try again.
 */

/** Marble speed (m/s) below which it counts as at rest. */
export const REST_SPEED = 0.05;
/** Rest this long above the floor, outside a cup, before a nudge. */
export const STALL_SECONDS = 0.8;
/** Every marble at rest this long ends an unsolved drop. */
export const DROP_QUIET_SECONDS = 1.2;
/** Highest resting marble centre that is just "on the floor" (one radius plus slack). */
const FLOOR_REST_Y = 0.02;

export function restTimer(restSeconds: number, delta: number, speed: number): number {
  return speed < REST_SPEED ? restSeconds + delta : 0;
}

export interface Perch {
  readonly restSeconds: number;
  /** Marble centre height in the diorama frame. */
  readonly y: number;
  readonly inCup: boolean;
}

export function isStalled({ restSeconds, y, inCup }: Perch): boolean {
  return !inCup && y > FLOOR_REST_Y && restSeconds >= STALL_SECONDS;
}

export function dropOver({ allReleased, quietSeconds }: { readonly allReleased: boolean; readonly quietSeconds: number }): boolean {
  return allReleased && quietSeconds >= DROP_QUIET_SECONDS;
}
