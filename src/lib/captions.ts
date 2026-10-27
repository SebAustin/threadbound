/**
 * Visual captions for sound-only events, always on (ticket 15): a cup that
 * rejects a marble blinks its walls, and each replayed melody note swells one of
 * the plaque's stars. The timing curves only; CaptionSystem draws them. Pure.
 */

/** A wrong cup's walls blink for this long, in this many alternating phases (bright first). */
export const CUP_FLASH_SECONDS = 0.5;
const CUP_FLASH_PHASES = 4;

export type FlashPhase = 'bright' | 'dark';

/** Which phase of a wrong cup's blink `elapsed` seconds in, or null once it is over. */
export function cupFlash(elapsed: number): FlashPhase | null {
  if (elapsed < 0 || elapsed >= CUP_FLASH_SECONDS) return null;
  const phase = Math.floor(elapsed / (CUP_FLASH_SECONDS / CUP_FLASH_PHASES));
  return phase % 2 === 0 ? 'bright' : 'dark';
}

/** A replayed note swells its star to this scale and back, over this long. */
export const STAR_PULSE_SECONDS = 0.2;
const STAR_PULSE_PEAK = 1.35;

/** The scale of a star `elapsed` seconds into its pulse: 1 at both ends and after. */
export function starPulseScale(elapsed: number): number {
  if (elapsed <= 0 || elapsed >= STAR_PULSE_SECONDS) return 1;
  return 1 + (STAR_PULSE_PEAK - 1) * Math.sin((Math.PI * elapsed) / STAR_PULSE_SECONDS);
}

/** The plaque has three stars: saved note `index` pulses star index mod 3. */
const STAR_COUNT = 3;

export function starForNote(index: number): number {
  return ((index % STAR_COUNT) + STAR_COUNT) % STAR_COUNT;
}
