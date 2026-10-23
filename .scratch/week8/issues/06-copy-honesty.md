# 06: Copy honesty sweep and submission housekeeping (P1)

**What to build:** judge-facing copy in `README.md`, `docs/submission.md` and `docs/video/script.md` that claims only what the build does, the missing form answers, an MIT `LICENSE` plus `THIRD_PARTY_NOTICES.md`, a copy-lint unit test that keeps the overclaims out, and one XR check behind the new privacy claim. Wording rule: "pinch" for pegs, threads, the chute, plaque controls and the stars (all ray-only, gap 9); "press" for ledge buttons (pinch or fingertip, `PokeInteractable` at src/features/diorama/buildDiorama.ts:267).
- **Remove or reword:**
  - "Purposeful mixed reality" (README.md:33) and "Passthrough is the stage" (docs/submission.md:73, also :31-32): the room places the diorama on a detected table, nothing more (ADR 0006).
  - "The core loop depends on hands and real-world scale" (submission.md:72); "A new daily puzzle every day" (script.md:33) becomes a daily puzzle on a tight spool, with a streak.
  - every "poke" (README.md:19-22, submission.md:40, :74, :98, :105-107) and "gear" (README.md:20, submission.md:105), which becomes the **settings button**. The script's stars line (script.md:28-29) and settings-button line (:36) are ticket 05's; in `docs/video/*` this ticket edits only script.md:17 and :33, and the copyHonesty lint below checks the rest.
  - "distinct" and "off-scale" failure sounds (submission.md:85, :97). The 98/110 Hz cues (src/lib/soundCues.ts:42, :45) are scale notes below the C4-A5 melody range (src/lib/threadTuning.ts:4-7): say "low and dull, below the melody".
  - "each one carries its own shape" (script.md:17): glyphs sit on cups and chutes, not marbles (buildDiorama.ts:154, :173). Also "cozy" (README.md:35, submission.md:45).
- **fps:** "within the frame budget" (README.md:51) and "A frame budget is enforced by tests" (submission.md:74) become a draw-call budget checked on every level (busiest 55 of 80 per view); Quest frame rate is not measured.
- **2 ft** (README.md:38, submission.md:73): "within a seated 2 ft in the study pose and on the emulator's table". The study pose is `DIORAMA_DEFAULT_POSITION` (src/config/constants.ts:7), checked on every level at the default offset and Farther -2 (tests/e2e/reach.e2e.mjs:7-11). The table is level 1 in XR (tests/e2e/xr-full-level.sh:26-33). Don't claim it for Quest's no-table pose or for every accepted desk: ticket 12 measures the Quest pose (estimate 0.66 m at Farther -2), and week 9's copy pass owns the final wording.
  - **User decision:** with ticket 07's `ACCEPT_REACH` at 0.61 m the table half of the claim holds; at 0.75 m the copy drops "2 ft" for tables.
