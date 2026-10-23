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

**Status:** done except: Dry run (user: the OBS capture, steps in Comments)

- [x] Unit: no `src/lib` change, so no new unit tests; `npm test` and `npm run typecheck` stay green
- [x] E2E (write first): new `tests/e2e/shots.sh` (`npm run test:e2e:shots`) stages every shot in `SHOTS` through shot.sh. Each one exits 0, and the preflight reports: no visible "Remote Control Active" or "Enter XR" text in any shadow root (pierced as `clickCanvas` does, `lib.mjs:77`), no visible `#enter-xr` once ticket 08 has landed, audio `running`, no Vite overlay, and settings at their defaults
- [x] E2E: `daily` stages showing "Daily - streak 6", and its take ends showing "Daily - streak 7" (read from `hud().model.worldLabel`, as `daily.e2e.mjs:49` does)
- [x] E2E: the `settings` take ends with `slowMotion` true, the level solved and `offset.up` at 1. `cold-open` stages w1-06 with a-b present and c-d absent
- [x] XR: in a fresh session, `glide_pinch_pull` from a to b on level 1 makes thread a-b, and `glide_pinch_at` on the chute solves it (a new block in `tests/e2e/hand-pinch.sh`, beside the jump-based checks)
- [x] XR: after shot.sh prints "start recording", take.sh moves the hand only with `xr animate-to` (no `set-transform` or `look-at`)
- [x] Docs: `docs/video/*.md` contain no `--headless`, no "real table", no "Slow-mo", and neither the old star verb nor the old button name from the CONTEXT.md _Avoid_ lists. The Clearance block is present, and so is a `Text:` line for every section from 0:30
- [ ] Dry run: `ffprobe` reports 1920x1080, `r_frame_rate` 60/1 and one audio stream. `ffmpeg -af volumedetect` reports max_volume above -30 dB. The OBS Stats dock shows 0 skipped and 0 missed frames. Frame grabs at 2 s, at the middle and 2 s before the end show no pill, edge glow, editor toggle or certificate banner. The numbers and the crop go in Comments

**Effort:** M (~1 day)

**Gaps closed:** #6, #43, #44; follow-ups "The video kit has no clearance step, and nobody is named as the voice-over" and "Emulator frames show a grey stand-in room and dev overlays, but the shot list calls it a real table"

**Risks:**
- IWER sizes the session canvas in CSS pixels, not device pixels (`XRDevice.js:239-240`). On this MacBook's 2x Retina display (3456x2234, which looks like 1728x1117), a 1920x1080 app frame needs the "More Space" display scaling or an external 1080p display. Otherwise the clip is an upscale. The preflight's canvas-size output shows which case you're in. If the managed window pins its viewport, record the workaround in Comments.
- Each `iw` call pays for `npx` startup, so use one `animate-to` per move. If the call returns before the move ends, wait out its duration before pinching.
- AGENTS.md makes headed versus headless the developer's choice, so announce the switch before restarting. `dev restart` drops `--allow-browser-automation`, and every `browser run` then fails silently.
- The unlock click needs a lead-in move and must miss pegs, the chute and the ledge, or it hits whatever peg was last hovered.

## Comments

