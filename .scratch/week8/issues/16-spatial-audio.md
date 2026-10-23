# 16: Positional plucks and cup chimes (P2)

**What to build:** (line numbers are main at 83977c8; after tickets 01 and 10, find them again by symbol.) In an XR session, each cue that comes from a place on the diorama is heard from that place, relative to the player's head. Placement and this are the room's whole role (ADR 0006). Every other sound, ambience included, stays as it is.
- **Which cues, in the cue table** (src/lib/soundCues.ts:31-52): `Cue` gains `positional?: true`, set on `bounce`, `thread`, `cupCorrect`, `cupWrong` and ticket 10's `cadence`. `cupWrong` is included because it tells the player which cup took the marble, which is how sorting is followed by ear (gap-analysis.md:183). `ambience`, `button`, `pegGrab`, `refused`, `settle`, `snip` and `melody` (the replay) stay non-positional.
- **Pure mapping, new `src/lib/cueSpace.ts`** (frame coordinates as `Vec3` from src/lib/vec.ts, no Three.js):
  - `threadSource(ax, ay, bx, by)`: the thread's midpoint at z = 0, the same for a→b and b→a.
  - `cupSource(range)`: a cup's centre (`GoalRange`, src/features/diorama/buildDiorama.ts:31-36) at half its wall height (`GOAL.wallHeight`, src/config/constants.ts:128-131). `cadenceSource(ranges)`: the mean of the cup centres.
  - `cueRoute(cue, source, immersive, liveSpatial)` returns `'spatial'` only for a positional cue that has a source, inside an XR session, while fewer than `MAX_SPATIAL_VOICES` spatial notes are ringing (8, an assumption). Otherwise it returns `'mono'`.
  - `PANNER`: `panningModel` 'HRTF', `distanceModel` 'inverse', `refDistance` 1 m, `rolloffFactor` 1. Every seated source is closer than 1 m (the 0.61 m reach in tests/e2e/xr-full-level.sh:33), so a positional cue is panned but never changes volume.
- **Use IWSDK's listener:**
  - IWSDK always registers an `AudioSystem` (node_modules/@iwsdk/core/dist/init/world-initializer.js:420-423). It puts a Three.js `AudioListener` on `player.head` (audio-system.js:73-74), which writes the head pose into its context's `listener` every frame (node_modules/three/src/audio/AudioListener.js:175-200).
  - `stringSynth.unlock()` (src/features/audio/stringSynth.ts:26-49) uses that same context, from Three's `AudioContext.getContext()`, instead of calling `new AudioContext()` (:32). Import it from `@iwsdk/core` under an alias, because its name shadows the DOM global. The game then runs one audio context instead of two.
  - `state` still reads 'locked' until `unlock()`. The master gain, the limiter (:35-43) and the `CUE_CEILING` clamp (:57) don't change.
- **Routing in `stringSynth`:**
  - `play(name, hz, gain, source?)` (:55-58) takes an optional world point and copies its numbers.
  - For `'spatial'`, `pluck` (:66-81) puts a `PannerNode` with `PANNER` settings at that point, between the note's gain and the master. `source.onended` disconnects it and lowers the live count.
  - A `'mono'` cue, or a panner that throws, connects straight to the master as today (:79).
  - `setImmersive(on)` is called from `AudioUnlockSystem.watchSession` (src/features/audio/AudioUnlockSystem.ts:27-33). The head is only tracked inside a session (node_modules/@iwsdk/xr-input/dist/rig/xr-origin.js:63-64), so the browser stays mono.
- **Call sites:** each converts its frame point to world space with `puzzleStore.frame.localToWorld` (src/features/diorama/dioramaFrame.ts:19-21), writing into a scratch `Vector3` kept as a class property. They are:
  - the bounce in `detectPlucks` (src/features/marbles/MarbleSystem.ts:239-242);
  - the cup chime and the wrong-cup thud (:270, :291), with `reject` taking the cup index. Ticket 15's `cupRejected` event needs the same parameter: whichever of 15 and 16 lands first adds it, and the other reuses it;
  - ticket 10's live cadence strum on a solve (the melody-book replay's cadence passes no source and stays mono);
  - a new thread (src/features/threads/ThreadSystem.ts:312).

  `AmbienceSystem` (src/features/audio/AmbienceSystem.ts:37) passes no source.
