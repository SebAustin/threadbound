# 01: Fixes from real-Quest tester reports (P0, slot)

**What to build:** the defects real Quest owners report on the live build, fixed test-first, before any other week 9 ticket (.scratch/week9/spec.md:5). The forum request went up on Oct 23 (week 8 ticket 04, Comments: the post URL and the deployed commit). On Oct 28, when this ticket was written, no tester report had arrived: the only real-world finding so far is the user's own (level 3's wrong-first-thread trap, fixed by week 8 tickets 13 and 14). This ticket is the slot that keeps a day for them.
- **Each report becomes a Comments entry first:** the tester's date of play, matched to the deployed commit (`gh run list --workflow deploy.yml -L 1`, read-only), what they did, what they saw, and whether the emulator reproduces it. Never name or credit a tester (docs/forum-post.md author notes).
- **A defect that reproduces in IWER** gets a failing test first (unit, E2E or an XR script, whichever owns the behaviour), then the fix.
- **A defect that only a device shows** (comfort, legibility, hand-tracking jitter, frame rate) gets the smallest change that addresses it, a note in Comments saying it is unproven in the emulator, and a follow-up ask to the same tester if they offered one.
- **A report big enough to need its own ticket** (more than about half a day) becomes `NN-tester-<slug>.md`, numbered after 07, and the spec's effort line is redone: the lowest-priority ticket above the line moves below it.
- **Copy:** anything a report proves or disproves (frame rate, legibility, table placement on a real desk) goes to ticket 07's copy list with its evidence.
- **No tester by Nov 7 (Q44):** nothing extra is built. Close this ticket with a Comments line saying so; ticket 07's copy keeps "built and verified in the emulator", and the fps line describes the draw-call budget.

**Blocked by:** none (reports arrive when they arrive; check ticket 04's post daily until Nov 7)

**Status:** ready-for-agent

- [ ] Every tester report received by Nov 7 has a Comments entry with its date, deployed commit and verdict (reproduced, device-only, or not a defect).
- [ ] Every reproduced defect has a test that failed first, and the fix makes it pass.
- [ ] Every device-only finding has its change and an "unproven in the emulator" note.
- [ ] typecheck, unit tests, and the suites the fix touches are green (the full list is in week 8 ticket 17's Definition of done); the full regression runs once in ticket 07.
- [ ] Human: the user forwards any report that arrives by DM, and asks a tester for a follow-up check where one is offered.

**Effort:** M (~1 day, timeboxed; Nov 5-7 as reports arrive)

**Gaps closed:** #2 (the evidence half: week 8 ticket 04 sent the request)

**Risks:**
- Reports may come in after Nov 7, or never (Q44). The slot then goes unused, and the spare day stays spare.
- A device-only report can't be verified here. Don't change physics or level data for one without a reproduction: the levels are proven (`test:e2e:levels:robust`), and a blind change costs a full re-proof.

## Comments
