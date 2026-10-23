# 01: Finish ticket 08 from the rescued branch (P1)

**What to build:** finish week 7 ticket 08 (standards fixes) on local branch `wip/ticket-08-standards`, prove it with a full regression, and fast-forward main to it. The branch is commit 40023fa: one commit on main's 83977c8, 25 files, never pushed. It goes first because it rewrites the drag code in `ThreadSystem`, `SliderSystem`, `pointerToDiorama` and `buildDiorama`, which tickets 07, 10, 11 and 12 also change.
- **Already on the branch** (from `git diff main wip/ticket-08-standards`):
  - the stale MarbleSystem comment is fixed (src/features/marbles/MarbleSystem.ts:41);
  - drag moves no longer allocate: `intersectRayWithPlaneZInto` (src/lib/rayPlane.ts:20) feeds `pointerToDiorama` (src/features/input/pointerToDiorama.ts:25). `SliderSystem` caches the rail and the tab offset when the tab is grabbed and reuses one `pegPreview` command (src/features/sliders/SliderSystem.ts:42, 79-105);
  - `nextButton.object3D!` is gone (src/features/puzzle/PuzzleSystem.ts:123);
  - the hook's always-false `marbles().scored` is removed. `chute(index)` returns the funnel mouth's world point (src/features/debug/testHook.ts:118), which reach and xr-probe now use;
  - new `CHUTE`, `FRICTION` and `GOAL.insetThickness` constants (src/config/constants.ts:132-151), with the same values as the literals they replace;
  - `DEFAULT_PITCH_HZ` (src/lib/threadTuning.ts:6) replaces the 440 defaults in MarbleSystem and the `Thread` component;
  - the dead exports `clampToRail`, `closestPointOnSegment` and `REST_SPEED` are removed, along with their tests;
  - `loadIndex` now waits for `levelIndex` plus 4 rendered frames instead of `sleep(250)` (tests/e2e/lib.mjs:41-60);
  - raise-lower.e2e.mjs is split into five named steps;
  - `AIM_PLANE_Z` is reused for the ghost hand (src/features/onboarding/OnboardingSystem.ts:21) and the rail tab (src/features/diorama/buildDiorama.ts:301);
  - `pegPoint(id)` finds one peg instead of mapping them all (src/features/threads/ThreadSystem.ts:100);
  - storage warns when a save falls back on schema (src/lib/storage.ts:18);
  - `toXrVisibility` replaces a cast in PauseSystem (src/lib/pausePolicy.ts:7).
- **Already on main:** glyph geometry disposal and the dev tooling's removal from the bundle (3fb6f91), plus the plane type guard `isNativePlane` (src/features/placement/PlacementSystem.ts:27, e63d92d).
- **State on Oct 22:** a scratch export of 40023fa passes `tsc --noEmit` and 237 unit tests. Main passes 238: the branch removes 3 `closestPointOnSegment` tests and adds 2 `toXrVisibility` tests. The two Oct 4 notes don't reproduce in unit:
  - `FOOTPRINT_HALF_DEPTH` is still exported (src/lib/placement.ts:25). Keep it: tests/unit/placement.test.ts:5 imports it.
  - `loadIndex` is already a state wait.

  No E2E run, level proof or XR script has run against this code.
- **Still to do:**
  - fix two doubled doc comments left by the rescue. The pentatonic comment now sits on `DEFAULT_PITCH_HZ` (src/lib/threadTuning.ts:4-5), and the old `KNOB_Z` comment sits above the new one (src/features/onboarding/OnboardingSystem.ts:19-20);
  - delete `intersectRayWithPlaneZ` (src/lib/rayPlane.ts:9), which no longer has a caller in src. Move tests/unit/rayPlane.test.ts onto the `Into` variant, as was done for `clampToRail`;
  - split the test functions over 50 lines into named steps, like raise-lower: sound-cues.e2e.mjs:20 (61 lines), levels.e2e.mjs:7 and plaque.e2e.mjs:6 (51 each);
  - give xr-probe.e2e.mjs:4 (61 lines) a shape that stays short while tickets 07-16 add modes and fields to it:
    - `SETUP_MODES`: one page function per mode, `load0`, `thread`, `busiest` and `solve` (:9-32). The header comment (:2-3) names all four. An unknown SETUP throws with its name. An empty one runs no setup.
    - `PROBE_FIELDS`: one `[name, page function]` entry per returned field, 14 today (:35-60). Each reads `window.__threadbound` itself, so `knobs` and `threadMid` call `state()` themselves (:34-38).
    - `CUE_FIELDS`: the cue log is drained once, last, by one `cueDrain` page function that returns the drained records (today `hook.cues()`, each name wrapped as `{ name }`, :61). Each `[name, Node function]` entry derives one field from those records in Node; today only `melodyNotesDrained`. Draining `cues()` or ticket 10's `cueTrace()` empties both, so no other entry drains.
    - `run()` only checks the mode, runs it, waits the 300 ms settle (:33), reads the `PROBE_FIELDS` entries in order with one `app.evaluate` each, then runs `cueDrain` and the `CUE_FIELDS`. A later ticket adds a table entry and leaves `run()` alone;
  - accept two remaining allocations, and say so in the Comments: `pegPoint` still spreads one object per lookup, and `pegPoints` (ThreadSystem.ts:94) still maps the list once per release (:165) and once per rail settle (:270). Neither runs per move.
