# Week 9: stretch and tester fixes (Nov 5-10)

Status: ready-for-agent

Tickets get written when week 8's ticket 17 closes, once real-Quest tester reports are in. Fixes from those reports come before any item below. Feature freeze is **Nov 10**.

Anything cut from week 8 at its Oct 30 checkpoint lands here first, in the cut order in `.scratch/week8/spec.md` (Schedule).

## Candidate items (from the Oct 22 grilling session, in priority order)

1. **Finger-strum.** Only if week 8's melody ticket landed by Nov 4; otherwise drop it. A fingertip crossing a thread inside the marble channel sounds the thread's root. It doesn't fire while pinching or dragging, and it isn't part of the melody. The copy calls it "touch a string and it sounds", not "the loop depends on hands".
2. **Mirrored daily variants,** proven with the dailies harness.
3. **XR tests:** a rail-tab drag by hand (vertical rails included), Next, controller mode, left-hand play, and switching input mid-drag.
4. **A soak test:** all 24 levels plus dailies in one page with no reloads, sampling memory and body counts.
5. **Rail and frame-rate evidence** (gap #22's open half; week 8 ticket 20 closed only its repeated-drop half, see that ticket's Comments): a throttled frame-time log; a rail-window condition in `test:e2e:levels:robust`, where each level with `slides` drops with every slide at its `to` ± 5 mm through the test hook's `slide` (the rails are continuous and SliderSystem doesn't snap, so no player lands on the exact stored value, and q = 0.20 drives w3-04, w3-06 and w4-06); a 72 Hz condition, through a test-only time scale of 60/72 so each 60 Hz emulator frame advances 1/72 s of simulation as a Quest frame at 72 Hz does (releases then fall 33 frames apart; slow motion's 2/3 scale already stands in for 90 Hz); and marble timers clamped on long frames.
6. **Self-hosted hand models,** so nothing loads from jsDelivr. Update the privacy note.
7. **Sound:** distinct cue timbres, a tail fade on the 98/110 Hz notes, and the integer-period tuning fix.
8. **Onboarding:** a ghost-hand demo for snip on w1-05, and calling the ghost hand "fingertips" in the copy.
9. **Star icons** on the plaque instead of plain dots.
10. **Faster CI smoke:** the Playwright install with `--with-deps` costs about 9 min per deploying push (week 8 ticket 03, Comments). Cache the browser, or run the smoke in the Playwright image.
11. **A final copy pass,** so the README and submission match what shipped.
12. **Game events on the physics step clock** (week 8 ticket 20's finding; not built there because it isn't small). Today a drop's events fall on frame boundaries, so the same solution can play out differently at 60, 72 or 90 Hz, or in slow motion:
    - Releases: `MarbleSystem.releaseDue` (src/features/marbles/MarbleSystem.ts:205-212) counts the frame's simulation delta down from 0.45 s and resets to 0.45 s without carrying the overshoot, so the gap between marbles is a whole number of frames: 27 or 28 at 60 Hz and 40 or 41 in slow motion (ticket 20's traces), and by arithmetic 33 at 72 Hz. The new marble's body is created at the next frame's physics update (SimulationClockSystem runs before MarbleSystem), so it starts at whatever step count has been posted by then.
    - Physics runs in a worker (`useWorker: true`) with only 2 exchange buffers (node_modules/@iwsdk/core/dist/physics/physics-system.js:21). When both are in flight, that frame's steps wait in the accumulator (capped at 4 steps, so time can be dropped), while the add-body message is posted at once. Worker latency can therefore move a marble's first step too.
    - Rest timers and stall nudges read velocities from the last completed exchange, a frame or more late, and a nudge applies with the next exchange.
    - Evidence that releases alone don't explain the flakes: on w4-03 Budget (before ticket 20's fix) a passing and a failing slow-motion drop had the same release frames (41, 41, 41), and the two failures ended in exactly the same marble positions. The variance is in which step each event lands on, not only in which frame.
    - The candidate: SimulationClockSystem owns a fixed-step accumulator (1/120 s), passes `physics.update` whole steps only, and stops a frame's steps at the next scheduled event, so a release starts exactly 54 steps after the previous one at any frame rate. Rest timers count steps. For nudges to be exact as well, physics would need to run on the main thread (`useWorker: false`) or in lockstep with the worker; measure the frame cost first.
    - Cost: every level's release timing changes slightly, so it needs a full re-proof (`test:e2e:levels`, `:slow`, `:dailies`, `:levels:robust`, the `test:e2e` chain and the melody and touch tests that count notes). Done well, it would make the robust sweep's speeds and poses replay identical drops.
    - Acceptance, whether or not the clock lands: w4-03 Budget re-proven at 72 Hz (item 5's condition) as well as at 60 Hz and in slow motion, with `RUNS=10 zsh tests/e2e/levels-robust.sh campaign:20` 60/60 in each. Ticket 20's review left Budget with no margin on chute 1's x toward the right: at 0.30 (with the 6 cm wall beside the cup's left side) it solved 60/60, and at 0.29 60/60, but at 0.31 only 45/60, because chute 1's first marble meets chute 0's first marble on e-f and drops to the floor at x 0.30 (`ticket20-review-budget-lip-runs10.log`). Re-run 0.31 too: if it stays red, move chute 1 or the two chutes' release order so their first marbles no longer meet on e-f.
