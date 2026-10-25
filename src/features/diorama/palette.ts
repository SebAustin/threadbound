import {
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  CylinderGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  SRGBColorSpace,
  type BufferGeometry,
  type Material,
  type Texture,
} from '@iwsdk/core';
import { DIORAMA, GLYPH, MARBLE, PEG } from '../../config/constants';
import { colorGlyph, type MarbleColor, type SortingColor } from '../../lib/marbleColors';
import { mergeParts } from '../geometry/mergeParts';

/**
 * Runtime only: this module builds DOM canvases at import (wood grain, contact
 * shadow), so it must never be imported by the asset manifest or anything the
 * editor realm evaluates (see src/assets.ts rules).
 *
 * Art direction: a warm walnut-and-brass music box. Threads are coral "strings",
 * marbles are sea-glass teal so they read against both wood and passthrough.
 * Shared materials/geometries — entities using them must dispose with
 * { disposeResources: false }.
 */
export const COLORS = {
  walnut: 0x5b3a29,
  /** The frame is a shade darker than the back panel it holds, so the case reads as layered. */
  walnutFrame: 0x4a2e20,
  cream: 0xefe3cf,
  /** Lit forms of touchable parts (TouchFeedbackSystem): the same hue, brighter and glowing. */
  creamHot: 0xfff4dc,
  brass: 0xc9a14a,
  brassHot: 0xffd479,
  /** The peg a pull would attach to: brighter than a hovered peg. */
  brassTarget: 0xfff0b8,
  thread: 0xff6b5a,
  threadHot: 0xff9a86,
  threadPreview: 0xffb3a8,
  /** Authored "snip me" threads read differently from the player's coral strings. */
  threadPreset: 0x9b7fd1,
  threadPresetHot: 0xc4aaf5,
  marble: 0x3fb7c6,
  /** World 2 sorting colors: amber vs azure stay distinct under common color-vision deficiencies. */
  amber: 0xff6f1a,
  azure: 0x3f7fd6,
  goal: 0x8fd694,
  goalHot: 0xb8f2bc,
  goalDone: 0xfff1a8,
} as const;

const GRAIN = {
  size: 256,
  lines: 70,
  /** Base tone the walnut colors are multiplied by (a little below white). */
  base: '#d8d0c8',
  /** Streak opacity: a floor plus a random part. */
  alpha: [0.08, 0.14],
  /** Streak width in pixels: a floor plus a random part. */
  width: [0.6, 2.4],
  /** Bright vs dark streak channel value. */
  light: 255,
  dark: 120,
  /** Waviness: horizontal frequency, per-line phase step, amplitude floor and random part (px). */
  waveFrequency: 0.025,
  wavePhase: 13,
  waveAmplitude: [2, 3],
  segment: 8,
} as const;

/** Any fixed seed: the grain must only be identical on every load. */
const GRAIN_SEED = 7;

/** Small deterministic PRNG, so the grain is identical on every load. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * Procedural wood grain: wavy, faintly lighter and darker streaks over a mid
 * tone. Multiplied by each material's color, one shared texture gives every
 * walnut surface grain at no draw-call cost.
 */
