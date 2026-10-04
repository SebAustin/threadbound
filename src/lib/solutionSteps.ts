import type { Level } from './levelSchema';
import { positionAlong } from './rail';
import { sameThread, type ThreadLink } from './threadRules';
import type { PegPositions } from './vec';

/** Structurally identical to the puzzle bus commands, so steps can be dispatched as-is. */
export type SolutionStep =
  | { readonly type: 'movePeg'; readonly pegId: string; readonly x: number; readonly y: number }
  | { readonly type: 'snip'; readonly from: string; readonly to: string }
  | { readonly type: 'addThread'; readonly from: string; readonly to: string };

/**
 * The commands that turn a freshly loaded level into its stored solution:
 * rail slides first (attached threads are rebuilt where the peg lands), then
 * presets the solution doesn't keep are snipped, then missing threads added.
 */
export function solutionSteps(level: Level): SolutionStep[] {
  const slides = level.slides.flatMap((slide): SolutionStep[] => {
    const peg = level.pegs.find((p) => p.id === slide.peg);
    if (!peg?.rail) return [];
    return [{ type: 'movePeg', pegId: peg.id, ...positionAlong(peg, peg.rail, slide.to) }];
  });
  const snips = level.presetThreads
    .filter((p) => !level.solution.some((s) => sameThread(s, p)))
    .map((p): SolutionStep => ({ type: 'snip', from: p.from, to: p.to }));
  const adds = level.solution
    .filter((s) => !level.presetThreads.some((p) => sameThread(s, p)))
    .map((s): SolutionStep => ({ type: 'addThread', from: s.from, to: s.to }));
  return [...slides, ...snips, ...adds];
}

/**
 * The commands that rebuild a freshly loaded level into the player's current
 * layout (after the diorama moves, its colliders are rebuilt from scratch):
 * rail pegs back where they were slid, presets the player snipped snipped
 * again, and the player's own threads re-added.
 */
export function restoreSteps(
  level: Level,
  threads: readonly ThreadLink[],
  pegPositions: PegPositions,
): SolutionStep[] {
  const slides = level.pegs.flatMap((peg): SolutionStep[] => {
    const at = pegPositions[peg.id];
    if (!peg.rail || !at || (at.x === peg.x && at.y === peg.y)) return [];
    return [{ type: 'movePeg', pegId: peg.id, x: at.x, y: at.y }];
  });
  const snips = level.presetThreads
    .filter((p) => !threads.some((t) => t.preset && sameThread(t, p)))
    .map((p): SolutionStep => ({ type: 'snip', from: p.from, to: p.to }));
  const adds = threads
    .filter((t) => !t.preset)
    .map((t): SolutionStep => ({ type: 'addThread', from: t.from, to: t.to }));
  return [...slides, ...snips, ...adds];
}
