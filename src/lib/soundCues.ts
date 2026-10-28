/**
 * One sound per thing that happens, so a player can follow the puzzle by ear.
 * Musical cues use the pentatonic scale (in any octave), so they never clash
 * with the melody a drop is playing. Failure cues sit below the scale: dull, unmistakably "no".
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
  | 'melody'
  /** A new thread is strung (its pitch comes from its length). */
  | 'thread'
  /** A marble bounces off a thread (pitch from the thread's climb, gain from the impact). */
  | 'bounce'
  /** One note of the chord that closes a solve (CADENCE_HZ in lib/melody), strummed or replayed. */
  | 'cadence'
  /** A pull released away from every peg it could attach to: no thread. */
  | 'dragMiss';

export interface Cue {
  readonly hz: number;
  /** Pluck strength, 0..CUE_CEILING. */
  readonly volume: number;
  /**
   * Comes from a place on the diorama (a thread, a cup), so in an XR session it is heard from
   * there, relative to the head (lib/cueSpace). Every other cue plays as it always has.
   */
  readonly positional?: true;
}

/** No single cue may be louder than this, so stacked cues stay under the limiter. */
export const CUE_CEILING = 0.8;

export const CUES: Readonly<Record<CueName, Cue>> = {
  // C6: above every thread note (A5 is the top), so a scored marble never sounds like a bounce.
  cupCorrect: { hz: 1046.5, volume: 0.6, positional: true },
  // Positional: it tells the player which cup took the marble, which is how sorting is followed by ear.
  cupWrong: { hz: 110.0, volume: 0.5, positional: true },
  button: { hz: 587.33, volume: 0.5 },
  pegGrab: { hz: 659.25, volume: 0.25 },
  refused: { hz: 98.0, volume: 0.5 },
  settle: { hz: 392.0, volume: 0.35 },
  snip: { hz: 261.63, volume: 0.4 },
  ambience: { hz: 329.63, volume: 0.1 },
  melody: { hz: 523.25, volume: 0.7 },
  thread: { hz: 440.0, volume: 0.8, positional: true },
  bounce: { hz: 440.0, volume: 0.8, positional: true },
  // C5, the cadence's first note; each strummed note passes its own pitch.
  cadence: { hz: 523.25, volume: 0.6, positional: true },
  // B2: below the scale like the refusal, and softer, because nothing was turned down.
  dragMiss: { hz: 123.47, volume: 0.25 },
};

/** Every distinct pitch a cue can ask for (the synth renders each once). */
export function cuePitches(): number[] {
  return [...new Set(Object.values(CUES).map((cue) => cue.hz))];
}

/** Seconds between ambience notes: sparse enough to sit behind the puzzle. */
export const AMBIENCE_INTERVAL_SECONDS = 6;

/** A four-note pentatonic phrase (E G A G) that loops for as long as the study is shown. */
const AMBIENCE_PHRASE: readonly number[] = [CUES.ambience.hz, 392.0, 440.0, 392.0];

/** What the background needs to know to stay out of the way. */
export interface AmbienceContext {
  readonly roomVisible: boolean;
  readonly paused: boolean;
  readonly dropping: boolean;
}

/** Ambience rests over passthrough, while paused, and during a drop (a note could pass for a bounce). */
export function ambienceRests(context: AmbienceContext): boolean {
  return !context.roomVisible || context.paused || context.dropping;
}

/** Pitch of the `step`th ambience note. */
export function ambienceHz(step: number): number {
  return AMBIENCE_PHRASE[step % AMBIENCE_PHRASE.length];
}
