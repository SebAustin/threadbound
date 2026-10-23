# Gap analysis: completeness-critic follow-ups
Six areas the main report did not check, each examined by a follow-up auditor (2026-10-22).

## Run the deployed production bundle in an XR session. Load https://sebaustin.github.io/threadbound/ (or `vite preview` of dist/) under the public Immersive Web Emulator extension, enter AR, play level 1 by hand pinch only and capture the console. Repeat on the release candidate before the v1.0 tag. Also decide whether CI should gate on the level proofs. Effort S.

### The judged production bundle has never been run in an XR session (emulated or on a device)

- **Severity / effort:** high / S
- **Criterion:** Technical Implementation (solid, bug-free, Quest-performant); Entry rules: 'capable of successful and consistent operation'; Stage One pass/fail

Every XR, hand and level proof depends on the DEV-only test hook, so it can only run against the Vite dev server with IWER injected. The bundle on GitHub Pages is a different build: it has no hook, no IWER, minified chunks and its own worker and wasm URLs. Nothing in the repo shows that bundle entering an immersive session. The regression logs only show that the build compiles. On 2026-10-22 I ran the live Pages build in a desktop Chromium pane. That pane has no WebXR (isSessionSupported returned false for both AR and VR), so only the flat path was checked. Its XR path (session start, hand input, plane placement, audio unlock in XR) is still unproven. The last full regression log was written before the two runtime commits that are now live, so those commits were only spot-checked. The freeze checklist says 'the Pages URL verified' but never says what that means.

**Evidence:**
- src/index.ts:49-57: PerfProbeSystem and installTestHook are loaded only under `import.meta.env.DEV`; src/features/debug/testHook.ts:279 `if (!import.meta.env.DEV) return;`
- tests/e2e/lib.mjs:16-17: hookReady and isComplete read `window.__threadbound`; tests/e2e/run.sh:5 'Needs: npx @iwsdk/cli dev up'; README.md:76-79 says the E2E 'needs the dev server'
- Deployed assets/index-r6sQkKGx.js (6,668,560 B raw, 1,741,517 B gzip): 0 hits for `__threadbound`, `XRDevice` and `frameStats`, so no hook and no IWER in the judged bundle
- Live run 2026-10-22 in a desktop pane without WebXR: clicking Enter XR only logs `[Threadbound] no immersive session mode is supported here` (src/panel.ts:42), so the XR path could not be reached
- .scratch/week5/regression-final.log and .scratch/week6/regression-fixes.log end with '--- build ✓ built in 7.18s': a compile check only, with no run of vite preview or dist/
- The last regression log, .scratch/week6/regression-fixes.log, is dated Oct 4 18:57. Commits e63d92d (19:47; AudioUnlockSystem, PlacementSystem, ThreadSystem, SliderSystem, pointerEvents) and 83977c8 (19:58; PuzzleSystem BuildReason) came after it, and both are live: Pages Last-Modified is 2026-10-05 00:59:49 GMT, matching the CI run for 83977c8 at 00:58:52Z
- .scratch/week7/issues/05-freeze-and-tag.md:3 'the build deployed, the Pages URL verified', with no defined procedure
- Brief: 'Entries must be capable of successful and consistent operation'; 'judging is based on the state at the deadline'

**Fix options:**
- Manual, about 1 hour: in desktop Chrome with Meta's public Immersive Web Emulator extension, open https://sebaustin.github.io/threadbound/, enter AR, switch to hands, and play level 1 with pinches only (pinch-pull a to b, then pinch the chute). Also open the gear and the sun. Save the console and screenshots to .scratch/week8/prod-xr-smoke.log. Repeat on the release-candidate commit before tagging v1.0.
- Scripted: Playwright against `npm run build && npm run preview`, injecting IWER from node_modules with page.addInitScript, then enter AR and use hand pinches. Assert zero console errors, status 200 for the physics worker, Havok wasm and scene JSON, and a non-blank canvas. Without the hook, completion can only be checked by pixels or screenshots. Synthetic clicks need a lead-in pointermove (tests/e2e/lib.mjs:64); I saw a bare CDP click hit the previously hovered peg instead of the chute, which would make the smoke test fail when nothing is wrong.
- Rewrite ticket 05 so 'Pages URL verified' means: the prod XR smoke passes, the full regression (unit, E2E, levels at both speeds, hands) is green on that exact commit, and both logs are committed.

### CI gates deploys on unit tests and the build only; the level proofs and XR hand tests gate nothing

- **Severity / effort:** medium / M
- **Criterion:** Technical Implementation (reliability); Polish & Presentation (performant, bug-free judged build)

deploy.yml runs typecheck, vitest and vite build, then publishes. The 24 level proofs, the slow-motion proofs, the real-input E2E chain and the four emulated-XR hand scripts run only when someone starts them by hand against the dev server. Every push before the freeze reaches judges and testers within about a minute with no gameplay check. Ticket 08 is still open and plans changes to the thread and slider drag code, which no CI step exercises. The earlier report's 'CI-gated deploys' strength therefore covers pure logic only.

**Evidence:**
- .github/workflows/deploy.yml:27-29: only `npm run typecheck`, `npm test`, `npm run build` run before upload-pages-artifact (line 32)
- gh run list: the last 8 pushes to main each ran 'Test and deploy to GitHub Pages' in 1m00s to 1m20s, all deployed
- package.json: the scripts test:e2e, test:e2e:levels and test:e2e:hands appear in no workflow
- tests/e2e/levels.sh: one browser lease per level ('leases cap at 110 s'); real-time physics across 24 levels at normal speed, plus SLOW=1
- .scratch/week7/issues/08-standards-fixes.md: Status ready-for-agent; it includes 'the slider and thread drag paths allocating per move' and '`loadIndex`'s fixed sleep becomes a state wait'

