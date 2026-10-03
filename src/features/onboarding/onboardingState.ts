import { onboardingStep, type OnboardingStep } from '../../lib/onboarding';
import { playerThreadCount } from '../../lib/threadRules';
import { LEVELS } from '../../levels';
import type { PuzzleState } from '../puzzle/puzzleStore';

/** The current tutorial step, derived from puzzle state (no separate save data). */
export function onboardingStepOf(state: PuzzleState): OnboardingStep {
  return onboardingStep({
    // Only levels that exist count: a stale save must not skip the tutorial.
    hasSolvedAny: LEVELS.some((l) => (state.progress.best[l.id] ?? 0) > 0),
    levelIndex: state.levelIndex,
    playerThreads: playerThreadCount(state.threads),
    status: state.status,
  });
}
