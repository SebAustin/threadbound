import { describe, expect, test } from 'vitest';
import { AMBIENCE_INTERVAL_SECONDS, ambienceHz, CUE_CEILING, CUES, cuePitches, type CueName } from '../../src/lib/soundCues';
import { PENTATONIC_HZ } from '../../src/lib/threadTuning';

const ALL: readonly CueName[] = ['cupCorrect', 'cupWrong', 'button', 'pegGrab', 'refused', 'settle', 'snip', 'ambience', 'melody'];
/** Cues that mean "that didn't work": deliberately outside the music. */
const DULL: readonly CueName[] = ['cupWrong', 'refused'];

describe('sound cues: every event the player causes has its own sound', () => {
  test('every event has a cue, audible and under the limiter ceiling', () => {
    for (const name of ALL) {
      expect(CUES[name].volume).toBeGreaterThan(0);
      expect(CUES[name].volume).toBeLessThanOrEqual(CUE_CEILING);
    }
  });

  test('musical cues stay in the pentatonic scale, so they fit any melody', () => {
    for (const name of ALL.filter((n) => !DULL.includes(n))) expect(PENTATONIC_HZ).toContain(CUES[name].hz);
  });

  test('failure cues sit below the scale and differ from each other', () => {
    for (const name of DULL) expect(CUES[name].hz).toBeLessThan(Math.min(...PENTATONIC_HZ));
    expect(CUES.cupWrong.hz).not.toBe(CUES.refused.hz);
  });

  test('a scored marble and a wrong cup are told apart', () => {
    expect(CUES.cupCorrect.hz).not.toBe(CUES.cupWrong.hz);
  });

  test('cuePitches lists every pitch the synth must be able to play, once each', () => {
    const pitches = cuePitches();
    for (const name of ALL) expect(pitches).toContain(CUES[name].hz);
    expect(new Set(pitches).size).toBe(pitches.length);
  });
});

describe('ambience: a slow, quiet phrase for the virtual study', () => {
  test('every note of the phrase is in the scale, starting on the ambience cue', () => {
    expect(ambienceHz(0)).toBe(CUES.ambience.hz);
    for (let step = 0; step < 8; step++) expect(PENTATONIC_HZ).toContain(ambienceHz(step));
  });

  test('the phrase moves and then repeats', () => {
    const phrase = Array.from({ length: 8 }, (_, step) => ambienceHz(step));
    expect(new Set(phrase).size).toBeGreaterThan(1);
    expect(ambienceHz(phrase.length)).toBe(ambienceHz(0));
  });

  test('notes are far apart, so it stays in the background', () => {
    expect(AMBIENCE_INTERVAL_SECONDS).toBeGreaterThanOrEqual(4);
  });
});
