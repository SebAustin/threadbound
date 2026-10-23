# Video shot list

Rules (Devpost): at most **3:00**; footage "as viewed on a Meta Quest device or via
XR Simulator"; real gameplay only, with no AI-generated video. Upload to YouTube or
Vimeo (public). **The author records, uploads and submits.**

## Recording setup

1. Say that the managed browser is switching to headed, then `npx @iwsdk/cli dev down`
   and `npx @iwsdk/cli dev up --headed --allow-browser-automation`. Headless gives no
   window to record, and Playwright adds `--mute-audio` only to headless launches. Wait
   for `npx @iwsdk/cli dev status` to report `browserCommandReady: true`.
2. OBS: a macOS Screen Capture source on the managed Chromium window, with its app
   audio captured; desktop audio and the mic muted. Base and output canvas 1920x1080,
   60 fps. Crop the source to the app frame, so the Runtime/Editor toggle (top right)
   and the certificate banner are out of shot.
   - Measured crop: *pending, written here by the dry run (week 8 ticket 05).*
   - IWER sizes the canvas in CSS pixels. On a 2x Retina display a 1920x1080 frame needs
     the "More Space" display scaling or an external 1080p display; otherwise the clip is
     an upscale. The `canvas` field on `shot.sh`'s last line shows which case you're in.
3. Stage a shot: `zsh tests/e2e/shot.sh <shot>`. XR shots seat the emulated player at
   the room's dining table and enter passthrough, so the diorama sits on the emulator's
   stand-in table. Its last step hides the emulator's chrome, and its last line says
   "start recording", with what it hid, the audio state and the canvas size. It exits 1
   if any chrome still shows, audio isn't running, or a Vite error overlay is up.
4. Start recording, then perform the gesture: `zsh tests/e2e/take.sh <shot>` for a
   scripted take (`three-cups`, `daily`, `settings`, `cold-open`), or live by hand.
   Stop when `take.sh` prints "take done". Between takes, rerun `shot.sh`: every shot
   starts from default settings, because Slow motion and the offset persist.
5. Afterwards, hand the managed browser back to the agent: restart it with the
   headless E2E command in the README ("E2E scripts need the dev server started with
   browser automation"), then wait for `browserCommandReady: true`. `dev restart`
   drops `--allow-browser-automation`, so use `dev up` with both flags.

## Clearance

Check every item before the upload.

- Narration is the developer's own voice, or captions only. No synthetic voice.
- English captions for every narrated line.
- No music except the in-game audio.
- Every emulator shot carries the caption "Recorded in the IWER emulator. Grey shapes stand in for your room."
- Nobody is named but the entrant.
- Tester footage only with the tester's written permission, and only after a frame-by-frame review.

## Shots

| # | Shot (`shot.sh`) | Time | What happens on camera |
|---|---|---|---|
| 1 | `cold-open` (record after ticket 10) | 0:00–0:10 | Encore, one thread hung: the hand pinch-pulls the second thread live, then pinches the chute. The two threads ring different notes, and a phrase of 3 or more notes plays. The title is up by 0:08, then "Your hands are the instrument." |
| 2 | `onboarding` | 0:10–0:30 | A fresh save: the ghost hand demonstrates pinch-pull; the player copies it; the first thread twangs. |
| 3 | `three-cups` | 0:30–0:50 | Color sorting: drop; amber and azure split into three cups (glyphs visible). |
| 4 | `hinge` | 0:50–1:10 | Rails: pinch the tab, slide the shared peg up; the valley becomes a roof; drop, solved. |
| 5 | `spool` | 1:10–1:25 | Tension: the plaque's spool readout; an over-long thread is refused ("Not enough spool for that thread"). |
| 6 | `melody-book` | 1:25–1:45 | Pinch the lit stars: the level's tune replays. Caption: "Pinch the stars to hear it again." |
| 7 | `daily` | 1:45–2:00 | A daily on a 6-day streak: the plaque reads "Daily - streak 6". Pinch the chute: solved, and it reads "Daily - streak 7". |
| 8 | `settings` | 2:00–2:25 | The settings button has opened the settings face: pinch Slow motion, pinch the chute for a 2/3-speed drop, then pinch Raise; the diorama moves, threads intact. |
| 9 | gaze (`zsh tests/e2e/gaze-pinch.sh` staging, Quest Pro preset) | 2:25–2:35 | Look at a peg, pinch, pull: a thread with eyes plus pinch. Caption: "Emulated eye tracking (Quest Pro preset)". |
| 10 | `study` | 2:35–2:45 | No passthrough: the virtual study; the end card with the URL. |

Total: 2:45 (15 s of slack for titles).
