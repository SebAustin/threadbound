# 03: Mirrored daily variants (P2)

**What to build:** week 9 spec item 2, deferred from week 8 (spec :33). A daily may be its campaign level mirrored left to right, so a returning player meets a familiar diorama in a new shape. Any player-facing name for a mirrored daily respects the _Avoid_ lists for **Diorama** and **Daily** in CONTEXT.md.
- **Pure:** `src/lib/dailyVariant.ts` gains a mirror: every x becomes `width - x` (pegs, rails and their limits, chutes, cups and their glyphs, the stored solution's pegs unchanged by id). A level with something that isn't symmetric under a mirror (a preset that relies on release order, a rail whose `to` would leave its limits) is excluded by a predicate, not patched.
- **Pool:** `src/lib/dailyPool.ts` alternates plain and mirrored days for the eligible levels, deterministically by date, so `dailyIndex` stays stable for a given day (tests/unit/daily.test.ts). The id becomes `daily-<base>-m` for a mirrored day, so saves and streaks keep working, and the name stays the daily's own (CONTEXT.md **Daily**).
- **Proof:** a mirrored level is not solvable by construction. Every mirrored variant must solve its stored solution in `tests/e2e/dailies.sh` and in `test:e2e:levels:robust` (`daily:<index>`), at 3/3 in all six conditions.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] Unit: `dailyVariant.test.ts` written first: mirroring twice gives the original; a mirrored level passes the level schema; glyphs and colors stay paired; ineligible levels are excluded; ids and names follow the rules above.
- [ ] Unit: `dailyPool.test.ts`: the pool is deterministic by date, alternates as described, and only uses mechanics the player has reached (week 8 ticket 14's rule still holds).
- [ ] E2E: `npm run test:e2e:dailies` passes every daily, plain and mirrored; `RUNS=3 zsh tests/e2e/levels-robust.sh daily:<i> ...` solves every daily 3/3 in all six conditions.
- [ ] E2E: `daily.e2e.mjs` and `daily-signs.e2e.mjs` pass unchanged, so the sun, the streak and the return-visit line still work.

**Effort:** S-M (~0.5 day)

**Gaps closed:** #27 (the variants half; week 8 ticket 14 closed the names)

**Risks:**
- Havok contact outcomes aren't exactly mirror-symmetric (release order, solver iteration order). Expect some levels to fail their mirror; exclude them rather than retune them.

## Comments