- **XR claims:** README.md:60 "every ledge button and plaque control" becomes what tests/e2e/xr-controls.sh pinches: the chute, a thread, Restart, the settings button, Slow-mo, the sun and the stars. Controllers (README.md:32, submission.md:41-42): drop the claim and keep the mouse. No XR test plays with a controller; week 9's controller mode test (.scratch/week9/spec.md:11) decides whether the claim comes back.
- **"I", not "we":** submission.md:30-31, :34, :50.
- **Melody:** keep "every solution is a melody" (README.md:14, submission.md:23, :72) and the script's "every solution is a song" (script.md:17), each with `<!-- true once week 8 ticket 10 lands; re-check in week 9's final copy pass -->`.
- **Innovation row** (submission.md:72): "one length, three effects": a thread's length sets its pitch, its bounce and its spool cost (src/lib/threadTuning.ts:15-25, src/lib/threadRules.ts:28-39), across 24 levels in four worlds.
- **Awards** (submission.md:77-86): Best First Five Minutes is the headline. Best Reason to Come Back and Best Accessibility Forward become bracketed `[if shipped]` author notes naming what they wait on (ADR 0005 stars, return hints, play-all; high contrast, visual captions). README.md:29 drops "for using few threads".
- **Add to submission.md:**
  - a tagline (:15) of 120-140 characters. Draft (135): "Pinch elastic threads between brass pegs, drop the marbles, and hear your solution play. A seated hand-tracked puzzle in Quest Browser."
  - a Hand Interactions answer: pinch-pull peg to peg by ray or up close, pinch to snip, pinch the chute and the stars, press ledge buttons, gaze plus pinch, the ghost hand, no controller needed. Tested in IWER only (hand-pinch.sh, xr-full-level.sh, xr-controls.sh, gaze-pinch.sh).
  - "What excites you about the future of VR": a `**[author writes]**` placeholder only.
  - Team: "Sebastien Henry, solo developer (design, code, audio)".
  - launch (:65-66): "Q1 2027 on the Meta Horizon Store as a packaged web app, title subject to trademark check".
  - one scoped glasses line in What's next: hands-only and gaze plus pinch are proven in IWER; it has never run on glasses.
  - **Content and privacy**, after Accessibility notes, plus one README "What's in it" bullet: ages 10+ (Meta Content Guidelines); no accounts, analytics, ads, purchases or chat; progress stays in this browser (src/lib/storage.ts:40-46); in XR, hand and controller models load from jsDelivr.
  - testing instructions (:100-107): run Space Setup and allow spatial data, or the diorama floats; press Restart (leftmost ledge button) to start a level over. Leave out `?fresh=1` here and in README "Try it in two minutes" (README.md:16): week 9's copy pass adds it once ticket 09's deployed guest-play check passes. It is already on ticket 17's copy list (17-regression-and-review.md:26).
- **LICENSE:** MIT, "Copyright (c) 2026 Sebastien Henry", plus a line that files carrying Meta's header (src/index.ts, src/panel.ts, src/components.ts, src/assets.ts, vite.config.ts) are Copyright Meta Platforms, Inc. and affiliates under the same terms. Those headers stay unchanged. README gets a one-line License section.
- **THIRD_PARTY_NOTICES.md:** name, version, license and copyright for what ships: `@iwsdk/*`, `three` (super-three), `@babylonjs/havok`, `elics`, `@preact/signals-core`, `three-mesh-bvh`, `@pmndrs/uikit*`, `zod`, the Inter font (SIL OFL 1.1, via `@pmndrs/msdfonts`), and `@webxr-input-profiles/assets` (fetched at runtime).
- **Tracker:** .scratch/week7/issues/09-decisions-for-user.md gets `**Status:** done` and a Comments line pointing to .scratch/week8/spec.md: #1 ADR 0005; #2 high contrast and visual captions, no gaze-dwell or voice; #3 ADR 0006; #4 the ledge move and 12 mm gaps.
- **Not this ticket:** in-game "Poke the sun" (src/lib/hud.ts:58, :60) names a pokeable ledge button, and hint text belongs to the return-visit hints ticket.

**Blocked by:** 05's merged docs change (script.md:28-29, so the copyHonesty box passes once 05's stars line replaces "poke"), not 05's `done`: its OBS dry-run box waits on the user; 02 (merge after its step-4 log push)

**Status:** ready-for-agent

- [ ] Unit: new `tests/unit/copyHonesty.test.ts`, written first and failing on today's docs: README.md, docs/submission.md and docs/video/script.md contain none of "purposeful mixed reality", "passthrough is the stage", "depends on hands", "new daily puzzle every day", "off-scale", "carries its own shape", "cozy", "frame budget", nor the whole words gear, poke/pokes/poked, we, our.
- [ ] Unit: the submission tagline is 120-140 characters, and submission.md has the Hand Interactions, future-of-VR, Team (exact line), launch ("Q1 2027", "Meta Horizon Store", "trademark") and Content and privacy ("10+", "jsDelivr") entries.
- [ ] Unit: LICENSE opens "MIT License" and names "2026 Sebastien Henry"; THIRD_PARTY_NOTICES.md names every package in package.json `dependencies` plus `@babylonjs/havok`, `@webxr-input-profiles/assets` and Inter; the five scaffold files still open with Meta's header.
- [ ] XR: new tests/e2e/xr-hosts.sh: fresh page, install a resource `PerformanceObserver`, enter XR with hands, list every cross-origin URL. Pass if the only host outside IWER's own named dev assets is cdn.jsdelivr.net under `/npm/@webxr-input-profiles/`. Add to `test:e2e:hands` (package.json:19); paste the list in Comments as the privacy note's evidence.
- [ ] Check: a claim audit in Comments maps every claim in README "What's in it" and "How it's tested" and in the criteria table to a file:line or test name, as week 7 ticket 03 did. No line claims controller play, and every "2 ft" names the study pose and the emulator's table.
- [ ] Check: `npm run --if-present typecheck`, `npm test` and `npm run test:e2e:hands` pass.
- [ ] Human: the user writes the future-of-VR answer and approves the tagline before submitting. This box doesn't hold the ticket's `done` or ticket 17's gate.

**Effort:** M (~1.25 days)

**Gaps closed:** #3, #9, #17 (copy), #38, #39, #40, #41, #57, #58 (privacy note; the config half is the placement ticket's), #60, #61, #62, #63 (#56 stays with ticket 12's measurement and week 9's copy pass); follow-ups "No Content Guidelines age tier" (gap-analysis-followups.md:371) and "No privacy or data note" (:394)

**Risks:**
- In dev, Vite serves hundreds of modules, so the default 250-entry resource-timing buffer is full before XR entry and the jsDelivr hand models would go unrecorded: install the observer before `xr enter` rather than reading `performance.getEntriesByType` afterwards. Name each allowed IWER host in the script.
- zsh function variables are global: declare `local` in xr-hosts.sh's helpers. Leave tests/e2e/xr-lib.sh unchanged; tickets 05 and 11 edit its pinch helpers.
- Copy written ahead of tickets 09, 10 and the stars, hints and accessibility tickets brings overclaims back: write what the build does on the day, keep `[if shipped]` brackets, and leave the final match to week 9's copy pass (.scratch/week9/spec.md:18). If week 9 self-hosts the hand models, the privacy note and xr-hosts.sh both change.

## Comments
