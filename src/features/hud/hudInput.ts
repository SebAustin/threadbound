import { currentStreak, today } from '../../lib/daily';
import type { HudInput } from '../../lib/hud';
import type { Level } from '../../lib/levelSchema';
import { hasTune } from '../../lib/melodyBook';
import { onboardingHint } from '../../lib/onboarding';
import { dailyStarsOn } from '../../lib/progress';
import { campaignComplete } from '../../lib/resume';
import { playerThreadCount, spoolUsed } from '../../lib/threadRules';
import { LEVELS } from '../../levels';
import { onboardingStepOf } from '../onboarding/onboardingState';
import type { PuzzleState } from '../puzzle/puzzleStore';
import { skipOfferedOf } from '../puzzle/skipOffer';

/** The best stars the plaque stands for: today's daily stars, or the level's best. */
export function bestStarsOf(state: PuzzleState, levelId: string): number {
  return state.daily ? dailyStarsOn(state.progress, state.daily.day) : (state.progress.best[levelId] ?? 0);
}

/** A returning player on a campaign level, while today's daily is unsolved: its streak (lib/hud's daily-ready line). */
function dailyReadyOf(state: PuzzleState): HudInput['dailyReady'] {
  if (!state.returnVisit || state.daily) return undefined;
  const day = today();
  return dailyStarsOn(state.progress, day) > 0 ? undefined : { streak: currentStreak(state.progress.streak, day) };
}

/** The ledge's return-visit and missed-drop inputs (ticket 14), derived from puzzle state. */
function signpostInputs(state: PuzzleState, level: Level): Partial<HudInput> {
  return {
    lastDropMissed: state.lastDropMissed,
    hasThread: state.threads.length > 0,
    skipOffered: skipOfferedOf(state),
    // A campaign level's first solve, while it is complete and the book holds its tune.
    firstSolve: state.firstSolve && state.status === 'complete' && hasTune(state.progress.melodies[level.id]),
    dailyReady: dailyReadyOf(state),
  };
}

/** What the plaque and the ledge strip show for `state`, as lib/hud's input. */
export function hudInputOf(state: PuzzleState, level: Level): HudInput {
  return {
    levels: LEVELS,
    levelIndex: state.levelIndex,
    title: level.name,
    threadsUsed: playerThreadCount(state.threads),
    maxThreads: level.maxThreads,
    par: level.par,
    bestStars: bestStarsOf(state, level.id),
    solved: state.status === 'complete',
    hint: onboardingHint(onboardingStepOf(state)),
    spool: level.spool === undefined ? undefined : { used: spoolUsed(state.threads, state.pegPositions), total: level.spool },
    daily: state.daily ? { streak: currentStreak(state.progress.streak, state.daily.day) } : undefined,
    refusal: state.refusal,
    levelHint: state.status === 'complete' ? undefined : level.hint,
    // From the save, so the ending survives a reload and shows on any campaign level once all are solved.
    campaignComplete: !state.daily && campaignComplete(LEVELS, state.progress.best),
    noTable: state.surface === 'floating',
    ...signpostInputs(state, level),
  };
}
