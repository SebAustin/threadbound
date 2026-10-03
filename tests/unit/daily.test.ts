import { describe, expect, test } from 'vitest';
import { currentStreak, dailyIndex, localDayKey, nextStreak } from '../../src/lib/daily';

describe('localDayKey: the calendar day where the player is', () => {
  test('uses local date parts, zero-padded', () => {
    expect(localDayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('dailyIndex: one challenge per day from the pool', () => {
  test('is deterministic and in range', () => {
    const i = dailyIndex('2026-11-01', 7);
    expect(i).toBe(dailyIndex('2026-11-01', 7));
    expect(i).toBeGreaterThanOrEqual(0);
    expect(i).toBeLessThan(7);
  });

  test('a week of days visits every puzzle of a seven-puzzle pool once', () => {
    const week = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07'];
    expect(new Set(week.map((d) => dailyIndex(d, 7))).size).toBe(7);
  });

  test('consecutive days never repeat, even across a month or year boundary', () => {
    expect(dailyIndex('2026-10-31', 7)).not.toBe(dailyIndex('2026-11-01', 7));
    expect(dailyIndex('2026-12-31', 7)).not.toBe(dailyIndex('2027-01-01', 7));
  });
});

describe('nextStreak: solving the daily on consecutive days', () => {
  const fresh = { lastDay: null, count: 0 };

  test('a first solve starts a streak of one', () => {
    expect(nextStreak(fresh, '2026-11-01')).toEqual({ lastDay: '2026-11-01', count: 1 });
  });

  test('solving again the same day changes nothing', () => {
    const s = { lastDay: '2026-11-01', count: 4 };
    expect(nextStreak(s, '2026-11-01')).toBe(s);
  });

  test('the next day grows it, across month and year boundaries', () => {
    expect(nextStreak({ lastDay: '2026-10-31', count: 4 }, '2026-11-01').count).toBe(5);
    expect(nextStreak({ lastDay: '2026-12-31', count: 9 }, '2027-01-01').count).toBe(10);
  });

  test('a missed day restarts it at one', () => {
    expect(nextStreak({ lastDay: '2026-11-01', count: 6 }, '2026-11-03')).toEqual({ lastDay: '2026-11-03', count: 1 });
  });

  test('a clock set backwards never grows it', () => {
    expect(nextStreak({ lastDay: '2026-11-05', count: 3 }, '2026-11-04').count).toBe(1);
  });
});

describe('currentStreak: what the plaque shows today', () => {
  test('still alive if the last daily solve was today or yesterday', () => {
    expect(currentStreak({ lastDay: '2026-11-03', count: 5 }, '2026-11-03')).toBe(5);
    expect(currentStreak({ lastDay: '2026-11-02', count: 5 }, '2026-11-03')).toBe(5);
  });

  test('a missed day shows no streak (the next solve starts again at one)', () => {
    expect(currentStreak({ lastDay: '2026-11-01', count: 5 }, '2026-11-03')).toBe(0);
    expect(currentStreak({ lastDay: null, count: 0 }, '2026-11-03')).toBe(0);
  });
});