function woodGrain(): Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = GRAIN.size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const random = seeded(GRAIN_SEED);
  const between = ([floor, spread]: readonly [number, number]) => floor + random() * spread;
  ctx.fillStyle = GRAIN.base;
  ctx.fillRect(0, 0, GRAIN.size, GRAIN.size);
  for (let i = 0; i < GRAIN.lines; i++) {
    const y = random() * GRAIN.size;
    const shade = random() > 0.5 ? GRAIN.light : GRAIN.dark;
    // Warm streaks: green and blue fall off, like real walnut.
    ctx.strokeStyle = `rgba(${shade}, ${shade * 0.85}, ${shade * 0.7}, ${between(GRAIN.alpha)})`;
    ctx.lineWidth = between(GRAIN.width);
    ctx.beginPath();
    for (let x = 0; x <= GRAIN.size; x += GRAIN.segment) {
      const wave = Math.sin((x + i * GRAIN.wavePhase) * GRAIN.waveFrequency) * between(GRAIN.waveAmplitude);
      ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

const WOOD_GRAIN = woodGrain();

const SHADOW = {
  size: 128,
  /** The shadow is solid out to this fraction of its radius, then fades. */
  core: 0.35,
  /** Darkness at the core (warm near-black). */
  rgb: '20, 12, 8',
  opacity: 0.55,
} as const;

/** Soft dark ellipse fading to nothing: the diorama's contact shadow. */
function shadowTexture(): Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SHADOW.size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const half = SHADOW.size / 2;
  const gradient = ctx.createRadialGradient(half, half, half * SHADOW.core, half, half, half);
  gradient.addColorStop(0, `rgba(${SHADOW.rgb}, ${SHADOW.opacity})`);
  gradient.addColorStop(1, `rgba(${SHADOW.rgb}, 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SHADOW.size, SHADOW.size);
  return new CanvasTexture(canvas);
}

/** A lit form of a touchable part: its colour glowing, so it reads under any light. */
const hotMaterial = (color: number, emissiveIntensity: number) =>
  new MeshStandardMaterial({ color, emissive: color, emissiveIntensity, metalness: 0.4, roughness: 0.3 });

export const MATERIALS = {
  walnut: new MeshStandardMaterial({ color: COLORS.walnut, map: WOOD_GRAIN, roughness: 0.62 }),
  walnutFrame: new MeshStandardMaterial({ color: COLORS.walnutFrame, map: WOOD_GRAIN, roughness: 0.55 }),
  cream: new MeshStandardMaterial({ color: COLORS.cream, roughness: 0.9 }),
  creamHot: hotMaterial(COLORS.creamHot, 0.35),
  brass: new MeshStandardMaterial({ color: COLORS.brass, metalness: 0.85, roughness: 0.28 }),
  brassHot: hotMaterial(COLORS.brassHot, 0.6),
  brassTarget: hotMaterial(COLORS.brassTarget, 1),
  thread: new MeshStandardMaterial({
    color: COLORS.thread,
    emissive: COLORS.thread,
    emissiveIntensity: 0.25,
    roughness: 0.5,
  }),
  threadHot: hotMaterial(COLORS.threadHot, 0.6),
  threadPreset: new MeshStandardMaterial({
    color: COLORS.threadPreset,
    emissive: COLORS.threadPreset,
    emissiveIntensity: 0.3,
    roughness: 0.5,
  }),
  threadPresetHot: hotMaterial(COLORS.threadPresetHot, 0.6),
  threadPreview: new MeshStandardMaterial({
    color: COLORS.threadPreview,
    transparent: true,
    opacity: 0.6,
  }),
  marble: new MeshStandardMaterial({ color: COLORS.marble, metalness: 0.1, roughness: 0.15 }),
  goal: new MeshStandardMaterial({ color: COLORS.goal, roughness: 0.8 }),
  goalHot: hotMaterial(COLORS.goalHot, 0.4),
  /** Unlit and never writes depth, so it only darkens what is under the diorama. */
  contactShadow: new MeshBasicMaterial({
    map: shadowTexture(),
    transparent: true,
    depthWrite: false,
    // Lies a hair above the table top: pulled toward the camera so it never z-fights.
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  }),
  goalDone: new MeshStandardMaterial({
    color: COLORS.goalDone,
    emissive: COLORS.goalDone,
    emissiveIntensity: 0.8,
  }),
} as const;

export const GEOMETRIES = {
  /** Unit cylinder; threads scale a child mesh so physics entities stay unscaled. */
  unitCylinder: new CylinderGeometry(1, 1, 1, 10, 1),
  /** Unit box, scaled into a tab's hit area. */
  unitBox: new BoxGeometry(1, 1, 1),
  marble: new SphereGeometry(MARBLE.radius, 20, 14),
  /** Unit plane lying flat (+Y up), scaled to each diorama's footprint. */
  shadowPlane: new PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
  /**
   * A whole peg in one draw call: the pin spanning the channel plus the knob in
   * front of the glass (local +Y points toward the player once the peg is placed).
   */
  peg: mergeParts([
    { geometry: new CylinderGeometry(PEG.radius, PEG.radius, DIORAMA.channelHalfDepth * 2, 12) },
    { geometry: new SphereGeometry(PEG.radius * 1.5, 16, 12), at: [0, DIORAMA.channelHalfDepth + PEG.radius, 0] },
  ]),
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

/** Uncolored cups accept any marble; colored cups exist only for sorting colors. */
const GOAL_MATERIALS: Record<SortingColor | 'any', { idle: MeshStandardMaterial; done: MeshStandardMaterial }> = {
  any: { idle: MATERIALS.goal, done: MATERIALS.goalDone },
  amber: { idle: cupMaterial(COLORS.amber, false), done: cupMaterial(COLORS.amber, true) },
  azure: { idle: cupMaterial(COLORS.azure, false), done: cupMaterial(COLORS.azure, true) },
};

export function marbleMaterial(color: MarbleColor): MeshStandardMaterial {
  return MARBLE_MATERIALS[color];
}

/** Cup floor material: tinted by the color it accepts, brighter once filled. */
export function goalMaterial(color: SortingColor | undefined, done: boolean): MeshStandardMaterial {
  const set = GOAL_MATERIALS[color ?? 'any'];
  return done ? set.done : set.idle;
}

const GLYPH_GEOMETRIES = {
  triangle: new CircleGeometry(GLYPH.radius, 3),
  circle: new CircleGeometry(GLYPH.radius, 24),
} as const;

const GLYPH_MATERIALS: Partial<Record<MarbleColor, MeshStandardMaterial>> = {
  amber: new MeshStandardMaterial({ color: COLORS.amber, emissive: COLORS.amber, emissiveIntensity: 0.6 }),
  azure: new MeshStandardMaterial({ color: COLORS.azure, emissive: COLORS.azure, emissiveIntensity: 0.6 }),
};

/**
 * Every material a diorama build, its threads and its marbles draw with, once each: the
 * one fade-in (RevealSystem) scales these. A diorama material added later must join one
 * of the maps above, or it shows at full opacity while the rest fades in.
 */
export const DIORAMA_MATERIALS: readonly (MeshStandardMaterial | MeshBasicMaterial)[] = [
  ...new Set([
    ...Object.values(MATERIALS),
    ...Object.values(MARBLE_MATERIALS),
    ...Object.values(GOAL_MATERIALS).flatMap((set) => [set.idle, set.done]),
    ...Object.values(GLYPH_MATERIALS).filter((m): m is MeshStandardMaterial => m !== undefined),
  ]),
];

/**
 * Every geometry shared across levels. Level teardown must never dispose these,
 * or the GPU re-uploads them on every load (see disposeLevelEntity).
 */
export const SHARED_GEOMETRIES: ReadonlySet<BufferGeometry> = new Set<BufferGeometry>([
  ...Object.values(GEOMETRIES),
  ...Object.values(GLYPH_GEOMETRIES),
]);

/**
 * What a touched part lights up as (TouchFeedbackSystem): its rest material's lit
 * form. A material missing here (the walnut icons, rims, glyphs) stays as it is.
 */
export const HOT_MATERIALS: ReadonlyMap<Material, Material> = new Map<Material, Material>([
  [MATERIALS.brass, MATERIALS.brassHot],
  [MATERIALS.cream, MATERIALS.creamHot],
  [MATERIALS.goal, MATERIALS.goalHot],
  [MATERIALS.thread, MATERIALS.threadHot],
  [MATERIALS.threadPreset, MATERIALS.threadPresetHot],
]);

/** What the peg a pull would attach to lights up as. */
export const TARGET_MATERIALS: ReadonlyMap<Material, Material> = new Map<Material, Material>([
  [MATERIALS.brass, MATERIALS.brassTarget],
]);

/**
 * The render layer hit areas live on. No camera renders it (a camera draws layer 0,
 * and an XR view also its own index), so a hit area costs no draw call. It stays
 * `visible`: IWSDK's pointers skip hidden objects, but they raycast every layer.
 */
export const HIT_AREA_LAYER = 31;

/** Never drawn, so it needs no fade; it writes nothing even if a debug camera draws every layer. */
const HIT_AREA_MATERIAL = new MeshBasicMaterial({ colorWrite: false, depthWrite: false });

/**
 * An invisible target that rays and fingertips hit: a mesh of a shared geometry on
 * HIT_AREA_LAYER, scaled by its owner, marked so touch feedback never lights or moves it.
 */
export function hitAreaMesh(geometry: BufferGeometry): Mesh {
  const mesh = new Mesh(geometry, HIT_AREA_MATERIAL);
  mesh.name = 'hit-area';
  mesh.layers.set(HIT_AREA_LAYER);
  mesh.userData.hitArea = true;
  return mesh;
}

/** A flat, player-facing shape for a sorting color, or null for colors without one. */
export function glyphMesh(color: MarbleColor): Mesh | null {
  const glyph = colorGlyph(color);
  const material = GLYPH_MATERIALS[color];
  if (!glyph || !material) return null;
  const mesh = new Mesh(GLYPH_GEOMETRIES[glyph], material);
  if (glyph === 'triangle') mesh.rotation.z = Math.PI / 2; // point up
  mesh.name = `glyph-${glyph}`;
  return mesh;
}
