import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

// The plaque's stylesheet, read as text: UIKitML parses it at load, and a mistake there
// takes the whole plaque (and the level system) down with no error on screen.
const HUD = readFileSync(new URL('../../public/ui/hud.uikitml', import.meta.url), 'utf8');
const STYLE = /<style>([\s\S]*?)<\/style>/.exec(HUD)?.[1] ?? '';

describe('the plaque shows a pinch on every control', () => {
  test('toggles and the stars declare hover and press styles', () => {
    for (const rule of ['.toggle:hover', '.toggle:active', '.stars:hover', '.stars:active']) {
      expect(STYLE, rule).toMatch(new RegExp(`${rule.replace('.', '\\.')}\\s*\\{[^}]*background-color`));
    }
  });

  test('its <style> has no /* */ comment, which UIKitML reads as a property and fails on', () => {
    expect(STYLE.length).toBeGreaterThan(0);
    expect(STYLE).not.toContain('/*');
  });
});
