import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

// The page shell (week 8 ticket 08): the ~2.9 MB load shows a loading line on walnut, never a
// blank white page. Read as text: index.html is static, and these lines are its contract.
const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

/** The first element whose start tag has `id="<id>"`: its start tag and its text up to the closing tag. */
function element(id: string): { tag: string; text: string } | null {
  const match = new RegExp(`<(\\w+)([^>]*\\bid="${id}"[^>]*)>([^<]*)</\\1>`).exec(html);
  return match ? { tag: match[2], text: match[3].trim() } : null;
}

/** The declarations of every `body { ... }` rule in the page's <style> blocks, plus body's inline style. */
function bodyDeclarations(): string {
  const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
  const rules = [...styles.matchAll(/(?:^|[},])\s*body\s*\{([^}]*)\}/g)].map((m) => m[1]);
  const inline = /<body[^>]*\bstyle="([^"]*)"/.exec(html)?.[1] ?? '';
  return [...rules, inline].join(';');
}

const WHITE = /^(#fff|#ffffff|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))$/i;

describe('index.html loading screen', () => {
  test('has the #boot loading line as a status', () => {
    const boot = element('boot');
    expect(boot?.text).toBe('Loading Threadbound...');
    expect(boot?.tag).toMatch(/\brole="status"/);
  });

  test('gives the body an explicit background that is not white', () => {
    const background = /background(?:-color)?\s*:\s*([^;]+)/.exec(bodyDeclarations())?.[1]?.trim();
    expect(background).toBeDefined();
    expect(background).not.toMatch(WHITE);
    expect(background?.toLowerCase()).toBe('#3d2f2a');
  });

  test('has the DOM Enter XR button, hidden until the game offers it', () => {
    const button = element('enter-xr');
    expect(button?.text).toBe('Enter XR');
    expect(button?.tag).toMatch(/\bhidden\b/);
    expect(html).toMatch(/<button[^>]*\bid="enter-xr"/);
  });
});
