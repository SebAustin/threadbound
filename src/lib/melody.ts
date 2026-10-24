import { solvedPegPositions, type Level } from './levelSchema';
import { sameThread, type ThreadLink } from './threadRules';
import { PENTATONIC_HZ, rootIndex } from './threadTuning';

/**
 * The notes a drop plays (CONTEXT.md **Melody**, ADR 0004). A thread's length
 * sets only its root; each further bounce on it plays the next note of its
 * climb. Pure: no physics, no audio.
 */

const SCALE = PENTATONIC_HZ.length;
const TOP = SCALE - 1;

/**
 * Scale index of the k-th bounce (0-based) on a thread with root `root`, in one drop.
 * Climbs one step per bounce from the root to A5, then goes down from just below
 * the root to C4, so all ten notes play before one repeats; then starts again at
 * the root. A C4 root has nothing below it, so it climbs and restarts.
 */
export function climbIndex(root: number, k: number): number {
  const step = k % SCALE;
  // Steps 0..TOP-root climb from the root; the rest walk down from root - 1, i.e. TOP - step.
  return step <= TOP - root ? root + step : TOP - step;
}

/**
 * Per-thread bounce counts for the current drop, shared by all its marbles and
 * keyed by thread entity index. One reused map: `next` and `reset` don't allocate.
 */
export class MelodyClimb {
  private readonly counts = new Map<number, number>();

  /** Scale index of this bounce on thread `key` (root `root`), counting it. */
  next(key: number, root: number): number {
    const k = this.counts.get(key) ?? 0;
    this.counts.set(key, k + 1);
    return climbIndex(root, k);
  }

  /** A new drop: every thread starts again from its root. */
  reset(): void {
    this.counts.clear();
  }
}

/** A thread of a level's stored solution or presets, and its root. */
export interface ThreadRoot extends ThreadLink {
  readonly root: number;
}

/** Root of every preset and solution thread, at their lengths once the solution's slides are applied. */
export function threadRoots(level: Pick<Level, 'pegs' | 'slides' | 'solution' | 'presetThreads'>): ThreadRoot[] {
  const pegs = solvedPegPositions(level);
  const added = level.solution.filter((s) => !level.presetThreads.some((p) => sameThread(p, s)));
  const links = [...level.presetThreads.map((l) => ({ ...l, preset: true })), ...added.map((l) => ({ ...l, preset: false }))];
  return links.map((link) => {
    const a = pegs[link.from];
    const b = pegs[link.to];
    return { ...link, root: rootIndex(a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0) };
  });
}

/** The chord the cups ring when a drop solves: C5 E5 G5, rendered scale notes already in tune. */
export const CADENCE_HZ: readonly number[] = [PENTATONIC_HZ[5], PENTATONIC_HZ[7], PENTATONIC_HZ[8]];

/** One beat: the old fixed replay step, the lead-in before a replay's first note, and the rest before its cadence. */
export const MELODY_STEP_SECONDS = 0.22;
/** Gap between the cadence's three notes: a quick strum, not a block chord. */
export const CADENCE_STRUM_SECONDS = 0.05;

/** A drop's tune: the notes (Hz) and when each sounded (simulation seconds since the drop began). */
export interface Melody {
  readonly notes: readonly number[];
  /** Same length as `notes` and never going backwards, or empty (old saves): replayed at the fixed step. */
  readonly times: readonly number[];
}

export const EMPTY_MELODY: Melody = Object.freeze({ notes: Object.freeze([]), times: Object.freeze([]) });

/** One replayed note: its pitch, when it sounds (seconds after the replay starts) and which cue sounds it. */
export interface ScheduledNote {
  readonly hz: number;
  readonly at: number;
  readonly cue: 'melody' | 'cadence';
  /** Index of the saved note it replays, or -1 for a cadence note. */
  readonly note: number;
}

/** Whether `times` can time `noteCount` notes: one per note, finite, never going backwards. */
export function timesFit(noteCount: number, times: readonly number[] | undefined): times is readonly number[] {
  if (!times || times.length !== noteCount) return false;
  return times.every((t, i) => Number.isFinite(t) && t >= 0 && (i === 0 || t >= times[i - 1]));
}

/**
 * When each note of a replay sounds: the real offsets between notes when the
 * times fit, the fixed 0.22 s step when they don't, then, if `endOnCadence`,
 * the cadence one beat after the last note.
 */
export function replaySchedule(melody: { readonly notes: readonly number[]; readonly times?: readonly number[] }, endOnCadence: boolean): ScheduledNote[] {
  const { notes, times } = melody;
  const timed = timesFit(notes.length, times);
  const tune = notes.map((hz, note): ScheduledNote => ({
    hz,
    at: MELODY_STEP_SECONDS + (timed ? times[note] - times[0] : MELODY_STEP_SECONDS * note),
    cue: 'melody',
    note,
  }));
  if (!endOnCadence) return tune;
  const last = tune.length > 0 ? tune[tune.length - 1].at : 0;
  const cadence = CADENCE_HZ.map((hz, i): ScheduledNote => ({
    hz,
    at: last + MELODY_STEP_SECONDS + CADENCE_STRUM_SECONDS * i,
    cue: 'cadence',
    note: -1,
  }));
  return [...tune, ...cadence];
}
