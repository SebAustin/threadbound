import { createComponent, Types } from '@iwsdk/core';

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

export const MarbleColors = { Teal: 'teal', Amber: 'amber', Azure: 'azure' } as const;

export const Marble = createComponent('Marble', {
  scored: { type: Types.Boolean, default: false },
  color: { type: Types.Enum, enum: MarbleColors, default: MarbleColors.Teal },
});

/** Pinching the chute releases the level's marbles. */
export const Chute = createComponent('Chute', {});

export const ControlActions = { Restart: 'restart', Next: 'next' } as const;

/** A poke/pinch button on the diorama's front ledge. */
export const ControlButton = createComponent('ControlButton', {
  action: { type: Types.Enum, enum: ControlActions, default: ControlActions.Restart },
});

/** The pinchable tab of a rail peg; dragging it slides the peg along its rail. */
export const SliderHandle = createComponent('SliderHandle', {
  pegId: { type: Types.String, default: '' },
});
