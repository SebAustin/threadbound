# 11: Hover, press and aim: every control shows it's being touched (P1)

**What to build:** line numbers come from `wip/ticket-08-standards` (40023fa), which ticket 01 merges first. Files that ticket 01 doesn't touch match main. Ticket 12 then rewrites `hud.uikitml` and edits `buildDiorama.ts`, `settingsFace.ts` and `testHook.ts`, so re-read those four after it merges.
- **Shared hover and press helper:**
  - **Pure module:** new `src/lib/touchFeedback.ts`, with three parts:
    - `touchState({ hovered, pressed, target })`: press beats target, target beats hover, hover beats rest.
    - `PRESS_TRAVEL` per kind: the ledge button cap 5 mm, the chute 4 mm down, a tab 4 mm into the back panel, pegs and threads 0.
    - `HIT_ORDER`: knob 2, tab 1, thread 0.
  - **System:** new `TouchFeedbackSystem` in `src/features/input/`, registered after `ControlsSystem` (`src/index.ts:39`). It reacts to `Hovered`/`Pressed` through `qualify`/`disqualify` subscriptions, with no polling and no allocation. It acts on a new system-free `Touchable { kind }` component and a `SnapTarget` tag, both in `src/features/puzzle/components.ts` and listed in `src/components.ts:11`.
  - **Hover:** swaps in a shared hot material. `brassHot` exists (`src/features/diorama/palette.ts:143`); add `creamHot`, `goalHot`, `threadHot`, `threadPresetHot` and a brighter `brassTarget` to `MATERIALS`, so ticket 07's fade covers them. Whichever of 11 and 15 lands second puts their colours in 15's `src/lib/colors.ts`, with high-contrast overrides that `applyPalette` applies, and adds them to 15's contrast test. It also puts the plaque's hover and press colours below (`.toggle:active`, `.stars:hover`, `.stars:active`) into `plaqueColors` with high-contrast values, covered by 15's literal-equality test and meeting its high-contrast bounds.
  - **Press:** moves the part by its travel (`translateY`/`translateZ`). A pressed thread shows `MATERIALS.threadPreview` (:162), a thread about to go.
  - **For tests:** each root mirrors `userData.touch = { kind, state, travel }`.
- **Wire it in:**
  - **Ledge buttons** (`buildButton`, `src/features/diorama/buildDiorama.ts:247-270`): only the cap and the icon sink. A fixed, invisible hit cylinder at the cap's rest size doesn't move.
  - **Chute and rail tabs:** the chute (:180-183) and the tabs (:302-304).
  - **Pegs:** their hover moves here from ThreadSystem (`hoveredPegs` and `setKnob`, `src/features/threads/ThreadSystem.ts:59, 79-80, 124-127`).
  - **Threads:** `createThread` (ThreadSystem.ts:295-306).

  Gaze, and a fingertip near a ledge button, deliver `Hovered` just as a hand ray does, so gaze hover needs no code of its own.
- **Plaque controls:** add `.toggle:active`, `.stars:hover` and `.stars:active` next to `.toggle:hover` (`public/ui/hud.uikitml:138-140`, with `.stars` at :34-38). The settings face's toggles (as ticket 12 lays them out) and the melody-book stars (`src/features/hud/HudSystem.ts:41`) then show both hover and press.
- **Pinch-only stays:** no `PokeInteractable` on threads (ThreadSystem.ts:306 adds only `RayInteractable`) or on the plaque. Only the ledge buttons keep it (buildDiorama.ts:268).
- **Pinch wording for plaque controls:** rename the fingertip leftovers.
  - The stars note (`hud.uikitml:152`, "Poke or pinch the stars") becomes "Pinch the stars".
  - `resetPoke` becomes `resetPinch`, and its comments say "two pinches" (`src/lib/resetGuard.ts:1, 6, 15`). Update its callers (`settingsFace.ts:5, 39, 72, 78-80`, where `pokeReset` becomes `pinchReset`) and `tests/unit/resetGuard.test.ts:2-14`.
  - In `tests/e2e/guarded-reset.e2e.mjs:1-2, 28, 36`, the header and check names say pinch ("one pinch only arms the reset").
  - "Poke the sun" (src/lib/hud.ts:58, :60) names a ledge button and stays with ticket 14.
