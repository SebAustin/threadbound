import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { plaqueColors, type PlaqueColors } from '../../src/lib/colors';

/** A panel's <style>, read as text (UIKitML parses it at load). */
function styleOf(file: string): string {
  const source = readFileSync(new URL(`../../public/ui/${file}`, import.meta.url), 'utf8');
  return /<style>([\s\S]*?)<\/style>/.exec(source)?.[1] ?? '';
}

/** The value of `property` in the rule for exactly `selector`, or undefined. */
function declared(style: string, selector: string, property: string): string | undefined {
  const escaped = selector.replace(/[.:]/g, (c) => `\\${c}`);
  const body = new RegExp(`(?:^|\\s)${escaped}\\s*\\{([^}]*)\\}`).exec(style)?.[1] ?? '';
  return new RegExp(`(?:^|[\\s;])${property}\\s*:\\s*([^;\\s]+)`).exec(body)?.[1];
}

type Literal = readonly [selector: string, property: string, key: keyof PlaqueColors];

/** Every colour literal in the plaque's stylesheet, and the plaqueColors key it must equal. */
const HUD_LITERALS: readonly Literal[] = [
  ['.plaque', 'background-color', 'plaque'],
  ['.plaque', 'border-color', 'plaqueBorder'],
  ['.header', 'background-color', 'headerPlaying'],
  ['.title', 'color', 'title'],
  ['.world', 'color', 'world'],
  ['.star', 'border-color', 'starRing'],
  ['.star', 'background-color', 'starOff'],
  ['.face-title', 'color', 'faceTitle'],
  ['.toggle', 'background-color', 'toggle'],
  ['.toggle', 'border-color', 'toggleBorder'],
  ['.toggle', 'color', 'toggleText'],
  ['.readout', 'color', 'readout'],
  // Ticket 11's hover and press colours.
  ['.toggle:hover', 'background-color', 'toggleHover'],
  ['.toggle:active', 'background-color', 'toggleActive'],
  ['.stars:hover', 'background-color', 'starsHover'],
  ['.stars:active', 'background-color', 'starsActive'],
];

/** The ledge strip's stylesheet: HudSystem paints it from the same plaqueColors. */
const LEDGE_LITERALS: readonly Literal[] = [
  ['.strip', 'background-color', 'ledge'],
  ['.strip', 'border-color', 'ledgeBorder'],
  ['.hint', 'color', 'ledgeHint'],
  ['.detail', 'color', 'ledgeDetail'],
];

const HEX = /#[0-9a-f]{6}\b/gi;

describe.each([
  ['hud.uikitml', HUD_LITERALS],
  ['ledge.uikitml', LEDGE_LITERALS],
] as const)('the literal colours in %s equal plaqueColors(false)', (file, literals) => {
  const style = styleOf(file);
  const colors = plaqueColors(false);

  test.each(literals)('%s %s is plaqueColors(false).%s', (selector, property, key) => {
    expect(declared(style, selector, property)?.toLowerCase()).toBe(colors[key].toLowerCase());
  });

  test('no colour literal is left out of that table', () => {
    expect(style.match(HEX)?.length ?? 0).toBe(literals.length);
  });
});
