# Threadbound: gap analysis against the Meta VR Start 2026 brief

As of 2026-10-22. There are 27 days to the deadline (2026-11-18 12:00 PT) and 23 days to the planned freeze (2026-11-14). The entrant has no headset. All evidence comes from IWER, CI and the source code. Severity and effort below use the skeptic's corrected values.

**Bottom line.** If the entry were submitted today it would be incomplete: there is no video, so it is a likely Stage One fail. The hands-first hard requirement is met, because every in-XR element is RayInteractable and nothing needs a controller. The biggest scoring risks are three:

- The headline "every solution is a melody" mostly plays one repeated note.
- The puzzle is a 2D plane that a mouse can solve, while the copy says it depends on hands.
- Nothing has been checked on a real Quest.

All three can be fixed or reframed before the freeze, except the device evidence, which depends on outside help.

---

## 1. Scorecard

| Criterion | Today | After top fixes | Justification |
|---|---|---|---|
| Innovation & Creativity | 5 | 7 | **Today:** one thread length sets pitch, bounce and spool cost, and the strings are real Karplus-Strong synthesis; both are original. But the loop is a flat board a mouse solves (pointerToDiorama.ts:10-37), 17 of 24 solutions play one pitch, and nothing scores the sound. **After:** varied melodies, a finger-strum moment, and copy that sells the length coupling honestly. |
| Experience Design | 6 | 7.5 | **Today:** hands-first and seated. Controls are part of the board, the ghost-hand onboarding works, and pause/resume is clean. But there is no FoV adaptation (about 60-66 degrees of vertical span), stars are automatic on 21 of 24 levels, the daily is recycled, table placement is a one-shot 3 s search, there is no skip, and nothing points the player to anything after the first solve. **After:** FoV-aware layout, placement that retries, stars that vary, in-game signposts, a skip option. |
| Technical Implementation | 5 | 6.5 (7.5 with one device session) | **Today:** testing is exceptional for an emulator-only entry (every level proven solvable at both speeds, CI green). But there is zero device evidence, fps is unmeasured, the Enter XR button can miss long pinches, a recenter leaves the board off the table, rail tabs and threads are below Meta's target-size minimums, and depth occlusion is unused. **After:** placement retry, a recenter reset listener, the Enter XR fix, hit slop, a throttled frame log, and real fps if a tester or headset turns up. |
| Polish & Presentation | 3 | 7.5 | **Today:** the walnut-and-brass look is cohesive, but there is no video, no stills, the copy overclaims in several places, solves have no celebration, there is no hover/press feedback, and the replay is monotone. **After:** a recorded 2:45 IWER video that opens on a live pinch-pull and a 2-3 note phrase, stills and thumbnail, a solve celebration, honest copy. |

---

## 2. Ranked gaps

Order: by severity tier (critical first), then by points at stake per unit of effort within each tier. All 77 gaps that survived verification are listed.

Criterion abbreviations:

| Code | Meaning |
|---|---|
| S1 | Stage One / entry rules |
| Inn | Innovation & Creativity |
| XD | Experience Design |
| Tech | Technical Implementation |
| Pol | Polish & Presentation |
| FFM | Best First Five Minutes |
| BRB | Best Reason to Come Back |
| Acc | Best Accessibility Forward |
| BOC | Boldest Original Concept |