- **Extra hit area:** new pure `src/lib/hitArea.ts`:
  - `minTargetSize(distance, degrees)` = 2·d·tan(deg/2);
  - `hitAreaSize(visual, distance)`: the larger of the visual size and the size that subtends 2.5 degrees at the worst seated distance.

  Threads (1.2 cm, `THREAD_TUNING.radius` at `src/config/constants.ts:59`) get an invisible cylinder child of that diameter. It goes after the visible mesh and is scaled in `layoutThread` (ThreadSystem.ts:233-243). Rail tabs (1.6 cm, `SLIDER.handleSize` at :36) get an invisible box child in `buildRail` (buildDiorama.ts:292-305). `SliderSystem.attach` (`src/features/sliders/SliderSystem.ts:66-77`) walks every mesh, so it wires the box without changes. Neither hit area gets a collider: the thread's capsule keeps its explicit dimensions (ThreadSystem.ts:307-312).
- **Hit priority, not moved pegs:**
  - **Order:** set `pointerEventsOrder` from `HIT_ORDER` on knob, tab and thread meshes. pmndrs sorts hits by it before distance (`node_modules/@pmndrs/pointer-events/dist/intersections/utils.js:152-159`), so a knob always beats the hit areas around it.
  - **Preset-only pegs:** add `presetOnlyPegs(level)` to `src/lib/threadRules.ts`, beside `findSnapPeg` (:68-86). It returns the pegs that only the snipped preset threads touch, meaning the presets the stored solution doesn't keep (`solution` lists the presets that stay, `src/lib/levelSchema.ts:52-55`). Those pegs are w1-05 p,q; w1-06 g,h; w2-04 p,q; w2-05 p,q; w2-06 u,v; and w4-06 u,v.
  - **Their behaviour:** they stop being snap targets. `buildPeg` (buildDiorama.ts:116-135) builds them without `RayInteractable` or listeners. So the ray lands on a at w1-06 a/h (2.8 cm apart), and on s at w4-06 s/u (1.6 cm apart).
  - **Unchanged:** level JSON and the proofs.
- **While pulling a thread:**
  - **Snap target:** `startDrag` (ThreadSystem.ts:129-146) caches the snap list once, without the drag's own peg or the preset-only pegs, and `pegMoved` refreshes it. `moveDrag` (:148-155) runs `findSnapPeg` against that list and moves `SnapTarget` only when the target changes. `endDrag`, `cancelDrag` and `levelBuilt` clear it (:157-180, :214-217).
  - **Miss cue:** a new `dragMiss` cue in `src/lib/soundCues.ts:7-52`, below the scale and softer than `refused` (e.g. 123.47 Hz at 0.25). It plays where `endDrag` finds no peg (:166-169). A release within `PEG.snapRadius` of the drag's own peg counts as a tap and stays silent.
  - **Stable release:** new pure `src/lib/releaseTrail.ts`, a fixed `Float64Array` ring of the last 16 drag samples (x, y, ms), with `push`, `reset` and `stableRelease(trail, out)`. When the pointer held still (within 6 mm for at least 60 ms) and the hold ended within 150 ms of the release, the held point wins. Otherwise the release frame stands, so jump drags and deliberate flicks behave as before. `endDrag` uses this instead of the raw release point (:160-165).