- **Oct 23, agent: the agent part landed locally on main; nothing pushed.** Commits:
  - `d8d2c75 test: video kit stages every shot clean, scripts the takes with glided hands, and adds the clearance block (ticket 05)`: the docs and scripts below.
  - The docs commit carrying these Comments.
  - Ticket 08 has not landed, so 05 lands first. The preflight reports a visible `#enter-xr` as chrome, so `test:e2e:shots` fails while it shows (`shot-preflight.e2e.mjs:60-61`). It does not hide it: ticket 08 adds the hiding (08's box at line 53).
- **The interrupted earlier attempt was reviewed, rerun and kept, with these changes:**
  - shot-list step 1 now says to run `dev down` before `dev up --headed --allow-browser-automation`.
  - The shot list's melody-book row carries the caption "Pinch the stars to hear it again." (shot-list.md:55).
  - shot-list step 3 reworded: the last step hides the chrome, and the last line prints the report.
  - `shots.sh`'s docs check now requires all six clearance items inside the Clearance section, not only its heading. Both docs must carry "record after ticket 10", "Your hands are the instrument.", the stars line, "settings button", "Slow motion" and the gaze caption, and script.md must carry the voice rule. `zsh tests/e2e/shots.sh --docs` runs the docs checks alone.
  - The `daily` shot's code comment now names the boards that don't solve on the table, with the evidence below.
- **Where things are:**
  - preflight: `hideChrome` `shot-preflight.e2e.mjs:18`, `visibleChrome` :38, `canvasSize` :70.
  - shot.sh: aims the hand once (:31), runs the preflight (:36), and prints "start recording" (:38).
  - shot-setup: `SHOTS` :14, `seedStreak` :43, `unlockAudio` :65, with the reset at :122 and the unlock at :124.
  - xr-lib.sh: `iw` with `IW_LOG` :5, `rest_hand_for` :43, `aim_hand` :76, `glide_to` :81, `glide_pinch_at` :85, `glide_pinch_pull` :91, `wait_solved` :98.
  - hand-pinch.sh's glide block: :45-53.
  - Ticket 06's script lines moved: "every solution is a song ... carries its own shape" is now script.md:21 (was :17), and "A new daily puzzle every day" is :41 (was :33).
  - Ticket 12's lines are now spool (shot-list.md:54, script.md:28-31), daily (:56, :38-41) and settings (:57, :43-46).
- **Decisions beyond the ticket text:**
  - **The daily shot uses a fixed board, pool index 4 (`daily-w2-04`).** `{type:'daily', index: 4}` opens it, and staging checks the id. That makes every take the same and avoids boards that fail on the table. In a sweep, each board was opened, its solution hung, then the shot's seated pose was entered and the solution dropped (`probe solve`):
    - in passthrough on the dining table (`placedOn: table`, yaw 1.5705 rad), pools 0, 2, 4 and 5 solved, and pools 1 (Relay), 3 (w2-02) and 6 (w3-04) ended `idle`;
    - in the browser view, all 7 solved.
    - Campaign w1-04 (Relay) also ends `idle` on the table at yaw 90°. `daily-w1-04` solves in an unseated session (`placedOn: in front of you`, yaw 0) and fails again when seated.
    - **Out-of-scope defect, not fixed here:** a stored solution's outcome depends on the placement pose. It probably belongs with ticket 07 (placement) or a new ticket, and a player on a table at that angle would see it too. No shot is affected: the melody-book shot drops Relay in the browser view before passthrough.
  - **`rest_hand_for` turns its offset by `REST_YAW`** (default 0, so `pinch_at` and the jump-based tests are unchanged). Video shots place the diorama at yaw 1.5705 rad beside the seated player, and an unturned offset would rest the hand beside the diorama instead of in front of it. shot.sh, take.sh and the glide block read the yaw from the probe's new `yaw` field. The probe also gains `raiseToggle`, `offset` and `worldLabel`.
  - **Take timing:** `GLIDE_S` 0.8 s and `PULL_S` 1.0 s. IWER queues `animate_to` as a duration action (`RemoteControlInterface.js:1260-1287`), so the call returns once the move ends and no extra wait is needed. `IW_LOG=<file>` makes `iw` log each call's domain and action. shots.sh uses that log to check that a take moved the hand only with `xr animate-to`.
  - **Unlock click:** 12 px in from the canvas's bottom-right corner, through `click()` (lead-in move). It first checks that the point lands on the app (an IFRAME or CANVAS, not the managed window's buttons).
  - **`resetSettings` only dispatches when the settings differ:** a new offset object rebuilds the diorama. `DEFAULT_SETTINGS` is mirrored in `reset-settings.e2e.mjs` because a Playwright script can't import TypeScript. **Note for ticket 15:** when high contrast joins `Settings`, add it there too, or the reset and the preflight's defaults check will ignore it.
