import { onboardingStep, type OnboardingStep } from '../../lib/onboarding';
import type { PuzzleState } from '../puzzle/puzzleStore';

/** The current tutorial step, derived from puzzle state (no separate save data). */
export function onboardingStepOf(state: PuzzleState): OnboardingStep {
  return onboardingStep({
    hasSolvedAny: Object.keys(state.progress.best).length > 0,
    levelIndex: state.levelIndex,
    playerThreads: state.threads.filter((t) => !t.preset).length,
    status: state.status,
  });
}
