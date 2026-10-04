/**
 * Daily puzzle: one challenge per local calendar day, and a streak for solving
 * it on consecutive days. Days are 'YYYY-MM-DD' keys in the player's time zone.
 */

const MS_PER_DAY = 86_400_000;
/** Step through the pool by a stride coprime with its size: a full cycle, no repeats on consecutive days. */
const STRIDE = 3;
const OFFSET = 5;

export function localDayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The player's local day right now. */
export const today = (): string => localDayKey(new Date());

/** Whole days since 1970-01-01 for a day key (calendar arithmetic, no time zone). */
function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

export function dailyIndex(dayKey: string, poolSize: number): number {
  const day = dayNumber(dayKey);
  return (((day * STRIDE + OFFSET) % poolSize) + poolSize) % poolSize;
}

export interface Streak {
  /** Day key of the last daily solve, null before the first. */
  readonly lastDay: string | null;
  readonly count: number;
}

export const NO_STREAK: Streak = Object.freeze({ lastDay: null, count: 0 });

/** Streak after solving the daily on `today`. */
export function nextStreak(streak: Streak, today: string): Streak {
  if (streak.lastDay === today) return streak;
  const consecutive = streak.lastDay !== null && dayNumber(today) - dayNumber(streak.lastDay) === 1;
  return { lastDay: today, count: consecutive ? streak.count + 1 : 1 };
}

/** The streak as it stands on `today`: alive only if the last solve was today or yesterday. */
export function currentStreak(streak: Streak, today: string): number {
  if (streak.lastDay === null) return 0;
  return dayNumber(today) - dayNumber(streak.lastDay) <= 1 ? streak.count : 0;
}
