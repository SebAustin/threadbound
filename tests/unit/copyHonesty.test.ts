import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

// Judge-facing copy claims only what the build does (week 8 ticket 06). Read as text:
// the words are the contract, and a phrase that creeps back in fails here first.
const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const COPY = ['README.md', 'docs/submission.md', 'docs/video/script.md'] as const;

/** Overclaims the build doesn't back (gap analysis #3, #9, #17, #38; ADR 0006). */
const BANNED_PHRASES = [
  'purposeful mixed reality',
  'passthrough is the stage',
  'depends on hands',
  'new daily puzzle every day',
  'off-scale',
  'carries its own shape',
  'cozy',
  'frame budget',
  'moving peg', // CONTEXT.md's Rail peg _Avoid_ list: rail pegs ship, so it reads as the opposite
] as const;

/** Whole words: the old button verb and name, and "we" for a solo entrant. */
const BANNED_WORDS = ['gear', 'gears', 'poke', 'pokes', 'poked', 'poking', 'we', 'our'] as const;

/** Lower-cased `text` with every run of whitespace, line breaks included, as one space. */
const normalise = (text: string) => text.toLowerCase().replace(/\s+/g, ' ');

/** Paragraphs of `text` (split on blank lines), each with its whitespace normalised. */
const paragraphs = (text: string) => text.split(/\n\s*\n/).map(normalise);

/** How many times `pattern` (a global regex) or `needle` occurs in `text`. */
const count = (text: string, pattern: RegExp | string) =>
  typeof pattern === 'string' ? text.split(pattern).length - 1 : (text.match(pattern) ?? []).length;

/**
 * The paragraphs of `text` with more `claim`s than `marker`s, so each claim carries its re-check
 * marker in the same paragraph however the hard-wrapped Markdown breaks its lines.
 */
function claimsWithoutMarker(text: string, claim: RegExp, marker: string): string[] {
  const normalisedMarker = normalise(marker);
  return paragraphs(text).filter((p) => count(p, claim) > count(p, normalisedMarker));
}

/** Lines of `text` holding `word` as a whole word, case-insensitive, with their line numbers. */
function linesWithWord(text: string, word: string): string[] {
  const pattern = new RegExp(`\\b${word}\\b`, 'i');
  return text
    .split('\n')
    .map((line, i) => `${i + 1}: ${line}`)
    .filter((line) => pattern.test(line.slice(line.indexOf(':') + 2)));
}

describe.each(COPY)('%s claims only what the build does', (path) => {
  const text = read(path);

  test.each(BANNED_PHRASES)('has no "%s", however its lines wrap', (phrase) => {
    expect(normalise(text)).not.toContain(phrase);
  });

  test.each(BANNED_WORDS)('has no whole word "%s"', (word) => {
    expect(linesWithWord(text, word)).toEqual([]);
  });
});

describe('the melody claim carries its re-check marker (ticket 10, week 9 copy pass)', () => {
  const CLAIM = /every solution (is|plays( back)? as) a (melody|song)/g;
  const MARKER = '<!-- true once week 8 ticket 10 lands; re-check in week 9\'s final copy pass -->';

  test.each(COPY)('%s marks every melody claim in its paragraph', (path) => {
    expect(claimsWithoutMarker(read(path), CLAIM, MARKER)).toEqual([]);
  });
});

describe('the accepted-table claim carries its re-check marker (ticket 07)', () => {
  const CLAIM = /any table it accepts/g;
  const MARKER = "every accepted table: true once week 8 ticket 07's ACCEPT_REACH lands";

  test.each(COPY)('%s marks every accepted-table claim in its paragraph', (path) => {
    expect(claimsWithoutMarker(read(path), CLAIM, MARKER)).toEqual([]);
  });
});

/** The text under `## heading` in a Markdown file, up to the next `## ` heading. */
function section(markdown: string, heading: string): string {
  const start = markdown.indexOf(`\n## ${heading}\n`);
  if (start < 0) return '';
  const body = markdown.slice(start + heading.length + 5);
  const end = body.indexOf('\n## ');
  return (end < 0 ? body : body.slice(0, end)).trim();
}

