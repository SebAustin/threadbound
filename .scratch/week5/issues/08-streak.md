# 08: Daily streak

**What to build:** solving the daily on consecutive days grows a streak shown on the plaque; a missed day restarts it; old saves migrate.

**Blocked by:** 07

**Status:** done

- [x] Streak rollover unit-tested (same day, next day, gap, month and year boundaries)
- [x] Progress v1 to v2 migration unit-tested
- [x] E2E: daily solve increments the streak and survives a reload

## Comments
- Streak is part of progress (zod default, so older saves load with none; same storage key). Rollover unit-tested across month and year boundaries, missed days and a clock set backwards.
- The plaque shows the *current* streak: alive only if the last daily solve was today or yesterday.
