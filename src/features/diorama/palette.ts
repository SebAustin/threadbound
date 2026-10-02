import {
  CylinderGeometry,
  MeshStandardMaterial,
  SphereGeometry,
} from '@iwsdk/core';
import { MARBLE, PEG } from '../../config/constants';
import type { MarbleColor } from '../../lib/goalMatch';

/**
 * Art direction: a warm walnut-and-brass music box. Threads are coral "strings",
 * marbles are sea-glass teal so they read against both wood and passthrough.
 * Shared materials/geometries — entities using them must dispose with
 * { disposeResources: false }.
 */
export const COLORS = {
  walnut: 0x5b3a29,
  cream: 0xefe3cf,
  brass: 0xc9a14a,
  brassHot: 0xffd479,
  thread: 0xff6b5a,
  threadPreview: 0xffb3a8,
  /** Authored "snip me" threads read differently from the player's coral strings. */
  threadPreset: 0x9b7fd1,
  marble: 0x3fb7c6,
  /** World 2 sorting colors: amber vs azure stay distinct under common color-vision deficiencies. */
  amber: 0xf2a33a,
  azure: 0x3f7fd6,
  goal: 0x8fd694,
  goalDone: 0xfff1a8,
} as const;

export const MATERIALS = {
  walnut: new MeshStandardMaterial({ color: COLORS.walnut, roughness: 0.7 }),
  cream: new MeshStandardMaterial({ color: COLORS.cream, roughness: 0.9 }),
  brass: new MeshStandardMaterial({ color: COLORS.brass, metalness: 0.6, roughness: 0.35 }),
  brassHot: new MeshStandardMaterial({
    color: COLORS.brassHot,
    emissive: COLORS.brassHot,
    emissiveIntensity: 0.6,
    metalness: 0.4,
    roughness: 0.3,
  }),
  thread: new MeshStandardMaterial({
    color: COLORS.thread,
    emissive: COLORS.thread,
    emissiveIntensity: 0.25,
    roughness: 0.5,
  }),
  threadPreset: new MeshStandardMaterial({
    color: COLORS.threadPreset,
    emissive: COLORS.threadPreset,
    emissiveIntensity: 0.3,
    roughness: 0.5,
  }),
  threadPreview: new MeshStandardMaterial({
    color: COLORS.threadPreview,
    transparent: true,
    opacity: 0.6,
  }),
  marble: new MeshStandardMaterial({ color: COLORS.marble, metalness: 0.1, roughness: 0.15 }),
  goal: new MeshStandardMaterial({ color: COLORS.goal, roughness: 0.8 }),
  goalDone: new MeshStandardMaterial({
    color: COLORS.goalDone,
    emissive: COLORS.goalDone,
    emissiveIntensity: 0.8,
  }),
} as const;

export const GEOMETRIES = {
  /** Unit cylinder; threads scale a child mesh so physics entities stay unscaled. */
  unitCylinder: new CylinderGeometry(1, 1, 1, 10, 1),
  marble: new SphereGeometry(MARBLE.radius, 20, 14),
  pegKnob: new SphereGeometry(PEG.radius * 1.5, 16, 12),
} as const;

const MARBLE_MATERIALS: Record<MarbleColor, MeshStandardMaterial> = {
  teal: MATERIALS.marble,
  amber: new MeshStandardMaterial({ color: COLORS.amber, metalness: 0.1, roughness: 0.15 }),
  azure: new MeshStandardMaterial({ color: COLORS.azure, metalness: 0.1, roughness: 0.15 }),
};

const cupMaterial = (color: number, done: boolean) =>
  new MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: done ? 0.9 : 0.15,
    roughness: 0.8,
  });

const GOAL_MATERIALS: Record<MarbleColor | 'any', { idle: MeshStandardMaterial; done: MeshStandardMaterial }> = {
  any: { idle: MATERIALS.goal, done: MATERIALS.goalDone },
  teal: { idle: MATERIALS.goal, done: MATERIALS.goalDone },
  amber: { idle: cupMaterial(COLORS.amber, false), done: cupMaterial(COLORS.amber, true) },
  azure: { idle: cupMaterial(COLORS.azure, false), done: cupMaterial(COLORS.azure, true) },
};

export function marbleMaterial(color: MarbleColor): MeshStandardMaterial {
  return MARBLE_MATERIALS[color];
}

/** Cup floor material: tinted by the color it accepts, brighter once filled. */
export function goalMaterial(color: MarbleColor | undefined, done: boolean): MeshStandardMaterial {
  const set = GOAL_MATERIALS[color ?? 'any'];
  return done ? set.done : set.idle;
}
