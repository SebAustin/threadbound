# 19: Accept ordinary desks: a reach limit of about 0.68 m, and honest seated copy (P1)

**What to build:** the user's Q47 decision (Oct 25), which revises Q41. Ticket 07 measured that `ACCEPT_REACH` 0.61 m accepts a desk only when its near edge is within about 0.41 m of a seated head, because the farthest control is a ledge button: low, to the side, and 2.5 cm behind the near edge (07's Comments, "Decision for the user"). Many real desks sit farther than that, so the board floated instead of landing.
- **The limit:** in `src/lib/placement.ts` (`ACCEPT_REACH`, about :58), go from 0.61 m to 0.68 m. At 0.68 m, the 0.74 m desk with its near edge 0.50 m from a seated 1.15 m head is accepted: level 1's ledge buttons are then 0.679 m away. Keep the constant named and documented. Its comment says the limit is set by ray-pinch reach from a chair, not by literal arm's reach.
- **Desk tests:** in `tests/unit/placement.test.ts`, put back ticket 07's original cases: the 0.50 m desk is accepted, and a desk just past the new limit floats. Derive that threshold in the test from `reachAt`, not as a magic number. Restore the fixtures 07 had to move closer (the turned table's origin at z -0.7, the 30-degree table, and the "ahead" table at 0.40 m). Any that are still refused get a computed position and a line in Comments.
- **Copy:** README.md:41 and docs/submission.md:110 currently say "everything you touch is within a seated 2 ft in the study pose and on any table it accepts". Change them to say: "Seated, no standing or leaning: every control works from your chair by pinch or touch. In the default spot, everything sits within 2 ft." README.md:61 and :68 stay, because they are about the study pose and a measured emulator table. Grep README.md, docs/submission.md and docs/video/ for any other "2 ft" claim about tables, and fix it.
- **Ticket 07:** tick its open placement.test.ts box with a pointer to this ticket. 07's XR box that says "the reach on the table is at most 0.61 m" changes to the new limit.
- **Ticket 17's copy list:** replace the "limit of about 0.41 m" item with this ticket's wording.

**Blocked by:** none

**Status:** done

- [x] Unit: placement.test.ts: the 0.50 m desk is accepted; a desk just past the derived limit floats; the restored fixtures pass, or the ones moved are listed in Comments with the reason.
- [x] Unit: the whole suite stays green, including ticket 12's field-of-view test.
- [x] XR: xr-placement.sh and xr-full-level.sh pass, and xr-full-level's table reach assertion uses the new limit.
- [x] E2E: reach.e2e.mjs still passes: the study pose stays within 0.61 m (2 ft).
- [x] Copy: no README, submission or video line says everything is within 2 ft on any accepted table. The new sentence appears in both README.md and docs/submission.md.

**Effort:** S (~0.5 day)

**Gaps closed:** #21 (desks at ordinary distances); revises ticket 07's 0.61 m limit (Q41, then Q47 and Q50: 0.69 m)

