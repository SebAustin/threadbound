import {
  CylinderGeometry,
  MeshStandardMaterial,
  SphereGeometry,
} from '@iwsdk/core';
import { MARBLE, PEG } from '../../config/constants';

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
  marble: 0x3fb7c6,
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
