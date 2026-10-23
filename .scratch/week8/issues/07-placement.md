# 07: Placement that holds up: keep searching, place again after a recenter, fade in (P1)

**What to build:** the room places the diorama and shapes nothing else (ADR 0006), so placement has to be robust. Write the policy as pure `lib/` code first, then wire it into `PlacementSystem` (src/features/placement/PlacementSystem.ts).
- **Search policy, new `src/lib/placementSearch.ts`:** a pure step function that replaces the one-shot 3 s window and the `phase`/`elapsed` fields (PlacementSystem.ts:15-18, 55-69, 98-125).
  - The clock only advances, and the search only evaluates, while the puzzle isn't `paused` (PauseSystem.ts:53; `shouldPause` at src/lib/pausePolicy.ts:10), so a blurred or hidden session no longer times out.
  - A table found at any point places the diorama on it and ends the search. With no table after 3 s of visible time, the diorama floats.
  - While it floats, the search keeps evaluating up to 18 s of visible time, but only while the level is untouched (status `idle`, no player threads, no drag). A table that shows up in that time takes the diorama.
- **Recenter (gap 19):** at session start, attach a `reset` listener to `this.xrManager.getReferenceSpace()`, and remove it at session end. If the space is still null at session start, attach on a later frame, as IWSDK's EnvironmentSystem does (node_modules/@iwsdk/core/dist/environment/environment-system.js:72-82, 121-127, 373-378). In passthrough, `reset` restarts the search from the current head pose, once any drop or drag has ended. Nothing happens in VR or in the browser. `relocate` already keeps threads, slides and a solve (src/features/puzzle/PuzzleSystem.ts:176-183).
- **Hidden until placed, then the one fade for every build (gap 46):**
  - From the start of a passthrough session, and during every new search, the diorama, its plaque, its threads, the ghost hand and ticket 12's ledge strip (its own scene node beside `hud-plaque`; whichever of 07 and 12 lands second adds it) stay hidden. PlacementSystem sets a `dioramaHidden` state flag through the command bus, and the ghost hand checks it (OnboardingSystem.ts:93).
  - This ticket owns the game's only fade; ticket 10 writes none. A pure `revealOpacity(t)` ramp (about 0.3 s, eased, clamped) goes in placementSearch.ts. A new `RevealSystem` (src/features/placement/RevealSystem.ts, registered next to PlacementSystem at src/index.ts:41) restarts it on every `levelBuilt` (PuzzleSystem.ts:137): Next, Restart, level select, a Near or Raise step, and a placement rebuild, which no longer snaps from `DIORAMA_DEFAULT_POSITION`. While `dioramaHidden` is set it holds at 0; the ramp starts when the flag clears.
  - It scales the shared materials (`MATERIALS`, src/features/diorama/palette.ts:138; `MARBLE_MATERIALS` :202; `GOAL_MATERIALS` :217; `GLYPH_MATERIALS` :238) from 0 to each one's base opacity, then restores `opacity` and `transparent` exactly. Any diorama material a later ticket adds (11's hot and target materials, 15's panel, wall, backing and blink materials) must be in one of these maps, or it shows at full opacity during the fade. It only fades in: the store, the colliders and the command bus are live on the build frame, so `loadIndex` and the level proofs wait no longer.
  - While hidden, the diorama ignores peg drags (ThreadSystem.ts:122), tab drags (SliderSystem.ts:74) and the chute pinch (MarbleSystem.ts:85), as ControlsSystem.ts:38 already does for buttons.