describe('docs/submission.md has every form answer', () => {
  const submission = read('docs/submission.md');

  test('the tagline is 120-140 characters', () => {
    const tagline = section(submission, 'Tagline');
    expect(tagline).not.toContain('\n');
    expect(tagline.length).toBeGreaterThanOrEqual(120);
    expect(tagline.length).toBeLessThanOrEqual(140);
  });

  test('Hand Interactions names the gestures and where they were tested', () => {
    const hands = section(submission, 'Hand Interactions');
    for (const phrase of ['pinch', 'press', 'gaze', 'ghost hand', 'no controller', 'IWER']) {
      expect(hands.toLowerCase()).toContain(phrase.toLowerCase());
    }
  });

  test('the future-of-VR answer is left for the author', () => {
    expect(section(submission, 'What excites you about the future of VR')).toContain('**[author writes]**');
  });

  test('Team is the exact solo line', () => {
    expect(section(submission, 'Team')).toBe('Sebastien Henry, solo developer (design, code, audio)');
  });

  test('the launch line names Q1 2027, the Meta Horizon Store and the trademark check', () => {
    const launch = submission.split('\n').find((line) => line.includes('Target launch date')) ?? '';
    for (const phrase of ['Q1 2027', 'Meta Horizon Store', 'trademark']) expect(launch).toContain(phrase);
  });

  test('Content and privacy states the age tier and the one outside host', () => {
    const privacy = section(submission, 'Content and privacy');
    expect(privacy).toContain('10+');
    expect(privacy).toContain('jsDelivr');
  });
});

describe('license and third-party notices', () => {
  const META_HEADER = [
    '/**',
    ' * Copyright (c) Meta Platforms, Inc. and affiliates.',
    ' *',
    ' * This source code is licensed under the MIT license found in the',
    ' * LICENSE file in the root directory of this source tree.',
    ' */',
  ].join('\n');
  const SCAFFOLD = ['src/index.ts', 'src/panel.ts', 'src/components.ts', 'src/assets.ts', 'vite.config.ts'];

  test('LICENSE is MIT and names 2026 Sebastien Henry', () => {
    const license = read('LICENSE');
    expect(license.startsWith('MIT License')).toBe(true);
    expect(license).toContain('2026 Sebastien Henry');
  });

  test('THIRD_PARTY_NOTICES.md names every dependency, Havok, the input profiles and Inter', () => {
    const notices = read('THIRD_PARTY_NOTICES.md');
    const deps = Object.keys(JSON.parse(read('package.json')).dependencies as Record<string, string>);
    for (const name of [...deps, '@babylonjs/havok', '@webxr-input-profiles/assets']) {
      expect(notices, name).toContain(`\`${name}\``);
    }
    expect(notices).toMatch(/\bInter\b/);
  });

  /** One phrase from each license text the notices reproduce in full. */
  const LICENSE_TEXTS = {
    MIT: 'Permission is hereby granted, free of charge, to any person obtaining a copy',
    ISC: 'Permission to use, copy, modify, and/or distribute this software for any',
    'BSD-3-Clause': 'Neither the name of the copyright holder nor the names of its',
    'OFL-1.1': 'SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007',
  };

  test.each(Object.entries(LICENSE_TEXTS))('THIRD_PARTY_NOTICES.md reproduces the %s text', (_, phrase) => {
    expect(read('THIRD_PARTY_NOTICES.md')).toContain(phrase);
  });

  // public/ is Vite's publicDir: these copies are emitted into dist/, so the deployed page carries them.
  test.each([
    ['public/LICENSE.txt', 'LICENSE'],
    ['public/THIRD_PARTY_NOTICES.txt', 'THIRD_PARTY_NOTICES.md'],
  ])('%s ships with the page and matches %s', (copy, root) => {
    expect(existsSync(new URL(`../../${copy}`, import.meta.url)), copy).toBe(true);
    expect(read(copy)).toBe(read(root));
  });

  test.each(SCAFFOLD)('%s still opens with Meta\'s header', (path) => {
    expect(read(path).startsWith(META_HEADER)).toBe(true);
  });
});
