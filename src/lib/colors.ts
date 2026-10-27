/**
 * Every colour the game paints, as data (ticket 15): the diorama's palette and its
 * high-contrast overrides, and the plaque's and ledge strip's colours for both modes.
 * features/diorama/palette.ts builds its shared materials from `dioramaPalette` and
 * repaints them in place on a switch; HudSystem paints the panels from `plaqueColors`.
 * tests/unit/contrast.test.ts holds every value here to its contrast and colour-vision
 * bounds. Pure: no Three.js, no DOM.
 *
 * Art direction: a warm walnut-and-brass music box. Threads are coral pink, marbles
 * sea-glass teal, so they read against both wood and passthrough.
 */

/** How one diorama surface is painted: its colour, how strongly it glows in that colour, and whether it is drawn. */
export interface Paint {
  /** '#rrggbb'. */
  readonly color: string;
  /** Emissive intensity in its own colour; 0 for a surface that doesn't glow. */
  readonly glow: number;
  readonly visible: boolean;
}

const paint = (color: string, glow = 0, visible = true): Paint => ({ color, glow, visible });

const WALNUT = '#5b3a29';
const CREAM = '#efe3cf';
const AMBER = '#ff6f1a';
const AZURE = '#3f7fd6';

/** The default palette, one entry per shared diorama material (palette.ts). */
const DEFAULT_PALETTE = {
  walnut: paint(WALNUT),
  /** The frame is a shade darker than the back panel it holds, so the case reads as layered. */
  walnutFrame: paint('#4a2e20'),
  /** The back panel the pegs stand on: walnut, until high contrast darkens it. */
  backPanel: paint(WALNUT),
  /** Cup walls and inner walls: walnut, until high contrast turns them into cream outlines. */
  wall: paint(WALNUT),
  cream: paint(CREAM),
  /** Lit forms of touchable parts (TouchFeedbackSystem): the same hue, brighter and glowing. */
  creamHot: paint('#fff4dc', 0.35),
  brass: paint('#c9a14a'),
  brassHot: paint('#ffd479', 0.6),
  /** The peg a pull would attach to: brighter than a hovered peg. */
  brassTarget: paint('#fff0b8', 1),
  /** The player's thread: a light coral, far from amber in every colour vision (gap 66). */
  thread: paint('#ff96a8', 0.25),
  threadHot: paint('#ffc4cf', 0.6),
  /** The drag preview and a pressed thread: a thread about to be made, or about to go. */
  threadPreview: paint('#ffb3a8'),
  /** Authored "snip me" threads read differently from the player's coral threads. */
  threadPreset: paint('#9b7fd1', 0.3),
  threadPresetHot: paint('#c4aaf5', 0.6),
  /** Marbles: sea-glass teal, and World 2's sorting colors, distinct under common color-vision deficiencies. */
  marble: paint('#3fb7c6'),
  marbleAmber: paint(AMBER),
  marbleAzure: paint(AZURE),
  /** An uncolored cup's floor (and the Next button's cap), lit, and filled. */
  goal: paint('#8fd694'),
  goalHot: paint('#b8f2bc', 0.4),
  goalDone: paint('#fff1a8', 0.8),
  /** Colored cup floors: tinted by the color they accept, brighter once filled. */
  cupAmber: paint(AMBER, 0.15),
  cupAmberFilled: paint(AMBER, 0.9),
  cupAzure: paint(AZURE, 0.15),
  cupAzureFilled: paint(AZURE, 0.9),
  glyphAmber: paint(AMBER, 0.6),
  glyphAzure: paint(AZURE, 0.6),
  /** The dark disc behind each glyph: drawn only in high contrast. */
  glyphBacking: paint('#0a0806', 0, false),
  /** A wrong cup's walls blink between these: a change in brightness, not colour. */
  wallBlinkBright: paint('#c99872', 0.5),
  wallBlinkDark: paint('#1f140e'),
} satisfies Record<string, Paint>;

export type PaintName = keyof typeof DEFAULT_PALETTE;
export type DioramaPalette = Readonly<Record<PaintName, Paint>>;

/**
 * High contrast: the back panel goes near-black, cup and inner walls go cream so they
 * read as outlines, brass (pegs, rails, chutes) brightens, threads and idle cup floors
 * glow more, and every glyph gets its dark backing. The ledge and its buttons stay.
 */
