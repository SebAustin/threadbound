# 20: Levels that solve reliably, not just once (P1)

**Why:** ticket 18 made every stored solution pass a single drop, straight and turned. Straight afterwards, w4-03 Budget began failing most slow-motion runs: about 1 in 6 passed, with one marble resting at x 0.285-0.288, short of the cup (tickets 19 and 13's Comments, logs `.scratch/week8/logs/ticket19-flake-check-head.log` and `ticket13-*.log`). w1-04 Relay at the turned pose also failed once in a full run. IWSDK's physics already steps on a fixed clock (`stepAccumulator`, node_modules/@iwsdk/core/dist/physics/physics-system.js:241-245). But game events fire at frame boundaries: marble releases, nudges and rest timers. Those boundaries fall at different simulation times in slow motion, and at a Quest's 72 or 90 Hz against the emulator's 60. A level without enough clearance can then go either way on a judge's headset. The user decided on Oct 25 (Q49) that every board must solve reliably, proven by repetition.

**What to build:**
- **The sweep tool:** `tests/e2e/levels-robust.sh` as `npm run test:e2e:levels:robust`. It drops every stored solution (the 24 campaign levels and the 7 dailies) `RUNS` times in each condition: normal and slow speed, at the study pose and on the table at 0 and 1.5705 rad (ticket 18's poses). It reuses `tests/e2e/lib.mjs`'s proof helpers, not a copy, and keeps one level per browser lease (memory gotcha: 110 s lease cap). It prints a pass rate per board per condition, and exits non-zero when any board is below `RUNS`/`RUNS`. `RUNS` defaults to 3; the sweep below uses `RUNS=5`.
- **Sweep first:** run `RUNS=5` on main before changing anything. Record every board below 5/5, and in which condition, in Comments.
- **Fix each one:** make the smallest clearance change that makes the stored solution solve 5/5 in every condition: a peg, chute or wall moved a few millimetres. Keep the level's par, thread limit, stored solution and idea, and keep its spool as tight as before (as ticket 18 did). Budget comes first. Record before and after rates in Comments.
- **Look at event timing, but don't build it unless it's small:** find out whether marble releases and stall nudges could be scheduled on the physics step clock, not on frames. Change it only if the change is small and measurably raises the pass rates. Otherwise write the finding up as a week 9 candidate in `.scratch/week9/spec.md`.
- **Make it part of deploys:** add `test:e2e:levels:robust` (at `RUNS=3`) to README "Develop"'s pre-deploy regression list.

**Blocked by:** none (lands before tickets 19 and 13, whose work waits on local branches)

**Status:** ready-for-agent

- [ ] E2E (write first): `test:e2e:levels:robust` exists and is red on main today (w4-03 slow is below 3/3).
- [ ] The `RUNS=5` sweep before the fixes is in Comments, as a table of every board below 5/5.
- [ ] After the fixes: `RUNS=5` passes 5/5 on all 31 boards, in both speeds and all three poses.
- [ ] `test:e2e:levels`, `:levels:slow` and `:dailies` stay green. At the study pose every level still solves with 3 stars, the same threads and no self-solve.
- [ ] Every changed level keeps its par, thread limit, stored solution and spool tightness. The diffs are listed in Comments.
- [ ] README "Develop" lists the robust run in the pre-deploy regression.

**Effort:** M (1-2 days): the sweep takes hours of machine time; the fixes are small edits to level files.

**Gaps closed:** #22 (rail solutions proven only at one exact value; no jitter run); ticket 18's follow-up (Budget in slow motion)

## Comments
