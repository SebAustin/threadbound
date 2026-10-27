import { replaySchedule, type ScheduledNote } from './melody';

/**
 * The melody book played whole (CONTEXT.md Melody book: the settings face plays
 * the whole book). Pure: it has no timing of its own, only `replaySchedule`'s.
 */

/** The rest after one tune's cadence before the next tune starts. */
export const BOOK_REST_SECONDS = 0.8;

/** A book entry as progress loads it (old bare-array entries load with empty times). */
interface BookEntry {
  readonly notes: readonly number[];
  readonly times?: readonly number[];
}

type Book = Readonly<Record<string, BookEntry | undefined>>;

/** An entry with at least one note: an empty one is no tune. */
export function hasTune(entry: BookEntry | undefined): boolean {
  return (entry?.notes.length ?? 0) > 0;
}

/** How many campaign levels have a tune in the book (stale ids and dailies don't count). */
export function bookTunes(levels: readonly { readonly id: string }[], melodies: Book): number {
  return levels.filter((level) => hasTune(melodies[level.id])).length;
}

/**
 * Every tune in campaign order, skipping levels without one, each exactly as its
 * stars replay it (`replaySchedule` closing on the cadence, cue and note kept), the
 * next starting `restSeconds` after the previous tune's last cadence note.
 */
export function bookPlaylist(levels: readonly { readonly id: string }[], melodies: Book, restSeconds: number): ScheduledNote[] {
  const tunes = levels.flatMap((level) => {
    const entry = melodies[level.id];
    return entry && hasTune(entry) ? [replaySchedule(entry, true)] : [];
  });
  let start = 0;
  return tunes.flatMap((tune) => {
    const offset = start;
    start = offset + tune[tune.length - 1].at + restSeconds;
    return tune.map((item) => ({ ...item, at: offset + item.at }));
  });
}
