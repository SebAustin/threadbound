# 05: Video capture dry run and video-kit fixes (P1)

**What to build:**
- **Headed capture setup** in `docs/video/shot-list.md:7-15`. Replace `dev up --headless` (:9) with `npx @iwsdk/cli dev up --headed --allow-browser-automation`: headless gives no window, and Playwright adds `--mute-audio` only to headless launches. Name OBS as the tool: a macOS Screen Capture source on the managed Chromium window with its app audio captured (desktop audio and mic muted), base and output canvas 1920x1080, 60 fps, cropped to the app frame so the Runtime/Editor toggle and the certificate banner are out of shot. The dry run writes the measured crop into this section.
- **Emulator chrome hidden by staging:** new `tests/e2e/shot-preflight.e2e.mjs`, run by `tests/e2e/shot.sh` after the last `settle session` (:20), hides IWER's overlay host. That host is the shadow-root div beside the canvases (`node_modules/iwer/lib/device/XRDevice.js:218`; leave the devui canvas at :217 alone), and it holds the "Remote Control Active" pill and the blue edge glow (`node_modules/@iwer/devui/lib/index.js:145-171`). Hiding the host, not the pill, also covers the manual emulator controls IWER swaps in 30 s after the last command (`node_modules/iwer/lib/remote/RemoteControlInterface.js:202`). In browser-view shots the preflight hides the "Enter XR" pill host (`devui/lib/index.js:70-72`) and ticket 08's DOM `#enter-xr` button (bottom centre); whichever of 05 and 08 lands second adds `#enter-xr`. It returns what it hid, `__threadbound.audio()`, the canvas size, and whether a `vite-error-overlay` is up (`tests/e2e/no-overlay.e2e.mjs`). shot.sh prints these on its "start recording" line (:21-23) and exits 1 if any chrome is still visible, audio isn't `running`, or the Vite overlay is up.
- **Audio unlock:** `tests/e2e/shot-setup.e2e.mjs` ends with one real click on an empty canvas corner through `click` (`tests/e2e/lib.mjs:65`), which fires the document pointerdown unlock (`src/features/audio/AudioUnlockSystem.ts:18`). IWER's scripted pinches may not count as a user gesture.
- **Smooth hands:** `glide_to`, `glide_pinch_at` and `glide_pinch_pull` in `tests/e2e/xr-lib.sh`. They aim once while staging (`set-transform` to `rest_hand_for` plus `look-at`, :40, :57-58) and then move only with position-only `xr animate-to` moves of 0.6-1.0 s, which IWER interpolates every frame. `rest_hand_for` is a fixed offset, so a pure translation keeps the ray on its target, and a pull from `rest_hand_for(a)` to `rest_hand_for(b)` sweeps the ray from a to b. The jump-based `pinch_at`/`pinch_pull` (:42-61) stay as they are for tests. New `tests/e2e/take.sh <shot>` performs the gesture for `three-cups`, `daily`, `settings` and `cold-open`. The other takes get scripted with the final takes (Nov 11-13).
- **Shot staging** (`SHOTS`, `shot-setup.e2e.mjs:11-30`):
  - Every shot resets settings to `DEFAULT_SETTINGS` (`src/lib/settings.ts:25`) unless it sets its own. Slow motion and the offset persist between takes.
  - `daily` (:25) seeds the save's streak to count 6, ending yesterday (key `threadbound.progress.v1`, `src/lib/progress.ts:5`, written in a seed pass before a `fresh_page`), and hangs the solution. The plaque then reads "Daily - streak 6" (`src/lib/hud.ts:42`), and the live chute pinch turns it into "Daily - streak 7".
  - `settings` (:27) hangs w1-02's solution with the settings face open. The take pinches Slow motion (`set-slow`), pinches the chute for a 2/3-speed drop, and pinches Raise (`set-up`) after the drop ends.
  - `cold-open` (:13) moves from solved w1-03 (one note) to w1-06 Encore. Its two solution threads have different roots (A4 and E5 by `pitchForLength`, `src/lib/threadTuning.ts:22-26`). a-b is hung and c-d is left for the live pinch-pull.
- **Script and shot list:** this ticket owns `docs/video/*`. Ticket 06 edits only `script.md:17` and `:33` (its copyHonesty lint then checks the whole script), and ticket 12's ledge move changes the `spool`, `daily` and `settings` lines when the final takes are scripted (Nov 11-13).
  - `script.md:3` says the narration is the developer's own voice, or captions only, with no synthetic voice.
  - Every section from 0:30 (:15-41) gets a short `Text:` line that carries it with the sound off.
  - The gaze shot is captioned "Emulated eye tracking (Quest Pro preset)".
  - The stars line reads "Pinch the stars to hear it again" (:28-29, shot-list :26).
  - Shot-list :28 and script :36 name the settings button and Slow motion.
  - The cold open (script :6-8, shot-list :21, which today says "On a real table") becomes a live pinch-pull on the two-pitch level, then a phrase of 3 or more notes, the title by 0:08 and the line "Your hands are the instrument.". It is marked "record after ticket 10".