- **Cue log:** `recordCue` (src/features/audio/cueLog.ts:11-15) also stores `source` (world metres rounded to 1 mm, or null) and `spatial` (whether the cue went through a panner). Ticket 10's `cueTrace()` records carry both fields. `cues()` still returns names only, so melody-book, first-melody and sound-cues read it unchanged.
- **DEV hook** (src/features/debug/testHook.ts:229-238): a new `listener()` returns the position of the synth context's listener (null while locked) and the world position of `world.player.head`.
- **Copy:** no copy changes in this ticket. Once the XR check passes, week 9's final copy pass (.scratch/week9/spec.md:18) may say that plucks and cup chimes are positional in XR.

**Blocked by:** 10

**Status:** ready-for-agent

- [ ] Unit: new tests/unit/cueSpace.test.ts:
  - `threadSource` is the midpoint at z = 0, whichever way round the thread is given;
  - `cupSource` is the cup's centre at half wall height, and `cadenceSource` is the mean of the cups;
  - `cueRoute` gives `'spatial'` for a bounce with a source in a session, and `'mono'` in the browser, with no source, at `MAX_SPATIAL_VOICES`, and for ambience even with a source;
  - `PANNER` is HRTF, with `refDistance` at least 0.75 m.
- [ ] Unit: tests/unit/soundCues.test.ts: exactly `bounce`, `thread`, `cupCorrect`, `cupWrong` and `cadence` are positional.
- [ ] E2E: tests/e2e/sound-cues.e2e.mjs (:25-34) solves and drops w1-01 (the file is already in the chain). Then:
  - every `bounce` and `thread` record's `source` is within 1 mm of `worldOf` the a-b midpoint;
  - every `cupCorrect` record sits at its cup's centre;
  - every record is `spatial: false`, because the browser is mono;
  - the existing check still finds one `cupCorrect` per scored marble;
  - ambience records (:67-70) carry `source: null`.
- [ ] XR: new tests/e2e/xr-spatial-audio.sh, added to `test:e2e:hands` (package.json:19):
  - seat at the table and unlock audio with a pinch, as xr-full-level.sh:10-21 does, then run `probe load0` and `probe solve`;
  - xr-probe (tests/e2e/xr-probe.e2e.mjs): ticket 01's single `cueDrain` drains `cueTrace()` instead of `cues()`. `melodyNotesDrained` stays, and the positional records are new `CUE_FIELDS` entries, all derived in Node from that one drain. It reuses ticket 10's `cups` field for the cup centres and adds only a `listener` `PROBE_FIELDS` entry (`listener()`);
  - pass if there is at least one bounce, and every bounce is `spatial: true` and within 2 mm of `threadMid` (:50);
  - the live strum's three `cadence` records have the mean of the cup centres as their source. Check the live strum only: ticket 10's solve replay plays no cadence, and a melody-book replay's cadence has no cup position, so it is mono with a null source;
  - the listener is within 2 cm of the head, and still is after `iw xr set-transform` moves the headset 0.4 m sideways.
- [ ] XR: same script, after `xr_stop`: one canvas click through `iw browser run` (lib.mjs `click`, tests/e2e/lib.mjs:65) brings `audio()` back to 'running'.
- [ ] Check: `npm run --if-present typecheck`, `npm test`, `npm run test:e2e` and `npm run test:e2e:hands` pass.
- [ ] Human: in an IWER passthrough session with headphones, a bounce on a thread to the left of the head is heard on the left. This box doesn't hold the ticket's `done` or ticket 17's gate.

**Effort:** S (~1 day)

**Gaps closed:** #72 (positional plucks and cup chimes only; marble foley stays out)

**Risks:**
- IWSDK's AudioSystem suspends its context when a session ends and resumes it when the next one starts (audio-system.js:38-67). Sharing that context means that after leaving XR, the game is silent until the next DOM pointerdown resumes it through `unlock()` (stringSynth.ts:27-28, AudioUnlockSystem.ts:18). The exit check guards this.
- If IWSDK's listener turns out not to drive the context's `listener` (the listener-follows-head check fails), copy `player.head`'s world pose into it from an allocation-free `update` in AudioUnlockSystem. Don't add a second `AudioListener`.
- HRTF panners cost more than plain gains, and their cost on Quest is unmeasured (we test in the emulator only, ADR 0002). `MAX_SPATIAL_VOICES` keeps a busy drop (w2-06) bounded. Automation can't hear, so the checks prove routing and positions, not the direction a player hears.
- Ticket 10 rewrites `detectPlucks`, the solve path and the cue log. Build on its `cueTrace()` instead of adding a second log, and remember that draining either `cues()` or `cueTrace()` empties both.

## Comments
