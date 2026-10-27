/**
 * Return-visit signposts (spec: "The sun pulses while today's daily is unsolved").
 * Pure: SunPulseSystem feeds it puzzle state and the clock.
 */

export interface SunPulseInput {
  /** A daily is open: there the sun is the way back, not an invitation. */
  readonly inDaily: boolean;
  /** The save holds a campaign solve: before one, the ghost hand has the player's attention. */
  readonly hasSolvedAny: boolean;
  /** Today's daily already has stars. */
  readonly solvedToday: boolean;
}

/** The sun pulses outside a daily, from the first campaign solve, until today's daily is solved. */
export function sunPulses({ inDaily, hasSolvedAny, solvedToday }: SunPulseInput): boolean {
  return !inDaily && hasSolvedAny && !solvedToday;
}

/** One swell and settle of the sun icon, in seconds: about a slow breath. */
export const SUN_PULSE_SECONDS = 1.6;
/** How much bigger the icon grows at the peak of a pulse. */
const SUN_PULSE_GROWTH = 0.15;

/** The sun icon's scale `seconds` into its pulse: 1 at rest, 1.15 at the peak, repeating. */
export function sunPulseScale(seconds: number): number {
  const phase = (2 * Math.PI * seconds) / SUN_PULSE_SECONDS;
  return 1 + (SUN_PULSE_GROWTH * (1 - Math.cos(phase))) / 2;
}
