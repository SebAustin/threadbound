# Week 8: close the gaps judges will see

Status: ready-for-agent

## Problem Statement

On Oct 22, Threadbound was audited against the full competition brief: the four judging criteria, every special award, the hard requirements and the submission rules. The audit is in `gap-analysis.md`, with `gap-analysis-followups.md` covering what the completeness critic added. After every finding was adversarially verified, 77 gaps stood. The audit's scores today: Innovation 5, Experience Design 6, Technical 5, Polish 3. It expects 7 / 7.5 / 6.5 / 7.5 after the top fixes.

The gaps that matter most:
- **No video.** It isn't recorded yet, so the entry would fail Stage One.
- **The melodies mostly don't vary.** "Every solution is a melody", but 17 of 24 solutions play one repeated note.
- **The copy overclaims.** The puzzle is a flat board a mouse can solve, yet the copy says it depends on hands and on purposeful mixed reality.
- **There is no device evidence.** Even the deployed production build has never run in an XR session, emulated or real.
- **Stars are automatic.** 21 of 24 levels cap threads at par.
- **The judged build isn't protected.** Every push to `main` redeploys it.
- **Shared headsets miss the onboarding.** A judge on a headset someone already played never sees the ghost hand.

The deadline is Nov 18, 2026, 12:00 PT. The code freeze is Nov 14, and the target submission day is Nov 17.

## Solution

Every decision below was made by the user in the Oct 22 grilling session. Where a decision has an ADR, it is named.

- **Scope:** keep Threadbound as the Entry (Gaming track, New Experience division). Development stays emulator-only (ADR 0002). There is no Quest (confirmed Oct 23), so community testers (ticket 04) are the only source of real-device evidence, and the copy says plainly that the game was built and verified in the emulator.
- **Award target:** Best First Five Minutes is the headline. Name Best Reason to Come Back and Best Accessibility Forward only for features that ship.
- **Melody** (ADR 0004): a thread's length sets its **root**. Each further bounce on that thread plays the next note of its climb: up the pentatonic scale from the root to the top, then down from just below the root, then from the root again, so all ten notes sound before one repeats. This revises the Q27 "turn back down" wording, which the user approved on Oct 23 (Q40); a plain mirror gave w1-03 only two notes. All of a drop's marbles share the climb, and every drop starts again from the roots. Preset threads climb like any other. A solve closes on the cups' **cadence**; a drop that misses ends without it. The replay keeps the real bounce timing.
- **Stars** (ADR 0005): one star for the solve, one for using par threads or fewer, one for solving on the first drop since the level loaded or restarted. The thread limit is par + 1 on every level. The settings face shows a "Stars N/72" total.
- **Skip:** after three drops that end without a solve, the settings face offers a skip. The skipped level earns no stars and stays unsolved. A returning player resumes past it. The ending, and reopening on the daily, need real solves.
- **The room** (ADR 0006): it places the board and shapes nothing else. Placement becomes robust. Plucks and cup chimes become positional. The copy drops "Purposeful mixed reality" and "Passthrough is the stage". Persistent anchors stay future work.
- **Field of view and the ledge:** the hint line and the thread count move from the plaque to the **ledge**, within reach. The plaque keeps the title, world progress and best stars. Gaps between controls widen to 12 mm, and Nearer is capped at +2. The "gear button" becomes the **settings button**.
- **Guest play:** a `?fresh=1` link plays from the first level without reading or changing the save. A finished campaign reopens on today's daily.
- **Level name:** the World 4 level "Budget" becomes "Thrift" (Q42). Its id `w4-03` stays, so saves still work.
- **The daily:** each daily gets a name of its own, not its campaign board's name. It only uses mechanics the player has reached. The sun pulses while today's daily is unsolved. Mirrored variants are a week 9 stretch.
- **Return-visit hints:**
  - after a level's first solve: "Pinch the stars to hear it again";
  - a play-all in the melody book;
  - on return: "Today's daily is ready · streak N".
- **Accessibility:**
  - a high-contrast toggle;
  - visual captions: a flash on a wrong cup, a star pulse for each replayed note, a ledge line explaining a failed drop;
  - the lit-star contrast fix.

  No gaze-dwell and no voice.
