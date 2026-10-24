import { THREAD_TUNING } from '../config/constants';
import { clamp } from './vec';

/** A4: the pitch of a thread before its length tunes it. */
export const DEFAULT_PITCH_HZ = 440;

/** C major pentatonic, C4–A5: any combination of bounces sounds consonant. */
export const PENTATONIC_HZ: readonly number[] = [
  261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0,
];

/** 0 for the shortest tuned thread, 1 for the longest. */
function normalizedLength(len: number): number {
  const { minLength, maxLength } = THREAD_TUNING;
  return clamp((len - minLength) / (maxLength - minLength), 0, 1);
}

export function restitutionForLength(len: number): number {
  const { maxRestitution, minRestitution } = THREAD_TUNING;
  return maxRestitution + (minRestitution - maxRestitution) * normalizedLength(len);
}

/** A4's scale index: the root of a thread before its length tunes it (DEFAULT_PITCH_HZ). */
export const DEFAULT_ROOT = 4;

/** A thread's root: its scale index, set by its length. Shorter threads ring higher. */
export function rootIndex(len: number): number {
  const last = PENTATONIC_HZ.length - 1;
  return Math.round((1 - normalizedLength(len)) * last);
}

/** Shorter threads ring higher, quantized to the scale: the root's pitch. */
export function pitchForLength(len: number): number {
  return PENTATONIC_HZ[rootIndex(len)];
}