## Comments
- **Oct 25, batch 2:** stopped unlanded because `test:e2e:levels:slow` was red on main (w4-03 Budget), which isn't this ticket's defect. The finished work is committed on local branch `wip/ticket-19` (b117821).
- **Q50 (user, Oct 25):** the limit is **0.69 m**, not 0.68 m. At 0.68 m, a desk 0.50 m away is refused only on w4-06 (peg v is 0.685 m away), so the board would float on that one level. At 0.69 m every level accepts it. When landing: rebase `wip/ticket-19` onto main after ticket 20, set `ACCEPT_REACH` to 0.69, drop the w4-06 exception from placement.test.ts, re-prove, and delete the branch.
- **Oct 26, agent: done, landed locally on main (not pushed).** One commit, `feat: accept ordinary desks within 0.69 m, and honest seated copy (ticket 19)`. `wip/ticket-19` (b117821) was cherry-picked onto main after ticket 20 (no conflicts), Q50 applied on top, and the branch deleted. Logs are `.scratch/week8/logs/ticket19-*.log` (gitignored).
  - **Q50, test-first.** placement.test.ts first expected `ACCEPT_REACH` 0.69 and a 0.50 m desk accepted on every level, w4-06 included (:271, :282): 2 failed, 71 passed (`ticket19-q50-unit-red.log`). Then src/lib/placement.ts:61 went to 0.69, with its comment saying why (ray-pinch reach from a chair, Q47 then Q50, w4-06's peg v). The w4-06 exception is gone.
  - **Derived limits at 0.69 m** (tests/unit/placement.test.ts:255, bisection on `reachAt`, :289 checks a desk 1 mm inside and 1 mm past on every level). Every level accepts a 0.74 m desk up to a near edge of 0.506 m (w4-06, the tightest), 0.513 m (w2-05) or 0.514 m (the other 22). On a 0.50 m desk the farthest control is 0.679 m on level 1 (its ledge buttons) and 0.685 m on w4-06. 0.70 m floats (:301).
  - **Restored fixtures** (ticket 07's originals):
    - the turned table's origin at z -0.7 (:328): turned 0, 25 and 40 degrees, each is taken where it stands, the whole base on the table and every control within `ACCEPT_REACH` (:366). (At 0.68 m the 40-degree turn was refused; at 0.69 m it isn't.)
    - the "ahead" table at 0.40 m (:116): accepted where it stands, its farthest control 0.624 m away, and still preferred over the side table.
    - the 30-degree table `{min [0.1, 0.74, -0.8], max [0.7, 0.76, -0.4]}` (:211) is **still refused** where it stands: its farthest control would be 0.814 m from the head (1.2 m), past 0.69 m. The test checks that refusal, then slides it toward the head along the bearing of its middle by the computed distance (`slideToAccept`, :193): 0.1575 m. There it is accepted at a 37.4-degree bearing, reach 0.690 m. Kept, because the case is about the facing gate, not the reach.
  - **Copy.** README.md:41 and docs/submission.md:110 carry the sentence word for word, and their accepted-table markers are gone. tests/unit/copyHonesty.test.ts:75-90 checks that README, submission, docs/video/script.md and shot-list.md contain no "any table it accepts", "every accepted table" or "on any table", and that both files carry the sentence. On main's copy it fails 4 of 79 (`ticket19-copy-red.log`); it passes now. A grep of README.md, docs/submission.md and docs/video/ for "2 ft" finds only README.md:41 (the new sentence), :61 (the study pose) and :68 (the measured emulator table, 0.513 m), which stay.
  - **Tickets.** 07: the placement.test.ts box is ticked with a pointer here, its XR box and Notes say 0.69 m, and its Status reads done. 17: the copy list's "about 0.41 m" item is this ticket's wording, at 0.69 m. tests/e2e/xr-full-level.sh:28-39 reads `ACCEPT_REACH` from placement.ts and fails if it can't.
  - **Evidence on the final tree.** No Vite overlay (`no-overlay.e2e.mjs` true, before and after the runs); the dev server stayed headless with browser automation (`browserCommandReady: true`).
    - `npm run typecheck` exit 0. `npm test`: 47 files, 626 tests passed, ticket 12's viewExtent.test.ts included.
    - `zsh tests/e2e/xr-placement.sh` 7 PASS, 0 FAIL, exit 0. `zsh tests/e2e/xr-full-level.sh` 8 PASS, 0 FAIL, exit 0: on the table, everything touchable is within 0.513 m of the head (limit 0.69 m, read from placement.ts).
    - `reach.e2e.mjs` 2 PASS: the study pose stays within 2 ft (0.553 m at the default distance, 0.609 m at the farthest).
    - `npm run test:e2e`: all 31 scripts, 236 PASS, 0 FAIL, exit 0.
    - `test:e2e:levels` 24/24 and `:levels:slow` 24/24, exit 0, every level 3 stars, `turned` true at 0 and 90 degrees, no self-solve. Against `ticket20-review-levels.log`: the same pass, stars, threads and marbles scored on every level; distinct notes differ by one on nine levels, as between earlier runs. `test:e2e:dailies` 21/21, exit 0.
    - `npm run test:e2e:levels:robust` (`RUNS=3`): 558 of 558 drops solved, every level and daily 3/3 in all six conditions, none self-solved, exit 0.
    - `NODE_ENV=production npm run build` exit 0. `npm run test:smoke`: 19 PASS, 0 FAIL, 5 NOTE, exit 0.
    - No hand input, xr-lib or xr-probe changed, so `test:e2e:hands` wasn't run as a whole; its xr-full-level.sh ran on its own (above).
  - **For the main session:** deploy with the next push.
