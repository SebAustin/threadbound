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
10. **A final copy pass,** so the README and submission match what shipped.