const HIGH_CONTRAST_OVERRIDES: Readonly<Partial<Record<PaintName, Paint>>> = {
  backPanel: paint('#0a0a0a'),
  wall: paint(CREAM, 0.2),
  brass: paint('#ffd75e', 0.35),
  brassHot: paint('#ffeaa6', 0.7),
  brassTarget: paint('#fff8dc', 1),
  thread: paint('#ff96a8', 0.6),
  threadHot: paint('#ffc4cf', 0.9),
  threadPreset: paint('#9b7fd1', 0.6),
  threadPresetHot: paint('#c4aaf5', 0.9),
  goal: paint('#8fd694', 0.5),
  /** Still brighter than the floor it lights, which now glows (the Next cap shares it). */
  goalHot: paint('#b8f2bc', 0.8),
  cupAmber: paint(AMBER, 0.5),
  cupAzure: paint(AZURE, 0.5),
  glyphBacking: paint('#0a0806', 0, true),
  wallBlinkBright: paint('#ffffff', 0.8),
  wallBlinkDark: paint('#3b342b'),
};

const HIGH_CONTRAST_PALETTE: DioramaPalette = Object.freeze({ ...DEFAULT_PALETTE, ...HIGH_CONTRAST_OVERRIDES });
const PLAY_PALETTE: DioramaPalette = Object.freeze({ ...DEFAULT_PALETTE });

/** The diorama's palette in the given mode. */
export function dioramaPalette(highContrast: boolean): DioramaPalette {
  return highContrast ? HIGH_CONTRAST_PALETTE : PLAY_PALETTE;
}

/** The plaque's and the ledge strip's colours ('#rrggbb'). hud.uikitml and ledge.uikitml hold the defaults as literals. */
export interface PlaqueColors {
  readonly plaque: string;
  readonly plaqueBorder: string;
  readonly headerPlaying: string;
  readonly headerSolved: string;
  readonly title: string;
  readonly world: string;
  /** The stars' backing under a ray, and while pinched (they replay the melody book). */
  readonly starsHover: string;
  readonly starsActive: string;
  readonly starOn: string;
  readonly starOff: string;
  readonly starRing: string;
  readonly faceTitle: string;
  readonly toggle: string;
  readonly toggleBorder: string;
  readonly toggleText: string;
  readonly toggleHover: string;
  readonly toggleActive: string;
  readonly readout: string;
  readonly ledge: string;
  readonly ledgeBorder: string;
  readonly ledgeHint: string;
  readonly ledgeDetail: string;
}

const DEFAULT_PLAQUE: PlaqueColors = Object.freeze({
  plaque: '#f4ead8',
  plaqueBorder: '#8a6a3c',
  headerPlaying: '#3d2f2a',
  /** Dark enough that lit stars reach 4:1 and the title 6:1 (gap 15: the old #b8862f gave 1.93:1). */
  headerSolved: '#7a5418',
  title: '#fbf3e4',
  world: '#e3d3b4',
  starsHover: '#5c4a3e',
  starsActive: '#8a6a3c',
  starOn: '#f2c14e',
  starOff: '#3d2f2a',
  starRing: '#d9b45a',
  faceTitle: '#3d2f2a',
  toggle: '#e3d3b4',
  toggleBorder: '#8a6a3c',
  toggleText: '#3d2f2a',
  toggleHover: '#f2c14e',
  toggleActive: '#d39a2c',
  readout: '#3d2f2a',
  ledge: '#f4ead8',
  ledgeBorder: '#8a6a3c',
  ledgeHint: '#8a4b12',
  ledgeDetail: '#3d2f2a',
});

/** High contrast: black on white, white on black, every text at least 7:1. */
const HIGH_CONTRAST_PLAQUE: PlaqueColors = Object.freeze({
  plaque: '#ffffff',
  plaqueBorder: '#000000',
  headerPlaying: '#000000',
  headerSolved: '#4a3000',
  title: '#ffffff',
  world: '#f5efe0',
  starsHover: '#333333',
  starsActive: '#555555',
  starOn: '#ffd23f',
  starOff: '#000000',
  starRing: '#ffe08a',
  faceTitle: '#000000',
  toggle: '#ffffff',
  toggleBorder: '#000000',
  toggleText: '#000000',
  toggleHover: '#ffd23f',
  toggleActive: '#e0a800',
  readout: '#000000',
  ledge: '#ffffff',
  ledgeBorder: '#000000',
  ledgeHint: '#5a1f00',
  ledgeDetail: '#000000',
});

/** The plaque's and ledge strip's colours in the given mode. */
export function plaqueColors(highContrast: boolean): PlaqueColors {
  return highContrast ? HIGH_CONTRAST_PLAQUE : DEFAULT_PLAQUE;
}
