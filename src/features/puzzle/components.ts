import { createComponent, Types, type Entity } from '@iwsdk/core';
import { MARBLE_COLORS, type MarbleColor } from '../../lib/marbleColors';

// System-free declarations: the editor imports this module via src/components.ts.

/** A pin on the back panel that threads attach to. x/y are diorama-local. */
export const Peg = createComponent('Peg', {
  pegId: { type: Types.String, default: '' },
  x: { type: Types.Float32, default: 0 },
  y: { type: Types.Float32, default: 0 },
});

/** An elastic thread stretched between two pegs (diorama-local endpoints). */
export const Thread = createComponent('Thread', {
  fromPeg: { type: Types.String, default: '' },
  toPeg: { type: Types.String, default: '' },
  ax: { type: Types.Float32, default: 0 },
  ay: { type: Types.Float32, default: 0 },
  bx: { type: Types.Float32, default: 0 },
  by: { type: Types.Float32, default: 0 },
  pitch: { type: Types.Float32, default: 440 },
  /** Authored by the level; does not count toward the player's thread limit. */
  preset: { type: Types.Boolean, default: false },
  /** Vibration energy from the last pluck (0..1), decays over time. */
  energy: { type: Types.Float32, default: 0 },
});

/** ECS enum view of MARBLE_COLORS (value → value). */
export const MarbleColors = Object.fromEntries(MARBLE_COLORS.map((c) => [c, c])) as {
  readonly [K in MarbleColor]: K;
};

export const Marble = createComponent('Marble', {
  scored: { type: Types.Boolean, default: false },
  color: { type: Types.Enum, enum: MarbleColors, default: MarbleColors.teal },
});

/** Pinching the chute releases the level's marbles. */
export const Chute = createComponent('Chute', {});

export const ControlActions = { Restart: 'restart', Next: 'next', Settings: 'settings', Daily: 'daily' } as const;
export type ControlAction = (typeof ControlActions)[keyof typeof ControlActions];

/** Narrows a stored action name; unknown names (stale scene data) are rejected. */
export function isControlAction(value: unknown): value is ControlAction {
  return Object.values(ControlActions).includes(value as ControlAction);
}

/**
 * Tag: this tappable (ledge button, thread) was pressed and has just been let go.
 * Acting on release, not press, matters in XR: disposing an entity a hand still
 * holds leaves that pointer captured on a dead object, swallowing its next pinch.
 */
export const TapReleased = createComponent('TapReleased', {});

/** 'disqualify' handler for a Pressed query. Entities disposed mid-press (level rebuilt) are skipped. */
export function tagRelease(entity: Entity): void {
  if (entity.active) entity.addComponent(TapReleased);
}

/** A poke/pinch button on the diorama's front ledge. */
export const ControlButton = createComponent('ControlButton', {
  action: { type: Types.Enum, enum: ControlActions, default: ControlActions.Restart },
});

/** The pinchable tab of a rail peg; dragging it slides the peg along its rail. */
export const SliderHandle = createComponent('SliderHandle', {
  pegId: { type: Types.String, default: '' },
});
