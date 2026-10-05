# Video shot list

Rules (Devpost): at most **3:00**; footage "as viewed on a Meta Quest device or via
XR Simulator"; real gameplay only, with no AI-generated video. Upload to YouTube or
Vimeo (public). **The author records, uploads and submits.**

## Recording setup

1. `npx @iwsdk/cli dev up --headless --allow-browser-automation`. Or record from the
   live URL in the Meta XR Simulator, which gives the more Quest-like view.
2. Stage a shot: `zsh tests/e2e/shot.sh <shot>`. XR shots seat the emulated player
   at the room's dining table and enter passthrough, so the diorama sits on a
   detected table, as it would on Quest.
3. Perform the gesture live (hand pinch) and record the headset view.
   Between takes, rerun `shot.sh`.

## Shots

| # | Shot (`shot.sh`) | Time | What happens on camera |
|---|---|---|---|
| 1 | `cold-open` | 0:00–0:10 | On a real table: the hand pinches the chute; marbles bounce off the coral thread and the solve melody plays. |
| 2 | `onboarding` | 0:10–0:30 | A fresh save: the ghost hand demonstrates pinch-pull; the player copies it; the first thread twangs. |
| 3 | `three-cups` | 0:30–0:50 | Color sorting: drop; amber and azure split into three cups (glyphs visible). |
| 4 | `hinge` | 0:50–1:10 | Rails: pinch the tab, slide the shared peg up; the valley becomes a roof; drop, solved. |
| 5 | `spool` | 1:10–1:25 | Tension: the plaque's spool readout; an over-long thread is refused ("Not enough spool for that thread"). |
| 6 | `melody-book` | 1:25–1:45 | Poke the lit stars: the level's tune replays. |
| 7 | `daily` | 1:45–2:00 | The sun on the ledge opens today's daily; the plaque shows the streak. |
| 8 | `settings` | 2:00–2:25 | The gear opens settings: Slow-mo on, then Raise; the diorama moves, threads intact. |
| 9 | gaze (`zsh tests/e2e/gaze-pinch.sh` staging, Quest Pro preset) | 2:25–2:35 | Look at a peg, pinch, pull: a thread with eyes plus pinch. |
| 10 | `study` | 2:35–2:45 | No passthrough: the cozy virtual study; the end card with the URL. |

Total: 2:45 (15 s of slack for titles).
