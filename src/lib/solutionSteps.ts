import type { Level } from './levelSchema';
import { positionAlong } from './rail';
import { sameThread } from './threadRules';

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