- **Evidence, Oct 23 (logs in `.scratch/week8/logs/05-*.log`, gitignored, so this entry is the committed evidence). All runs are on the final tree, committed as d8d2c75:**
  - unit: `npm run typecheck` exit 0; `npm test`: 34 files, 281 tests passed.
  - `npm run test:e2e:shots`: 41 PASS, 0 FAIL, exit 0. That is 5 docs checks, and for all 10 shots a staging check plus a preflight check (no chrome, audio `running`, no Vite overlay, default settings). It also covers:
    - cold-open stages w1-06 with a-b and without c-d, and its take pulls c-d and solves;
    - daily stages "Daily - streak 6", and its take ends on "Daily - streak 7";
    - the settings take ends with `slowMotion` true, solved and `offset.up` 1;
    - three-cups solves;
    - each of the 4 takes exits 0, moving the hand only with `xr animate-to` (1, 1, 3 and 3 moves).
    - An earlier full run of the reviewed attempt was also 41/41 (with the weaker docs checks).
  - Red checks:
    - The docs checks against HEAD's (pre-05) docs: 5 FAIL, exit 1. They flag `--headless`, "real table", "Slow-mo", "poke" and "gear", the missing Clearance items, 7 sections without `Text:`, and the missing phrases. The current docs pass 5/5.
    - Chrome hiding disabled: `shot.sh three-cups` exits 1 with chrome `["Remote Control Active","emulator overlay"]`, and `shot.sh study` exits 1 with `["Enter XR"]`.
    - Unlock click removed: `shot.sh study` exits 1 with audio `locked`.
  - A late take: `take.sh three-cups` started 40 s after "start recording", past IWER's 30 s release to its manual controls (`RemoteControlInterface.js:202`). The host was still hidden (a second preflight hid nothing and found no chrome), and the take solved.
  - `npm run test:e2e`: all 24 scripts, 137 PASS, 0 FAIL, exit 0.
  - `npm run test:e2e:hands`: 22 PASS, exit 0. That is hand-pinch 5 (3 jump-based plus the 2 new glide checks), xr-full-level 5, xr-controls 9 and gaze-pinch 3. iwsdk.config.json had no changes afterwards.
  - `NODE_ENV=production npm run build` exit 0. `npm run test:smoke`: 17 PASS, 0 FAIL, 5 NOTE in 10.8 s.
  - levels and levels:slow were not run: nothing under `src/` changed.
  - Canvas in the headless managed window: 756x469 CSS px, dpr 1 (the preflight's `canvas` field). The dry run has to enlarge the app frame to reach 1920x1080.
  - Environment: at 15:05 the dev server died on its own with `EPERM ... HavokPhysics.wasm` (`.iwsdk/runtime/logs/dev-1792770814617.log`; the file is readable). It was brought back with `dev up --headless --allow-browser-automation`, and it is still up headless with browser automation (`browserCommandReady: true`).
- **Open for the user: the Dry run box (OBS capture of `three-cups`).** The agent left the server headless as instructed. About 20 minutes:
  1. Make sure no regression or agent run is using the dev server. Then switch to headed (announce it, per AGENTS.md):
     - `npx @iwsdk/cli dev down`
     - `npx @iwsdk/cli dev up --headed --allow-browser-automation`
     - wait until `npx @iwsdk/cli dev status` shows `"browserCommandReady": true`.
  2. Display: System Settings > Displays > "More Space" (or plug in a 1080p display). Maximise the managed Chromium window. OBS is not in /Applications: install it from obsproject.com (or `brew install --cask obs`). ffmpeg/ffprobe are already in /opt/homebrew/bin.
  3. OBS Settings:
     - Video: Base 1920x1080, Output 1920x1080, Common FPS 60.
     - Audio: Desktop Audio and Mic/Aux both Disabled.
     - Output: recording format mp4 (or mkv), saved outside the repo.
     - Turn on Docks > Stats.
  4. Add a source: + > macOS Screen Capture, Method "Window Capture", the managed "Google Chrome for Testing" window, with "Capture Audio" ticked.
  5. In a terminal at the repo root, run `zsh tests/e2e/shot.sh three-cups`. Wait for the last line "staged three-cups ... start recording {...}" and note its `canvas` field (cssWidth x cssHeight, dpr).
     - If cssWidth/cssHeight is below 1920x1080, the window or display is too small (or the window pins its viewport; write down the workaround).
  6. Crop the source to the app frame: right-click > Transform > Edit Transform > Crop (or Alt-drag the edges). Keep the Runtime/Editor toggle (top right) and the certificate banner out. Write down the crop numbers (left/top/right/bottom). Rerun step 5 if you spent more than about 30 s (the take still works after the 30 s release).
  7. Start Recording. Wait about 3 s, then run `zsh tests/e2e/take.sh three-cups`. When it prints "take three-cups done: stop recording", let the cups' chimes finish (aim for 20-30 s in all), then Stop Recording. Read the Stats dock: skipped and missed frames should both be 0.
  8. Checks (replace `clip.mp4`):
     - `ffprobe -v error -show_entries stream=codec_type,width,height,r_frame_rate -of compact=p=0 clip.mp4` should list one video stream at 1920x1080 and 60/1, and one audio stream.
     - `ffmpeg -hide_banner -i clip.mp4 -af volumedetect -vn -f null - 2>&1 | grep max_volume` should be above -30 dB.
     - `D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 clip.mp4)`
     - `for t in 2 $(echo "$D/2" | bc -l) $(echo "$D-2" | bc -l); do ffmpeg -v error -y -ss $t -i clip.mp4 -frames:v 1 grab-${t%%.*}s.png; done`
     - Then look at the three grabs: no "Remote Control Active" pill, no blue edge glow, no Runtime/Editor toggle, no certificate banner.
  9. Put the crop into shot-list.md:17 (the "Measured crop" line). Put the ffprobe, volumedetect and Stats numbers, the canvas field and any viewport workaround into these Comments. Then tick the Dry run box and set Status to done. Keep the clip out of the repo.
  10. Hand the server back:
      - `npx @iwsdk/cli dev down`
      - `npx @iwsdk/cli dev up --headless --allow-browser-automation`
      - wait for `"browserCommandReady": true`. Don't use `dev restart`: it drops `--allow-browser-automation`.