- **Pinch-only:** snipping and melody replay are pinch-only, and the copy stops saying "poke".
- **Copy and housekeeping:**
  - honest claims throughout;
  - a Hand Interactions answer drafted (the user writes "what excites you about VR" personally);
  - team line "Sebastien Henry, solo developer (design, code, audio)", and "I" instead of "we";
  - launch date Q1 2027 on the Meta Horizon Store as a packaged web app, "title subject to trademark check";
  - an MIT LICENSE plus THIRD_PARTY_NOTICES, keeping Meta's headers;
  - content tier 10+;
  - an accurate privacy note;
  - `.scratch/` and the agent tooling stay public.
- **Deploys:** docs changes stop triggering deploys, and a CI smoke test checks the production build before upload. The full local regression runs before every push. At the freeze, a `v1.0` tag becomes the only thing that deploys, and pushes to `main` are blocked until about Dec 11.
- **Video:** dry-run the capture pipeline this week. The final takes are Nov 11-13 on the release-candidate build: the user runs OBS and the agent scripts the takes. The narration is the user's own voice, or captions only. Emulator shots carry a "Recorded in the IWER emulator" caption. A tester's footage is used only with their written permission and after a frame-by-frame check.
- **Real-device evidence:** run the deployed build in an emulated XR session. Rewrite `docs/forum-post.md` with specific asks and a footage-permission paragraph, and draft a short message for a Start program mentor (Q43). The user posts both this week.

## Schedule

| Dates | Work |
|---|---|
| Oct 23-24 | Prerequisites: tickets 01-05 |
| Oct 25-Nov 4 | Must-ship: tickets 06-16, then 17 (regression and review) |
| Nov 5-10 | Week 9: stretch items and fixes from tester reports. Feature freeze Nov 10 |
| Nov 11-13 | Final video takes, stills, GIF, thumbnail |
| Nov 14 | Freeze and tag (week 7 ticket 05) |
| Nov 15-16 | Video edit and upload |
| Nov 17 | Submit |

**Checkpoint, Oct 30 (Q39).** The tickets estimate about 25 days of work for 13 calendar days. But Oct 3-4 alone shipped weeks 3-7 with agents, so the full scope stays. If tickets 06-12 aren't done by Oct 30, these move to week 9, first to go first:
1. 08's welcome-card restyle
2. 12's new settings-button icon (the label stays)
3. 07's facing-gate and study-table fixes
4. 16, spatial audio (the copy then says the room only places the board)
5. 14's melody-book play-all
6. 10's celebration extras (star stagger, thread shimmer)
7. 15's high-contrast toggle and star pulse (Accessibility then stops being named)
8. 11's snap highlight and miss cue

11's larger hit areas and steadier release go last, if at all, because they address Meta's minimum target sizes.

**No tester by Nov 7 (Q44).** If no real-Quest report has arrived by Nov 7, nothing extra gets built. The submission says the game was built and verified in the emulator, the fps line describes the draw-call budget instead of a measured number, and the video uses emulator footage only. The brief allows emulator footage.

## User Stories

1. As a judge, I want the first minute to teach the pinch, play a real phrase and reward me, so that the opening earns Best First Five Minutes.
2. As a judge on a headset someone else already used, I want a fresh start that shows me the onboarding, so that I judge the real first five minutes.
3. As a judge, I want each solve to sound like a tune, not one repeated note, so that "every solution is a melody" is true.
4. As a judge, I want stars that reward thrift and foresight, so that there is something to chase.
5. As a judge, I want hints and counts within reach and in view, so that a narrower field of view doesn't hide what matters.
6. As a judge, I want the board to land on my table and stay there after a recenter, so that the mixed reality holds up in a room the developer never saw.
7. As a judge, I want Enter XR to work with a long or wobbly pinch, and a clear message on a browser without XR, so that I never hit a dead button.
8. As a judge, I want every control to show hover and press, so that I know what I'm touching.
9. As a stuck player, I want to skip after three misses, so that I still see the later worlds.
10. As a returning player, I want to be told that today's daily is waiting and to hear my melodies, so that I have a reason to come back.
11. As a low-vision player, I want a high-contrast mode, and visual signs for sound-only events, so that I can play without relying on color or sound.
12. As a judge, I want the README and submission to claim only what the build does, so that an AI-assisted cross-check finds no overclaim.
13. As the developer, I want deploys gated by a production smoke test and frozen at the deadline, so that the judged build can't change or break under the judges.