- **Land it:**
  - The week 8 docs (CONTEXT.md, docs/adr/0004-0006, .scratch/week8, .scratch/week9) are committed on main before this ticket starts; if they aren't, stop and ask.
  - On the branch, run everything below and fix whatever fails.
  - Land the work as one commit, `refactor: standards fixes from the bug bash (week 7 ticket 08)`. Then `git merge --ff-only` into main and delete the branch. If main has moved past 83977c8 (03, 04 or 05 merged first), rebase the commit onto main, run the regression on the rebased commit, then ff-only. Do not push: ticket 02 makes the one push that deploys this work, after its baseline regression is green.
  - Include the `allowScripts` block in `package.json` (uncommitted today; npm 11 needs it for `npm ci`).
  - Set week 7 ticket 08 to `Status: done`, tick its items, and add a Comments entry.

**Blocked by:** none

**Status:** done

- [x] Gap 37: `npm ci` succeeds from the committed lockfile, and package-lock.json is unchanged. `npm run reference:status` reports the reference warm. After `dev up --headless --allow-browser-automation`, `npx @iwsdk/cli dev status` reports `browserCommandReady: true`.
- [x] Unit: `npm run typecheck` and `npm test` are green on the branch.
- [x] Unit: tests/unit/rayPlane.test.ts covers `intersectRayWithPlaneZInto`: a straight hit, an angled hit, a parallel ray, and a plane behind the origin. On a miss, `out` is left untouched. Nothing imports the array form any more.
- [x] Unit: tests/unit/progress.test.ts:87 ("falls back on schema-invalid data") also asserts, via `vi.spyOn`, one `console.warn` that names the saved progress.
- [x] E2E: the full `npm run test:e2e` chain (24 scripts) passes. It includes slider, first-thread and jump-drag (the drag paths), raise-lower (now split) and reach (now on `hook.chute(i).world`).
- [x] E2E: `npm run test:e2e:levels`, `test:e2e:levels:slow` and `test:e2e:dailies` pass on all 24 levels and 7 dailies, so the `CHUTE` and `FRICTION` constants changed no outcome.
- [x] XR: `npm run test:e2e:hands` passes (hand-pinch, xr-full-level, xr-controls, gaze-pinch). Between them they use all four probe modes. xr-full-level's chute pinch now aims at xr-probe's `hook.chute().world`.
- [x] No function in tests/ is over 50 lines. sound-cues, levels and plaque are split into named steps. xr-probe's `run()` is under 15 lines and holds no mode or field logic.
- [x] E2E: on the branch, before and after the xr-probe split, `probe load0` (tests/e2e/xr-lib.sh:35) on a fresh level 1 returns the same 15 keys and the same knob, chute and button points. `SETUP=nope` fails and names `nope`.
- [x] Gap 42: every command above and its output, plus the merged commit hash, are archived in `.scratch/week7/regression.log`.
- [x] Main is fast-forwarded locally, the branch is deleted and nothing is pushed. Week 7 ticket 08 reads `Status: done` and has a Comments entry.

**Effort:** S (~1 day)

**Gaps closed:** #37, #42 (prerequisites)

