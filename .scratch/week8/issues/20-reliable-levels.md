# 20: Levels that solve reliably, not just once (P1)

**Why:** ticket 18 made every stored solution pass a single drop, straight and turned. Straight afterwards, w4-03 Budget began failing most slow-motion runs: about 1 in 6 passed, with one marble resting at x 0.285-0.288, short of the cup (tickets 19 and 13's Comments, logs `.scratch/week8/logs/ticket19-flake-check-head.log` and `ticket13-*.log`). w1-04 Relay at the turned pose also failed once in a full run. IWSDK's physics already steps on a fixed clock (`stepAccumulator`, node_modules/@iwsdk/core/dist/physics/physics-system.js:241-245). But game events fire at frame boundaries: marble releases, nudges and rest timers. Those boundaries fall at different simulation times in slow motion, and at a Quest's 72 or 90 Hz against the emulator's 60. A level without enough clearance can then go either way on a judge's headset. The user decided on Oct 25 (Q49) that every board must solve reliably, proven by repetition.

**What to build:**
- **The sweep tool:** `tests/e2e/levels-robust.sh` as `npm run test:e2e:levels:robust`. It drops every stored solution (the 24 campaign levels and the 7 dailies) `RUNS` times in each condition: normal and slow speed, at the study pose and on the table at 0 and 1.5705 rad (ticket 18's poses). It reuses `tests/e2e/lib.mjs`'s proof helpers, not a copy, and keeps one level per browser lease (memory gotcha: 110 s lease cap). It prints a pass rate per board per condition, and exits non-zero when any board is below `RUNS`/`RUNS`. `RUNS` defaults to 3; the sweep below uses `RUNS=5`.
- **Sweep first:** run `RUNS=5` on main before changing anything. Record every board below 5/5, and in which condition, in Comments.
- **Fix each one:** make the smallest clearance change that makes the stored solution solve 5/5 in every condition: a peg, chute or wall moved a few millimetres. Keep the level's par, thread limit, stored solution and idea, and keep its spool as tight as before (as ticket 18 did). Budget comes first. Record before and after rates in Comments.
- **Look at event timing, but don't build it unless it's small:** find out whether marble releases and stall nudges could be scheduled on the physics step clock, not on frames. Change it only if the change is small and measurably raises the pass rates. Otherwise write the finding up as a week 9 candidate in `.scratch/week9/spec.md`.
- **Make it part of deploys:** add `test:e2e:levels:robust` (at `RUNS=3`) to README "Develop"'s pre-deploy regression list.

**Blocked by:** none (lands before tickets 19 and 13, whose work waits on local branches)

**Status:** done

- [x] E2E (write first): `test:e2e:levels:robust` exists and is red on main today (w4-03 slow is below 3/3).
- [x] The `RUNS=5` sweep before the fixes is in Comments, as a table of every board below 5/5.
- [x] After the fixes: `RUNS=5` passes 5/5 on all 31 boards, in both speeds and all three poses.
- [x] `test:e2e:levels`, `:levels:slow` and `:dailies` stay green. At the study pose every level still solves with 3 stars, the same threads and no self-solve.
- [x] Every changed level keeps its par, thread limit, stored solution and spool tightness. The diffs are listed in Comments.
- [x] README "Develop" lists the robust run in the pre-deploy regression.

**Effort:** M (1-2 days): the sweep takes hours of machine time; the fixes are small edits to level files.

**Gaps closed:** #22 (rail solutions proven only at one exact value; no jitter run); ticket 18's follow-up (Budget in slow motion)

## Comments

- **Oct 26, agent: done, landed locally on main (not pushed).** One commit, `fix: levels solve reliably, proven by a repeated sweep (ticket 20)`. Logs are `.scratch/week8/logs/ticket20-*.log` (gitignored).
  - **The sweep tool, written first:** `npm run test:e2e:levels:robust` runs tests/e2e/levels-robust.sh. Each run of each level is one fresh page and one browser lease (tests/e2e/levels-robust.e2e.mjs): it drops the stored solution at the study pose, then on the table at 0 and 1.5705 rad, using lib.mjs's `loadIndex`, `placeOnTable`, `solveAndDrop`, `leaveTable` and `TABLE_YAWS`, plus a new `loadDaily` (tests/e2e/lib.mjs:68-81). tests/e2e/levels-robust.py prints the pass rate per level and condition, lists where each failed drop's marbles came to rest, and exits 1 unless every level solved `RUNS`/`RUNS` everywhere. `RUNS` defaults to 3; `SPEEDS=1` runs slow motion only; arguments pick levels (`campaign:20`, `daily:3`). A lease takes about 14 s, so `RUNS=5` over all 31 levels took about 72 minutes and `RUNS=3` takes about 45.
  - **RED on main:** the first draft gave w4-03 Budget 1/3 in slow motion at the study pose (`ticket20-red-budget.log`). The final script on main's Budget: try 1 was 3/3 everywhere, try 2 was 2/3 in slow motion on the table at 90 degrees, exit 1 (`ticket20-red.log`). `RUNS=10 SPEEDS=1` on main's Budget: 8/10 at the study pose (`ticket20-budget-slow10.log`).
  - **The `RUNS=5` sweep before any fix** (`ticket20-sweep-before.log`): 930 of 930 drops solved, exit 0, so no level is below 5/5 in that sweep, Budget included. Budget's flake is real but intermittent (at most about 1 drop in 5 in a condition), and that sweep caught none, so the table of levels below 5/5 comes from the Budget runs above:

    | Level | Condition | Rate on main | Run |
    |---|---|---|---|
    | w4-03 Budget | slow, study pose | 1/3 | first draft, `RUNS=3` |
    | w4-03 Budget | slow, study pose | 8/10 | `RUNS=10 SPEEDS=1` |
    | w4-03 Budget | slow, table at 90 degrees | 2/3 | final script, `RUNS=3`, second try |
    | every other level and daily | all six conditions | 5/5 | the `RUNS=5` sweep |

  - **Why Budget fails:** four marbles share one 9 cm cup, and each chute's marbles reach it within about 0.1 s of each other (traces in `.tmp/t20/`). Chute 1's marbles bounce off e-f to the right wall and fall back into the cup moving left. When the cup's left slot is already taken, the fourth marble hops off the pile and over the left rim, and comes to rest on the floor at x 0.288. Every failure ended in exactly the same positions.
  - **The fix: w4-03 Budget, chute 1 moves from x 0.33 to 0.30** (src/levels/world4/03-budget.json). Its marbles now land on e-f 2.3 cm from peg e (6 mm clear of the peg). Why that holds is empirical: they still reach the cup close together, but none hopped out in the 194 drops at 0.30 below. Par 2, thread limit 2, the solution (a-b, e-f) and the spool (0.22: the solution needs 0.2129, 0.71 cm spare, as before) are unchanged; a chute's position doesn't enter the spool. Budget isn't a daily base, so no daily changes. It's the only level changed.
    - Also tried (`ticket20-budget-exploration.log`): a wider cup (0.10, 0.11 and 0.12 wide) still lost a marble 1-3 times in 10, because the pile just forms at the new left wall. Chute 1 at 0.31, 0.32 and 0.34 did worse than main, at normal speed too: up to 3 of 5 or 5 of 8 drops failed in a condition. At 0.29 3 in 60 failed; 0.28 passed 30/30, but its marbles hit peg e. At 0.36 it passed 104/104, but its marbles touch peg f, the kind of crest contact ticket 18 found fragile, for the same 3 cm move.
    - 0.30 before the final sweep: `RUNS=10` 60/60 (`ticket20-budget-window.log`), `RUNS=8` 48/48, `RUNS=8 SPEEDS=1` 24/24, and 32/32 over the study pose and 8 table turns (0.001, 0.785, pi, -pi/2, 1.2, 2.5, -0.5 rad) at both speeds, twice. Main's Budget scored 31/32 on that turn probe.
  - **The `RUNS=5` sweep after the fix** (`ticket20-sweep-after.log`): 930 of 930 drops solved; every level and daily 5/5 in all six conditions, exit 0.
  - **Event timing: a week 9 candidate, not built** (`.scratch/week9/spec.md` item 12). Releases (src/features/marbles/MarbleSystem.ts:205-212) count down whole frames and drop the overshoot: 27 or 28 frames apart at 60 Hz and 40 or 41 in slow motion in the traces. Physics runs in a worker with 2 exchange buffers, and rest timers and nudges read results a frame or more late. Releases alone don't explain the flake: passing and failing slow Budget drops had the same release frames (41, 41, 41). A step-clock fix means a fixed-step clock in SimulationClockSystem that stops at scheduled events, and for nudges main-thread or lockstep physics. It shifts every level's timing and needs a full re-proof, so it isn't small.
  - **Evidence on the final tree.** No Vite overlay (`no-overlay.e2e.mjs` true); the dev server stayed headless with browser automation (`browserCommandReady: true`).
    - `npm run typecheck` exit 0. `npm test`: 46 files, 611 tests passed.
    - `npm run test:e2e:levels` 24/24 and `test:e2e:levels:slow` 24/24, exit 0, every level `turned` true at 0 and 90 degrees. `test:e2e:dailies` 21/21, exit 0. Box 4: compared with `ticket18-levels.log`, every level has the same pass, stars (3), threads, marbles scored and no self-solve. Distinct-note counts differ by one on six levels (w1-03, w1-04, w2-01, w2-02, w3-05, w4-03), as between earlier runs.
    - `npm run test:e2e`: all 31 scripts, 236 PASS, 0 FAIL, exit 0 (`ticket20-e2e.log`). Two earlier runs stopped on an ERROR, not a FAIL: `frame.evaluate: Execution context was destroyed` inside lib.mjs's `navigateApp`, which polls the page while it navigates. The first (`ticket20-e2e-before-restart.log`, at guest-play) also happened on main with this ticket's changes stashed. It cleared after `dev restart --headless --allow-browser-automation` (the server had been up 7 hours). The second (`ticket20-e2e-under-load.log`, at melody-book) ran while another project's jobs held the machine's load average above 20. The third run was green. Follow-up for the main session: `waitFor` could treat a destroyed execution context as "not yet", so a slow navigation can't stop a script.
    - `NODE_ENV=production npm run build` exit 0. `npm run test:smoke`: 19 PASS, 0 FAIL, 5 NOTE.
    - No XR script, hand input, xr-lib or xr-probe changed, so no XR suite was needed.
  - **For the main session:** deploy with the next push. Tickets 19 and 13 can now rebase onto main (their Comments say how); 13's re-proof includes `test:e2e:levels:robust`.