| # | Gap | Criterion | Severity | Effort | Device |
|---|---|---|---|---|---|
| 1 | The required public video (under 3:00) is not recorded; the link is still `[decide]` (docs/submission.md:11) | S1, Pol | critical | M | no (a real-Quest clip is optional) |
| 2 | No real-Quest evidence at all. The tester post has sat unposted since Oct 4 (docs/forum-post.md:3). Close-range pinch, fps, the spatial-data prompt and placement are unproven | Tech, XD, FFM | high | S (to act) | yes |
| 3 | submission.md:72 says "core loop depends on hands and real-world scale", but the board is planar and mouse-solvable (README:32 advertises this). No mechanic needs hands in space | Inn, BOC, Pol | high | S (copy) / L (mechanic) | no |
| 4 | Table search is a single 3 s window (PlacementSystem.ts:15). The timer runs while blurred, never retries, and room capture is never offered. Late planes or a turned head leave the board floating all session | Tech, XD | high | S (core retry) / M (full) | yes |
| 5 | "Every solution is a melody": 17 of 24 levels play one pitch and none play more than two. The first solve is six A4s, the cold open is all G5, and the replay uses a fixed 0.22 s step | Inn, Pol, FFM | high | M | no |
| 6 | Video kit errors: `--headless` gives no window and mutes audio; no capture tool, audio route, resolution or fps is named; the IWER "Remote Control Active" pill is in frame; the emulated hand moves in jumps | Pol | medium | S (minimum) / M (smooth takes) | no |
| 7 | Enter XR listens for `click` (panel.ts:50), which needs a release within 300 ms on the same object. A long or drifting pinch does nothing. There is no DOM fallback | XD, FFM | medium | S | yes |
| 8 | Every push to main redeploys the judged build. No tag, no branch protection, and a tag-only trigger would be blocked by the main-only environment policy | S1 | medium | S | no |
| 9 | README, submission and VO tell judges to "poke" the plaque stars and settings. The plaque, threads and chute are ray-only, and no XR test performs a poke | XD, Pol | medium | S | no |
| 10 | Cold open is a chute pinch on a pre-solved one-note board. No pinch-pull in the first 10 s, no title until 2:35, no story line | Pol, FFM | medium | S | no |
| 11 | No stills, GIF, thumbnail or og:image anywhere a judge would look | Pol | medium | S | no |
| 12 | A solve has no celebration where the player is looking (only the plaque, about 25 degrees up). Next, Restart and placement swap the board in a single frame | Pol, FFM | medium | S | no |
| 13 | No hover or press feedback on ledge buttons, chute, threads or tabs. Poke has no cursor, and gaze has no feedback on these targets. The "gear" is a hex nut | XD, Pol, Tech | medium | S | no |
| 14 | Rail tabs (1.6 cm) and threads (1.2 cm) are below Meta's 2.5-3 degree minimum with no extra hit area. Knobs overlap at w4-06 s/u and w1-06 a/h | Tech, XD | medium | S | yes (to validate) |
| 15 | Lit stars nearly vanish on the solved gold header (1.93:1). No high-contrast mode | Acc, Pol | medium | S | no |
| 16 | Wrong cup and melody replay give sound only; a failed drop is never explained on the plaque | Acc, XD | medium | S | no |
| 17 | Copy says "Purposeful mixed reality" and "Passthrough is the stage", but the room only places the board. The contact shadow floats when there is no table | XD, Inn | medium | S (copy) / M (feature) | no |
| 18 | The daily serves untaught mechanics on 13 of 24 judging days, rails on 7, with no hint and no ghost hand | XD, FFM | medium | S | no |
| 19 | A recenter leaves the board off the table. No reference-space `reset` listener, no "Place here" control | Tech | medium | S | no (IWER cannot show the misalignment) |
| 20 | 60 fps rests on a draw-call proxy, and "frame budget enforced by tests" overstates it. No frame-time or hitch log | Tech | medium | S | partly (real fps needs a device) |
| 21 | A desk 0.45-0.65 m away is rejected, so the board floats near desk height with a mid-air shadow. On accepted tables the base sits 1.2 cm into the surface | Tech, XD | medium | S | no |
| 22 | Rail solutions are proven only at the exact stored value (q=0.20 drives three levels including the finale). No 72 Hz or jitter run. Marble timers are not clamped on long frames | Tech | medium | S | no |
| 23 | No XR hand test drags a rail tab, including the vertical ones. A stuck player cannot skip a level | XD, Tech | medium | S | yes (for aiming) |
| 24 | Stars are automatic: 21 of 24 levels cap threads at par, 1 star is impossible anywhere, and all 7 dailies are 3-star-only | BRB, XD | medium | M (S for copy only) | no |
| 25 | Not FoV-aware: status sits at the top and actions at the bottom; Nearer+3 spans about 84x82 degrees; the Glasses view is never checked | XD, Tech | medium | M | no |
| 26 | Streak and today's daily are invisible outside the daily, with no nudge on return and no reward | BRB | medium | M (S for the nudge) | no |
| 27 | The daily is 7 campaign boards on a weekly loop, keeping their campaign names. The VO says "a new daily puzzle every day" | BRB, XD | medium | M (S to reword) | no |
| 28 | The melody book has no book: the stars are hidden, levels are browsed one at a time, and there is no play-all | BRB, FFM | medium | M (S for a hint) | no |
| 29 | No meta-progression or total readout; nothing visibly changes between sessions | BRB | medium | M | no |
| 30 | Hands never touch a string. There is no strum, so touching a string within reach does nothing | Inn | medium | M | no |
| 31 | Pinch release takes the drifting release frame. No target highlight while dragging, and a miss is silent | Tech | medium | M (parts are S) | yes |
| 32 | Threads are rigid rods: the pluck animation only pulses thickness for under 0.3 s, a new thread doesn't twang visibly, and there is no pitch preview while pulling | Pol, Inn | medium | M (parts are S) | no |
| 33 | Scene understanding is planes-only. No depth hit-test fallback when Space Setup is missing | Tech | medium | M | yes (to validate) |
| 34 | The music is decorative: no goal or star depends on sound, which is close to BallDroppings and Peggle | Inn | medium | L (S copy, S-M song star) | no |
| 35 | No pinch-free path (head or eye dwell) for limited mobility | Acc | medium | L (M for buttons only) | no |
| 36 | No voice alternative, and Web Speech is likely unavailable in Quest Browser | Acc | medium | L | yes |
| 37 | node_modules is missing (a copy sits in ~/.Trash). This blocks local typecheck, tests, E2E and the MCP tools. Prerequisite for everything else | (process) | low | S | no |
| 38 | Claims not backed by the build: marbles carry no shapes; failure cues are not off-scale; most cues are not distinct from thread notes; "gear"; "cozy study"; "new daily" | Pol | low | S | no |
| 39 | The awards section overclaims ("stars for thread economy"; Accessibility list lacks voice, eyes-only and high-contrast) | Pol | low | S | no |
| 40 | The Innovation row omits the one-length-three-effects idea and the 24-level, 4-world scope | Inn, Pol | low | S | no |
| 41 | Form fields: no Hand Interactions or future-of-VR answer, no team block, launch date `[decide]`, "we" for a solo entrant | S1, Pol | low | S | no |
| 42 | No full regression since the last 3 commits; the Oct 4 log was partial | Tech | low | S | no |
| 43 | Script says the on-screen text works without VO, but none is written after 0:30. The gaze shot needs a caption | Pol | low | S | no |
| 44 | Staged daily and settings shots cannot show the streak or slow motion | Pol | low | S | no |
| 45 | After the first solve nothing in the headset points to the sun or the stars | FFM, XD | low | S | no |
| 46 | The board appears at the default pose, then snaps to its placement. A big jump if the player is standing or turned | FFM, Pol | low | S | no |
| 47 | A rebuild during a drag drops the pull; relocation isn't deferred while dragging | Tech | low | S | no |
| 48 | Blank white page during about 2.9 MB of gzipped load; cold start is unmeasured on a device | XD, Pol | low | S | yes |
| 49 | After a wrong first thread the tutorial keeps saying "pinch the chute"; Restart is never taught | FFM | low | S | no |
| 50 | The plaque "stars" are plain dots with no sign they can be pressed | Pol | low | S | no |
| 51 | Stock IWSDK welcome card, off-palette. On desktop the Enter XR button does nothing visible | Pol | low | S | no |
| 52 | Cue pitches overlap thread notes in one timbre. Integer-period tuning drifts up to -30 cents (A5) | Pol | low | S | no |
| 53 | The 98/110 Hz notes click at the 1.4 s buffer cut | Pol | low | S | no |
| 54 | Only the first gesture is demonstrated; snip on w1-05 is text-only | FFM | low | S | no |
| 55 | Settings controls sit 6-21 cm above the eye line with 8 mm gaps (Meta minimum is 12 mm); the code comment says the opposite | XD | low | S | no |
| 56 | "Within a seated 2 ft (tested on every level)" holds only for a pose Quest never uses | Pol, XD | low | S | no |
| 57 | README says XR tests pinch "every ledge button and plaque control"; Next and 7 settings controls are untested in XR, and Nearer is untested anywhere | Pol | low | S | no |
| 58 | Unused anchors, meshDetection and grabbing are enabled; there is no privacy note | S1, Tech | low | S | no |
| 59 | No visible error for unsupported XR or a World.create failure | XD | low | S | no |
| 60 | Copy names only Quest; no Glasses-readiness line (needs the FoV and gaze checks first) | Pol | low | S | no |
| 61 | Meta MIT headers point to a LICENSE that doesn't exist; no third-party notices | S1, Pol | low | S | no |
| 62 | "Threadbound" is already a Steam-listed physics puzzle with a demo (app 2218130) | S1 (launch) | low | S | no |
| 63 | Public .scratch ticket 09 admits stars are automatic | Pol | low | S | no |
| 64 | Hand and controller models load at runtime from jsdelivr | Tech | low | S | no |
| 65 | The facing gate is checked at the table centre, so the board can land up to 90 degrees off; the label bonus outweighs facing | XD | low | S | no |
| 66 | Amber marble vs coral thread is low contrast (CIEDE2000 13.9 normal, 1.8 tritan) | Acc | low | S | no |
| 67 | One slow-motion speed; no in-game sound toggle | Acc | low | S | no |
| 68 | VR fallback uses a fixed world pose; the study table ignores the height/distance offset | XD | low | S | no |
| 69 | frameStats checks OVR_multiview2, but three.js uses OCULUS_multiview (dev-only) | Tech | low | S | no |
| 70 | No innovation ticket or plan in week 7 | Inn (process) | low | S | no |
| 71 | The "ghost hand" is two 14 mm dots | Pol, FFM | low | S (rename) / M (model) | no |
| 72 | Plucks and chimes are mono and not spatialized; no marble foley | Pol, Acc | low | S (spatial) / M (foley) | no |
| 73 | Puzzles are small (1-2 threads); capstone levels would mostly reach judges through the video | XD, Inn | low | M | no |
| 74 | Gaze has no designed role. On Glasses it aims every far interaction | Inn, Tech | low | M | no |
| 75 | Anchors unused; same-seat placement is already deterministic | Tech | low | M | yes |
| 76 | No depth occlusion; IWSDK's outline hand draws over the board | Tech, Pol | low | M | yes |
| 77 | Best Social & Multiplayer and Best Agentic Interaction can't be reached | (awards) | low | XL (do nothing) | no |

