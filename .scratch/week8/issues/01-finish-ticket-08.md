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

**Status:** ready-for-agent

- [ ] Gap 37: `npm ci` succeeds from the committed lockfile, and package-lock.json is unchanged. `npm run reference:status` reports the reference warm. After `dev up --headless --allow-browser-automation`, `npx @iwsdk/cli dev status` reports `browserCommandReady: true`.
- [ ] Unit: `npm run typecheck` and `npm test` are green on the branch.
- [ ] Unit: tests/unit/rayPlane.test.ts covers `intersectRayWithPlaneZInto`: a straight hit, an angled hit, a parallel ray, and a plane behind the origin. On a miss, `out` is left untouched. Nothing imports the array form any more.
- [ ] Unit: tests/unit/progress.test.ts:87 ("falls back on schema-invalid data") also asserts, via `vi.spyOn`, one `console.warn` that names the saved progress.
- [ ] E2E: the full `npm run test:e2e` chain (24 scripts) passes. It includes slider, first-thread and jump-drag (the drag paths), raise-lower (now split) and reach (now on `hook.chute(i).world`).
- [ ] E2E: `npm run test:e2e:levels`, `test:e2e:levels:slow` and `test:e2e:dailies` pass on all 24 levels and 7 dailies, so the `CHUTE` and `FRICTION` constants changed no outcome.
- [ ] XR: `npm run test:e2e:hands` passes (hand-pinch, xr-full-level, xr-controls, gaze-pinch). Between them they use all four probe modes. xr-full-level's chute pinch now aims at xr-probe's `hook.chute().world`.
- [ ] No function in tests/ is over 50 lines. sound-cues, levels and plaque are split into named steps. xr-probe's `run()` is under 15 lines and holds no mode or field logic.
- [ ] E2E: on the branch, before and after the xr-probe split, `probe load0` (tests/e2e/xr-lib.sh:35) on a fresh level 1 returns the same 15 keys and the same knob, chute and button points. `SETUP=nope` fails and names `nope`.
- [ ] Gap 42: every command above and its output, plus the merged commit hash, are archived in `.scratch/week7/regression.log`.
- [ ] Main is fast-forwarded locally, the branch is deleted and nothing is pushed. Week 7 ticket 08 reads `Status: done` and has a Comments entry.

**Effort:** S (~1 day)

**Gaps closed:** #37, #42 (prerequisites)

**Risks:**
- Silent E2E failures are usually the environment: a stale Vite overlay, `dev restart` without `--allow-browser-automation`, or a lost browser lease. Rule these out first (tests/e2e/no-overlay.e2e.mjs, `runtime recover`), and don't edit `src/` while a regression runs, because HMR swaps the code under the tests. Ticket 02's rule for a running regression (no checkout or merge in this tree, no dev restart, no other browser script) holds here too.
- Every xr-probe table entry runs inside the app frame, so it must be self-contained (tests/e2e/lib.mjs:2). If an entry uses a module constant or `sleep`, the page throws a ReferenceError, and only at run time. Write the entries as arrow functions, like lib.mjs:16-22. `busiest` and `solve` keep their own inline waits.
- The reused `pegPreview` command object is only safe while every `onCommand` listener reads it synchronously and never keeps it. Today that holds for all six listeners.

## Comments
