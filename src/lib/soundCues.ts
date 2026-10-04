/**
 * One sound per thing that happens, so a player can follow the puzzle by ear.
 * Musical cues use the pentatonic scale, so they never clash with the melody a
 * drop is playing. Failure cues sit below the scale: dull, unmistakably "no".
 */

export type CueName =
  /** A marble lands in a cup that accepts it. */
  | 'cupCorrect'
  /** A marble lands in a cup of the other color. */
  | 'cupWrong'
  /** A ledge button or plaque control is pressed. */
  | 'button'
  /** The player takes hold of a peg or a rail tab. */
  | 'pegGrab'
  /** A thread or slide is refused. */
  | 'refused'
  /** A slid rail peg settles into place. */
  | 'settle'
  /** A thread is snipped. */
  | 'snip'
  /** One note of the virtual study's quiet background. */
  | 'ambience'
  /** One note of a solved level's melody, replayed. */
  | 'melody';

export interface Cue {
  readonly hz: number;
  /** Pluck strength, 0..CUE_CEILING. */
  readonly volume: number;
}

/** No single cue may be louder than this, so stacked cues stay under the limiter. */
export const CUE_CEILING = 0.8;

export const CUES: Readonly<Record<CueName, Cue>> = {
  cupCorrect: { hz: 880.0, volume: 0.6 },
  cupWrong: { hz: 110.0, volume: 0.5 },
  button: { hz: 587.33, volume: 0.5 },
  pegGrab: { hz: 659.25, volume: 0.25 },
  refused: { hz: 98.0, volume: 0.5 },
  settle: { hz: 392.0, volume: 0.35 },
  snip: { hz: 261.63, volume: 0.4 },
  ambience: { hz: 329.63, volume: 0.1 },
  melody: { hz: 523.25, volume: 0.7 },
};

/** Every distinct pitch a cue can ask for (the synth renders each once). */
export function cuePitches(): number[] {
  return [...new Set(Object.values(CUES).map((cue) => cue.hz))];
}

/** Seconds between ambience notes: sparse enough to sit behind the puzzle. */
export const AMBIENCE_INTERVAL_SECONDS = 6;

/** A four-note pentatonic phrase (E G A G) that loops for as long as the study is shown. */
const AMBIENCE_PHRASE: readonly number[] = [329.63, 392.0, 440.0, 392.0];

/** Pitch of the `step`th ambience note. */
export function ambienceHz(step: number): number {
  return AMBIENCE_PHRASE[step % AMBIENCE_PHRASE.length];
}
