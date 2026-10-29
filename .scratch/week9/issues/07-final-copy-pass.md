# 07: Final copy pass and the week 9 regression (P1, last)

**What to build:** week 9 spec item 11. README.md and docs/submission.md say exactly what the shipped build does, with evidence for each claim, and the full local regression runs once on the result. This is the week's last ticket: it absorbs what tickets 01-06 shipped.
- **Work through the copy list below,** entry by entry. Each entry gives the file:line (as of Oct 28, commit 1e8da2a), the current words, what shipped and its evidence, and the change. Line numbers drift as earlier entries land: match on the quoted words.
- **Then add what tickets 01-06 ship:** finger-strum (02) only as "touch a string and it sounds", never "the loop depends on hands" (spec :11); mirrored dailies (03); the new XR scripts (04) in the tested lists; the soak figures (05) if they back a claim; and every tester finding (01) that proves or disproves a claim.
- **Keep `tests/unit/copyHonesty.test.ts` green,** and extend it for any new phrase that must not creep back (for example, a test that no line says everything is within 2 ft on an accepted table already exists; add one for "Over 200 unit tests" once it is replaced, so a stale count can't return).
- **The user's lines stay the user's:** the tagline (docs/submission.md:17) and "What excites you about the future of VR" (:99) are week 8 ticket 06's Human box. Don't write them.
- **Then the full regression** as week 8 ticket 17 ran it (`.tmp/regression-17.sh` was the runner; the layout is `.scratch/week8/regression-final.log`), on this ticket's commit, logged to `.scratch/week9/regression-final.log`. Its push and the live checks are the main session's (README "Develop").

## Copy list (from week 8 ticket 17's claim audit, Oct 28)

Evidence names a test that passes in `.scratch/week8/regression-final.log` (run on 1e8da2a) unless it says otherwise.

| # | File:line | Current words | What shipped, and its evidence | Change |
|---|---|---|---|---|
| 1 | README.md:14 | "...every solution plays as a melody. `<!-- true once week 8 ticket 10 lands... -->`" | Ticket 10 (25538ef): each thread climbs from its root, the cups close on a cadence. first-melody.e2e.mjs and melody-climb.e2e.mjs (3+ distinct notes on w1-01 and w1-03, the same notes on a repeat drop); tests/unit/melody.test.ts | Delete the marker; keep the sentence. |
| 2 | docs/submission.md:25 | Same sentence and marker | As #1 | Delete the marker. |
| 3 | docs/submission.md:109 | "...every solution is a melody. `<!-- ... -->` One length, three effects: a thread's length sets its pitch, its bounce and its spool cost" | As #1; a length now sets only the thread's root note (ADR 0004) | Delete the marker; "sets its pitch" becomes "sets its root note". |
| 4 | docs/submission.md:116-121 | "**[if shipped] Best Reason to Come Back.** Author note: ... Draft for then: ..." | Tickets 13 and 14 shipped: better-solve.e2e.mjs and first-drop.e2e.mjs (stars for par and the first drop), return-visit.e2e.mjs ("Today's daily is ready - streak N"), daily-signs.e2e.mjs (the sun pulses), melody-book.e2e.mjs (play-all) | Drop the bracket and the author note; the draft becomes the entry. |
| 5 | docs/submission.md:122-129 | "**[if shipped] Best Accessibility Forward.** Author note: ..." | Ticket 15 shipped: high-contrast.e2e.mjs (toggle, contrast ratios: tests/unit/contrast.test.ts), sound-cues.e2e.mjs and tests/unit/captions.test.ts (a wrong cup blinks, a replayed note pulses a star), the missed-drop line (missed-drop.e2e.mjs) | Drop the bracket and the author note; the draft becomes the entry. |
| 6 | docs/submission.md:5-6 | "**[if shipped]** notes name the features a claim waits on. HTML comments (`<!-- -->`) are re-check notes..." | No bracket or marker left after #1-#5 | Delete the two sentences (keep [decide] and [author writes]). |
| 7 | README.md:55 | "**Over 200 unit tests** on the pure game logic in `src/lib` (96% coverage)." | 803 unit tests in 56 files, coverage 98.07 % statements, 96.64 % branches (regression-final.log `--- unit`) | "Over 800 unit tests ... (98% coverage)"; re-read the numbers from week 9's final log. |
| 8 | docs/submission.md:55 | "Over 200 unit tests, real-input end-to-end tests and emulated XR sessions (hands-only play, gaze plus pinch, table placement)" | As #7; the XR scripts now also cover Enter XR by long press, guest play, a skip after three misses, placement after a recenter and positional audio (`test:e2e:hands`, 10 scripts) | "Over 800"; name the added sessions. |
| 9 | README.md:40-46 | The "Comfortable and accessible" list | Missing: the high-contrast toggle and the visual captions (#5 evidence) | Add both. Keep :41 as is (#16). |
| 10 | docs/submission.md:131-142 | "Accessibility notes" | Missing: high contrast, visual captions, the skip after three misses (skip.e2e.mjs, xr-skip.sh) | Add the three. |
| 11 | README.md:30-31 | "**Reasons to come back:** stars, a daily puzzle on a tight spool with a streak, and a melody book of every solved level's tune." | The three stars (ADR 0005), each daily's own name, the sun pulsing while today's daily is unsolved, the return line, play-all (#4 evidence) | Say what the stars reward, and add the return line and play-all. |
| 12 | README.md:20 | "pinch Slow-mo, Raise/Lower and Nearer/Farther on the plaque" | The settings face also has High contrast, the star total and Play all (settings.e2e.mjs, high-contrast.e2e.mjs, melody-book.e2e.mjs) | Add High contrast (and Play all, once a level is solved). |
| 13 | docs/submission.md:153-164 | "Testing instructions for judges" | Guest play: `?fresh=1` plays from level 1 without reading or changing the save (guest-play.e2e.mjs, xr-guest.sh, prod-xr guest run; live check on 3810c26, week 8 ticket 09); held back by ticket 06 until it shipped | Add a step: "On a headset someone already played, open https://sebaustin.github.io/threadbound/?fresh=1 to see the first five minutes as a new player." Same line in README "Try it". |
| 14 | README.md:64-69 | "Emulated XR sessions" list | Also proven: Enter XR with an 800 ms press (enter-xr.sh), guest play (xr-guest.sh), a skip after three misses (xr-skip.sh), placement again after a recenter (xr-placement.sh), outside hosts (xr-hosts.sh), positional plucks and chimes (xr-spatial-audio.sh) | Add the missing sessions. |
| 15 | README.md:82 | "`npm run test:e2e:hands`    # emulated XR: hands-only level, ledge/plaque pinches, gaze + pinch, outside hosts, placement and recenter, guest play" | As #14 | Add Enter XR, skip and spatial audio. |
| 16 | README.md:41 and docs/submission.md:110 | "Seated, no standing or leaning: every control works from your chair by pinch or touch. In the default spot, everything sits within 2 ft." | Ticket 19 (Q47, Q50): accepted tables keep every control within `ACCEPT_REACH` 0.69 m; reach.e2e.mjs "within 2 ft at the default distance / farthest setting"; xr-placement.sh "within ACCEPT_REACH of the head"; tests/unit/copyHonesty.test.ts | No change: verified. README.md:61 and :68 stay too (the study pose and the measured emulator table). |
| 17 | README.md:70 and docs/submission.md:111 | "The busiest frame in an XR session is 57 draw calls and about 16k triangles per view" / "57 draw calls per view, within 80" | xr-full-level.sh on 1e8da2a: 116 draw calls and 33,048 triangles over 2 views (58 and 16.5k per view), no breach | "58 draw calls and about 17k triangles per view"; re-read from week 9's log. |
| 18 | docs/submission.md:115 | "the first melody plays within seconds of the chute pinch (tested; 2.0 s in the test run)" | first-melody.e2e.mjs on 1e8da2a: see its "game's own share" line in regression-final.log | Quote week 9's measured figure, not 2.0 s. |
| 19 | docs/submission.md:58-61 | "**Sound:** a small Karplus-Strong string synthesizer, with one sound per game event and a limiter. Thread notes and the musical cues use the pentatonic scale..." | Ticket 10's climb and cadence (#1), and ticket 16's positional plucks and cup chimes in XR (xr-spatial-audio.sh) | Add: each bounce plays the thread's next note, a solve closes on a cadence, and in XR plucks and chimes come from where they happen. |
| 20 | README.md:36-37 and docs/submission.md:46-48 | "...facing you, and that is all the room does." / "That is the room's whole job." | ADR 0006: the room places the diorama; positional audio (ticket 16) follows the head, not the room | Keep; if #19 lands, make sure the two don't read as contradicting (positional audio is the head's, not the room's). |
| 21 | docs/submission.md:91-95 | Hand Interactions' tested list: hand-pinch.sh, xr-full-level.sh, xr-controls.sh, gaze-pinch.sh; "the fingertip press is untested" | As #14. The fingertip press is still only checked as a component (touch-feedback.e2e.mjs: ledge buttons are `PokeInteractable`), not pressed by an emulated fingertip | Add the new scripts; keep "the fingertip press is untested" unless ticket 04 adds one. |
| 22 | README.md:44 | "a sound for every event (cup chime, wrong-cup thud, refusal)" | Plus a visual caption for the sound-only events (#5) | "...and a visual sign for the ones you only hear". |
| 23 | docs/submission.md:138 | "Height (±15 cm) and distance adjustments" | `OFFSET_LIMITS` up ±6 x 2.5 cm = ±15 cm; near -2..+2 x 4 cm (src/lib/settings.ts:11, src/lib/placement.ts:267) | No change: verified. Optionally add "distance ±8 cm". |
| 24 | docs/submission.md:17, :99 | Tagline; "**[author writes]**" | The user's (week 8 ticket 06, Human box) | Not this ticket's: leave for the user, list as open in Comments. |
| 25 | docs/submission.md:54-57, README.md:53, :70 | "built and tested entirely in the IWER emulator ... Frame rate on a Quest is not measured." | Still true unless ticket 01 brings a measured report | No change unless ticket 01 changes it (Q44). |

**Blocked by:** 01, 02, 03, 04, 05, 06

**Status:** ready-for-agent

- [ ] Copy: every entry above is done or marked "no change: verified" in Comments, with the evidence re-read from week 9's log; additions for tickets 01-06 have evidence too.
- [ ] Unit: `tests/unit/copyHonesty.test.ts` passes, with a new check for each replaced claim that must not come back (the unit-test count at least).
- [ ] `grep -nE "<!--|\[if shipped" README.md docs/submission.md` prints nothing.
- [ ] Regression: `.scratch/week9/regression-final.log` in week 8 ticket 17's layout (ten sections and the summary line), every exit 0, `test:e2e:levels:robust` at `RUNS=3`.
- [ ] Main session: the push and the live checks (README "Develop"), and closing the deploy gate before the Nov 14 freeze (week 7 ticket 05).
- [ ] Human: the tagline and the future-of-VR answer (week 8 ticket 06).

**Effort:** S (~0.5 day, plus the ~3 h regression)

**Gaps closed:** #56 (the claim's final wording; week 8 ticket 12 measured it), and the copy half of user story 12 (week 8 spec)

**Risks:**
- Copy written before tickets 01-06 land goes stale: do this ticket last.
- A number quoted from a log that isn't the final one (unit count, draw calls, first-melody time) is the commonest overclaim; re-read each from week 9's final log.

## Comments

- **From ticket 17 review (low):** tests/unit/legibility.test.ts:47-53 hard-codes the strip inset 0.001 and omits its 0.15 cm border; read padding-bottom and border-width from public/ui/ledge.uikitml as HINT_FONT_CM is.
