import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

// Read as text on purpose: the order of steps is the contract, and no YAML parser is a dependency.
const workflow = readFileSync(new URL('../../.github/workflows/deploy.yml', import.meta.url), 'utf8');
const lines = workflow.split('\n');

const indentOf = (line: string) => line.length - line.trimStart().length;

/** The lines nested under the first `key:` line (more indented than it). */
function blockUnder(key: string): string[] {
  const start = lines.findIndex((l) => l.trim() === `${key}:`);
  if (start < 0) return [];
  const block: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === '') continue;
    if (indentOf(line) <= indentOf(lines[start])) break;
    block.push(line);
  }
  return block;
}

/** Character offset of `needle` in the workflow; -1 when missing. */
const at = (needle: string) => workflow.indexOf(needle);

describe('deploy.yml: docs pushes do not deploy', () => {
  test.each(["'docs/**'", "'**/*.md'", "'.scratch/**'"])('paths-ignore under push lists %s', (glob) => {
    const push = blockUnder('push').join('\n');
    expect(push).toMatch(/paths-ignore:/);
    expect(push).toContain(glob);
  });

  test('push stays main-only and workflow_dispatch stays', () => {
    expect(blockUnder('push').join('\n')).toMatch(/branches: \[main\]/);
    expect(lines.some((l) => l.trim() === 'workflow_dispatch:')).toBe(true);
  });
});

describe('deploy.yml: the production smoke gates the Pages upload', () => {
  test('npm run test:smoke runs after npm run build and before upload-pages-artifact', () => {
    const build = at('run: npm run build');
    const smoke = at('run: npm run test:smoke');
    const upload = at('actions/upload-pages-artifact');
    expect(build).toBeGreaterThan(-1);
    expect(smoke).toBeGreaterThan(build);
    expect(upload).toBeGreaterThan(smoke);
  });

  test('Chromium is installed before the smoke, in the same build job', () => {
    const install = at('run: npx playwright install --with-deps chromium');
    expect(install).toBeGreaterThan(at('run: npm run build'));
    expect(install).toBeLessThan(at('run: npm run test:smoke'));
    expect(at('run: npm run test:smoke')).toBeLessThan(at('\n  deploy:'));
  });

  test('a failing smoke uploads .tmp/prod-smoke/ as an artifact', () => {
    const smoke = at('run: npm run test:smoke');
    const artifact = at('actions/upload-artifact@');
    expect(artifact).toBeGreaterThan(smoke);
    expect(artifact).toBeLessThan(at('actions/upload-pages-artifact'));
    const step = workflow.slice(artifact, at('actions/upload-pages-artifact'));
    expect(step).toContain('if: failure()');
    expect(step).toContain('path: .tmp/prod-smoke/');
    // upload-artifact skips dot-directories such as .tmp/ unless told otherwise.
    expect(step).toContain('include-hidden-files: true');
  });
});