**Risks:**
- Silent E2E failures are usually the environment: a stale Vite overlay, `dev restart` without `--allow-browser-automation`, or a lost browser lease. Rule these out first (tests/e2e/no-overlay.e2e.mjs, `runtime recover`), and don't edit `src/` while a regression runs, because HMR swaps the code under the tests. Ticket 02's rule for a running regression (no checkout or merge in this tree, no dev restart, no other browser script) holds here too.
- Every xr-probe table entry runs inside the app frame, so it must be self-contained (tests/e2e/lib.mjs:2). If an entry uses a module constant or `sleep`, the page throws a ReferenceError, and only at run time. Write the entries as arrow functions, like lib.mjs:16-22. `busiest` and `solve` keep their own inline waits.
- The reused `pegPreview` command object is only safe while every `onCommand` listener reads it synchronously and never keeps it. Today that holds for all six listeners.

## Comments

- **Oct 23, agent: landed. Main fast-forwarded 189b9a7..f9b7c5e locally, branch `wip/ticket-08-standards` deleted, nothing pushed (origin/main still 83977c8).** Scope widened by the user on Oct 23 (Q45): besides ticket 08 itself, fix the three E2E scripts that also fail on main, fix the first review's findings, and compare xr-controls on main and the branch. So the work lands as ten commits instead of one: the ticket 08 refactor stays one commit, and each new fix is its own small commit.
  - `72b2c91 refactor: standards fixes from the bug bash (week 7 ticket 08)`: 91e558c rebased onto 189b9a7 (docs only since its base), unchanged.
  - `b3e5b07 test: spool E2E checks the refusal clears, not that the hint goes blank`. Week 7 ticket 07 gave w4-01 a level hint ("Threads use up the spool below"), which is what the line shows once a refusal clears. "success clears the refusal" now waits for `state().refusal === null` and the hint equal to the level's own hint (tests/e2e/spool.e2e.mjs:9-13, :30).
  - `ff0ff43 test: settings E2E checks the whole settings face is in the flat view` (written first, RED), then `f2084a5 fix: frame the flat view so the whole settings face is on screen` (GREEN):
    - Cause: 83977c8 added the Prev / Level / Next row (public/ui/hud.uikitml:177-181), so the settings face grew 4.4 cm to about 22 cm. On the 756 x 469 canvas its top edge sat at y -54 px and its top row (Slow-mo, Reset progress) at y -4 px, so settings.e2e and guarded-reset.e2e failed on main too.
    - Fix: one change in `iwsdk.config.json`. The flat-view camera (`render.camera.position`) moves from (0, 0.98, 0.32) to (0, 1.07, 0.40), 9 cm up and 8 cm back. Raising it alone would have pushed the ledge buttons off the bottom: at (0, 1.08, 0.32) their lowest edge is 3 px from it. The plaque, its layout and its ids are untouched (ticket 12 owns them). This pose only drives the non-XR view: in XR the headset pose replaces it, and IWSDK restores it when a session ends.
    - Now: face top y 28 px, top row y 73 px, ledge buttons y 425 px. The top row is below IWER's Enter XR pill (y 13-41), which now covers only the face's "Settings" title.
    - Proof: settings.e2e gains three checks (tests/e2e/settings.e2e.mjs:27-49, :74-77). The face's top edge is on screen. It is taken as twice the plaque centre's height above its bottom edge, because the plaque grows up from the panel origin. Both top-row controls and all four ledge buttons are inside the canvas. Before the fix: 2 of the 3 new checks and 3 old ones FAIL. After: settings.e2e 9/9 and guarded-reset.e2e 5/5, both with real mouse clicks (`clickCanvas`).
  - First review's findings, one commit each:
    - `53e19c0`: `frames()` resolves `{ complete, rendered }`, and `loadIndex` throws "level N: frames stalled (rendered k of 4 in 1 s)" (tests/e2e/lib.mjs:41-76).
    - `6e0eb96`: the unused `SLIDER` import is gone from SliderSystem.
    - `38a7a26`: `start()` resolves the peg and tab Object3Ds into the drag (src/features/sliders/SliderSystem.ts:26-28, :89-92). `move()` calls the lookup-free `placeVisualsAt` (:104, :176-192). `placeVisuals` keeps the by-id lookups for release, cancel and refusal, which run once per slide.
    - `3f04949`: raise-lower's `replayDrop` is renamed `restartWithThread`, at both call sites.
    - `aba7a24`: the load/save block in tests/unit/progress.test.ts restores mocks in `afterEach` (:75-77), so a failed assertion no longer leaves `console.warn` mocked.
  - `f9b7c5e test: xr-controls prints where the chute is when a chute pinch misses`:
    - xr-controls.sh, 5 runs on main 189b9a7: 5/5 exit 0, 9/9 checks each. 5 runs on the branch: also 5/5, 9/9 each. The branch is not flakier.
    - The aim point is the same on both: main's `worldOf(x, y + 0.02)` and the branch's `hook.chute().world` (`CHUTE.lift` 0.02) both give (-0.15, 1.17, -0.42), and the before/after probe below matches.
    - The one failure on 91e558c read `idle`, i.e. no drop was running when the probe read the status.
    - If it recurs, the failure line is now followed by the aimed point, then a fresh `hook.chute().world`, `hook.frame()` and the status (tests/e2e/chute-where.e2e.mjs). That separates a moved diorama from a drop that ended before the probe read it.
