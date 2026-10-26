# 19: Accept ordinary desks: a reach limit of about 0.68 m, and honest seated copy (P1)

**What to build:** the user's Q47 decision (Oct 25), which revises Q41. Ticket 07 measured that `ACCEPT_REACH` 0.61 m accepts a desk only when its near edge is within about 0.41 m of a seated head, because the farthest control is a ledge button: low, to the side, and 2.5 cm behind the near edge (07's Comments, "Decision for the user"). Many real desks sit farther than that, so the board floated instead of landing.
- **The limit:** in `src/lib/placement.ts` (`ACCEPT_REACH`, about :58), go from 0.61 m to 0.68 m. At 0.68 m, the 0.74 m desk with its near edge 0.50 m from a seated 1.15 m head is accepted: level 1's ledge buttons are then 0.679 m away. Keep the constant named and documented. Its comment says the limit is set by ray-pinch reach from a chair, not by literal arm's reach.
- **Desk tests:** in `tests/unit/placement.test.ts`, put back ticket 07's original cases: the 0.50 m desk is accepted, and a desk just past the new limit floats. Derive that threshold in the test from `reachAt`, not as a magic number. Restore the fixtures 07 had to move closer (the turned table's origin at z -0.7, the 30-degree table, and the "ahead" table at 0.40 m). Any that are still refused get a computed position and a line in Comments.
- **Copy:** README.md:41 and docs/submission.md:110 currently say "everything you touch is within a seated 2 ft in the study pose and on any table it accepts". Change them to say: "Seated, no standing or leaning: every control works from your chair by pinch or touch. In the default spot, everything sits within 2 ft." README.md:61 and :68 stay, because they are about the study pose and a measured emulator table. Grep README.md, docs/submission.md and docs/video/ for any other "2 ft" claim about tables, and fix it.
- **Ticket 07:** tick its open placement.test.ts box with a pointer to this ticket. 07's XR box that says "the reach on the table is at most 0.61 m" changes to the new limit.
- **Ticket 17's copy list:** replace the "limit of about 0.41 m" item with this ticket's wording.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] Unit: placement.test.ts: the 0.50 m desk is accepted; a desk just past the derived limit floats; the restored fixtures pass, or the ones moved are listed in Comments with the reason.
- [ ] Unit: the whole suite stays green, including ticket 12's field-of-view test.
- [ ] XR: xr-placement.sh and xr-full-level.sh pass, and xr-full-level's table reach assertion uses the new limit.
- [ ] E2E: reach.e2e.mjs still passes: the study pose stays within 0.61 m (2 ft).
- [ ] Copy: no README, submission or video line says everything is within 2 ft on any accepted table. The new sentence appears in both README.md and docs/submission.md.

**Effort:** S (~0.5 day)

**Gaps closed:** #21 (desks at ordinary distances); revises ticket 07's 0.61 m limit (Q41, then Q47)

## Comments
- **Oct 25, batch 2:** stopped unlanded because `test:e2e:levels:slow` was red on main (w4-03 Budget), which isn't this ticket's defect. The finished work is committed on local branch `wip/ticket-19` (b117821).
- **Q50 (user, Oct 25):** the limit is **0.69 m**, not 0.68 m. At 0.68 m, a desk 0.50 m away is refused only on w4-06 (peg v is 0.685 m away), so the board would float on that one level. At 0.69 m every level accepts it. When landing: rebase `wip/ticket-19` onto main after ticket 20, set `ACCEPT_REACH` to 0.69, drop the w4-06 exception from placement.test.ts, re-prove, and delete the branch.
