# 12: Field of view: the ledge carries the hint and the thread count (P1)

**What to build:** move the hint line and the thread count (threads placed against the thread limit) from the plaque to a strip on the **ledge**, make the plaque and the settings face shorter, space the settings controls 12 mm apart, cap Nearer at +2, give the settings button its own icon, and prove the layout with an angular-extent unit test. This ticket owns the settings-face layout and its ids: tickets 13, 14 and 15 fill controls into it, and rename or add none. Line numbers are main at 83977c8; re-read buildDiorama, constants and testHook after ticket 01 merges.
- **Field-of-view target** (Meta, developers.meta.com/horizon/essentials/field-of-view, updated 2026-09-25): Meta VR Glasses see 70 x 66 degrees straight ahead, which Meta calls "an upper bound"; the p90 perceived view is 58 x 54. Assert 70 x 66, because the 48 cm spread of cups is itself about 59-64 degrees wide at the default offset, so 58 x 54 can't be met by any layout. State both figures and the URL in the test.
- **Poses (gap 56):** a seated head at (0, 1.15, 0) facing -z (tests/e2e/reach.e2e.mjs:8). The **Quest pose** is `headRelativePlacement` (src/lib/placement.ts:220-233): what Quest's passthrough does without a table. The **study pose** is `DIORAMA_DEFAULT_POSITION` (src/config/constants.ts:7), used by IWER, the desktop browser and VR. Each pose goes through `originFromCenter` and `offsetOrigin` (placement.ts:236-258). The offset limits are taken one axis at a time: Raise +6, Lower -6, Farther -2, Nearer +2. Table poses belong to ticket 07's `reachAt`.
- **New pure `src/lib/viewExtent.ts`:**
  - `viewSpan(head, points)` returns `{ h, v }` in degrees. It turns the view to the middle of the points' azimuth and elevation ranges, then takes the max minus the min of each point's angle on each axis.
  - `essentialPoints(level, origin, yaw, face)` returns the world corners of the plaque face, the ledge strip, every cup opening (`goals` x +/- width/2, y 0 to `GOAL.wallHeight`), the chute rims and the peg knobs at `AIM_PLANE_Z`, plus both rail ends for a rail peg.
  - The new constants it reads: `HUD.levelFaceMaxHeight`, `HUD.settingsFaceMaxHeight`, `HUD.maxWidth` (0.44 m, inside the cups' spread, so it adds no width), and `LEDGE_STRIP` (rectangle, lean).
- **Ledge strip:** a new `public/ui/ledge.uikitml` asset (`'ledge-strip'` in src/assets.ts:19-23) and a scene node beside `hud-plaque` (public/scenes/main.iwsdk.scene.json:54-72), with no `RayInteractable`, so it never takes a pinch.
  - It sits between the Daily and Next buttons, 12 mm away from each (buildDiorama.ts:308-323), about x 0.19-0.41 m on a 0.5 m level. It lies on the ledge, raised about 20 degrees toward the player (the button icons lean 30, buildDiorama.ts:203). Its bottom edge is at the ledge front.
  - It holds up to two hint lines, then one count line, at least 1.0 cm type, about 4.5 cm tall, in plain ASCII.
  - On spool levels the spool readout joins the count line (hud.uikitml:163, HudSystem.ts:126-127).
  - A small `src/features/hud/ledgeStrip.ts` (like settingsFace.ts) takes `hint`, `threadsLabel` and `spoolLabel` from `hudModel`, whose fields stay as they are, so hook readers keep working. HudSystem `follow()` (:67-73) also places the strip.
  - Remove `hud-threads`, `hud-spool` and `hud-hint` from the plaque (hud.uikitml:58-75, :159-165, HudSystem.ts:125-129).
- **Plaque:** the level face shows the title, the world label and the stars, at most 7 cm tall (today 9-14 cm). One row at up to 44 cm wide fits all three.
- **Settings face (gap 55):**
  - At most 10 cm tall (today about 22 cm) and 44 cm wide: three rows of controls at least 2.2 cm tall (Meta's 22 mm hit target), 12 mm apart edge to edge (Meta: "Minimum spacing: 12mm between adjacent interactables", developers.meta.com/horizon/design/hands-ui-best-practices). Today the gap is 8 mm (hud.uikitml:87, :106). Fold the header (:168-170) into a row.
  - Lay out, hidden and with placeholder text, `set-contrast` (15), `set-stars` ("Stars N/72", 13), `set-skip` (the **Skip** offer, 13) and `set-play-all` (14), and size the face with all four showing. Rename today's Next control `set-skip` to `set-next` (hud.uikitml:180, settingsFace.ts:42, level-select.e2e.mjs:36-37).
  - Replace the comment at :171, which says the controls sit low; they don't.
- **Nearer +2:** `OFFSET_LIMITS.near` becomes [-2, 2] (src/lib/settings.ts:8). The schema (:14-20) clamps a saved 3 to 2 instead of rejecting it: a rejected save falls back whole (src/lib/storage.ts:16-17) and loses slow motion.
- **Settings button:** a three-slider glyph merged into one mesh, as `sunGeometry` is (buildDiorama.ts:208-222), replaces the hex nut (:237-242). The two test labels that still name the old icon (settings.e2e.mjs:46, xr-controls.sh:25-26) say "settings button".
- **Words:** remove "thread budget" (hud.uikitml:2, HudSystem.ts:18-21, src/lib/hud.ts:41, plaque.e2e.mjs:1, :23). In the button inset comment (constants.ts:84-87), say the reach was measured in the study pose. Refusal and spool copy moves to "the ledge": README.md:42, docs/submission.md:75, :86. Leave docs/video/* alone: ticket 05 owns it (see Risks).
- **Hook:** `ledge()` returns the strip's local pose, its size, its shown text and whether it is visible. `plaqueElement(id)` adds the element's world width and height (src/features/debug/testHook.ts:51-55, 183-205). xr-probe gains a `SETUP_MODES` entry `fresh` (dispatch `resetProgress` and wait until it lands, as tests/e2e/lib.mjs:18 checks) and `PROBE_FIELDS` entries (ticket 01's tables) for `nearToggle`, `offset` and `ledge` (`hook.ledge()`).

**Blocked by:** 01; 02 (merge after its step-4 log push)

**Status:** done

- [x] Unit: new tests/unit/viewExtent.test.ts, written first. `viewSpan` returns 0 for one point, 70 for points 35 degrees either side, and centres on a pitched view.
- [x] Unit: across all 24 levels, the level face and the other essential points fit 70 x 66:
  - in the Quest pose at the default offset, Raise +6, Lower -6 and Farther -2;
  - in the study pose at the same four offsets;
  - at Nearer +2 (Quest pose), the vertical span is at most 66, and the plaque and strip lie inside the cups' and pegs' horizontal extent.

  The test notes why Nearer +2 is a partial check: the diorama alone is about 70 degrees wide in the Quest pose, and about 77 x 62 in the study pose.
- [x] Unit: with the settings face up, the face plus the ledge's settings button fit 70 x 66 in both poses, at the default offset, Raise +6, Lower -6 and Farther -2.
- [x] Unit: at every tested pose, the segment from the head to each cup's floor centre passes above the strip, so the strip never hides a cup.
- [x] Unit (gap 56): in the Quest pose at the default offset, every knob, chute mouth, ledge button and the plaque stars are within 0.61 m (estimate 0.60 m, set by the end buttons). The Farther -2 figure (estimate 0.66 m) goes in Comments for ticket 06 and week 9's copy pass. There is one `reachAt` in src/lib/placement.ts (ticket 07's): whichever of 07 and 12 lands second uses the other's helper, and this test calls it with `headRelativePlacement` (and `offsetOrigin` for Farther -2).
- [x] Unit: tests/unit/settings.test.ts:48: Nearer stops at +2, and a save with `near: 3` loads as 2 and keeps `slowMotion: true`. tests/unit/hud.test.ts: every hint string (`REFUSAL_HINTS`, onboarding steps, level hints, the ending, the daily line) is at most `LEDGE_HINT_MAX_CHARS` = 48, exported from src/lib/hud.ts. Ticket 07's no-table line and ticket 14's new lines join this test.
- [x] E2E: plaque.e2e.mjs: the plaque has no threads, spool or hint element. The strip reads "Threads 1/N" after a thread, sits on the ledge 12 mm away from Daily and Next, and follows the diorama onto a table (`place`, :36-42). spool.e2e.mjs reads the spool from `ledge()` as well.
- [x] E2E: settings.e2e.mjs measures the rendered faces with real clicks:
  - every neighbouring settings control, in a row and between rows, is at least 12 mm apart edge to edge;
  - every control is at least 2.2 cm tall;
  - both faces stay within `HUD.maxWidth` and their `HUD.*MaxHeight`, so the unit test's inputs are true.
- [x] E2E: raise-lower.e2e.mjs: three Nearer clicks from 0 stop at +2. level-select.e2e.mjs passes with `set-next`. The full `npm run test:e2e` chain passes.
- [x] E2E: `npm run test:e2e:levels` and `test:e2e:levels:slow` pass with no draw-call breach (levels.e2e.mjs:36-51) now that the strip is drawn.
- [x] Check: UIKit layout inspection, as week 7 ticket 07 did: the 47-character onboarding hint (src/lib/onboarding.ts:22) wraps to at most two lines, and w4-05's count line with its spool fits on one. Put the numbers in Comments.
- [x] XR: xr-controls.sh pinches the settings button, then Nearer three times; `offset.near` is 2. On entering XR, `probe fresh` resets progress (earlier hand scripts have solved level 1, so onboarding would read 'done'), and the `ledge` field then shows level 1's onboarding hint and "Threads 0/2". A runtime `browser_screenshot` taken in the session goes in Comments. Whichever of 07 and 12 lands second adds the strip to 07's hidden set (until placed, and during every new search), and 07's xr-placement.sh asserts that the `ledge` field's `visible` is false until the diorama is placed.

**Effort:** M (~2 days)

**Gaps closed:** #25, #55, #56 (the measurement; week 9's copy pass owns the claim's final wording)

**Risks:**
- UIKit:
  - spans that start empty never lay out, so give every strip span placeholder text;
  - a `/* */` comment inside a `<style>` rule kills the panel and the level system, so put notes in `<!-- -->`;
  - panels are single-sided and face +Z, so a strip leaned the wrong way renders nothing and reports no error.

  Author the panel with the `iwsdk-ui` skill and the scene node with `iwsdk-compose-scene`. `src/assets.ts` runs in two realms, so keep it side-effect free.
- The degree figures above come from a quick model of this geometry, not from the test. If the 10 cm settings face can't pass in the study pose, show what passes before you cut a control.
- Ticket 07 adds a `noTable` hint to `hintFor` (src/lib/hud.ts:66-70). Whichever of 07 and 12 lands second merges it and adds it to the length test, and the text still goes to the strip. Ticket 14 owns the full hint order.
- Ticket 05's dry run (Oct 23-24) comes before this ticket, so re-check the plaque and ledge shots before the final takes (Nov 11-13) instead. `spool` (shot-list.md:25, script.md:24) still puts the spool readout and the refusal on the plaque; `daily` keeps its streak there (shot-list.md:27, script.md:32); `settings` (shot-list.md:28, script.md:36) shows the new icon and the shorter face. Those lines change when the final takes are scripted, not in this ticket.

## Comments

- **Oct 23, from ticket 05's review: the video lines in Risks have moved, and `offset` is already probed.** spool is now shot-list.md:54 and script.md:28-31, daily is shot-list.md:56 and script.md:38-41, and settings is shot-list.md:57 and script.md:43-46. Ticket 05 added the `offset` entry to `PROBE_FIELDS` (tests/e2e/xr-probe.e2e.mjs:77), so this ticket adds only `nearToggle` and `ledge`.
- **Oct 24, agent: landed locally on main (not pushed).** Ticket 07 hasn't landed, so 12 lands first: `reachAt(placement, head, level)` is new in src/lib/placement.ts:297 (with `frameToWorld` at :267), and 07 uses it. 07 also owns, as the ticket that lands second, adding the strip to its hidden set, xr-placement.sh's `ledge.visible` check, the `noTable` hint and its line in the length test.
  - **What landed:** src/lib/viewExtent.ts (`viewSpan` :24, `essentialParts` :113, `essentialPoints` :127); src/lib/ledge.ts (`ledgeButtonX` :18, `ledgeStripPose` :34, which buildDiorama now uses for the button positions too); `HUD.maxWidth` / `levelFaceMaxHeight` / `settingsFaceMaxHeight` and `LEDGE_STRIP` (src/config/constants.ts:104-129); public/ui/ledge.uikitml, registered as `'ledge-strip'` in src/assets.ts, and scene node `ledge-strip` (no RayInteractable; `scene render-file` is valid and lists it in `visibleNodeIds`); src/features/hud/ledgeStrip.ts, placed by HudSystem `follow()` (:77) and filled from the unchanged `hudModel` (:130). `OFFSET_LIMITS.near` is [-2, 2], exported, and a save loads through a clamping schema while a settings patch is still refused past a limit (src/lib/settings.ts:11-43, :70). The settings button is three merged slider rails with knobs (src/features/diorama/buildDiorama.ts:242). `ledge()` and the sized `plaqueElement()` are at src/features/debug/testHook.ts:240-287; xr-probe has `fresh` (:19), `nearToggle` (:89) and `ledge` (:95).
  - **Field of view (worst level, h x v degrees), with the level face / with the settings face:** Quest pose default 57.7 x 56.9 / 56.2 x 58.8; Raise +6 56.0 x 61.5 / 52.5 x 62.3; Lower -6 54.0 x 46.9 / 54.5 x 49.1; Farther -2 49.1 x 50.1 / 47.8 x 51.6; Nearer +2 69.4 x 65.4 (not asserted for the settings face). Study pose default 61.8 x 62.7 / 59.3 x 64.4; Raise +6 60.3 x 64.9 / 53.6 x 65.2; Lower -6 59.1 x 52.5 / 59.2 x 54.9; Farther -2 52.1 x 54.3 / 50.1 x 55.7; Nearer +2 75.5 x 73.5 (not asserted). The test states both Meta figures and the URL (tests/unit/viewExtent.test.ts:18-27).
  - **Two readings to check (where the model differs from the ticket's quick numbers):**
    - The p90 view (58 x 54) can't be met in the study pose because the playfield alone (cups, chutes and knobs) is 58.9 degrees wide there at the default offset. The cups alone are only 44-48 degrees across the display, not 59-64: the view is pitched down, which narrows them.
    - "The plaque and strip lie inside the cups' and pegs' horizontal extent" at Nearer +2 is checked against the campaign's cups and pegs (x 0.01-0.49 m), the 48 cm spread that `HUD.maxWidth` is "inside". Per level it fails on the one-cup levels w1-05, w4-01 and w4-02, by up to 6 degrees past their own leftmost peg. One row of title, world label and stars can't be narrow enough for that (it needs about 30 cm).
  - **"Show what passes before you cut a control":** with the whole settings-button cap down to the ledge, the study pose at Raise +6 is 53.9 x 66.6, so it fails by 0.6 degrees. A face 0.7 cm shorter would pass, but three 2.2 cm rows 12 mm apart plus the border need at least 9.4 cm. The test counts the button as its cap's top face, where it is pressed (the point xr-probe aims at), which gives 65.2. No control was cut. Say if the whole cap should count.
  - **Reach (gap 56), Quest pose:** 0.599 m at the default offset (end buttons), so within 0.61. **Farther -2: 0.658 m**, for ticket 06 and week 9's copy pass. The plaque stars are bounded by the level face's top corners.
  - **Layout as rendered (settings.e2e, `ui inspect`):**
    - The level face is 44 x 5.2 cm.
    - The settings face is 44 x 9.95 cm: three rows of controls 2.25 cm tall, 12.5 mm apart edge to edge (closest pair set-slow / set-contrast), and the widest row is 41.9 of 43.0 cm.
    - The four placeholders are laid out with `visibility: hidden`, so the face is sized with them showing. A hidden element takes no hover: the mouse over hidden set-play-all left `hovered` false, and over set-next it was true.
    - Ticket 14: the face fits "Play all (24)" (13 characters, this ticket's 14). "Play all melodies (N)" doesn't fit row 2. Ticket 15's "High contrast: Off" is the placeholder and fits.
  - **Ledge check:**
    - The strip is 22.2 x 4.5 cm, 12.0 mm from the Daily and Next caps, its bottom edge at frame z 0.080 and lean 0.35 rad.
    - The 47-character onboarding hint lays out 20.3 x 2.64 cm: two lines of 1.32 cm at 1.1 cm type.
    - w4-05's count line is "Threads 0/2 - par 2" (10.23 cm) plus "Spool 44/44 cm" (8.5 cm) in a 20.3 cm row, both 1.32 cm tall at the same height: one line. "Threads 2/3 - par 2" after ticket 13 has the same character count.
  - **XR screenshot:** `browser_screenshot` in the emulated AR session after `probe fresh`, head tilted to the ledge: .scratch/week8/fov-ledge/xr-session-ledge.jpg. It shows the one-row plaque, the slider icon and the strip reading the onboarding hint over "Threads 0/2 - par 1".
  - **Regression on the final tree (logs in .scratch/week8/logs/ticket12-*.log, gitignored):**
    - `npm run typecheck` exit 0. `npm test`: 39 files, 437 tests passed (viewExtent 34).
    - `npm run test:e2e` exit 0: 26 scripts, 159 PASS, 0 FAIL.
    - `test:e2e:levels` 24/24 and `:slow` 24/24, with no draw-call breach. The busiest flat-view level is w2-06 at 57 calls (the strip adds 2).
    - `test:e2e:hands` exit 0: 6 scripts, 30 PASS. xr-controls passes 11/11, including the fresh-save ledge check and three Nearer pinches stopping at `{"up": 0, "near": 2}`. The XR busiest frame is 114 calls over 2 views, so 57 per view: README.md:70 and docs/submission.md:111 now say 57. gaze-pinch left iwsdk.config.json unchanged.
    - `NODE_ENV=production npm run build` exit 0, then `npm run test:smoke` exit 0 with 19 PASS. tests/smoke/verdict.mjs now requires ui/ledge.uikitml (test first in tests/unit/smokeVerdict.test.ts). `npm run test:e2e:prod-xr` passes 15/15 locally.
  - **Words:**
    - "Thread budget" is gone from hud.uikitml, HudSystem, src/lib/hud.ts, plaque.e2e and the hud unit test name.
    - The `buttonInset` comment now says reach was measured in the study pose.
    - The refusal copy now says "the ledge" (README.md:45, docs/submission.md:112, :128-129).
    - Test labels name the settings button (settings.e2e, xr-controls.sh), and hint checks say "ledge".
    - docs/video/* is untouched (ticket 05).