- **Desk acceptance from measured reach (gap 21, src/lib/placement.ts):** remove the 0.45 m near-edge limit (:41-46, :204). Add a pure `reachAt(placement, head, level)`: the farthest of the points xr-full-level.sh:28-33 measures (knobs, ledge buttons, chute, plaque stars). Accept a table when that reach is at most `ACCEPT_REACH` (0.61 m, 2 ft: the user's decision on Oct 23, so "within a seated 2 ft" holds on every accepted table). Replace the fixed 0.15 m `EDGE_INSET` (:49) by setting the base as close to the near edge as its real footprint allows: the case reaches 3 cm behind the channel and the ledge 8 cm in front.
  - There is one `reachAt` in src/lib/placement.ts: whichever of 07 and 12 lands second uses the other's helper, and 12's gap-56 test calls it with `headRelativePlacement` (and `offsetOrigin` for Farther -2).
- **On the surface, not in it (gap 21):** today the base sits 1.2 cm into the table. Lift a table placement's frame origin by `DIORAMA.slab` (src/config/constants.ts:11), as the study table already does (EnvironmentSystem.ts:47).
- **While floating:** the `place` command (puzzleStore.ts:66) gains `surface: 'table' | 'floating'`, which PuzzleSystem stores.
  - The contact shadow is exposed in `BuiltDiorama` like `nextButton` (buildDiorama.ts:38-44, 91-98), and is hidden while floating.
  - `hintFor` (src/lib/hud.ts:66-70) takes a `noTable` input and shows "No table found - run Space Setup", passed in by HudSystem.ts:81-96. It ranks below the refusal, onboarding and level hints, and above the ending and the daily line; ticket 14 owns the full order. Ticket 12 moves the hint line to the ledge, so this ticket owns only the text and the condition. The line (32 characters) joins ticket 12's `LEDGE_HINT_MAX_CHARS` test; whichever of 07 and 12 lands second adds it.
- **Facing at the placement (gap 65):** check the facing gate (cos >= 0.5) and the score at the placed centre, not at the table's middle (placement.ts:205-207). Shrink the table-label bonus (:213) below the facing penalty at the gate, so a desk 55 degrees off can't beat an unlabelled table straight ahead.
- **A relocation waits for a drag (gap 47):** thread and tab drags dispatch `drag` start and end on the command bus, and `relocateSoon` and `onStateChange` (PuzzleSystem.ts:142-144, 169-173) wait on them as they wait on `dropping`. On `levelBuilt`, an open drag releases its pointer capture before it is dropped. Today ThreadSystem.ts:207-209 and SliderSystem.ts:119 drop it without `releasePointer`.
- **Study table follows the offset (gap 68):** EnvironmentSystem (:39-59) moves the study table with `settings.offset`. Near steps slide it along z. Up steps scale the merged table mesh about the floor, so its top stays flush with the base and its legs stay on the floor. The fit is a pure `studyTableFit(offset)` in lib/placement.ts.
- **Config (ADR 0006, gap 58's config half):** iwsdk.config.json sets `anchors` (:17), `meshDetection` (:19) and `grabbing` (:39) to false, and keeps `planeDetection` and `sceneUnderstanding`. Nothing in src/ or public/scenes/ uses Grabbable, XRAnchor or XRMesh.
- **DEV hook:** `placement()` (src/features/debug/testHook.ts:60, 234) adds `phase`, `placements` (a count of `place` commands) and `reveal`: the fade's progress from 0 to 1, in the browser too, reported as 1 only once every material's base `opacity` and `transparent` are back. A new `recenter()` calls the injected `window.IWER_DEVICE.recenter()`, which fires `reset` on the next frame (node_modules/iwer/lib/device/XRDevice.js:303-313, 710-727).
- **xr-probe** (ticket 01's tables) gains `SETUP_MODES` entries `recenter`, `hide` and `show` (pause.e2e.mjs's `setHidden`, written inline) and `float` (a `'floating'` `place`), and `PROBE_FIELDS` entries `shadow` (whether the contact shadow is visible) and `hint` (`hook.hud()?.model.hint`). xr-placement.sh reads the hint from ticket 12's `ledge` field, or the `hint` field if 12 hasn't landed; `run()` stays as it is.

**Blocked by:** 01, 02 (merge after its step-4 log push; also for the prod-xr box)

**Status:** ready-for-agent

- [ ] Unit: new tests/unit/placementSearch.test.ts covers the search policy:
  - while paused, the step neither advances nor evaluates, so nothing is placed, even with a table in view;
  - floating after 3 s of visible time with no table;
  - a table at 10 s moves an untouched idle level, but not one with a player thread or a drag;
  - no evaluation after 18 s or once on a table;
  - `reset` restarts the search, hidden and from zero, and waits for a drop or a drag to end;
  - `revealOpacity` is 0 at build and 1 from 0.3 s on, rising and clamped.
- [ ] Unit: tests/unit/placement.test.ts:
  - a 0.74 m desk with its near edge 0.50 m from a seated head (1.15 m) is accepted (RED today); at 0.70 m it floats;
  - a wide table centred 50 degrees off, with its near edge 80 degrees off, is rejected;
  - an unlabelled table straight ahead beats a "desk" 55 degrees off;
  - the frame origin is `DIORAMA.slab` above the surface;
  - `studyTableFit` stays flush from up -6 to +6;
  - the existing 0, 25 and 40 degree tables and the too-small table still pass.
- [ ] Unit: tests/unit/hud.test.ts: the `noTable` hint ranks below the refusal, onboarding and level hints, and above the ending and the daily line.
- [ ] E2E: new tests/e2e/placement.e2e.mjs, in the `test:e2e` chain:
  - `place` with `'floating'` hides the contact shadow, and `'table'` shows it; after each `place`, `reveal` is below 1 on the first frame and reaches 1 within 0.4 s;
  - with real pointer input, a `place` sent mid-pull waits for the release, the thread is made, and the next pinch-pull works;
  - after Raise twice, the study table top is flush with the base's underside (`room()` reports it).
- [ ] E2E: tests/e2e/controls.e2e.mjs: after the real Next (:28) and Restart (:34) clicks, `placement().reveal` is below 1 on the first frame and reaches 1 within 0.4 s, while `levelIndex` and the threads are already live. `test:e2e:levels` passes with outcomes unchanged.
- [ ] XR: new tests/e2e/xr-placement.sh, in `test:e2e:hands` (package.json:19):
  - entering AR places the diorama on the living_room table with `placements` = 1, hidden until then, ledge strip included (`visible` in xr-probe's `ledge` field; whichever of 07 and 12 lands second adds this check);
  - make a thread, turn the head 120 degrees and call `recenter()`: a second `place` reaches the command bus, the diorama hides and then shows again with the thread intact, and the next pinch-pull works;
  - run `probe hide` (pause.e2e.mjs's `setHidden`, waiting inline for `paused`), then `probe recenter`, so the `reset` arrives while the page is hidden: no `place` for 5 s, then one once `probe show` runs;
  - a `'floating'` place shows the hint and hides the shadow.
- [ ] XR: xr-full-level.sh still passes. The reach on the table is at most 0.61 m, and `settle` (xr-lib.sh:15) waits for `reveal` to reach 1.
- [ ] XR: ticket 02's `tests/e2e/prod-xr.mjs` has no hook, so its placement wait becomes the 3 s window plus the fade (about 3.4 s of visible time) before the first pinch. After `NODE_ENV=production npm run build`, re-run `npm run test:e2e:prod-xr` on the local preview: it solves level 1, and `tests/unit/prodXrTargets.test.ts` stays green (update the fixture in the same change if the floating pose moved).
- [ ] Config: typecheck, vitest and both E2E chains pass with the three features off, and `placement().planesSeen` is above 0 in AR.

**Effort:** M (~2.5 days)

**Gaps closed:** #4, #19, #21, #46, #47, #65, #68, #58 (config half), #12 (the per-build fade half; ticket 10 keeps the celebration)

**Risks:**
- Three.js raycasts hit invisible meshes. Without the input guards, a hidden diorama still takes pinches.
- The `palette.ts` materials are shared by every build. The fade must restore `opacity` and `transparent` exactly, and leave `transparent` on for the already-transparent `contactShadow` and `threadPreview`.
- Turning `transparent` on for a shared material compiles a second program the first time, which could hitch the first Next on Quest. Warm it up at boot and check the first fade with tests/e2e/perf-split.e2e.mjs.
- Ticket 01 rewrites the thread and rail-tab drag code. Re-read the ThreadSystem, SliderSystem and pausePolicy line numbers after it merges.
- Never dispose an entity a hand still holds: release the capture first, or that hand's next pinch is swallowed.
- IWER can't show a recenter's misalignment (gap 19). The XR check proves the chain from `reset` to search to `place`, not the alignment on a device.
- Editing iwsdk.config.json restarts Vite, so wait for `browserCommandReady`. Plane detection alone still triggers the spatial-data prompt.
- `ACCEPT_REACH` is 0.61 m, so a table whose controls would sit farther than 2 ft is refused, and the board floats within reach instead. Don't raise the limit without the user: ticket 06's "2 ft" copy depends on it.

## Comments

- **Oct 23, from ticket 05's review:** ticket 18 (`18-solve-depends-on-placement.md`, needs-triage) records stored solutions that end `idle` on the emulator's table at yaw 90 degrees but solve at yaw 0 and in the browser view: w1-04 (Relay) and daily pools 1, 3 and 6. This ticket changes the table pose (the slab lift, the near-edge inset), so re-run 18's sweep once 07 lands. Triage may fold 18's boxes into this ticket.
