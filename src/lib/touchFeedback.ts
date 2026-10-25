/**
 * How a part the player can touch answers a hand: it lights up under a ray or a
 * fingertip, lights brighter as the peg a pull would land on, and a pressed part
 * moves. Pure rules; TouchFeedbackSystem (src/features/input) applies them.
 */

/** Every kind of touchable part. */
export const TOUCH_KINDS = ['button', 'chute', 'tab', 'peg', 'thread'] as const;
export type TouchKind = (typeof TOUCH_KINDS)[number];

/** What a touchable part shows, from least to most urgent. */
export type TouchState = 'rest' | 'hover' | 'target' | 'press';

export interface TouchInput {
  /** A ray, gaze or fingertip is over it. */
  readonly hovered: boolean;
  /** A pinch, poke or click is holding it. */
  readonly pressed: boolean;
  /** The peg a pull would attach to if released now. */
  readonly target: boolean;
}

/** Press beats target, target beats hover, hover beats rest. */
export function touchState({ hovered, pressed, target }: TouchInput): TouchState {
  if (pressed) return 'press';
  if (target) return 'target';
  return hovered ? 'hover' : 'rest';
}

const MM = 0.001;

/**
 * How far a pressed part moves (meters): a ledge button's cap sinks, the chute
 * dips, a tab goes into the back panel. Pegs and threads stay put, because a
 * pull or a snip starts from where they are.
 */
export const PRESS_TRAVEL: Readonly<Record<TouchKind, number>> = {
  button: 5 * MM,
  chute: 4 * MM,
  tab: 4 * MM,
  peg: 0,
  thread: 0,
};

/** The frame axis each kind moves along when pressed (always toward negative: down, or into the panel). */
export const PRESS_AXIS: Readonly<Record<TouchKind, 'y' | 'z'>> = {
  button: 'y',
  chute: 'y',
  tab: 'z',
  peg: 'y',
  thread: 'y',
};

/**
 * Which part a ray takes when several lie under it (pointerEventsOrder: the
 * higher wins before distance is compared). A peg's knob always beats the tab
 * and thread hit areas around it, and a tab beats a thread.
 */
export const HIT_ORDER = { knob: 2, tab: 1, thread: 0 } as const;