---

## 3. Decisions for the user (dependency tree)

`[ask now]` means the decision is independent and can be settled today.

### Independent decisions

**D1. Device access** `[ask now]`
- Options:
  - (a) Post docs/forum-post.md today.
  - (b) Also borrow or buy a Quest 3S (about $300) or book a demo session.
  - (c) Do neither.
- **Recommend (a) plus (b) if at all possible.** It is the only way to settle gaps 2, 7, 14, 23, 31, 33 and 48 and to get a real fps number.
- Extend the post to ask for: a stopwatch time from tapping the URL to the first melody; an OVR Metrics fps screenshot during a Three Cups drop; any permission prompts; whether the board landed on the table; and a 10-20 s clip of a drop on a real table.
- Unlocks: D18 (video) and D19 (freeze date).

**D2. Primary special award** `[ask now]`
- Options:
  - (a) Best First Five Minutes only.
  - (b) First Five Minutes plus Best Reason to Come Back.
  - (c) Add Best Accessibility Forward as well.
- **Recommend (a) as the headline.** Add Come Back only if D10 and D12 ship. Name Accessibility only if D11's high-contrast mode and visual captions ship.
- Why: First Five Minutes gaps are mostly S effort and close to done. Only one prize is allowed. Overclaims cost credibility with judges who may use AI to cross-check.
- Unlocks: D10, D11, D12, D13.

