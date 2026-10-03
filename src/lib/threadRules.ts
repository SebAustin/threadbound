import type { Vec2 } from './vec';

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

export type ThreadCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'same-peg' | 'duplicate' | 'limit' };

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

export function checkNewThread(
  existing: readonly ThreadLink[],
  from: string,
  to: string,
  maxThreads: number,
): ThreadCheck {
  if (from === to) return { ok: false, reason: 'same-peg' };
  if (existing.some((t) => sameThread(t, { from, to }))) return { ok: false, reason: 'duplicate' };
  const playerThreads = existing.filter((t) => !t.preset).length;
  if (playerThreads >= maxThreads) return { ok: false, reason: 'limit' };
  return { ok: true };
}
