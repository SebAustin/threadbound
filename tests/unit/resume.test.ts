import { describe, expect, test } from 'vitest';
import { resumeIndex } from '../../src/lib/resume';

const ids = (...list: string[]) => list.map((id) => ({ id }));
const campaign = ids('w1-01', 'w1-02', 'w2-01', 'w2-02', 'w2-03', 'w3-01');

describe('resumeIndex: where a returning player picks up', () => {
  test('a fresh save starts at the first level', () => {
    expect(resumeIndex(campaign, {})).toBe(0);
  });

  test('resumes at the first level not yet solved', () => {
    expect(resumeIndex(campaign, { 'w1-01': 3, 'w1-02': 2 })).toBe(2);
  });

  test('a level inserted before saved progress never misplaces the save', () => {
    // Saved before w2-02 and w2-03 existed: everything up to w2-01 solved, plus w3-01.
    expect(resumeIndex(campaign, { 'w1-01': 3, 'w1-02': 3, 'w2-01': 3, 'w3-01': 1 })).toBe(3);
  });

  test('a finished campaign resumes on the last level', () => {
    const all = Object.fromEntries(campaign.map((l) => [l.id, 3]));
    expect(resumeIndex(campaign, all)).toBe(campaign.length - 1);
  });

  test('stars for levels that no longer exist (or dailies) are ignored', () => {
    expect(resumeIndex(campaign, { 'w9-99': 3, 'daily-w1-02': 3 })).toBe(0);
  });
});
