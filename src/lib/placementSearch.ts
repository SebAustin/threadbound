/**
 * The passthrough table search, as a step function (ADR 0006: the room places the
 * diorama and shapes nothing else, so placement has to hold up).
 *
 * The state is a small mutable record that PlacementSystem steps every frame. It is
 * updated in place, like ghostPose's `out`, because a system's update() must not
 * allocate; a step only allocates the placement it asks for.
 */

export const SEARCH = {
  /** Visible seconds without a table before the diorama floats in front of the player. */
  floatAfter: 3,
  /** While it floats, an untouched level still moves to a table found within this much visible time. */
  keepLookingUntil: 18,
  /** Seconds between two looks at the detected planes. */
  evaluateEvery: 0.25,
} as const;

/** How long every build's fade-in lasts (seconds). */
export const REVEAL_SECONDS = 0.3;

/**
 * 'inactive' outside passthrough; 'searching' (hidden) until the first placement;
 * 'floating' while it floats and a table may still take it; 'done' once on a table
 * or once the time to keep looking is up.
 */
export type SearchPhase = 'inactive' | 'searching' | 'floating' | 'done';

export interface PlacementSearch {
  phase: SearchPhase;
  /** Visible seconds since the search (re)started. */
  elapsed: number;
  sinceEvaluate: number;
  /** The diorama, its plaque, strip, threads and ghost hand stay hidden from a search's start until it is placed. */
  hidden: boolean;
  /** A recenter arrived during a drop or a drag: restart once both have ended. */
  restartPending: boolean;
}

/** What the search needs to know about the puzzle this frame. */
export interface SearchFrame {
  readonly delta: number;
  /** The player can't see the session (PauseSystem): the clock stops and nothing is evaluated. */
  readonly paused: boolean;
  readonly status: 'idle' | 'dropping' | 'complete';
  /** Threads the player made (preset threads don't count). */
  readonly playerThreads: number;
  /** Thread pulls and tab slides in progress. */
  readonly drags: number;
}

export type SearchPlace<T> = { readonly surface: 'table'; readonly placement: T } | { readonly surface: 'floating' };

export function createSearch(): PlacementSearch {
  return { phase: 'inactive', elapsed: 0, sinceEvaluate: 0, hidden: false, restartPending: false };
}

/**
 * A passthrough session started, or a recenter came through: hidden, from zero. The first
 * look comes one evaluation period in rather than on the first frame, while plane detection
 * may not have reported every plane yet: a table, once chosen, ends the search.
 */
export function startSearch(search: PlacementSearch): void {
  search.phase = 'searching';
  search.elapsed = 0;
  search.sinceEvaluate = 0;
  search.hidden = true;
  search.restartPending = false;
}

/** The session ended (or isn't passthrough): no search, nothing hidden. */
export function stopSearch(search: PlacementSearch): void {
  search.phase = 'inactive';
  search.hidden = false;
  search.restartPending = false;
}

/** The reference space was reset (a recenter). Outside passthrough nothing happens. */
export function requestRestart(search: PlacementSearch): void {
  if (search.phase !== 'inactive') search.restartPending = true;
}

/** Only a level nobody has touched yet may still move from floating to a table. */
const untouched = (frame: SearchFrame) => frame.status === 'idle' && frame.playerThreads === 0 && frame.drags === 0;

/** A drop or a drag is in progress: a move would wait for it (PuzzleSystem's `busy`), so a search waits too. */
const busy = (frame: SearchFrame) => frame.status === 'dropping' || frame.drags > 0;

/** Whether this frame looks at the planes: on the cadence, and while floating only for an untouched level. */
function dueToEvaluate(search: PlacementSearch, frame: SearchFrame): boolean {
  if (search.sinceEvaluate < SEARCH.evaluateEvery) return false;
  return search.phase === 'searching' || untouched(frame);
}

/**
 * One frame of the search. A table found at any point takes the diorama and ends the
 * search. With no table after `floatAfter` visible seconds it floats, and a table that
 * shows up before `keepLookingUntil` still takes an untouched level. A search waits,
 * hidden and with its clock stopped, while a drop or a drag is in progress, as a restart
 * does: the move it asks for would wait too, and the diorama would show at its old pose.
 */
export function stepSearch<T>(search: PlacementSearch, frame: SearchFrame, findTable: () => T | null): SearchPlace<T> | null {
  if (search.restartPending && !busy(frame)) startSearch(search);
  if (frame.paused || (search.phase !== 'searching' && search.phase !== 'floating')) return null;
  if (search.phase === 'searching' && busy(frame)) return null;
  search.elapsed += frame.delta;
  search.sinceEvaluate += frame.delta;
  if (search.phase === 'floating' && search.elapsed > SEARCH.keepLookingUntil) {
    search.phase = 'done';
    return null;
  }
  if (!dueToEvaluate(search, frame)) return null;
  search.sinceEvaluate = 0;
  const table = findTable();
  if (table) {
    search.phase = 'done';
    search.hidden = false;
    return { surface: 'table', placement: table };
  }
  if (search.phase === 'searching' && search.elapsed >= SEARCH.floatAfter - 1e-9) {
    search.phase = 'floating';
    search.hidden = false;
    return { surface: 'floating' };
  }
  return null;
}

/** Fade-in opacity `t` seconds after a build (eased out, clamped to 0..1). */
export function revealOpacity(t: number): number {
  if (t <= 0) return 0;
  if (t >= REVEAL_SECONDS) return 1;
  const u = t / REVEAL_SECONDS;
  return 1 - (1 - u) ** 3;
}