**D3. How melodies get variety** `[ask now]`. This is the core identity and drives video, stars, strum and the book.
- Options:
  - (a) Remap the length-to-pitch range only. This can't vary the 11 single-thread levels.
  - (b) Length sets the thread's root; successive bounces on a thread climb its pentatonic arpeggio; every solve ends on a cup-chord cadence; the replay keeps real bounce timing (optional `times` field).
  - (c) "Fretboard": where the marble lands on the thread picks the note.
  - (d) Only re-stage the video on two-pitch levels.
- **Recommend (b).** It keeps "shorter rings higher", gives the first solve and the cold open three or more notes, and leaves physics and level proofs alone (restitution is separate). It is testable: assert that w1-01 and w1-03 produce at least 3 distinct notes. M effort. Take (c) instead only if D14 (strum) is a yes and you want touch position to choose the note.
- Unlocks: D13, D14, D15, D17, D18.

**D4. Field of view (ticket 09 #4)** `[ask now]`. Changes the main video shot, so it must be settled before recording.
- Options:
  - (a) Restructure the UI: move hint and counters to a strip on the ledge, make the plaque and settings face shorter, use 12 mm gaps, cap Nearer at +1/+2, add an angular-extent unit test.
  - (b) Tilt the board including its physics (re-prove all 24 levels).
  - (c) Tilt the visuals only.
  - (d) Raise the default height.
  - (e) Document only.
- **Recommend (a).** No physics change. It also fixes gaps 55 and 56 and backs an honest Glasses line (gap 60). Reject (c): rendered pegs would no longer match the physics.

**D5. Placement robustness and anchors (ticket 09 #3)** `[ask now]`
- Options:
  - (a) Run the search timer only while visible; keep re-evaluating for about 15-20 s while the level is idle with no threads; re-search on the XR `reset` event; hide the board and ghost hand during the search and fade in at the final pose.
  - (b) (a) plus a "Place here" settings control.
  - (c) Anchor-driven relocation.
  - (d) Leave as is.
- **Recommend (a)**, plus setting `anchors`, `meshDetection` and `grabbing` to false. Ticket 09's "medium-large" estimate is wrong: the existing `place` relocation already keeps threads and state. Keep persistent anchors as future work, because IWER cannot show their payoff.
- Unlocks: D16.

**D6. What the real room contributes** `[ask now]`
- Options:
  - (a) Honest copy only: drop "Purposeful" and "Passthrough is the stage".
  - (b) (a) plus spatialized plucks and cup chimes (HRTF on IWSDK's head listener).
  - (c) (a) plus a filmable tabletop marble spill.
  - (d) Real-table puzzle cups (L).
- **Recommend (b).** The copy fix is required regardless. Spatial audio is S and also helps players follow sorting by ear. (c) is a stretch goal only.

**D7. Skip valve** `[ask now]`
- Options: (a) "Next" on the settings face after 3 failed drops, with 0 stars; (b) no skip.
- **Recommend (a).** A judge stuck in World 1 never sees rails or the spool. S effort.

**D8. Name** `[ask now]`. Must be settled before recording.
- Options: (a) keep "Threadbound" and reword the launch line to "title subject to trademark check"; (b) rename before the video.
- **Recommend (a)** for the competition. A same-genre Steam title is a launch risk, not a judging one. If renaming, keep the `/threadbound/` URL slug and the localStorage keys.

**D9. Housekeeping** `[ask now]`
- Launch date: Q1 2027, Meta Horizon Store as a packaged web app, title TBD.
- Team: "Sebastien Henry, solo developer (design, code, audio)".
- License: MIT, matching IWSDK. Keep Meta's header on scaffold-derived files, add your own line, add THIRD_PARTY_NOTICES.md.
- `.scratch` visibility: keep it public (it backs the testing story) once D10 is settled.

### Depends on D2 (and partly D3)

**D10. Star balance (ticket 09 #1)**
- Options:
  - (a) Thread cap = par+2 everywhere. Needs new brute-force proofs; the current "not self-solving" check doesn't cover spare threads.
  - (b) Redefine the stars: 1 for a solve, 1 for at or under par, 1 for solving on the first drop since the level loaded.
  - (c) A song star (needs D3, and melody capture depends on frame rate).
  - (d) Copy-only fix.
- **Recommend (b)**, plus a "Stars N/72" total on the settings face. First-drop varies on every level and doesn't depend on frame rate. Fall back to (d) if Come Back is dropped.

**D11. Accessibility scope (ticket 09 #2)**
- Options:
  - (a) High-contrast toggle.
  - (b) Head-gaze dwell for ledge and plaque controls (M), or full dwell play (L).
  - (c) Voice.
- **Recommend:** (a), plus visual captions (wrong-cup flash, a star pulse per replayed note, a plaque line on a failed drop), plus the lit-star contrast fix. All S, and the contrast fix is needed anyway. Do (b) for buttons only, and only if Accessibility stays a named target. Skip (c): it likely won't run in Quest Browser and can't be shown honestly.

**D12. Daily**
- Options:
  - (a) Mirrored variants, proven with the existing dailies harness.
  - (b) A tune of the day (needs D15).
  - (c) Reword and rename only.
- **Recommend (a)** if Come Back stays a target, otherwise (c). Either way: rename dailies away from their campaign names, draw only from mechanics the player has reached, pulse the sun while today's daily is unsolved, and change the VO line.

**D13. Return-loop depth**
- Recommend: an S hint after a level's first solve ("Poke the stars to hear it again"), a play-all in the settings book, and a resume hint ("Today's daily is ready, streak N").
- Skip cosmetic unlocks unless D2 includes Come Back.

### Depends on D3

**D14. A mechanic that needs hands in space (finger-strum)**
- Options:
  - (a) Strum: a fingertip crossing a thread inside the channel band plays it. Suppressed while pinching or dragging, kept out of the melody, about 1-1.5 days.
  - (b) Pull-and-fling or depth puzzles (L-XL).
  - (c) None, and give up on Boldest.
- **Recommend (a)** if D3 lands by Nov 4; otherwise (c) with honest copy. Frame strum as fixing "touching a string does nothing" and as a first-five-minutes moment, not as "the loop now depends on hands".

**D15. Music as a goal**
- Options: Echo levels (L), a song star (S-M), or none.
- **Recommend none before the freeze.** Melody capture depends on frame rate (one pluck sample per render frame, 4 mm contact margin), so scored phrases could differ on Quest. Revisit after D10.

### Depends on D5

**D16. Space Setup and no-plane fallback**
- Options:
  - (a) Call `initiateRoomCapture` automatically.
  - (b) A judge instruction ("run Space Setup and allow space data") plus a plaque hint when the board floats.
  - (c) A depth hit-test fallback (M).
- **Recommend (b).** (a) launches a long system flow in the first minute. (c) is a stretch goal and needs a lap-rejection check.

### Depends on D3 and D10

**D17. Capstone levels**
- **Recommend no.** Keep 24 levels. Judges can't skip ahead, so harder levels mostly reach them through the video.

### Depends on D1, D3, D4, D8 and D14

**D18. Video plan and gaze framing**
- Options: (a) record in IWER now; (b) wait for real-Quest footage; (c) dry run now, final takes on the release candidate.
- **Recommend (c):**
  - Dry-run the capture pipeline this week: headed window, OBS app audio, 1920x1080 at 60 fps, crop the pill and chrome.
  - Shoot final takes Nov 11-13 on the release-candidate build.
  - Use a tester's real-table clip for the cold open if it arrives by Nov 12.
  - Add a small "Recorded in the IWER WebXR emulator" caption.
  - Keep the gaze shot, labelled "emulated eye tracking (Quest Pro preset)".

### Depends on D1

**D19. Freeze and tag**
- **Recommend:** tag v1.0 on Nov 14 after a full green regression, then `gh workflow disable` and add a ruleset blocking pushes to main until about Dec 11. The live Pages deployment keeps serving. Do any later work on a branch.

---

## 4. Proposed scope, Oct 22 to Nov 14

Budget: one developer with an AI agent and no headset, about 18 working days. The cut line keeps about 2 days of buffer for tester findings.

**Day 0 (Oct 22-23): prerequisites**
- Run `npm ci` (gap 37), then a full regression archived to `.scratch/week7/` (gap 42).
- Post the tester request (gap 2).
- Settle D1-D9.

**Above the line, must ship (about 11-12 days)**

1. **Copy honesty sweep (about 1 day)**, covering gaps 3, 9, 17, 38-41, 56, 57, 58, 60 and 61:
   - Innovation row: "one length, three effects".
   - Drop "Purposeful", the "core loop depends on hands" line and "new daily puzzle every day".
   - Change "poke" to "pinch" for plaque, thread and chute.
   - "gear" becomes "settings".
   - Remove "off-scale" and the claim that marbles carry shapes.
   - 2 ft and fps wording.
   - Add the Hand Interactions answer, the future-of-VR answer, the team block, the launch date, "I" for "we", a privacy section, LICENSE and notices, and one scoped Glasses line.
2. **Robustness (about 2 days)**, covering gaps 4, 7, 19, 21, 46, 47 and 59:
   - Enter XR via onTap plus a DOM `<button>` fallback and an "Open in Quest Browser" message.
   - D5(a) placement retry, reset listener, hide-then-fade.
   - Defer relocation while dragging and release pointer capture.
   - Desk acceptance from measured reach; hide the shadow when floating.
3. **Melody variety, D3(b) (about 2 days)**, covering gaps 5 and 12: arpeggio, cup cadence, rhythm-preserving replay, the solve cadence plus thread shimmer plus star stagger, and a "3 or more distinct notes" test on w1-01 and w1-03.
4. **Interaction feel (about 1.5 days)**, covering gaps 13, 14 and 31:
   - Shared hover and press helper; 4-7 mm cap travel.
   - Extra hit area on tabs and threads.
   - Preset-only anchors stop being snap targets.
   - Target highlight while dragging, a miss cue, and release stabilization from a ring buffer.
5. **FoV restructure, D4(a) (about 1.5 days)**, covering gaps 25 and 55.
6. **Stars, D10(b), plus totals (about 1 day)**, covering gaps 24 and 29.
7. **Signposting (about 0.5 day)**, covering gaps 18, 45 and 49: daily mechanic hint or progress-gated pool, post-solve sun and stars hints, wrong-thread recovery hint.
8. **Freeze safety (about 0.5 day)**, covering gap 8, per D19.
9. **Video kit fixes and dry-run capture (about 0.5 day)**, covering gaps 6 and 44: headed window, OBS, streak seeding, a live slow-motion drop.

**Stretch, if items 1-5 are done by Nov 5 (about 5 days)**
- Finger-strum, D14(a) (gap 30).
- High-contrast mode plus visual captions (gaps 15, 16, 66).
- Daily mirrored variants plus renaming (gap 27).
- Book play-all and skip valve (gaps 28, 23).
- Spatial plucks and chimes (gap 72).
- Cue timbres, tail fade and tuning fix (gaps 52, 53).
- Throttled frame-time log, rail-window sweep and timer clamp (gaps 20, 22).
- Snip demo and rename the ghost "fingertips" (gaps 54, 71).
- Loading text and welcome card restyle (gaps 48, 51).
- Star icons (gap 50).
- Self-host the hand models (gap 64).
- XR rail and Next pinch tests (gaps 23, 57).

**Below the line, out before the freeze**
- Echo levels and a scored melody (34, 15).
- Capstone levels (73).
- Persistent anchors (75).
- Depth occlusion (76).
- Voice (36).
- Full dwell play (35); buttons-only dwell stays possible if D2 keeps Accessibility.
- Hit-test fallback (33), unless ahead of schedule.
- String bow visuals (32); only the S parts: twang on creation and a pitch tick while pulling.
- Tabletop or real-table puzzle (17, L variant).
- Runtime XRView FoV adaptation.
- Social and agentic work (77).

**Calendar**
- **Oct 22-28:** Day 0, then items 1, 2 and 9.
- **Oct 29-Nov 4:** items 3, 4, 5 and 6.
- **Nov 5-10:** item 7, stretch items, and fixes from tester feedback. Feature freeze Nov 10.
- **Nov 11-13:** final video takes on the release candidate; stills, GIF and thumbnail (gap 11); og:image.
- **Nov 14:** full regression, tag v1.0, disable deploys.
- **Nov 15-16:** edit to about 2:45 with English captions; upload as Public.
- **Nov 17:** submit, one day of buffer.
- **Nov 18-Dec 11:** no pushes to main; keep the repo and Pages public.

---

## 5. Refuted / non-issues (do not raise again)

**Platform and build**
- The @iwsdk/core 1.0.0-rc.2 pin is content-identical to stable 1.0.0; a bump is optional housekeeping.
- Emulator footage is explicitly allowed by the brief. Only a small caption is advisable, not required.
- Meta's "no gaze data for web content" rule covers 2D panels. IWSDK documents gaze plus pinch in immersive WebXR.
- Quest judges do see the virtual study: on the 2D page, before Enter XR.

**Input and hit-testing**
- Poking does not snip threads; IWSDK's touch pointer only hits PokeInteractable. "Make snip pinch-only" is unnecessary.
- Awaiting isSessionSupported before requestSession is fine on Quest Browser (roughly 5 s of user activation).
- The "Exit to Browser" button is unreachable dead code that judges never see.
- The IWER "Enter XR" pill over the plaque appears only in dev captures, never on the live build.
- In-game hints never tell players to poke the plaque; only the external copy does.
- Peg knobs are 3.3 cm (about 3.4-4.4 degrees) and meet the hand and gaze minimums. Only tabs and threads are undersized.
- Narrowing the gaze cone to 2.5-3 degrees would remove useful slop; keep the 5 degree default.
- Do not set `eyeTracking: false`.
- The 3.5 cm release snap already absorbs normal drift on 22 of 24 levels.
- The hands-first hard requirement is met: no controller-only path exists, and recovery through the system menu works by hand.

**Placement and room**
- "First melody within seconds (tested)" is accurate (2.0 s from chute to note, measured in physics time).
- The board does not visibly clip into a desk 0.5 m away: the base extends only 3 cm back and 8 cm forward, and there's no occlusion.
- Do not add `world.features.fieldOfViewMask`; it fails manifest validation in rc.2.
- Ticket 09's "visual-only tilt" is not a valid option; it would put the rendered board out of step with the physics.
- Pegs and threads are seen against the opaque walnut back panel, not the room.
- Dropping meshDetection or anchors won't remove the spatial-data prompt; plane detection triggers it.
- "Settles on your real table" is figurative and does not promise an animation.
- Anchors would not change same-seat placement, which is already deterministic, and the 3 s wait applies only when no table is found.

**Colour, stars and physics**
- Teal and azure marbles never share a level. Amber vs azure stays at ΔE 106 or more under every simulated colour deficiency.
- Unlit star rings pass contrast (6.49:1). The real defect is lit stars on the solved header.
- "Stars always 3" is slightly wrong: 2 stars are possible on w1-01, w1-02 and w4-01. 1 star is impossible everywhere.
- 90 Hz cadence is effectively covered by the slow-motion proof at 60 Hz, and single-marble paths don't depend on frame rate.
- Ticket 08's "HARD" allocations are mostly not per-frame and are invisible to judges.

**Copy, awards and rules**
- Naming several awards doesn't dilute the pitch; the one-prize limit caps what you win, not what you're considered for.
- The IWSDK scaffold's agent tooling (.agents, .claude, .cursor) is standard and harmless; .codex isn't tracked.
- Removing Meta's MIT header from scaffold-derived files would breach the license.
- The third-party asset rule is already met; only attribution is missing.
- The name collision is neither a brand-name rule violation nor a Stage One issue.
- A Quest-only copy is not a Stage One risk; Quest is a Meta VR device.
- Web Speech voice would very likely do nothing on Quest. Don't build or claim it.
- Social & Multiplayer and Agentic are not targets; no work is needed.

---

## 6. Strengths to lead with

**In the video (first 30 s)**
- A live pinch-pull on a board with two or more pitches: the thread stretches and twangs at its note, a second thread sounds a different note, then a chute pinch plays a 3-note phrase (after D3). Title card by about 0:08.
- Story line: "Your hands are the instrument."
- No menus and no controllers. Every control is on the box: ledge buttons you can pinch, the plaque flips to settings, and threads and the chute are pinch targets.
- The ghost hand teaches the gesture in one short line; the first melody plays 2.0 s after the chute pinch.
- The walnut-and-brass music box lands on a table found by WebXR plane detection (shown in IWER's living_room, labelled; a real-table tester clip if one arrives).

**In the submission text**
- **The original idea:** one thread length sets its pitch, its bounce (restitution 0.95 to 0.3) and its spool cost, so you hear how springy a thread is the moment you make it (threadTuning.ts:15-25, threadRules.ts:29-40).
- **Real plucked-string synthesis:** Karplus-Strong per pitch, no samples, no licensed audio.
- **Seated, two-foot design measured on every level** (0.553 m default, 0.609 m at the Farther limit). Slow motion dilates time, so every solution stays valid. One-handed height and distance controls. Clean pause and resume on the system menu or headset off.
- **Engineering rigor that is rare for a solo entry:** 236 unit tests; every level proven solvable and not self-solving under real physics at normal and slow speed; hands-only full-level and gaze-plus-pinch runs in emulated XR; a draw-call budget (55 of 80 per view); CI-gated deploys. State plainly that it was built without a headset.
- **Zero install and privacy-clean:** free, served from GitHub Pages, no network calls or analytics, progress stays in the browser, guarded reset.
- **Colour is always paired with a shape** (amber triangle, azure circle). The pair stays distinct under protan, deutan and tritan simulation.
- **Best First Five Minutes case:** the ghost-hand demo on the real solution pegs, a hint line of 60 characters or fewer, the tutorial returning after a miss or a snip, and a payoff inside a minute.

Nothing was edited or created during this audit. The decisions above were checked against `/Users/sebastienhenry/Documents/Hackathons/Meta VR Start Developer Competition 2026/.scratch/week7/issues/09-decisions-for-user.md` and `/Users/sebastienhenry/Documents/Hackathons/Meta VR Start Developer Competition 2026/docs/submission.md`.