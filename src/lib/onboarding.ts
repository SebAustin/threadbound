/**
 * First five minutes: a ghost hand demonstrates pinch-pull on the first level,
 * then points at the chute. Pure state + timeline so the system only renders.
 */
export type OnboardingStep = 'pinch-pull' | 'drop' | 'watch' | 'done';

export interface OnboardingInput {
  readonly hasSolvedAny: boolean;
  readonly levelIndex: number;
  /** Threads the player made (presets excluded). */
  readonly playerThreads: number;
  readonly status: 'idle' | 'dropping' | 'complete';
}

export function onboardingStep({ hasSolvedAny, levelIndex, playerThreads, status }: OnboardingInput): OnboardingStep {
  if (hasSolvedAny || levelIndex !== 0 || status === 'complete') return 'done';
  if (status === 'dropping') return 'watch';
  return playerThreads === 0 ? 'pinch-pull' : 'drop';
}

const HINTS: Readonly<Record<OnboardingStep, string>> = {
  'pinch-pull': 'Pinch a glowing peg, pull, release on the other',
  drop: 'Now pinch the chute to drop the marbles',
  watch: 'Listen: every bounce plays a note',
  done: '',
};

/** Plaque copy for the step (plain ASCII: the panel font has no typographic glyphs). */
export function onboardingHint(step: OnboardingStep): string {
  return HINTS[step];
}

export interface GhostPose {
  /** 0 at the first peg, 1 at the second. */
  along: number;
  /** 0 = fingertips open, 1 = pinched together. */
  pinch: number;
  thread: boolean;
  opacity: number;
}

/** Keyframes (seconds): fade in, pinch, pull, release, hold, fade out. */
const FADE_IN_END = 0.3;
const PINCH_END = 0.7;
const PULL_START = 0.9;
const PULL_END = 2.2;
const RELEASE_END = 2.5;
const FADE_OUT_START = 3.0;
export const GHOST_LOOP_SECONDS = 3.4;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const span = (t: number, start: number, end: number) => clamp01((t - start) / (end - start));
/** Smoothstep: slow in, slow out, so the pull reads as a deliberate hand motion. */
const ease = (v: number) => v * v * (3 - 2 * v);

/** Pose at `seconds` into the loop. Pass `out` to reuse one object per frame (no allocation). */
export function ghostPose(
  seconds: number,
  out: GhostPose = { along: 0, pinch: 0, thread: false, opacity: 0 },
): GhostPose {
  const t = ((seconds % GHOST_LOOP_SECONDS) + GHOST_LOOP_SECONDS) % GHOST_LOOP_SECONDS;
  out.along = ease(span(t, PULL_START, PULL_END));
  out.pinch = t < PULL_END ? ease(span(t, FADE_IN_END, PINCH_END)) : 1 - ease(span(t, PULL_END, RELEASE_END));
  out.thread = t >= PULL_START;
  out.opacity = Math.min(span(t, 0, FADE_IN_END), 1 - span(t, FADE_OUT_START, GHOST_LOOP_SECONDS));
  return out;
}
