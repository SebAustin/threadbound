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
});

export const Marble = createComponent('Marble', {
  scored: { type: Types.Boolean, default: false },
});

/** Pinching the chute releases the level's marbles. */
export const Chute = createComponent('Chute', {});
