import { describe, expect, test } from 'vitest';
import { campaignComplete, resumeIndex, resumeTarget } from '../../src/lib/resume';

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

const allSolved = (stars = 3) => Object.fromEntries(campaign.map((l) => [l.id, stars]));

describe('campaignComplete: every campaign level has a real solve', () => {
  test('an empty save has not finished the campaign', () => {
    expect(campaignComplete(campaign, {})).toBe(false);
  });

  test('a save missing one level has not finished it', () => {
    const { 'w2-02': _missing, ...rest } = allSolved();
    expect(campaignComplete(campaign, rest)).toBe(false);
  });

  test('stars for removed levels or dailies never finish it', () => {
    expect(campaignComplete(campaign, { 'w9-99': 3, 'daily-w1-02': 3, 'daily-w3-01': 2 })).toBe(false);
  });

  test('an empty campaign is never finished', () => {
    expect(campaignComplete([], { 'w1-01': 3 })).toBe(false);
  });

  test('every level solved, with one star or more, finishes it', () => {
    expect(campaignComplete(campaign, allSolved(1))).toBe(true);
    expect(campaignComplete(campaign, { ...allSolved(3), 'w9-99': 3 })).toBe(true);
  });
});

describe('resumeTarget: where the game opens on a reload', () => {
  test('an unfinished campaign opens on its first unsolved level', () => {
    expect(resumeTarget(campaign, {})).toEqual({ daily: false, index: 0 });
    expect(resumeTarget(campaign, { 'w1-01': 3, 'w1-02': 2 })).toEqual({ daily: false, index: 2 });
  });

  test("a finished campaign opens on today's daily, returning to the last level", () => {
    expect(resumeTarget(campaign, allSolved())).toEqual({ daily: true, returnTo: campaign.length - 1 });
  });
});
