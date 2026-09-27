import { describe, expect, test } from 'vitest';
import {
  PENTATONIC_HZ,
  pitchForLength,
  restitutionForLength,
} from '../../src/lib/threadTuning';
import { THREAD_TUNING } from '../../src/config/constants';

describe('restitutionForLength (shorter, tighter thread = bouncier)', () => {
  test('shortest thread gets maximum restitution', () => {
    expect(restitutionForLength(THREAD_TUNING.minLength)).toBeCloseTo(
      THREAD_TUNING.maxRestitution,
    );
  });

  test('longest thread gets minimum restitution', () => {
    expect(restitutionForLength(THREAD_TUNING.maxLength)).toBeCloseTo(
      THREAD_TUNING.minRestitution,
    );
  });

  test('clamps outside the tuning range', () => {
    expect(restitutionForLength(0)).toBeCloseTo(THREAD_TUNING.maxRestitution);
    expect(restitutionForLength(10)).toBeCloseTo(THREAD_TUNING.minRestitution);
  });

  test('is monotonically decreasing', () => {
    expect(restitutionForLength(0.1)).toBeGreaterThan(
      restitutionForLength(0.3),
    );
  });
});

describe('pitchForLength (every thread is a string)', () => {
  test('always returns a note from the pentatonic scale', () => {
    for (const len of [0.01, 0.05, 0.12, 0.2, 0.33, 0.5, 2]) {
      expect(PENTATONIC_HZ).toContain(pitchForLength(len));
    }
  });

  test('shorter threads sound higher', () => {
    expect(pitchForLength(0.06)).toBeGreaterThan(pitchForLength(0.4));
  });

  test('extremes map to the ends of the scale', () => {
    expect(pitchForLength(0)).toBe(PENTATONIC_HZ[PENTATONIC_HZ.length - 1]);
    expect(pitchForLength(5)).toBe(PENTATONIC_HZ[0]);
  });
});