- **Regression on f9b7c5e (archived in `.scratch/week7/regression.log`, section "week 8 ticket 01 final regression", Oct 23 09:25; gitignored):**
  - Gap 37: proven in the same log's 07:07 section. `npm ci` exit 0 with package-lock.json's shasum identical before and after. `npm run reference:status` warm (`warmupRequired: false`). `dev up --headless --allow-browser-automation` then `dev status` reports `browserCommandReady: true`. package.json and package-lock.json are unchanged since (a7bca6d..f9b7c5e). `dev status` reports `browserCommandReady: true` again before this run.
  - Unit: `npm run typecheck` exit 0. `npm test`: 31 files, 237 tests passed. tests/unit/rayPlane.test.ts covers the 4 cases and checks `out` is left untouched on both misses; nothing in src/ or tests/ references the array form.
  - E2E: `npm run test:e2e` exit 0. All 24 scripts ran, 137 checks PASS, 0 FAIL, including slider, first-thread, jump-drag, raise-lower, reach, settings, spool and guarded-reset.
  - Levels: `test:e2e:levels` 24/24 and `test:e2e:levels:slow` 24/24, no draw-call breach. `test:e2e:dailies` 7/7. So `CHUTE` and `FRICTION` changed no outcome.
  - XR: `npm run test:e2e:hands` exit 0. 4/4 scripts, 20 checks: hand-pinch 4, xr-full-level 4, xr-controls 9, gaze-pinch 3. The XR busiest frame is 110 calls over 2 views, with no breach. All four probe modes ran: load0, thread, busiest and solve. xr-full-level's chute pinch aims at the probe's `chute`, which is `hook.chute().world`. gaze-pinch left `iwsdk.config.json` unchanged.
  - Function length: a TypeScript AST scan of every function in tests/**/*.{mjs,ts} finds none over 50 lines (longest 46, tests/e2e/daily.e2e.mjs:15). xr-probe's `run()` is 12 lines.
  - Probe: on the merged tree, `fresh_page` then `SETUP=load0` was run with main's pre-split xr-probe and then with the table-driven one. Both return the same 15 keys in the same order, with identical knobs, chute and buttons. `SETUP=nope` fails with "xr-probe: unknown SETUP mode 'nope'".
- **Accepted allocations** (not per move): `pegPoint` (src/features/threads/ThreadSystem.ts:100) still spreads one object per lookup, on addThread and preset creation. `pegPoints` (:94) still maps the peg list once per thread release (:165) and once per rail settle (:270). The slider and thread move paths allocate nothing.
- Node is v26.7.0 locally; .nvmrc and CI use 22.12.0. The dev server is left running headless with browser automation.
- **Post-landing review (two low findings):**
  - Fixed: the docs for `CHUTE.lift`, `hook.chute()` and `chute-where.e2e.mjs` called the pinch point the funnel's "mouth". It is the funnel's centre, and `ONBOARDING.chuteLift` used "mouth" for a different point 2 cm lower. All of them now say "funnel centre" or "chute point". Comments only, no behaviour change.
  - Left for ticket 17: `chute-where` can't tell a pinch that missed from a drop that already ended, because both read status 'idle'. It also races the drop's 1.2 s quiet timer. Fix: add a `marbleCount` PROBE_FIELDS entry, pass xr-controls' chute check on `status != idle || marbleCount > 0`, and correct the earlier Comments sentence claiming the diagnostics tell the two apart.