13. **A navigation can't stop an E2E script** (week 8 ticket 20's review). `waitFor` in tests/e2e/lib.mjs polls the page with `frame.evaluate`; when the page navigates during a poll (`navigateApp`, a reload), Playwright throws `Execution context was destroyed` and the whole script stops on an ERROR. That stopped 2 of ticket 20's 3 `test:e2e` runs (`ticket20-e2e-before-restart.log` at guest-play, `ticket20-e2e-under-load.log` at melody-book), so a pre-deploy regression can stop at random. The fix: `waitFor` treats a destroyed execution context (only that error) as "not yet" and polls again, and every other error still throws. Proof: an E2E check that reloads the page while `waitFor` polls and still resolves, plus one full `test:e2e` run. Effort: S.

## Tickets (written Oct 28 by week 8 ticket 17)

No real-Quest tester report had arrived when these were written (week 8 ticket 04, Comments), so ticket 01 is a slot kept for them. Nothing from week 8 was cut at the Oct 30 checkpoint: tickets 06-16 had all landed by Oct 27.

| Ticket | Item | Effort |
|---|---|---|
| `issues/01-tester-fixes.md` | Tester fixes (:5), the slot | M, ~1 day (timeboxed, Nov 5-7) |
| `issues/02-finger-strum.md` | 1. Finger-strum: kept, because week 8's melody ticket landed Oct 24 (25538ef), before Nov 4 | M, ~1 day |
| `issues/03-mirrored-dailies.md` | 2. Mirrored daily variants | S-M, ~0.5 day |
| `issues/04-xr-tests.md` | 3. XR tests | M, ~1 day |
| `issues/05-soak-test.md` | 4. Soak test | S, ~0.5 day |
| `issues/06-e2e-navigation-proof.md` | 13. A navigation can't stop an E2E script: pulled above the line, because ticket 07's regression depends on it and it is small | S, ~0.25 day |
| `issues/07-final-copy-pass.md` | 11. The final copy pass (it carries week 8 ticket 17's copy list) and the week 9 regression | S, ~0.5 day plus the regression |

About 4.75 days of work for Nov 5-10 (six days), so a day stays spare before the Nov 10 feature freeze. A tester report bigger than ticket 01's slot moves the lowest ticket above the line (05, then 03) below it.

**Below the line,** listed but not ticketed this week:
- **5. Rail and frame-rate evidence:** about a day, and its 72 Hz and rail-window conditions need a full re-proof of the levels. It closes gap #22's open half, which no judge-facing claim depends on: the copy says frame rate on a Quest isn't measured. First in line if a ticket above finishes early.
- **6. Self-hosted hand models:** the privacy note already names jsDelivr honestly (README.md:49, docs/submission.md:149), so this changes no claim; S, next after item 5.
- **7. Sound** (cue timbres, the 98/110 Hz tail fade, the integer-period tuning): polish with no failing check behind it; it would change every cue test's pitches.
- **8. The snip ghost-hand demo:** week 8 ticket 14's refusal line ("No threads left - pinch one to snip it") and the missed-drop line already teach the snip; the copy already calls the ghost hand fingertips (docs/submission.md:88).
- **9. Star icons:** cosmetic; the plaque's stars already light one by one and pulse with the replay.
- **10. Faster CI smoke:** costs CI minutes, not correctness; after the freeze, deploys are tag-only.
- **12. Game events on the physics step clock:** L, and it changes every level's release timing (a full re-proof); the robust sweep is 3/3 everywhere without it (week 8 ticket 17's final log).

**Accepted from week 8's review, not ticketed:** story 7's device half (a real pinch on Quest Browser's 2D page) stays unproven without a headset (ADR 0002), and story 13's freeze tag is week 7 ticket 05's (Nov 14). Week 8 ticket 17's Comments list both, with the user's open decisions.
