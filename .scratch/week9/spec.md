# Week 9: stretch and tester fixes (Nov 5-10)

Status: needs-triage

Tickets get written when week 8's ticket 17 closes, once real-Quest tester reports are in. Fixes from those reports come before any item below. Feature freeze is **Nov 10**.

Anything cut from week 8 at its Oct 30 checkpoint lands here first, in the cut order in `.scratch/week8/spec.md` (Schedule).

## Candidate items (from the Oct 22 grilling session, in priority order)

1. **Finger-strum.** Only if week 8's melody ticket landed by Nov 4; otherwise drop it. A fingertip crossing a thread inside the marble channel sounds the thread's root. It doesn't fire while pinching or dragging, and it isn't part of the melody. The copy calls it "touch a string and it sounds", not "the loop depends on hands".
2. **Mirrored daily variants,** proven with the dailies harness.
3. **XR tests:** a rail-tab drag by hand (vertical rails included), Next, controller mode, left-hand play, and switching input mid-drag.
4. **A soak test:** all 24 levels plus dailies in one page with no reloads, sampling memory and body counts.
5. **Rail evidence:** a throttled frame-time log, a rail-window sweep around the stored solution values, and marble timers clamped on long frames.
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