**Fix options:**
- Add a fast prod smoke job to CI before the upload step: vite preview plus headless Playwright. Check the page loads with zero console errors, that the worker, wasm, scenes/main.iwsdk.scene.json and ui/*.uikitml return 200, and that the canvas is not blank. This adds about 1-2 minutes and catches broken chunk or base paths.
- Make the full local regression (unit, test:e2e, test:e2e:levels with and without SLOW=1, test:e2e:hands) a required, logged step before any push to main from now until the freeze. A pre-push hook or a checklist in ticket 05 would do it.
- Optional: a nightly or manual workflow_dispatch job that runs `npx @iwsdk/cli dev up --headless --allow-browser-automation` and levels.sh on ubuntu-latest. Check what it costs and how flaky SwiftShader is before making it a merge gate.

**Decision for the user:** Should CI block deploys on the 24 level proofs and the XR hand scripts? That adds per-push minutes, plus the risk that IWSDK's managed browser and real-time physics are flaky on GitHub runners. The alternative is a fast prod smoke in CI, with the full suite as a logged local release gate.

### Pages deploys whatever is on main, not the v1.0 tag, so any push after the deadline changes the judged build

- **Severity / effort:** medium / S
- **Criterion:** IWSDK submission rules ('may not change the submission'; 'judging is based on the state at the deadline'; must remain available until ~Dec 11)

The workflow deploys on every push to main, including docs-only commits. Pages is configured with build_type 'workflow' from branch main. The planned v1.0 tag has no effect on what is served. A README or video-link fix pushed after Nov 18 12:00 PT would rebuild and redeploy the site during judging. The forum post also tells testers they are on 'the live GitHub Pages build of `main`', so their feedback describes a moving target.

**Evidence:**
- .github/workflows/deploy.yml:4-5 `push: branches: [main]` with no paths-ignore and no tag filter
- gh run list: the docs-only commits cb5880e (README and submission copy) and fbcaf52 (video kit) each triggered a full deploy
- gh api repos/SebAustin/threadbound/pages: build_type 'workflow', source branch 'main'
- docs/forum-post.md:33 'the URL is the live GitHub Pages build of `main`'
- .scratch/week7/issues/05-freeze-and-tag.md:3 'the tag `v1.0` on the judged commit'

**Fix options:**
- At the freeze, change the trigger to `push: tags: ['v*']` plus workflow_dispatch, and deploy the tagged commit only.
- Add `paths-ignore: ['docs/**', '**/*.md', '.scratch/**']` now, so copy edits stop redeploying the game.
- After the deadline, disable the workflow (or protect the github-pages environment) until winners are announced (~Dec 11). Keep doc edits on a branch or in Devpost.

**Decision for the user:** After the freeze, should only a v* tag or a manual dispatch deploy, or should the workflow be disabled from Nov 18 until judging ends?

### On a non-XR browser, Enter XR fails silently: the only feedback is a console warning

- **Severity / effort:** low / S
- **Criterion:** Experience Design (clear onboarding); Stage One screening ('AI tools may also be used to assist in the judging')

In the deployed build on a desktop browser without WebXR, the welcome panel still shows Enter XR. Clicking it only writes a console warning, and nothing changes on screen. A screener or AI-assisted reviewer who opens the link on desktop, which the brief explicitly allows, sees a dead button and never reaches the mixed-reality mode. Flat mouse play works, so this is a presentation and trust problem, not a blocker.

**Evidence:**
- src/panel.ts:42 `console.warn('[Threadbound] no immersive session mode is supported here')` followed by return
- Live run 2026-10-22: the click produced only that warning; the panel still reads 'Enter XR'
- Deployed bundle has no emulator injected (`XRDevice` 0 hits); the bundled config has `dev.emulator` but no `injectOnBuild`

**Fix options:**
- When neither immersive-ar nor immersive-vr is supported, replace the button label or the panel text with a line such as 'Open in Quest Browser to play in mixed reality' (or point to the Immersive Web Emulator).
- Or set IWSDK's `dev.emulator.injectOnBuild` with a Quest userAgentException, so desktop judges get emulated XR while Quest keeps native WebXR. Verify the exception carefully on the prod smoke.

### A refusal line stays on the plaque after the level is solved (seen live on the deployed build)

- **Severity / effort:** low / S
- **Criterion:** Polish & Presentation (UI/UX); Best First Five Minutes (payoff clarity)

Only a new thread, a snip, a rail move or a level rebuild clears `refusal`; dropping marbles and solving do not. The hint gives a refusal top priority, so after a solve the plaque keeps showing the refusal next to three filled stars. On the live build, level 1 finished with 3 stars while the plaque read 'Those pegs are already joined'. A common real sequence triggers it: try one thread too many ('No threads left - snip one first'), then drop and solve. On the final level the refusal would hide the ending line 'All 24 solved - poke the sun for a daily'.

**Evidence:**
- src/lib/hud.ts:67-69 `return refusal || input.hint || input.levelHint || ending || ...`
- refusal: null is set only at src/features/threads/ThreadSystem.ts:310 and :320, src/features/sliders/SliderSystem.ts:133 and src/features/puzzle/PuzzleSystem.ts:134 (level build); nothing on 'drop' (src/features/marbles/MarbleSystem.ts:92)
- Live run 2026-10-22: after a duplicate refusal, the level-1 solve showed three filled stars with the stale refusal still on the plaque

**Fix options:**
- Clear `refusal` when a drop starts, in MarbleSystem.drop or the 'drop' command handler. Add a unit test in hud.test.ts and an E2E check: refuse, drop, solve, then expect the ending or level hint.

### In XR, the hand models load at runtime from a third-party CDN (jsDelivr)

- **Severity / effort:** low / S
- **Criterion:** IWSDK submission ('must remain available and accessible throughout judging'); Technical Implementation (reliability)

The deployed bundle builds hand and controller model URLs from https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/<profile>/<handedness>.glb (generic-hand left and right). Nothing in src overrides assetPath. If jsDelivr is slow or blocked during judging, the hand visuals are missing even though pinch input still works. That weakens the hands-first presentation, and the dependency sits outside the entrant's hosting.

**Evidence:**
- Deployed index-r6sQkKGx.js: `y01="https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles"` and createVisual's default `${y01}/${c}/${t.handedness}.glb`; 'generic-hand' appears 6 times
- `grep -rn 'assetPath|cdn.jsdelivr' src` finds nothing, so there is no override

**Fix options:**
- Copy the generic-hand left.glb and right.glb (and the generic-trigger controller models) into public/ and pass the input-visual assetPath override that IWSDK supports, so everything is served from GitHub Pages.
- Or accept the risk and record it in the freeze checklist.

**Strengths found:**
- I loaded the live build (https://sebaustin.github.io/threadbound/, assets/index-r6sQkKGx.js) in a desktop Chromium pane on 2026-10-22. It boots with a clean console: the only output is the IWSDK v1.0.0-rc.2 banner, with no errors and no warnings until Enter XR is clicked.
- Relative-base asset paths work under /threadbound/. physics-worker, world-initializer, inter, msdf-worker and worker chunks all return 200, as do scenes/main.iwsdk.scene.json, ui/welcome.uikitml, ui/hud.uikitml and HavokPhysics-BqNY-4N9.wasm (2,094,563 B, application/wasm).
- Flat mode works end to end in the production bundle: on level 1, a mouse pinch-pull a to b, then the chute, ran the marbles through the Havok worker into the cup and gave 3 stars. After a reload the save resumed at level 2 (Switchback). Physics, scoring, audio-free UI and persistence all run without the dev hook.
- Dev tooling is really stripped. The deployed bundle has 0 hits for __threadbound, PerfProbe, frameStats, meshBreakdown and physicsBodies, and it still registers all 16 gameplay systems (matches src/index.ts:30-47).
- Every requested XR feature is optional. The bundled config maps `true` to `{}` to optionalFeatures (S4 / $t1). So a headset without mesh detection, plane detection or gaze tracking will not fail session creation because of a required feature.
- CI is green and reproducible: 8 of the last 8 pushes passed typecheck, unit tests and build and deployed in about 1 minute. package-lock.json and .nvmrc are committed, so a rebuild during judging is deterministic.
- The deployed build matches main HEAD 83977c8: Pages Last-Modified 2026-10-05 00:59:49 GMT equals that commit's CI run. Ticket 07's level-JSON edits only reformat the files and add `hint`; I compared parsed data with hint removed and it is identical, so the stored solutions behind the level proofs are unchanged.

## Check a shared or reused judging device: start from a save with any level solved and confirm whether a new judge ever sees the ghost hand. Add a fresh-start path that does not touch the existing save, such as `?fresh=1` or a "New player" button on the 2D welcome card, or show the ghost hand on level 1 whatever the progress. Effort S.

### A reused headset or browser profile never shows the ghost hand again, and only a destructive reset brings it back

- **Severity / effort:** medium / S
- **Criterion:** Best First Five Minutes (the award the submission targets first); Experience Design ('clear onboarding'); Polish & Presentation (the testing instructions must be accurate)

Confirmed in code. Once any campaign level has a saved star in localStorage, onboarding is permanently 'done'. The game also resumes on the first unsolved level, not level 1. Say judge B uses a headset or Quest Browser profile where judge A, a Stage One screener, or a staff tester already played. Judge B enters XR mid-campaign. No ghost hand appears. On most levels the plaque has no hint line either, because only 5 of 24 levels carry a `hint` (w1-03, w1-05, w2-01, w3-01, w4-01). Level 2 'Switchback', where someone lands after only level 1 was solved, has none. Going back to level 1 with Prev on the settings face does not help, because `hasSolvedAny` is still true. The only way back is 'Reset progress' poked twice on the settings face. That wipes the earlier player's stars, streak and melody book, and nothing tells a judge it exists. Meanwhile submission.md step 4 says 'Follow the ghost hand on level 1', and the Best First Five Minutes pitch rests on the ghost hand. Nothing in the brief says judges share devices, so how likely this is cannot be known. If it does happen, the award's main showcase is invisible and the instructions are wrong. One thing softens it: the 2D welcome card describes the gesture in one sentence to every visitor before Enter XR.

**Evidence:**
- src/lib/onboarding.ts:16 `if (hasSolvedAny || levelIndex !== 0 || status === 'complete') return 'done';`
- src/features/onboarding/onboardingState.ts:10 sets hasSolvedAny to true if any LEVELS id has best > 0
- src/features/onboarding/OnboardingSystem.ts:33 'Hidden for good after the first solve.'; .scratch/week4/issues/03-ghost-hand-onboarding.md:3 '...and never sees it again after solving' (on purpose, but a shared device was never considered)
- src/features/puzzle/PuzzleSystem.ts:45-52 loads progress from storage, then `this.loadLevel(resumeIndex(LEVELS, progress.best))`; src/lib/resume.ts:7-13 picks the first unsolved level
- src/lib/progress.ts:5 key 'threadbound.progress.v1' in localStorage (src/lib/storage.ts:41-48), which persists per origin across sessions
- No URL-parameter handling anywhere: grep for URLSearchParams/location.search in src and index.html finds nothing
- The only fresh-start path is destructive: src/features/hud/settingsFace.ts:78-82 (two pokes), src/features/puzzle/PuzzleSystem.ts:76-79 (saves INITIAL_PROGRESS and loads level 0), public/ui/hud.uikitml:174
- Only 5 level files have a `hint` field (src/levels/world1/03, 05; world2/01; world3/01; world4/01); src/levels/world1/01-first-thread.json and 02-switchback.json have none
- src/lib/levelSelect.ts:8-17 lets Prev go back to level 1, but onboardingStep still returns 'done'
- docs/submission.md:105 '4. Follow the ghost hand on level 1, then poke **Next**.'; README.md:18 says the same; docs/submission.md:78 makes the ghost hand the Best First Five Minutes evidence
- Every onboarding E2E starts from a wiped save (tests/e2e/onboarding-comeback.e2e.mjs:7-8 dispatches resetProgress first). No test covers a second player on a used save
- Mitigation: public/ui/welcome.uikitml:63 describes the gesture in the 2D card, which every visitor sees before Enter XR (src/panel.ts:55-64)

**Fix options:**
- Guest link that leaves the save alone: in src/lib/storage.ts `browserStorage()`, return the existing `memoryStorage()` (storage.ts:32-38) when `new URLSearchParams(location.search).has('fresh')`. Put https://sebaustin.github.io/threadbound/?fresh=1 in the testing instructions as 'always starts at the tutorial'. Keep the plain link as the main URL, so judges who come back still see resume, streak and melody book. Add one E2E: seed a solved save, load ?fresh=1, assert levelIndex 0, ghost step 'pinch-pull', and the localStorage value unchanged. About 2 hours.
- Add a 'New player' button to the 2D welcome card (public/ui/welcome.uikitml beside xr-button). It switches this page load to memoryStorage and loads level 0 before launchXR. It is visible to anyone who opens the URL, and nothing is wiped.
- Docs-only fallback (under 30 minutes): add to docs/submission.md 'Testing instructions' and README.md 'Try it': 'If this headset has played Threadbound before, open the gear and poke Reset progress twice to see the tutorial.' This fixes the wrong instruction but still wipes the earlier player's save.
- Do NOT show the ghost hand on whatever level a session starts on. OnboardingSystem.demoThread draws level.solution[0] (OnboardingSystem.ts:109-112), so on any level after 1 it would give away part of the answer. If you want in-XR help for returning players, show the text hint 'Pinch a glowing peg, pull, release on the other' once per page load on the first level loaded, until the first thread.

**Decision for the user:** Which fresh-start path should judges get: a `?fresh=1` guest link (the save is untouched and that link keeps no progress), a 'New player' button on the 2D welcome card, or only a testing-instructions line pointing at the destructive Reset progress?

### A fully played device reopens on the last, hardest level with no hint and no pointer to the daily

- **Severity / effort:** low / S
- **Criterion:** Best Reason to Come Back; Experience Design (journey for a returning player); also affects the reused-device judge

The ending line 'All 24 solved - poke the sun for a daily' only appears while the last level's status is 'complete' in the current page session. After a reload, a finished campaign resumes on w4-06 (resume.ts:12) with status 'idle', so `campaignComplete` is false. w4-06 has no `hint` and onboarding is 'done', so the hint line is empty. A returning player, or a second judge on a device where someone finished the campaign, sees World 4 - 6/6 already starred and no hint line. Nothing says the campaign is over or that the daily is the thing to come back for. That is the loop the Best Reason to Come Back pitch depends on.

**Evidence:**
- src/features/hud/HudSystem.ts:96 `campaignComplete: !state.daily && state.levelIndex === LEVELS.length - 1 && state.status === 'complete'`
- src/lib/resume.ts:12 `return unsolved >= 0 ? unsolved : Math.max(0, levels.length - 1);`, so a finished save reopens on the last level
- src/features/puzzle/PuzzleSystem.ts:129 every build sets `status: 'idle'`
- src/lib/hud.ts:66-70 hintFor falls through to '' when there is no refusal, no onboarding hint, no levelHint, campaignComplete is false and it is not a daily
- Only 5 levels have a `hint`, and w4-06 is not one of them (grep '"hint"' src/levels)

**Fix options:**
- Work out campaignComplete from saved progress (every LEVELS id has best > 0) instead of the current level's live status, so the ending and daily pointer survive a reload. Add a unit case to tests/unit/hud.test.ts and a reload step to resume-check.e2e.mjs.
- Or, when resumeIndex finds no unsolved level, open today's daily instead of w4-06, so the returning player lands straight in the come-back loop.

**Decision for the user:** Should a player who has finished the campaign open on today's daily, or on the last level with the 'All 24 solved - poke the sun' line kept?

**Strengths found:**
- A fresh-start path exists and is tested end to end with real clicks. 'Reset progress' on the settings face takes two pokes within 4 s (src/lib/resetGuard.ts:3-17; src/features/hud/settingsFace.ts:78-82). It saves INITIAL_PROGRESS and loads level 0 (src/features/puzzle/PuzzleSystem.ts:76-79). tests/e2e/guarded-reset.e2e.mjs:30-36 checks that progress is wiped, levelIndex is 0, and the ghost is visible on 'pinch-pull'.
- Onboarding is computed from puzzle state with no separate tutorial flag, and it ignores ids for levels that no longer exist. A stale or foreign save therefore cannot skip the tutorial (src/features/onboarding/onboardingState.ts:9-10).
- The ghost hand comes back if a first-time player snips their only thread, and the plaque hint changes with it (tests/e2e/onboarding-comeback.e2e.mjs:15-25). Cold-start time to first melody is measured (.scratch/week7/issues/01-stage1-checks.md:22, 3.2 s by automation).
- Every visitor sees the 2D welcome card before Enter XR, whatever the save, and it describes the gesture in one sentence: 'Pinch a brass peg, pull, and release on another peg...' (public/ui/welcome.uikitml:63; src/panel.ts:55-64). A judge on a reused device still gets the gesture in text.
- A non-destructive guest mode is almost free to add. `memoryStorage()` already exists (src/lib/storage.ts:32-38), and both persistence users go through `browserStorage()` (PuzzleSystem.ts:36, SettingsSystem.ts:8).
- Resume works by solved level id, not by stored index, so adding levels never puts a returning player on the wrong board (src/lib/resume.ts:1-13; tests/e2e/resume-insert.e2e.mjs).

## Test the controller path, left-hand play and switching between hands and controllers mid-session. In IWER: run xr-full-level in controller mode, run a level with hand-left, and switch input mode during a thread drag and during a rail drag. Then confirm that state, captures and the plaque are still valid. Effort S.

### World 3 rail slide has never been run with any XR input, including hands

- **Severity / effort:** medium / S
- **Criterion:** Hard requirement: hands-first, fully usable with hands end-to-end; Technical Implementation (solid and bug-free)

Six of the 24 levels (World 3) depend on pinching a rail peg's tab and sliding it. That drag has only ever been driven with the desktop mouse. No XR script aims a hand ray (or a controller, or gaze) at a tab. The XR probe does not even return tab positions, so the critic's 'switch input during a rail drag' step can't be scripted today. The thread drag shares the same capture and pointerToDiorama path and is proven with hands, so it will most likely work. But for the 'complete the entire experience without a controller' test, World 3 rests on inference, not evidence. Ticket 06 also says stuck-drag protection covers 'thread or rail', yet the tracking-loss check only exercises a thread.

**Evidence:**
- tests/e2e/slider.e2e.mjs:1-2 "drag a rail peg's brass tab with the mouse" (the only slider test)
- grep for slide/rail/tab in tests/e2e/*.sh: no XR script drives a tab (hits are only comments/usage strings in shot.sh, probe.sh, xr-full-level.sh)
- tests/e2e/xr-probe.e2e.mjs:40-63 returns knobs, chute, buttons, threadMid, stars, slowToggle; no tab/handle world positions
- tests/e2e/hand-pinch.sh:30-41 tracking-loss check uses knobs a->b only (thread), not a rail tab
- Contrast: .scratch/week7/issues/06-device-defects.md:6 "losing tracking mid-pinch and leaving the session end any drag (thread or rail)"
- src/features/sliders/SliderSystem.ts:108-116 cancel path (restore peg) is never exercised in XR

**Fix options:**
- Add world-space tab positions to xr-probe (testHook already has handle()/handleAt() for canvas coordinates at src/features/debug/testHook.ts:38-42; add world variants). Then add a hand-right pinch_pull from the w3-01 tab to handleAt(a, 0.05) in a new XR script, asserting pegPositions.a moved along the rail and the preset thread was rebuilt (mirror slider.e2e.mjs:20-30).
- Extend hand-pinch.sh's tracking-loss block to a rail tab: set-connected false mid-slide, assert the peg is back at its home position and a fresh slide works.
- Run the same slide once with gaze + pinch on the metaQuestPro preset (gaze-pinch.sh pattern), since VR Glasses use that path.

### Controller path and left-hand play are claimed in the copy but never run in XR

- **Severity / effort:** medium / S
- **Criterion:** Technical Implementation (reliability, solid and bug-free); Polish & Presentation (submission text honestly represents the project); Meta pre-release procedure (essentials/test-your-app)

The README and submission say controllers work, and the forum post asks testers to try them. Every XR script forces hand mode and drives only hand-right, so no XR test ever uses a controller trigger or the left hand. The code reading is reassuring: nothing in src branches on input kind. IWSDK runs one MultiPointer per handedness for both hands and controllers. Audio unlock listens for session selectstart and squeezestart. So controllers and the left hand should work for normal play. But that is an inference from the architecture, not a test result, and judges often enter Quest Browser XR holding controllers. Meta's procedure for apps where controllers are optional says "Pair and activate compatible controllers. Start the app and complete its required flows." A minor related point: every instruction a controller-holding judge sees says only 'pinch' (welcome panel, onboarding hint, ghost fingertips).

**Evidence:**
- README.md:32 "Controllers and a desktop mouse work too."
- docs/submission.md:41-42 "Controllers and a mouse work through the same input path"
- docs/forum-post.md:20 "If you have controllers handy, try one level with them too."
- tests/e2e/xr-lib.sh:29-30 xr_start always runs set-input-mode {"mode":"hand"}; tests/e2e/shot.sh:15 same
- tests/e2e/xr-lib.sh:46-60 pinch_pull/pinch_at hard-code device hand-right; grep -rn 'controller\|hand-left' tests/ returns no hits
- IWER's own default is controllers: ~/.Trash/node_modules/iwer/lib/device/XRDevice.js:136 primaryInputMode: 'controller', so the scripts actively avoid the default path
- Copy is pinch-only: src/lib/onboarding.ts:22-23, public/ui/welcome.uikitml:63-64
- Precondition: the repo's node_modules is currently missing (ls node_modules -> No such file; the rc.2 install sits in ~/.Trash/node_modules), so typecheck, tests and the @iwsdk/reference MCP (ENOENT on node_modules/@iwsdk/reference/package.json) cannot run until it is reinstalled

**Fix options:**
- Restore dependencies (npm ci), then parameterize xr-lib.sh with DEV=${DEV:-hand-right} in pinch_pull/pinch_at/rest_hand_for, and add tests/e2e/xr-controller.sh: enter XR without set-input-mode (IWER defaults to controllers), play level 1 with DEV=controller-right (pull a->b, click the chute, reach complete), ray-click Restart and the gear, toggle Slow-mo on the plaque. Repeat level 1 with set-input-mode hand and DEV=hand-left (mirror rest_hand_for's x offset). Add both to test:e2e:hands.
- Until that passes, soften README.md:32 and submission.md:41 to 'Controllers also work (emulator-tested)' or drop the claim.
- Optional: when the active input source has a gamepad, add a short 'or pull the trigger' to the onboarding hint (src/lib/onboarding.ts:22-23) without changing the pinch-first ghost demo.

### Switching hands to controllers mid-drag probably leaves a ghost drag that swallows the first trigger click

- **Severity / effort:** low / S
- **Criterion:** Technical Implementation (solid and bug-free); Meta test-your-app: "switch between controllers and hands during a session. Confirm focus, selection, held objects, and open dialogs are all in a valid state after each switch" (VRC.Quest.Input.7 is the matching store requirement)

This was not executed (read-only audit). It comes from reading the installed IWSDK rc.2 and IWER code, so treat it as plausible. IWER's set-input-mode swaps the right hand's source for the right controller within one frame. IWSDK keeps one MultiPointer per handedness, and that pointer only calls cancel() when it stops being connected. It stays connected through the swap, so no pointercancel fires. The ray sub-pointer stays locked in SELECT with button 0 down and keeps pointer capture on the peg mesh. The new controller's StatefulGamepad starts at zero, so no select-end edge arrives. In SELECT state a new trigger press is ignored, and only its release sends pointerup. Predicted result in IWER: the thread preview keeps following the controller ray with the trigger released, or a rail peg keeps sliding with it. The first trigger click after the switch is consumed by the stale drag. If the user was aiming at the chute, nothing drops. If they were near a peg, an unintended thread may be made, or the slide is committed where the ray happened to point. The reverse switch (controller to hands) behaves the same way. The code comment says this case is handled when it is untested. On a real Quest the hand-off may include a frame with no source, which takes the clean cancel path that hand-pinch.sh already proves for tracking loss. That timing is device-only. Low severity because judges rarely switch inputs mid-pull.

**Evidence:**
- src/features/threads/ThreadSystem.ts:166 "The input went away mid-pull (tracking lost, mode switch): drop the drag, make nothing." (mode switch is untested)
- src/features/threads/ThreadSystem.ts:123 and src/features/sliders/SliderSystem.ts:76 ignore new drags while this.drag is set
- ~/.Trash/node_modules/iwer/lib/remote/RemoteControlInterface.js:798-801 set-input-mode assigns device.primaryInputMode directly; iwer/lib/device/XRDevice.js:650-660 activeInputs getter swaps hands for controllers in one step
- ~/.Trash/node_modules/@iwsdk/xr-input/dist/xr-input-manager.js:136-139 one MultiPointer per handedness shared by hand and controller; :516 connected = !!(inputSource && (gp || inputSource.hand)) stays true across the swap
- ~/.Trash/node_modules/@iwsdk/xr-input/dist/pointer/multi-pointer.js:181-203 cancel() only on the !shouldBeEnabled path; :124-131 selection lock; :423-428 SELECT exits only on buttonUp
- ~/.Trash/node_modules/@iwsdk/xr-input/dist/gamepad/stateful-button-axes-device.js:26-37 new gamepad state zero-filled; :142-143 select end = button-up edge
- ~/.Trash/node_modules/@iwsdk/xr-input/dist/xr-input-manager.js:346-349 once a gamepad exists for that side, the hand's queued select events are discarded

**Fix options:**
- Test first (S): in the new controller script, start a hand-right pinch_pull on a->b, set-input-mode controller at t=0.5 before release, then probe threads, status and a new preview-visible field (scene thread-preview .visible). Also click the chute with controller-right and assert the drop starts. Repeat on a w3-01 tab and in the controller-to-hands direction.
- App-side mitigation (S): in ThreadSystem and SliderSystem, subscribe to the session's inputsourceschange (follow sessions as AudioUnlockSystem.ts:27-33 does). If a source is removed while this.drag is set, run the existing cancel logic: hide the preview, restore the peg home, release capture. Re-test whether IWSDK still swallows the next trigger press.
- Upstream: report to IWSDK that MultiPointer should cancel when primaryInputSources[handedness] changes identity, not only when it disconnects; note it in the README's known limitations if not fixed by freeze.

**Strengths found:**
- Input-agnostic by construction: no system branches on input kind. Pegs, threads, tabs and buttons all use IWSDK pointer events or Pressed tags, which hands, controllers, gaze and the mouse all deliver (src/features/input/pointerEvents.ts:3-7, src/features/input/onTap.ts:16-21, src/features/input/pointerToDiorama.ts:10-15, src/features/marbles/MarbleSystem.ts:51). The controller and left-hand paths are therefore likely to work for normal play.
- Drags are keyed to the pointerId that started them, so a second hand or a controller can't end or hijack another pointer's drag (src/features/threads/ThreadSystem.ts:144,152,169; src/features/sliders/SliderSystem.ts:88,101,111).
- Both drag systems handle pointercancel. The slider's cancel puts the peg back where its threads fit, and the thread cancel creates nothing (src/features/sliders/SliderSystem.ts:108-116; src/features/threads/ThreadSystem.ts:166-173).
- Tracking loss mid-pinch is a permanent XR regression check: disconnect, reconnect, then a new pinch-pull must still make a->b (tests/e2e/hand-pinch.sh:30-41). It rests on IWSDK's MultiPointer cancelling on disable (multi-pointer.js:181-203, 'Mode switches terminate an in-flight far selection').
- Audio unlock is not hand-specific: it listens for XR session selectstart and squeezestart plus the first DOM pointerdown, so a controller trigger or a squeeze unlocks sound as a pinch does (src/features/audio/AudioUnlockSystem.ts:4-33; asserted in tests/e2e/xr-full-level.sh:17-23).
- Ledge buttons are both RayInteractable and PokeInteractable, so they work from afar with a controller ray and up close with a finger poke (src/features/diorama/buildDiorama.ts:266-267).
- An idle controller-to-hands switch happens implicitly in every XR test run: IWER starts in controller mode and xr_start switches to hands before any interaction, and all later hand checks pass (iwer XRDevice.js:136; tests/e2e/xr-lib.sh:29-31). This is weak evidence that a switch at idle leaves state valid.

## Run a session-length soak test in one page with no reloads. Play Next through all 24 levels, plus the dailies, Restart, Raise/Lower rebuilds and an XR exit and re-enter. At each level start, sample renderer.info.memory (geometries, textures), live physics bodies, AudioBufferSourceNodes and the JS heap, and assert they stay flat. Effort S.

### No session-length soak: cumulative resource growth across a full campaign has never been measured

- **Severity / effort:** low / S
- **Criterion:** Technical Implementation (25%): "performant on Meta Quest hardware (min 60 fps), solid and bug-free"; entry rule "capable of successful and consistent operation"

The critic's main point holds, but its suggested consequence does not. Every multi-level proof reloads the page first, and no test reads GPU memory, shader programs, the JS heap or the Havok body count across levels. So nothing shows a long, unbroken session staying flat. On the other hand, a read-only review of the teardown path and of the IWSDK rc.2 internals found no leak (see strengths). This is an evidence gap, not a known defect, and the claim that 'a leak would reload the tab' is not substantiated. Severity is low: judges see behaviour, not tests, and most will play fewer than 24 levels. It is still worth doing before the Nov 14 freeze, for three reasons. Teardown has regressed silently before (the glyph-dispose bug). This is the only no-headset stand-in for Meta's own 45-minute performance test. And it would back a stability claim in the Technical section. Two parts of the critic's design would fail as written. (1) 'Assert flat at each level start' will false-fail, because per-level geometry, entity and body counts differ by design (w4-06 has far more pegs and bodies than w1-01). (2) 'AudioBufferSourceNodes' cannot be counted: Web Audio has no live-node API, so stringSynth needs a dev-only counter. Also, PerfProbeSystem counts ECS entities with a PhysicsBody, not live Havok bodies, so it would miss a worker-side leak.

**Evidence:**
- tests/e2e/levels.sh:11 `fresh_page` runs before every level; tests/e2e/run.sh:8 `fresh_page` runs before every single-script test, dailies included (tests/e2e/dailies.sh calls run.sh)
- tests/e2e/xr-lib.sh:28 `xr_start` itself calls `fresh_page`, so no test enters, exits and re-enters XR on one page
- tests/e2e/reach.e2e.mjs:30-37 is the only one-page multi-level run (24 levels x 2 offsets = 48 rebuilds). It drops no marbles, never presses Restart, Next or Raise/Lower by input, never toggles XR, and samples no memory
- grep of src/ and tests/ finds no renderer.info.memory, performance.memory or heap reads. The only renderer stat read is renderer.info.render at src/features/debug/testHook.ts:252 (single frame)
- src/features/debug/PerfProbeSystem.ts:5 counts `{ required: [PhysicsBody] }` ECS entities, not Havok bodies in the worker
- tests/e2e/levels.sh:2: browser leases are capped at 110 s, so a full campaign with real drops cannot fit in one lease and has to be chunked across leases without a reload
- docs/forum-post.md:11 asks a tester for "about five minutes" and line 17 for "two or three more levels". docs/adr/0002-emulator-only-development.md:3 holds performance "by a design budget ... rather than measured fps"
- Meta VRC.Quest.Performance.1, 'Steps to test': "Use the app for the length of the content or 45 minutes, whichever is shorter." (developers.meta.com/horizon/resources/vrc-quest-performance-1)
- .scratch/week7/issues/02-bug-bash.md:10: "shared glyph geometries were disposed on every level teardown" (a teardown defect found only by review)
- .scratch/week7/spec.md user story 5: "I want a steady frame rate on Quest". The week-7 Stage 1 checks prove only single-frame budgets
- Note: the repo currently has no node_modules (the iwsdk-reference MCP fails on the missing @iwsdk/reference package.json). The framework internals were read from ~/.Trash/node_modules/@iwsdk/core, version 1.0.0-rc.2, which matches package.json

**Fix options:**
- Add tests/e2e/soak.sh plus soak.e2e.mjs. Call fresh_page once, then run successive `iw browser run` leases with no reload between them (the page persists across leases), about 4-6 levels per lease. Per level: solve(), drop, wait for completion, then press Next with a real click as in controls.e2e.mjs:28-29. Also press Restart once per world, apply one Raise/Lower patch (settings offset) per world, open all 7 dailies via {type:'daily', index}, and enter, set hand input, exit and re-enter XR twice with `iw xr enter`/`exit` (not xr_start, which reloads).
- Add a dev-only memory() probe to testHook.ts sessionProbes. It should return renderer.info.memory.geometries and .textures, renderer.info.programs?.length, ECS entity count, scene descendant count, and world.getSystem(PhysicsSystem).bodyEntities.size (the main-thread mirror of live Havok handles, physics-system.js removeBody/ensureBody). Add a dev-only live-source counter in stringSynth.pluck (increment on start(), decrement in source.onended). Before sampling the heap, force GC through Playwright CDP (HeapProfiler.collectGarbage), then read performance.memory.usedJSHeapSize.
- Assert against a reference level, not 'flat at every level start'. Load w1-01 at the start, after each world, after the XR cycles and at the end. Require geometries, textures, programs, bodies, entities and live sources (once idle) to return exactly to the w1-01 baseline, and the post-GC heap to stay within a set tolerance (for example +10%). Log a per-level series for the record.
- Optional, device-side: amend docs/forum-post.md to ask one tester for a 15-20 minute run through a whole world, noting whether stutter appears late in the session. Only hardware can show thermal or GC behaviour at session length; the emulator soak only proves the counts do not grow.

**Strengths found:**
- Level teardown is complete. PuzzleSystem.teardown (src/features/puzzle/PuzzleSystem.ts:185-190) disposes every marble, every thread and every diorama entity. disposeLevelEntity (src/features/diorama/disposeLevelEntity.ts:8-13) frees each entity's per-level geometries but skips the SHARED_GEOMETRIES set (src/features/diorama/palette.ts:248-251), so the earlier glyph defect is fixed.
- Every per-level object goes into one list. buildDiorama returns every entity it creates, including the hidden Next button (src/features/diorama/buildDiorama.ts:306-328). Child meshes such as chute rims, glyphs and button icons are reached by the object3D traverse.
- High-churn objects allocate no GPU resources of their own. Threads use the shared GEOMETRIES.unitCylinder with shared materials (src/features/threads/ThreadSystem.ts:283). Marbles use the shared marble geometry with cached per-color materials (src/features/marbles/MarbleSystem.ts:133; palette.ts:202-231). Cup glow swaps between pre-built materials instead of creating new ones (palette.ts:217-231).
- The framework frees physics and scene-understanding resources. IWSDK rc.2 PhysicsSystem removes the body on query disqualify (physics-system.js:151-153), and the runtime releases both the Havok body and its shape (physics-runtime.js:140-149). Handles are allocated on the main thread inside update(), so an entity disposed before its first physics step never posts a body. SceneUnderstandingSystem disposes plane and mesh entities on sessionend (scene-understanding-system.js:131-137, 217-231).
- ECS storage cannot grow across levels: elics 3.4.2 pools released entities and reuses their indices (lib/entity-manager.js requestEntityInstance/releaseEntityInstance). MarbleSystem clears its per-index maps on disqualify (MarbleSystem.ts:86-90).
- Audio memory is bounded. Thread pitch is quantized to 10 pentatonic notes (src/lib/threadTuning.ts:21-25), so the AudioBuffer cache keyed by pitch (src/features/audio/stringSynth.ts:70-74) stays small even with rail slides. The cue log is dev-only and capped at 200 (src/features/audio/cueLog.ts:9-15).
- Subscriptions are registered once and torn down. Every store, command and visibility subscription is made in init() and pushed to cleanupFuncs. Per-level pointer listeners live on meshes that are discarded with the level (ThreadSystem.ts:100-115, SliderSystem.ts:60-72). AudioUnlockSystem unhooks an ended XR session before hooking the next (src/features/audio/AudioUnlockSystem.ts:27-38).
- Some one-page evidence already exists. reach.e2e.mjs rebuilds all 24 levels twice in one page without a reload (tests/e2e/reach.e2e.mjs:30-37), so 48 consecutive teardown/build cycles already run without a crash, though nothing is measured.

## Clear every video frame and voice against the entry rules. Get written permission or a licence from any tester whose clip is used. Review every real-room frame, and every frame of the IWER living_room backdrop, for logos, branded products, artwork and photos of people. Confirm that the entrant voices the VO (or that it is a cleared synthetic voice). Add the permission request to docs/forum-post.md. Effort S.

### The forum post asks testers for clips but grants no rights and gives no framing rules

- **Severity / effort:** medium / S
- **Criterion:** Entry rules: "Must not mention or depict any identifiable person other than Entrants", "recognizable branded products, or commercial artwork", "Third-party assets must be licensed"; Polish & Presentation (video)

docs/forum-post.md:27 asks for "a screenshot or a short clip if it's easy". It does not ask permission to use the footage in the entry and does not ask testers to keep people, screens, posters or photos out of frame. A first-person Quest capture records the tester's real room (Meta's capture guide: "Your headset captures everything you see"). Meta's own production policy lists "Noticeable brands or other existing IPs" as something to clear. The footage is also the tester's copyright. Today the repo's video plan uses emulator footage only, so nothing is violated yet. But if the audit's advice to open with a tester's real-table clip (D18/D1) is followed, the first frames a judge sees would be unlicensed third-party footage of a stranger's home. That risks the Stage One fit check and the entry-rules clauses. One more trap: crediting a tester by name or handle anywhere in the Project, video, README or Devpost text would itself breach the rule against mentioning anyone other than Entrants. The post has not been sent yet (ticket .scratch/week6/issues/09-forum-post-draft.md:7 is ready-for-human), so the fix costs minutes now and would be awkward to add after clips arrive.

**Evidence:**
- docs/forum-post.md:27 "**Anything broken or confusing**, plus a screenshot or a short clip if it's easy." (no grant of rights, no framing or mic guidance)
- docs/forum-post.md:33 author notes cover frame cost only, not footage clearance
- docs/video/shot-list.md:21 cold open is planned "On a real table"; using a tester clip is the obvious way to get a real table, since the entrant has no headset
- https://developers.meta.com/horizon/resources/video-capture-mr-vr : first-person capture "captures everything you see"; the set policy lists "Noticeable brands or other existing IPs" and advises removing clutter
- Brief: "Must not mention or depict any identifiable person other than Entrants"; "Third-party assets must be licensed"
- grep for thank/credit/acknowledg finds no tester credits in README.md, docs/, src/ or public/ yet (good, keep it that way)

**Fix options:**
- Add a paragraph to docs/forum-post.md before posting. If you share a clip, frame only the table and diorama: no people, faces, mirrors or reflective screens, TVs or laptops with logos, posters, artwork or family photos. Turn the mic off in Camera settings. Then ask: may I use the clip, free of charge, in Threadbound's competition video and Devpost page?
- Get an explicit written 'yes' in a DM for each clip you might use, and keep a screenshot of it privately. Then review every frame of the clip, and blur or crop anything branded, any artwork or photos, and any person, including reflections.
- Never credit testers by name or handle in the video, README, Devpost text or in-game. Use 'a Quest owner from the Start community' at most.
- Alternative with zero rights risk: keep the cold open on emulator footage only and use tester feedback just to fix bugs.

**Decision for the user:** Do you want tester footage in the video at all (it needs written permission and a frame review), or should the video stay emulator-only and use tester reports just to find bugs?

### The video kit has no clearance step, and nobody is named as the voice-over

- **Severity / effort:** low / S
- **Criterion:** Entry rules (English, third-party assets licensed, no identifiable non-Entrants); Polish & Presentation ("Don't lean on AI-generated video to carry the pitch")

The video docs cover length, emulator footage and 'no AI-generated video', but nothing else from the entry rules. docs/video/script.md:3 says "Voice-over (VO) is optional" without saying who speaks it. If the entrant records it, it is fine. If it is text-to-speech, the voice needs a licence that covers this use and must not clone a real person. A strict human judge may also count a synthetic narrator against the brief's warning about AI-generated video. Background music is never mentioned. The game's own audio is fully procedural and safe, but any stock or trending track added in editing must be licensed, and YouTube Content ID could claim or mute the video during judging. No step says to burn in English captions. They are cheap and would help the Accessibility Forward pitch. There is also no final frame-by-frame pass before upload.

**Evidence:**
- docs/video/script.md:3 "Voice-over (VO) is optional. On-screen text works on its own."
- docs/video/shot-list.md:3-5 lists only: at most 3:00, emulator or simulator footage, real gameplay, no AI-generated video, public upload
- docs/submission.md:11 "Video: **[decide]**": no clearance checklist attached
- src/features/audio/stringSynth.ts:12-17,83: game audio is synthesized (no audio files are loaded anywhere in src/), so only music added in editing is a risk
- Brief: "Projects must be entirely in English or include English subtitles"; "Third-party assets must be licensed"; "Don't lean on AI-generated video to carry the pitch"

**Fix options:**
- Add a 'Clearance' block to docs/video/shot-list.md. It should cover: (1) the VO is the entrant's own voice, or there is no VO; (2) no music except in-game audio, or a track with a stated licence; (3) burned-in English captions for every VO line; (4) a frame-by-frame pass for people, logos, artwork and any third-party footage, with each permission on file; (5) no name or handle of anyone but the entrant.
- Record the VO yourself on any phone. Script lines are short (script.md:8-41), so this takes about 30 minutes.
- Upload as Unlisted first and wait for Content ID to finish before switching to Public.

**Decision for the user:** Who voices the video: you, nobody (text only), or a synthetic voice (needs a licence that covers this use)?

### Emulator frames show a grey stand-in room and dev overlays, but the shot list calls it a real table

- **Severity / effort:** low / S
- **Criterion:** Polish & Presentation ("show real gameplay that honestly represents the experience"; "Lead with the story")

The IWER living_room environment is a legacy scan stored as geometry only. In the IWER repo, packages/sem/captures/living_room.json holds 26 spatial entities (planes, boxes and one global mesh) and no textures. In passthrough it renders as grey faceted surfaces, as the repo's own .scratch/week6/ar-review.jpg shows. That screenshot also has a 'Remote Control Active' pill at the bottom centre, which comes from the CLI-driven emulator. The shot.sh staging drives the same remote control (tests/e2e/shot.sh:14-19). The browser-view end shot (`study`, shot-setup.e2e.mjs:29) shows the 'Enter XR' pill over the plaque title (.scratch/week6/pegs-merged.jpg). None of this breaks an entry rule; the grey room actually removes any logo or artwork risk. But the cold open is described as "On a real table" (shot-list.md:21) while it will show grey geometry. With no caption saying what it is, a judge may read it as a broken passthrough or as overclaiming.

**Evidence:**
- docs/video/shot-list.md:21 "On a real table: the hand pinches the chute"
- iwsdk.config.json:53-56 emulator device metaQuest3, environment "living_room"
- https://github.com/meta-quest/immersive-web-emulation-runtime/tree/main/packages/sem/captures : living_room.json labels are TABLE x8, WALL_FACE x6, COUCH x2, WINDOW_FRAME x2, WALL_ART x2, LAMP x2, CEILING, FLOOR, STORAGE, GLOBAL_MESH. Fields are only uuid, semanticLabel, locatable, bounded2D/3D and triangleMesh, with no texture or image data
- The SEM README calls these "The older room captures" and lists them as "Legacy scans". Eight procedural rooms (e.g. sunlit_living_room) are also offered
- /Users/sebastienhenry/Documents/Hackathons/Meta VR Start Developer Competition 2026/.scratch/week6/ar-review.jpg: grey faceted backdrop plus the 'Remote Control Active' pill
- /Users/sebastienhenry/Documents/Hackathons/Meta VR Start Developer Competition 2026/.scratch/week6/pegs-merged.jpg: 'Enter XR' pill overlapping the plaque in the browser view

**Fix options:**
- Add a small on-screen caption to the XR shots: 'Recorded in the IWER emulator. Grey shapes stand in for your room.' Do not say 'your real table' over grey footage.
- Before recording, check whether the 'Remote Control Active' pill and the 'Enter XR' pill appear in the captured region. Crop or hide them, or record the end card from a frame without them.
- Optionally try a procedural SEM room (e.g. sunlit_living_room) if the pinned IWSDK rc.2 exposes it. Review its frames before using it, because it has colour and furniture.

**Strengths found:**
- The IWER backdrop cannot contain logos, artwork or photos. The living_room capture used by iwsdk.config.json:55 is scene-understanding geometry only (planes, boxes and one global mesh, no texture or image fields). Its WALL_ART entries are bare planes, and it renders as plain grey (.scratch/week6/ar-review.jpg). So the 'review every living_room frame for branded content' concern does not apply to emulator footage.
- All in-game content is original and procedural, so no third-party asset licences are needed. public/ holds only welcome.uikitml, hud.uikitml and the scene JSON. src/assets.ts:13-24 registers only those two panels. Audio is a Karplus-Strong synth (src/features/audio/stringSynth.ts) and no audio files are loaded. The virtual study is boxes and circles (src/features/environment/EnvironmentSystem.ts:41-67).
- The video plan uses only emulator footage the entrant records: no people on camera, no AI-generated video, and on-screen text that works without a VO (docs/video/shot-list.md:3-5; docs/video/script.md:3).
- Nobody other than the entrant is named or credited anywhere in README.md, docs/, src/ or public/ (grep for thank/credit/acknowledg only hits the forum post's sign-off).
- The forum post has not been posted yet (.scratch/week6/issues/09-forum-post-draft.md:7, ready-for-human), so permission and framing wording can go in before any tester footage exists.

## State which Content Guidelines tier the entry targets (10+ fits) and confirm the content qualifies for it. Put this in the submission text or a README section next to the privacy note. Effort S.

### No Content Guidelines age tier is stated anywhere in the submission

- **Severity / effort:** low / S
- **Criterion:** Entry rules: "Must follow Content Guidelines for 10+, 13+ or 18+" (policy-compliance hard requirement); also the Polish & Presentation submission text

Confirmed. The content does qualify for 10+, but no judge-facing document says which tier the entry targets. A reviewer or an AI-assisted checker therefore has nothing to tick off. A grep of README.md, CONTEXT.md, docs/ and .scratch/ for 10+, 13+, 18+, 'content guideline', 'rating', 'all ages' and 'COPPA' finds nothing. The only audience wording is the video chapter title 'Made for everyone' (docs/video/script.md:35), and that is about accessibility. This matters a little more than a box-tick for two reasons. First, Meta's Content Guidelines prohibit 'Applications directed to children or users under the age of 10' (developers.meta.com/horizon/policy/content-guidelines). Second, the FTC factors Meta tells developers to weigh ('Visual content', 'Music and audio content', 'Child-oriented activities', from resources/age-groups) fit a cozy marble-and-music toy. An explicit 'ages 10 and up, not designed for young children' line removes both doubts. This is not a disqualifier. Compliance depends on the content, the brief's submission form has no tier field, and Stage One checks only theme fit and tool use. That is why severity is low.

**Evidence:**
- docs/submission.md:1-107: covers track, division, tagline, description, criteria table, awards, accessibility notes and judge instructions, but no age tier or content statement
- README.md:1-94: no age tier or content statement
- docs/video/script.md:35: '**2:00–2:35 · Made for everyone (`settings`, then gaze)**', the only audience wording, which could be read as all-ages
- Meta Content Guidelines (policy/content-guidelines): developer app content must not include 'Applications directed to children or users under the age of 10.'
- Meta age-groups page (resources/age-groups): self-certification is mandatory for store apps, with the options 'Teens and Adults (13+)', 'Mixed Ages' and 'Children (under 13)'
- docs/submission.md:65-66 names a target launch: 'Q1 2027 on the Meta Horizon Store as a packaged web app'. That launch would need this tier choice anyway.
- Content audit supports 10+: the level names in src/levels are all puzzle words ('First Thread', 'Trampoline', 'Three Cups', 'Snip', 'Untangle'), and the UI strings in public/ui/*.uikitml are functional ('Enter XR', 'Reset progress', 'Slow-mo: Off'). A whole-word scan of src for violent, mature, gambling or social terms hits only code comments ('dead object', 'camera').

**Fix options:**
- Add a 'Content and privacy' section to docs/submission.md after the Accessibility notes (after line 98), and the same line in README.md 'What's in it' (around line 43). Suggested wording: 'Content: suitable for ages 10 and up (Meta Content Guidelines, 10+). No violence, mature language, gambling, ads, purchases, chat or user-generated content. Not designed for children under 10.'
- Paste the same sentence into the Devpost text description. The description is the only free-text field judges are sure to read, and the repo docs are optional reading.
- Optional: retitle the 'Made for everyone' video chapter in docs/video/script.md:35 (for example 'Made to fit you'). It is about accessibility, and the new title cannot be read as an all-ages or kid-directed claim.

**Decision for the user:** Which tier should the submission state? 10+ is truthful today and the broadest, and it maps to 'Mixed Ages' at the Q1 2027 Horizon Store self-certification. 13+ maps to 'Teens and Adults', the simplest store path. The content qualifies for either.

### No privacy or data note exists, and the obvious wording ('nothing leaves your device') would be false for the deployed build

- **Severity / effort:** low / S
- **Criterion:** Developer App Policies and Meta's youth requirements (COPPA applies once a 10+ tier is claimed); 'every claim backed by code' standard (ticket 03); Polish & Presentation submission text

The critic says to put the tier line 'next to the privacy note', but no privacy note exists: 'privacy' appears nowhere in README.md, docs/ or CONTEXT.md. The app's own code collects nothing. Progress goes to localStorage with an in-memory fallback, and there is no fetch, XHR or sendBeacon call and no external URL in src/ or index.html. The deployed bundle does contact a third-party host, though. IWSDK's default input visuals load the hand and controller glTF models from jsDelivr, and the project does not override that path (no assetPath or visuals override in src). Because the README counts 'tracked hands included' in its triangle budget, those models are fetched in every XR session. A privacy line written from the source alone ('no network requests', 'nothing leaves your device') would be inaccurate, and a strict or AI-assisted reviewer scanning the live bundle could catch it. The bundle also contains unused library defaults that point at unpkg.com (Draco decoder path) and api.dicebear.com (uikit-horizon Avatar placeholder). No Draco asset or Avatar component is used, so they should never fire, but a scanner may list them. This was not checked: whether hands still work if jsDelivr is unreachable. The loader catches the error and returns null, which suggests hands would be invisible rather than broken, but nothing has proven it.

**Evidence:**
- grep -i privacy over README.md, docs/*.md, docs/adr/*.md and CONTEXT.md: no matches
- src/lib/storage.ts:40-48: 'Browser localStorage when accessible, otherwise an in-memory stand-in.'
- grep of src and index.html for fetch(, XMLHttpRequest, sendBeacon and https://: no matches
- Live bundle https://sebaustin.github.io/threadbound/assets/index-r6sQkKGx.js contains const y01="https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles" and the default visual path `${y01}/${c}/${t.handedness}.glb`, loaded with a.loadGLTF(u).catch(()=>null)
- Same bundle: `https://unpkg.com/three@0.${U6}.0` as the default Draco decoder path, and `https://api.dicebear.com/9.x/lorelei/png?seed=${Math.random()}` as the uikit-horizon Avatar default src. Neither is used: public/ contains only scenes/ and ui/, with no .glb, .ktx2 or .drc files, and grep for Avatar in src and public/ui finds nothing.
- README.md:63: '...about 16k triangles per view, tracked hands included', so hand models are rendered
- Ticket .scratch/week7/issues/03-readme-submission.md:11: 'Every claim must be backed by code or a test.'

**Fix options:**
- Write an accurate note next to the tier line: 'No accounts, analytics, ads or chat. Progress is saved only in this browser (localStorage) and never sent anywhere. When you enter XR, hand and controller models load from the public jsDelivr CDN.'
- Optional, effort M: self-host the generic-hand and generic-trigger GLBs under public/ and point IWSDK's input visuals at them. The note could then truthfully say the page talks only to GitHub Pages, and the build would lose its dependency on a third-party CDN during the judging window (until about Dec 11).
- Do not write 'no network requests' or 'nothing leaves your device' unless the self-hosting option is done.

**Strengths found:**
- The content qualifies for the lowest (10+) tier with margin. Level names are puzzle words (src/levels: 'First Thread', 'Trampoline', 'Three Cups', 'Snip', 'Untangle', 'Encore'), and the UI text is functional (public/ui/*.uikitml: 'Enter XR', 'Reset progress', 'Slow-mo: Off'). A whole-word scan of src for violent, mature, gambling, purchase or social terms hits only code comments.
- None of the features that bring youth-policy duties exist. There is no chat, voice, user-generated content, multiplayer, ads, in-app purchases or real-money mechanics. That meets Meta's 'No ads' rule for every age group and leaves no Code of Conduct for Virtual Experiences moderation duty.
- No personal data is collected. Progress is stored only in localStorage, with an in-memory fallback when storage is blocked (src/lib/storage.ts:40-48). src/ and index.html contain no fetch, XHR, beacon or analytics code.
- No third-party content assets need licensing. public/ holds only scenes/ and ui/, geometry is procedural, and audio is a built-in Karplus-Strong synthesizer (docs/submission.md:54-56). The 'third-party assets must be licensed' rule is met by design; the only runtime third-party fetch is the open-source WebXR input-profile hand and controller models.
- All text in the app and the submission is in English, which meets the 'entirely in English' entry rule without subtitles.
- The fix is cheap and fits the existing structure. docs/submission.md already has an 'Accessibility notes' section (lines 88-98) where a two-line 'Content and privacy' block slots in, and the README's 'What's in it' list (lines 24-43) can take one bullet.