- **Clearance block** in shot-list.md:
  - narration in the developer's own voice or captions only, with no synthetic voice;
  - English captions for every narrated line;
  - no music except the in-game audio;
  - every emulator shot captioned "Recorded in the IWER emulator. Grey shapes stand in for your room.";
  - nobody named but the entrant;
  - tester footage only with written permission and after a frame-by-frame review.
- **Dry run on today's build:** the agent stages and runs `three-cups` (w2-06: a sorting drop with bounces and cup chimes) while the user records 20-30 s in OBS. The clip stays out of the repo.
  - Run the headed dry run, and this ticket's own browser-driven scripts, before 01's regression starts or after 02's step-4 push (02's rule for a running regression). Afterwards, restart headless with `--allow-browser-automation` and wait for `browserCommandReady: true`.
  - The docs and scripts merge once the agent boxes pass, within the merge window under **Blocked by**, without waiting for the Dry run box.

**Blocked by:** none (merge before 02's step 1 starts, or after its step-4 log push)

**Status:** ready-for-agent (capture itself is ready-for-human: the user runs OBS)

- [ ] Unit: no `src/lib` change, so no new unit tests; `npm test` and `npm run typecheck` stay green
- [ ] E2E (write first): new `tests/e2e/shots.sh` (`npm run test:e2e:shots`) stages every shot in `SHOTS` through shot.sh. Each one exits 0, and the preflight reports: no visible "Remote Control Active" or "Enter XR" text in any shadow root (pierced as `clickCanvas` does, `lib.mjs:77`), no visible `#enter-xr` once ticket 08 has landed, audio `running`, no Vite overlay, and settings at their defaults
- [ ] E2E: `daily` stages showing "Daily - streak 6", and its take ends showing "Daily - streak 7" (read from `hud().model.worldLabel`, as `daily.e2e.mjs:49` does)
- [ ] E2E: the `settings` take ends with `slowMotion` true, the level solved and `offset.up` at 1. `cold-open` stages w1-06 with a-b present and c-d absent
- [ ] XR: in a fresh session, `glide_pinch_pull` from a to b on level 1 makes thread a-b, and `glide_pinch_at` on the chute solves it (a new block in `tests/e2e/hand-pinch.sh`, beside the jump-based checks)
- [ ] XR: after shot.sh prints "start recording", take.sh moves the hand only with `xr animate-to` (no `set-transform` or `look-at`)
- [ ] Docs: `docs/video/*.md` contain no `--headless`, no "real table", no "Slow-mo", and neither the old star verb nor the old button name from the CONTEXT.md _Avoid_ lists. The Clearance block is present, and so is a `Text:` line for every section from 0:30
- [ ] Dry run: `ffprobe` reports 1920x1080, `r_frame_rate` 60/1 and one audio stream. `ffmpeg -af volumedetect` reports max_volume above -30 dB. The OBS Stats dock shows 0 skipped and 0 missed frames. Frame grabs at 2 s, at the middle and 2 s before the end show no pill, edge glow, editor toggle or certificate banner. The numbers and the crop go in Comments

**Effort:** M (~1 day)

**Gaps closed:** #6, #43, #44; follow-ups "The video kit has no clearance step, and nobody is named as the voice-over" and "Emulator frames show a grey stand-in room and dev overlays, but the shot list calls it a real table"

**Risks:**
- IWER sizes the session canvas in CSS pixels, not device pixels (`XRDevice.js:239-240`). On this MacBook's 2x Retina display (3456x2234, which looks like 1728x1117), a 1920x1080 app frame needs the "More Space" display scaling or an external 1080p display. Otherwise the clip is an upscale. The preflight's canvas-size output shows which case you're in. If the managed window pins its viewport, record the workaround in Comments.
- Each `iw` call pays for `npx` startup, so use one `animate-to` per move. If the call returns before the move ends, wait out its duration before pinching.
- AGENTS.md makes headed versus headless the developer's choice, so announce the switch before restarting. `dev restart` drops `--allow-browser-automation`, and every `browser run` then fails silently.
- The unlock click needs a lead-in move and must miss pegs, the chute and the ledge, or it hits whatever peg was last hovered.

## Comments
