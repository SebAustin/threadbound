# 10: End-of-week-6 review fixes

**What to build:** fix the findings from the two-axis review of `5a0f7af..HEAD`, test-first wherever behaviour changes.

**Blocked by:** 01–08

**Status:** done

## Spec axis (behaviour)
- [x] **S1 Saves resume at the wrong level.** `progress.unlocked` is an index, and the new W2/W3 levels shifted every later index (an old save at w3-01, index 10, resumes at w2-05). Decision: resume is derived from solved level *ids* (`resumeIndex(levels, best)`: the first unsolved campaign level, else the last), so inserting levels can never misplace a save. Unit test with a save from before the insert.
- [x] **S2 The contact shadow is invisible on the virtual table** (it sat 1 mm under the table top). Decision: lift it just above the base's underside, with polygon offset against z-fighting. When raised off the table it reads as the case's own soft underside, which is accepted.
- [x] **S3 The limiter doesn't limit** (the default compressor has a 30 dB knee and 3 ms attack). Decision: a hard knee, fast attack and high ratio near 0 dBFS.
- [x] **S4 Ambience plucks during a drop** and can be mistaken for a bounce. Decision: ambience rests while marbles are dropping.
- [x] **S5 A zero-bounce solve saves an empty tune** that then "replays" as a fallback note. Decision: an empty melody isn't written to the book.
- [x] **S6 The passthrough backdrop has no before/after screenshot.** Capture an AR before (the art files from 20beebb) and after.
- [x] **S7 Record decisions** in the tickets: the cue envelope is the string synth's fixed pluck decay (the table sets pitch and gain); failure cues are deliberately off-scale; the sun, peg and table geometry are feature-code primitives, not manifest models, so build-model wasn't required.

## Standards axis
- [x] Register PerfProbeSystem in `src/index.ts` (DEV-guarded), not inside the test hook.
- [x] Remove fixed sleeps in the XR melody steps (poll instead).
- [x] Name the magic numbers in the wood grain, contact shadow and sun icon.
- [x] Document that palette.ts is runtime-only (it builds DOM canvases, so it must never be imported by the asset manifest or the editor realm).
- [x] Every sound goes through the cue table: add `thread` and `bounce` cues (per-event pitch and gain), so nothing bypasses the table or the cue log; `play(name, hz?, gain?)`.
- [x] One `stringSynth.tap()` (unlock + button cue) for ledge and plaque presses.
- [x] Single source for fallback and ambience pitches (from CUES); cap the melody at capture time (no slice at completion).
- [x] Ambience moves to its own `AmbienceSystem` (store subscription, not per-frame polling); EnvironmentSystem keeps visuals only. `mergeParts` moves to a shared feature module.
- [x] Rename `peg-knob` to `peg-body`; comment `ownerOf`'s regex; fix the `PuzzleState.melody` doc; type `cues()` as `CueName[]`; the perf probe throws instead of returning -1; the xr-probe field is named for its draining side effect; remove the duplicate xr-lib header.
- [x] CONTEXT.md: Melody book, Cue.

## Accepted, not changed
- Merging pegs and table was below the "only if over budget" line in the spec, but justified by the ticket's 25% headroom rule (61/80 left 24%).
- Hinge solves with 0 threads at par 1 (the schema needs par of at least 1), and Rail Yard (par 1) follows Crossfade (par 2): difficulty in World 3 comes from slides, not thread count.
- Poking the stars on a daily does nothing (dailies don't keep tunes).
- XR draw calls (multiview) are verified in week 7's Stage 1 checks, with the emulator in an XR session.

## Comments
- **S1** RED was confirmed against the old code: a pre-insert save (w1-01..w2-04 plus w3-01) resumed at **w2-06** (its stale index 11). Fixed: it resumes at w2-05 by id. Unit test `resume.test.ts` plus E2E `resume-insert` (a real frame reload; in the chain).
- **Found while capturing S6:** entering AR (`place`) rebuilt the level with `loadLevel`, which **wiped the player's threads**. `place` and `resetPlacement` now go through `relocate()` (RED: threads 0, then GREEN: 1). The check lives in raise-lower.e2e.
- S2: the shadow now sits 0.8 mm above the base's underside (flush with the table top), with polygon offset. S3: limiter at -3 dB threshold, hard knee, 20:1, 1 ms attack. S4: `ambienceRests` (unit tested) runs in a new `AmbienceSystem` that tracks its inputs by subscription. S5: an empty tune is never written (unit test).
- S6 evidence: `.scratch/week6/ar-review.jpg` (passthrough before/after with the headset aimed at the diorama) and `art-review.jpg` (the study).
- Trap while capturing: the stale Vite overlay from a brief compile error spoiled the first captures, and `dev restart` dropped `--allow-browser-automation`. Restarted with `--headless --allow-browser-automation` (the same mode) and added a `no-overlay` guard script.
