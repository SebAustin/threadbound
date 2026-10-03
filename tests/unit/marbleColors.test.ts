import { describe, expect, test } from 'vitest';
import { MARBLE_COLORS, colorGlyph, isMarbleColor } from '../../src/lib/marbleColors';

describe('marble colors: one source of truth', () => {
  test('lists every playable color once', () => {
    expect(MARBLE_COLORS).toEqual(['teal', 'amber', 'azure']);
  });

  test('narrows unknown strings safely', () => {
    expect(isMarbleColor('azure')).toBe(true);
    expect(isMarbleColor('magenta')).toBe(false);
  });

  test('every sorting color has a distinct shape glyph (colorblind-safe)', () => {
    expect(colorGlyph('amber')).toBe('triangle');
    expect(colorGlyph('azure')).toBe('circle');
    expect(colorGlyph('amber')).not.toBe(colorGlyph('azure'));
  });

  test('the neutral color needs no glyph', () => {
    expect(colorGlyph('teal')).toBeNull();
  });
});