- **Test hook:**
  - **`touch()`:** added in `src/features/debug/testHook.ts` (`sceneProbes`, :145-185). It returns `{ [rootName]: { kind, state, travel, pokeInteractable } }`, plus `pokeInteractable` for the plaque.
  - **xr-probe** (`tests/e2e/xr-probe.e2e.mjs`) gains `PROBE_FIELDS` entries (ticket 01's table) for `touch` and `threadEdge`, and a `CUE_FIELDS` entry for the `dragMiss` count, derived in Node from ticket 01's single `cueDrain` (a second drain would empty the log for `melodyNotesDrained`). `threadEdge` is a bare `{x,y,z}` world point 1.1 cm off thread a-b's axis, at its midpoint.

**Blocked by:** 01, 12

**Status:** done

- [x] Unit: new `tests/unit/touchFeedback.test.ts`:
  - press beats target, which beats hover, which beats rest;
  - every `PRESS_TRAVEL` is 0 or 4-7 mm, and the ledge button's isn't 0;
  - `HIT_ORDER` ranks knob above tab above thread.
- [x] Unit: new `tests/unit/hitArea.test.ts`. The seated head is at [0, 1.2, 0]. The 0.5 m diorama is placed by `headRelativePlacement` (`src/lib/placement.ts:220`) and moved to the Farther limit by `offsetOrigin(..., { up: 0, near: -2 })` (:255, `src/lib/settings.ts:8`). The target is its far bottom corner.
  - Thread and tab hit sizes subtend at least 2.5 degrees there, about 3.1 cm.
  - A visual size above the minimum comes back unchanged.
  - A tab's half-extent stays under `SLIDER.handleOffset`, so it never covers its own peg's centre.
- [x] Unit: new `tests/unit/releaseTrail.test.ts`:
  - a 200 ms hold at b, then a release frame 4 cm away, returns b (within 2 mm);
  - a jump (a at 0 ms, b at 16 ms, release at b) returns b;
  - a steady sweep with no hold returns the release point;
  - a hold that ended 300 ms before the release returns the release point;
  - 1000 pushes keep the same buffer object and length.
- [x] Unit: `tests/unit/threadRules.test.ts`: `presetOnlyPegs` returns exactly the 12 pegs above across the 24 levels, and none in World 3. Once they're removed, no two knobs (3.3 cm) overlap at their authored positions.
- [x] Unit: `tests/unit/soundCues.test.ts` adds `dragMiss` to `ALL` and `DULL`. It sits below the scale, differs from `refused` and `cupWrong`, and is quieter than `refused`.
- [x] Unit: `public/ui/hud.uikitml` declares `.toggle:active`, `.stars:hover` and `.stars:active`, and its `<style>` contains no `/* */`.
- [x] Unit: `tests/unit/resetGuard.test.ts` passes under `resetPinch`. `grep -il poke public/ui/hud.uikitml src/lib/resetGuard.ts src/features/hud/settingsFace.ts tests/unit/resetGuard.test.ts tests/e2e/guarded-reset.e2e.mjs` prints nothing.
- [x] E2E: new `tests/e2e/touch-feedback.e2e.mjs`, added to `test:e2e`. It uses the real mouse, with a lead-in move before each step:
  - **Restart:** over it reads `hover`. Held, it reads `press` with 4-7 mm of travel. Released, it reads `hover` with travel 0. Moving off reads `rest`. The chute hovers the same way.
  - **Thread hit area:** 1.1 cm off thread a-b's axis, outside its 6 mm radius, the thread hovers, and a click there snips it.
  - **Tab hit area:** on w3-01, 1.2 cm above the tab's centre, outside its 8 mm half-height, the tab hovers. A drag from there slides peg a, as in `tests/e2e/slider.e2e.mjs:20-30`.
  - **Overlaps:** on w1-06, a pull from b released on h's knob makes b-a and never b-h. On w4-06, a pull from r released on u's knob makes r-s.
  - **Snap target:** on w1-01, pulling from a to 2 cm short of b marks b as `target`. Moving to bare panel clears it, and releasing there makes no thread.
  - **Stable release:** a 200 ms hold on b, then a 4 cm move with the release in the same tick, still makes a-b. `jump-drag.e2e.mjs` stays green unchanged.
  - **Pinch-only:** `pokeInteractable` is false for every thread and for the plaque.
- [x] E2E: `tests/e2e/sound-cues.e2e.mjs`:
  - a pull released on bare panel logs one `dragMiss` and no `thread`;
  - a press and release on a peg logs no `dragMiss`.
- [x] XR: split `pinch_pull` (`tests/e2e/xr-lib.sh:42-53`) into `pinch_sweep` and `pinch_release`. `pinch_pull` stays, as `pinch_sweep` then `pinch_release`, so its other callers (xr-controls.sh, xr-full-level.sh, 09's xr-guest.sh) don't change. Then, in `tests/e2e/hand-pinch.sh`:
  - after the sweep onto b, peg b reads `target`;
  - after the release, a-b exists and nothing reads `target`;
  - a pull released on bare panel makes no thread and drains one `dragMiss`.
- [x] XR: `tests/e2e/xr-controls.sh`:
  - the hand ray resting on Restart without a pinch reads `hover`;
  - selecting reads `press` with 4-7 mm of travel, and releasing reads `hover` again;
  - a pinch at `threadEdge` snips a-b.
- [x] XR: `tests/e2e/gaze-pinch.sh` (metaQuestPro): gazing at the chute without a pinch reads `hover`, and gazing at bare panel reads `rest`.
- [x] Regression: preset-only pegs and hit areas change no outcome. All of these pass:
  - `npm run typecheck`, `npm test` and `npm run test:e2e`;
  - `test:e2e:levels`, `test:e2e:levels:slow` and `test:e2e:dailies` (24 levels, 7 dailies);
  - `npm run test:e2e:hands`.

**Effort:** M (~2 days)

**Gaps closed:** #13, #14, #31. Ticket 12 replaces the hex-nut icon.

**Risks:**
- **Invisible hit meshes:** pmndrs doesn't check `visible` when it intersects (`.../intersections/utils.js:43-75`), so `visible = false` should work and cost no draw call. If IWSDK's BVH path skips hidden meshes, use a `colorWrite: false` material and recheck `meshBreakdown` against `PERF_BUDGET.maxDrawCalls` (constants.ts:167).
- **`children[0]`:** `layoutThread` (ThreadSystem.ts:242) and `ThreadVibrationSystem.ts:19` scale a thread's first child. So the hit cylinder goes second and gets its own scale.
- **Cap travel under a finger:** a finger can lose contact with a sinking cap and press again. Keep the fixed hit cylinder, and keep acting on release (`ControlsSystem.ts:25`).
- **Disposal mid-press:** Restart, Next and snips dispose entities that are still `Pressed`. Guard the disqualify handlers with `entity.active`, as `tagRelease` does (components.ts:60-62).
- **Fingertip hover range:** IWSDK's touch pointer hovers from 20 cm (`node_modules/@iwsdk/xr-input/dist/pointer/touch-pointer.js:15`). A hand resting near the ledge may keep a button lit; judge it from an XR screenshot before tuning.
- **Device drift is unproven:** CLI-driven IWER can't make release jitter under 150 ms, so only the unit tests and the mouse E2E prove the ring buffer.
- **UIKit:** a note in the plaque's `<style>` must be `<!-- -->`, never `/* */`, or the plaque fails to load.

## Comments

- **Oct 25, agent: landed locally on main (not pushed).** Tickets 01 and 12 had landed (their Comments). Ticket 15 hasn't, so 15 lands second: it moves this ticket's hot and target colours (`creamHot`, `brassTarget`, `threadHot`, `threadPresetHot`, `goalHot`, src/features/diorama/palette.ts:36-52) and the plaque's `.toggle:active`, `.stars:hover` and `.stars:active` (public/ui/hud.uikitml:128-138) into its colors.ts, with high-contrast overrides and its contrast and literal-equality tests.
  - **What landed:**
    - Pure modules: src/lib/touchFeedback.ts (`touchState` :24, `PRESS_TRAVEL` :37 with button 5 mm, chute and tab 4 mm, peg and thread 0, `PRESS_AXIS` :46, `HIT_ORDER` :59); src/lib/hitArea.ts (`minTargetSize` :4, `hitAreaSize` :12, `THREAD_HIT_DIAMETER` :17, `TAB_HIT_SIZE` :20, from the new `HIT_AREA` in src/config/constants.ts:76); src/lib/releaseTrail.ts (16-sample `Float64Array` ring, `push`/`reset`/`stableRelease` :82); `presetOnlyPegs` and `landingPeg` in src/lib/threadRules.ts (:116, :93); the `dragMiss` cue (B2, 123.47 Hz at 0.25, src/lib/soundCues.ts:60).
    - `Touchable { kind }` and `SnapTarget` (src/features/puzzle/components.ts:85, :90), listed in src/components.ts. `TouchFeedbackSystem` (src/features/input/TouchFeedbackSystem.ts:33) is registered after `ControlsSystem` (src/index.ts:44). It reacts to `qualify`/`disqualify` on Hovered, Pressed and SnapTarget only, guards every handler with `entity.active`, swaps materials through `HOT_MATERIALS` / `TARGET_MATERIALS` (palette.ts:284, :293), moves the visible parts by the travel, and mirrors `userData.touch`.
    - Wired in: pegs (hover moved out of ThreadSystem, knob `pointerEventsOrder` 2), ledge buttons (cap and icon sink, fixed hit cylinder at the cap's rest size), the chute (now a group named `chute` holding the funnel, so a press dips the funnel), rail tabs (hit box, order 1) and threads (hit cylinder as the second child, scaled in `layoutThread`, src/features/threads/ThreadSystem.ts:301). `setHitOrder` is src/features/input/hitOrder.ts. Only the four ledge buttons are pokeable; threads and the plaque are pinch-only.
    - Pulls: the snap list is cached at `startDrag` without the own peg and the preset-only pegs (`snapCandidates`, ThreadSystem.ts:126), refreshed on `pegMoved` (:283); `moveDrag` moves `SnapTarget` only when the target changes (`markSnapTarget` :152); `finishDrag` (:223) and `levelBuilt` clear it. `endDrag` (:195) uses the stable release and plays `dragMiss` unless the release is on (or beside) the own peg.
    - Hook `touch()` (src/features/debug/testHook.ts:213), including `hud-plaque`. xr-probe gains `threadEdge`, `touch` and the `dragMissDrained` cue field (tests/e2e/xr-probe.e2e.mjs:100, :110, :168). xr-lib.sh has `pinch_sweep` / `pinch_release` (:47, :59) and `pinch_pull` calls both (:63).
    - Words: `resetPinch` / `pinchReset`, "two pinches", and guarded-reset's check names say pinch; the grep in box 7 prints nothing. The stars note already read "Pinch the stars" after ticket 12. HudSystem's melody-book comment says pinching too.
  - **Hit areas are not hidden meshes.** IWSDK's pointers skip `visible = false` objects (`isObjectTreeVisible`, node_modules/@iwsdk/xr-input/dist/pointer/visibility.js, used by the canvas, ray, touch and gaze pointers). With hidden hit meshes, the thread and tab hover checks failed (log ticket11-touch-2.log). Rather than the Risks' `colorWrite: false` fallback (one draw call per hit area), each hit area stays visible on render layer 31 (`HIT_AREA_LAYER`, palette.ts:302). No camera draws that layer: a camera draws layer 0, and each XR view also its own index. pmndrs still raycasts it. Its material also has `colorWrite` and `depthWrite` off. `meshBreakdown` now skips meshes the camera doesn't draw (testHook.ts:423). Flat-view draw calls per level match ticket 12's run, except w4-06 at 54 against 53. This ticket's first run also gave w4-06 53, so the count varies with marbles in flight. The busiest level is still w2-06 at 57.
  - **Hit sizes:** the far bottom corner at Farther -2 (head [0, 1.2, 0], Quest pose) is 0.721 m away. `HIT_AREA.worstDistance` is 0.73, so the thread hit diameter and the tab hit width and height are 3.19 cm, which subtends 2.53 degrees at that corner. The tab's half-extent is 1.59 cm, under `SLIDER.handleOffset` (3 cm).
  - **Two refinements of the release rule (say if either should go):**
    - **A hold at the grab never wins** (releaseTrail.ts). Without this, a flick right after a held pinch would snap back to its own peg and count as a tap, which the ticket says flicks must not do. Tested in tests/unit/releaseTrail.test.ts.
    - **A held point on no peg doesn't win: `landingPeg` gives the release frame its chance.** This came from the regression. The second full `test:e2e` run failed placement.e2e's "the next pinch-pull works on the moved diorama", which had passed in all 8 earlier logs and passed 4/4 when rerun on its own.
      - Cause: the headless browser sends moves about 33 ms apart, so one late move makes a 66 ms gap. The rule counted that gap as a 60 ms hold, the release came within 150 ms, and the held point, 3.7 cm short of c, landed on no peg.
      - Shown first: a new E2E check pauses 100 ms on bare panel 4.5 cm short of b, then lands on b. It failed deterministically (ticket11-landing-e2e-red.log), and 3 new `landingPeg` unit tests failed (ticket11-landing-unit-red.log).
      - With `landingPeg`, both pass, and the full chain below passed.
      - A held mouse sends no moves, so a hold is measured from its first sample until the next sample moves off. The ticket's 200 ms mouse hold has only one sample at b.
  - **Peg listeners:** `RayInteractable` is added after `Peg`, so checking for it at Peg's `qualify` left every peg without listeners (first run, ticket11-touch-1.log). Listeners now attach through a `pinchablePegs` query (Peg + RayInteractable, ThreadSystem.ts:69).
  - **Red first** (logs in .scratch/week8/logs/, gitignored):
    - Unit: 11 of 30 failed across the 7 new or changed files, all for missing modules and functions (ticket11-unit-red.log).
    - E2E, run against the pre-ticket src (stashed for the run, then restored): touch-feedback errored on the missing `touch()`, and sound-cues failed "a pull released on bare panel logs one dragMiss" (ticket11-e2e-red.log).
    - Mutation: with the raw release point and no preset-only exclusion, touch-feedback failed the w1-06 check (made b-h), the w4-06 check (made r-u) and the stable release check (ticket11-touch-mutation-red.log).
  - **XR notes:**
    - Gaze alone, with no pinch, hovers the chute; at that moment the hand ray still pointed at peg b.
    - The busiest XR frame read 116 calls over 2 views (ticket 12: 114). In one session, a separate probe read 108 and 112 at two moments with nothing hovered (ticket11-xr-calls.log). The count varies with the frame sampled; hit areas are not drawn.
    - Fingertip hover range (Risks): not tuned. No hand rests near the ledge in the scripts, and no XR screenshot was taken.
  - **Flake left for ticket 17:** the first full `test:e2e` run errored in first-melody.e2e.mjs with "Execution context was destroyed". Its own `location.reload()` races the first `waitFor` evaluate. It passed 3/3 alone and in both later full runs. `waitFor` could treat a destroyed context as "not yet".
  - **Regression on the final tree** (ticket11-final-*.log). No Vite overlay before or after. The dev server stayed headless with browser automation (`browserCommandReady: true`), and iwsdk.config.json had no diff after gaze-pinch.
    - `npm run typecheck`: exit 0. `npm test`: 46 files, 607 tests passed (touchFeedback 4, hitArea 6, releaseTrail 8, threadRules 14, soundCues 13, resetGuard 4, plaqueStyle 2).
    - `npm run test:e2e`: all 31 scripts, 228 PASS, 0 FAIL, exit 0. touch-feedback is 20/20 and sound-cues 11/11.
    - `test:e2e:levels` 24/24, `:levels:slow` 24/24 and `:dailies` 7/7, all exit 0.
    - `npm run test:e2e:hands`: all 8 scripts, 54 PASS, 0 FAIL, exit 0. This includes hand-pinch 8/8 (target, release, miss), xr-controls 15/15 (hover, press 5 mm, hover again, the thread-edge snip) and gaze-pinch 5/5 (hover, rest).
    - `NODE_ENV=production npm run build`: exit 0. `npm run test:smoke`: 19 PASS, 0 FAIL.