## Implementation Decisions

- **Melody:** stays a presentation concern. The physics, the restitution and the level solutions don't change. The note for a bounce comes from the thread's root plus its climb count within the current drop. Melody-book entries gain optional timing, and entries saved before this change still replay with the old fixed step. The 16-note cap stays.
- **Stars:** every level file's `maxThreads` becomes `par + 1`. The level schema rejects any other value, and stays within its existing maximum of 8. "First drop since the level loaded or restarted" is puzzle state that resets on load and on Restart.
- **Skip:** progress records which levels were skipped. The resume rule passes over skipped levels. "Campaign complete" needs a real solve (best > 0) on every level. The progress schema migrates older saves.
- **Placement:**
  - the search timer runs only while the page is visible;
  - while the level is idle with no threads, the search continues for 15-20 s;
  - the reference-space `reset` event places the board again;
  - the board stays hidden until its final pose, then fades in;
  - a table is accepted only while every control stays within 0.61 m (2 ft) of the seated head (Q41), so "within a seated 2 ft" holds on every accepted table;
  - the contact shadow hides while the board floats;
  - a relocation waits while a drag is in progress.

  `iwsdk.config.json` turns off `anchors`, `meshDetection` and `grabbing`.
- **Enter XR:** uses `onTap` instead of `click`, with a DOM button fallback. When no immersive mode is supported, it says "Open in Quest Browser". A failed `World.create` shows a visible error.
- **Field of view:** an angular-extent unit test asserts that all essential UI fits a comfortable narrower field of view at the default pose and at the offset limits.
- **CI smoke:** runs the production build headless under `vite preview` with Playwright. It checks zero console errors, that the worker and wasm load, and that the build enters an emulated XR session.

## Testing Decisions

- **Test-first:** every ticket is written test-first, as in weeks 4-7. Unit tests cover the pure `lib/` modules. E2E and XR scripts cover behaviour through the command bus and real input.
- **Melody tests:** w1-01 and w1-03 must play at least 3 distinct notes. The same solution must play the same notes on every drop.
- **Level proofs:** re-run on all 24 levels after the thread-limit change, at normal and slow speed.
- **New XR checks:**
  - Enter XR with a long pinch;
  - a guest-play run;
  - a skip after three misses;
  - placement again after a recenter.
- **Wrap-up:** ticket 17 ends the week with a full regression and the two-axis review (Standards and Spec sub-agents).

## Out of Scope

- **Week 9 stretch:** finger-strum (only if the melody ticket lands by Nov 4), mirrored daily variants, extra XR tests, the soak test, the frame-time log, self-hosted hand models, cue timbres, the snip demo.
- **Out entirely:** a song star or echo levels (ADR 0004), capstone levels, persistent anchors (ADR 0006), depth occlusion, voice, gaze-dwell, a depth hit-test fallback, bending-string visuals, real-table puzzles, runtime field-of-view adaptation, social and agentic features.
- **The user's actions:** posting the forum request, recording and uploading the video, submitting.

## Further Notes

- **Ticket 08 work:** its uncommitted changes from Oct 4 were rescued to local branch `wip/ticket-08-standards` (not pushed; some tests were failing on Oct 4). Ticket 01 finishes and merges it first, because it changes the same drag code as tickets 07, 11 and 12.
- **Install scripts:** `npm ci` (npm 11) skips install scripts until approved. `onnxruntime-node` and `protobufjs` are approved in `package.json`. `esbuild` and `@meta-quest/metavr` aren't; nothing needs them yet.
- **Glossary:** `CONTEXT.md` was updated during the grilling session: **Thread limit**, **Star**, **Ledge**, **Root**, **Cadence**, **Skip**, **Guest play**, plus revised **Melody**, **Plaque**, **Daily**, **Snip**, **Melody book** and **Settings face**. Use those terms in code names where they don't fight the level schema (`maxThreads` and `goals` stay).
