/** The single source of truth for marble colors; everything else derives from this. */
export const MARBLE_COLORS = ['teal', 'amber', 'azure'] as const;
export type MarbleColor = (typeof MARBLE_COLORS)[number];

/** Colors a cup can require. Teal marbles always use an accept-any cup. */
export const SORTING_COLORS = ['amber', 'azure'] as const satisfies readonly MarbleColor[];
export type SortingColor = (typeof SORTING_COLORS)[number];

export type Glyph = 'triangle' | 'circle';

/**
 * Color is never the only cue (colorblind-safe): each sorting color is paired
 * with a shape shown on its chute and its cup.
 */
const GLYPHS: Readonly<Record<MarbleColor, Glyph | null>> = {
  teal: null,
  amber: 'triangle',
  azure: 'circle',
};

export function colorGlyph(color: MarbleColor): Glyph | null {
  return GLYPHS[color];
}

export function isMarbleColor(value: unknown): value is MarbleColor {
  return typeof value === 'string' && (MARBLE_COLORS as readonly string[]).includes(value);
}
