import type { PegPositions, Point2, Vec2 } from './vec';

export interface PegPoint {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export interface ThreadLink {
  readonly from: string;
  readonly to: string;
  /** Authored by the level (e.g. "snip me"); does not count toward the player's limit. */
  readonly preset?: boolean;
}

/** Threads are undirected: a→b and b→a are the same thread. */
export function sameThread(a: Omit<ThreadLink, 'preset'>, b: Omit<ThreadLink, 'preset'>): boolean {
  return (a.from === b.from && a.to === b.to) || (a.from === b.to && a.to === b.from);
}

/** Threads the player made: presets never count toward limits, par or stars. */
export function playerThreadCount(threads: readonly ThreadLink[]): number {
  let count = 0;
  for (const t of threads) if (!t.preset) count += 1;
  return count;
}

/** Total length (meters) of the player's threads at the pegs' live positions. */
export function spoolUsed(
  threads: readonly ThreadLink[],
  pegs: PegPositions,
): number {
  let total = 0;
  for (const t of threads) {
    const a = pegs[t.from];
    const b = pegs[t.to];
    if (!t.preset && a && b) total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
}

/** World 4: what is left on the level's spool and how long the new thread would be. */
export interface SpoolCheck {
  readonly remaining: number;
  readonly length: number;
}

/** Why a thread (or a slide stretching one) was refused. */
export type RefusalReason = 'same-peg' | 'duplicate' | 'limit' | 'spool';

export type ThreadCheck = { readonly ok: true } | { readonly ok: false; readonly reason: RefusalReason };

/** Rounding slack so a thread that exactly uses up the spool still fits. */
const SPOOL_EPSILON = 1e-6;

/** Whether sliding `pegId` to `to` keeps the threads attached to it within the spool (if the level has one). */
export function slideFitsSpool(
  threads: readonly ThreadLink[],
  pegs: PegPositions,
  pegId: string,
  to: Point2,
  spool: number | undefined,
): boolean {
  if (spool === undefined) return true;
  return spoolUsed(threads, { ...pegs, [pegId]: to }) <= spool + SPOOL_EPSILON;
}

/** Nearest peg to `point` within `radius`, skipping `excludeId`. */
export function findSnapPeg(
  point: Vec2,
  pegs: readonly PegPoint[],
  excludeId: string,
  radius: number,
): string | null {
  let bestId: string | null = null;
  let bestDist = radius;
  for (const peg of pegs) {
    if (peg.id === excludeId) continue;
    const dist = Math.hypot(peg.x - point[0], peg.y - point[1]);
    if (dist <= bestDist) {
      bestDist = dist;
      bestId = peg.id;
    }
  }
  return bestId;
}

/**
 * The peg a released pull attaches to. The held point (lib/releaseTrail) wins when it
 * lands on a peg; one that lands on none doesn't, so the release frame gets its chance:
 * a pull that paused on bare panel, then landed on a peg, still lands there.
 */
export function landingPeg(
  held: Vec2,
  release: Vec2,
  pegs: readonly PegPoint[],
  excludeId: string,
  radius: number,
): string | null {
  return findSnapPeg(held, pegs, excludeId, radius) ?? findSnapPeg(release, pegs, excludeId, radius);
}

/** The parts of a level that say which threads it starts with and which its solution keeps. */
export interface PresetLevel {
  readonly pegs: readonly { readonly id: string }[];
  readonly presetThreads: readonly ThreadLink[];
  /** Threads a known-good solution has: the presets it keeps, plus the player's. */
  readonly solution: readonly ThreadLink[];
}

/**
 * Pegs that only snipped preset threads touch: the presets the solution doesn't
 * keep. They anchor a thread to snip and are never a thread's end, so they are no
 * snap target (a pull released beside one lands on its neighbour).
 */
export function presetOnlyPegs(level: PresetLevel): readonly string[] {
  const kept = (link: ThreadLink) => level.solution.some((s) => sameThread(s, link));
  const touches = (links: readonly ThreadLink[], id: string) => links.some((l) => l.from === id || l.to === id);
  const snipped = level.presetThreads.filter((link) => !kept(link));
  return level.pegs
    .map((p) => p.id)
    .filter((id) => touches(snipped, id) && !touches(level.solution, id));
}

export function checkNewThread(
  existing: readonly ThreadLink[],
  from: string,
  to: string,
  maxThreads: number,
  spool?: SpoolCheck,
): ThreadCheck {
  if (from === to) return { ok: false, reason: 'same-peg' };
  if (existing.some((t) => sameThread(t, { from, to }))) return { ok: false, reason: 'duplicate' };
  if (playerThreadCount(existing) >= maxThreads) return { ok: false, reason: 'limit' };
  if (spool && spool.length > spool.remaining + SPOOL_EPSILON) return { ok: false, reason: 'spool' };
  return { ok: true };
}
