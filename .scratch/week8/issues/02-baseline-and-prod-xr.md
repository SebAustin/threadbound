# 02: Baseline regression, and the deployed build in an XR session (P1)

**What to build:**
- **A regression baseline on main after 01 and 03.** Both land on main locally and neither pushes main. Later week 8 tickets compare against the baseline, and it shows that merging `wip/ticket-08-standards` left main green. It is also the full local regression that 03's README rule requires before a push to `main`, so it runs that whole list. Run it on the commit that will be pushed (this ticket's script, fixture and unit test included), with `node_modules` from `npm ci`:
  - `npm run typecheck`, then `npm run coverage`;
  - once `npx @iwsdk/cli dev up --headless --allow-browser-automation` reports `browserCommandReady: true`: `npm run test:e2e`, `npm run test:e2e:levels`, `npm run test:e2e:levels:slow`, `npm run test:e2e:hands`, `npm run test:e2e:dailies`;
  - then `NODE_ENV=production npm run build`, then `npm run test:smoke` (03).

  Archive the output to `.scratch/week8/regression-baseline.log` in the week 6 layout plus 03's smoke (`--- unit`, `--- e2e`, `--- levels`, `--- levels slow`, `--- dailies`, `--- xr`, `--- build`, `--- smoke`; see `.scratch/week6/regression-fixes.log`). Ticket 17's final log reuses these sections. Head it with the commit SHA, the date and `node --version`. End it with one summary line: unit count and coverage, E2E checks passed, levels N/24 at each speed, dailies N/7, hand scripts N/4, the smoke PASS count, and each exit code.
- **`tests/e2e/prod-xr.mjs`**: a plain Node + Playwright script for the production bundle. It needs no dev server and no test hook, since the hook is DEV-only (src/index.ts:49-57, src/features/debug/testHook.ts:279). Keep it in `tests/e2e/`, because the scratchpad is wiped. It imports ticket 03's shared harness (`tests/smoke/harness.mjs`: `serve()`, `inject()`, `record()`) and verdict (`tests/smoke/verdict.mjs`), and adds only the steps below: the Enter XR click, the level-1 pinch solve, the save check, the AudioContext NOTE and the per-step screenshots.
  - **Target:** 03's `serve()`: Vite's preview of a `NODE_ENV=production` build of `dist/`, or the URL in `SMOKE_URL`. `SMOKE_URL` is the one target variable both scripts share; there is no `BASE_URL` and no second `vite preview`. The flag matches CI (.github/workflows/deploy.yml:29-31 before 03's edit) and turns sourcemaps off (vite.config.ts:16).
  - **Emulator:** 03's `inject()` loads IWER (IWSDK's browser WebXR emulator) before any page script, at a fixed 1280x720 viewport, and keeps the device on `window`. This script then sets `primaryInputMode = 'hand'` and a seated head pose through that device.
    - No synthetic room is loaded, so there are no planes, and the diorama takes the "in front of you" placement (src/features/placement/PlacementSystem.ts:122-123). Table placement stays proven on the dev server by tests/e2e/xr-full-level.sh.
  - **Enter AR as a judge would:** a real mouse click on the welcome panel's Enter XR (src/panel.ts:36-50), using the lead-in move from tests/e2e/lib.mjs:65-69, at a canvas point measured once at the harness's 1280x720 viewport. Ticket 08 later swaps this point for a click on its DOM `#enter-xr` and drops the point from the fixture.
    - It passes when the IWER device has an active `immersive-ar` session within 5 s.
    - On a FAIL, it enters through `grantOfferedSession()` instead, so the rest of the run still produces evidence. The config offers the session (iwsdk.config.json:13-14).
  - **Play level 1 by hand pinch only:** pinch-pull knob a to knob b, then pinch the chute.
    - First wait out the placement search (3 s, PlacementSystem.ts:15). Ticket 07 changes this wait to its 3 s window plus the fade.
    - Port `pinch_pull` and `pinch_at` (tests/e2e/xr-lib.sh:42-62) to direct IWER calls: the hand position, the look-at rotation that the CLI's `xr look-at` applies, and `hands.right.updatePinchValue(1|0)`.
    - The targets come from `tests/e2e/fixtures/prod-xr-w1-01.json`: the head pose, the world points of knob a, knob b and the chute, and the Enter XR canvas point.
  - **Read the solve from the save, since the bundle has no hook:** `localStorage['threadbound.progress.v1']` (src/lib/progress.ts:5) must show `best['w1-01']` of at least 1, and `melodies['w1-01']` must be a non-empty array, or an object whose `notes` array is non-empty (ticket 10's format).
  - **Record:** 03's `record()` already collects every console message, page error and failed request, the status and content type of every response (the workers, the Havok wasm, `scenes/main.iwsdk.scene.json`, `ui/welcome.uikitml`, `ui/hud.uikitml`), the running workers, the served `assets/index-*.js` and the jsDelivr generic-hand `.glb` requests (a NOTE: week 9 self-hosts them). Its verdict FAILs on 03's list. This script adds only:
    - the AudioContext state after the first pinch (NOTE only: headless autoplay rules differ from Quest Browser's);
    - named screenshots after entering, after the thread and after the solve, written by `record()` to `.tmp/prod-xr/`.
  - **Output:** 03's verdict module turns the record plus this script's checks (the Enter XR click, the solve read from the save) into PASS, FAIL and NOTE lines in the style of tests/e2e/run.sh, with exit code 1 on any FAIL.
- **`test:e2e:prod-xr`** in package.json is `node tests/e2e/prod-xr.mjs`, with no build step, exactly like `test:smoke`: against the local preview, run it after `NODE_ENV=production npm run build`, or it tests whatever `dist/` already holds. There is no `prod-xr.sh`: `serve()` starts and stops the preview, and skips it when `SMOKE_URL` is set.
  - Import `playwright` and `iwer` from the explicit devDependencies 03 pins (1.63.0 and 2.5.0); don't add them again.
  - Keep the script headless and free of the dev server, so ticket 17 and week 7 ticket 05 can re-run it on the release candidate.
- **One deploying push, in this order.** origin/main is still 83977c8, so the live URL serves that build until this ticket pushes. 01 and 03 don't push main. Until step 4's push, only the week 8 docs commit (made before 01), 01, 03, 04 and 05 merge into main, and 05 merges only before step 1 starts (otherwise after step 4's push).
  - While a regression runs (here, in 01, 09 or 17), no branch is checked out in this tree (start other tickets with `git worktree add`), nothing is merged into it, the dev server is not restarted, and no other script drives the managed browser.
  1. Commit this ticket's code on main, run the baseline on that commit, then `npm run test:e2e:prod-xr` against the local preview.
  2. Once both are green, commit the baseline log and push main. That one push deploys the week 8 docs commit, 01, 03, this ticket and whichever of 04 and 05 have merged. `gh run watch` must show `npm run test:smoke` green before `upload-pages-artifact`, then a green deploy job. Put the run URL in Comments as the evidence for the first CI box.
  3. After the deploy, run `SMOKE_URL=https://sebaustin.github.io/threadbound/ npm run test:e2e:prod-xr` and `SMOKE_URL=https://sebaustin.github.io/threadbound/ npm run test:smoke`. Of 02 and 03, only this ticket runs the live URL.
  4. Save both prod-xr runs and the live smoke lines to `.scratch/week8/prod-xr-smoke.log`, with the screenshots from `.tmp/prod-xr/` beside it. Committing them is a `.scratch/`-only push, so 03's `paths-ignore` starts no deploy (the second CI box).
- Each defect found gets a Comments entry with its evidence line. Fix it here if it is small; otherwise move it to the week 8 ticket that owns it.

**Blocked by:** 01, 03

**Status:** ready-for-agent

- [x] Unit: `tests/unit/prodXrTargets.test.ts` recomputes the fixture's knob and chute points and matches them to within 1 mm. It uses the scripted head pose, `headRelativePlacement` and `originFromCenter` (src/lib/placement.ts:220-239), the frame transform (src/features/puzzle/PuzzleSystem.ts:120, src/features/diorama/dioramaFrame.ts:12-21), `AIM_PLANE_Z` (src/config/constants.ts:29) and src/levels/world1/01-first-thread.json:6-15. A level or placement change then can't silently leave the fixture stale.
- [x] Unit: `npm run coverage` is green on main after 01 and 03, with the count and coverage in the baseline log.
- [x] E2E: all 24 `npm run test:e2e` scripts pass with real input.
- [x] E2E: `test:e2e:levels` proves 24/24, `test:e2e:levels:slow` proves 24/24, and `test:e2e:dailies` proves 7/7.
- [x] E2E: `npm run test:smoke` prints all PASS on the `NODE_ENV=production` build of the baseline commit.
- [x] XR: `npm run test:e2e:hands` passes (hand-pinch, xr-full-level, xr-controls, gaze-pinch).
- [x] XR: `npm run test:e2e:prod-xr` on the local preview shows:
  - zero console errors and zero page errors;
  - status 200 for the worker, wasm, scene and UI files, with the wasm served as `application/wasm`;
  - the Enter XR click starting an AR session;
  - level 1 solved by hand pinch only, as read from the save.
- [x] CI: one push to `main`, made only after the baseline log is green, deploys the week 8 docs commit, 01, 03, this ticket and any merged 04 or 05 (named in Comments), and nothing else. Its run shows the smoke green before the upload and the deploy job green, the whole run takes under about 3 min, and the run URL is in Comments.
- [x] XR: after that deploy, the same run passes against https://sebaustin.github.io/threadbound/, and the log names the bundle tested and the pushed SHA. `SMOKE_URL` at the live URL also prints all PASS.
- [x] `.scratch/week8/regression-baseline.log` and `.scratch/week8/prod-xr-smoke.log` are committed, and every failure has a Comments entry. (Oct 23: both logs exist locally, but `*.log` is gitignored (.gitignore:24), so Comments carry the pass counts as the committed evidence. Every failure so far has a Comments entry. The main session closes this box after the live run.)
- [ ] CI: the `.scratch/`-only push of `prod-xr-smoke.log` starts no run in `gh run list --workflow deploy.yml` (03's `paths-ignore`).

**Effort:** M (~1 day)

**Gaps closed:** #42; follow-up "The judged production bundle has never been run in an XR session (emulated or on a device)"

**Risks:**
- Without the hook, a pinch that misses a knob only shows up as "no solve", so the per-step screenshots are the diagnosis. If the hand targeting can't be made reliable, run the live URL by hand under Meta's Immersive Web Emulator extension instead: enter AR, switch to hands, pinch-pull a to b, pinch the chute. Log that run the same way, and say why in Comments.
- Ticket 07 (placement) keeps the 3 s window before the diorama floats, keeps searching up to 18 s while the level is untouched, and fades the diorama in over about 0.3 s. It updates this script's wait (and the fixture, if the floating pose moves) and re-runs it in the same change; it has the box. Ticket 08 replaces the Enter XR canvas point with a click on `#enter-xr`.
- A red CI run on the push means a fix, a fresh baseline and another push, and the live run waits for a green deploy. Never push a fix without re-running the baseline.
- Local Node is v26.7.0, but `.nvmrc` and CI use 22.12.0. Run the regression under 22.12.0, or record the difference in the log header.
- Dev gotchas:
  - `dev restart` drops `--allow-browser-automation`;
  - editing `src/` during the regression swaps code under the tests (HMR);
  - a stopped `browser run` loses its lease (`runtime recover`);
  - levels run one per 110 s lease.

## Comments

- **Oct 23, agent: the local parts landed on main; nothing pushed, no workflow dispatched.** Commits:
  - `54f5eab test: production bundle in an XR session, entered by the Enter XR click and solved by hand pinch`: tests/e2e/prod-xr.mjs, tests/e2e/fixtures/prod-xr-w1-01.json, tests/unit/prodXrTargets.test.ts, the `test:e2e:prod-xr` script and a README "Develop" entry.
  - `4f76529 test: xr-controls' chute check counts marbles, so a drop that already ended still passes`: the fix for the first baseline's only red (see the defect below).
  - The docs commit carrying these Comments.
- **Ready to push: the docs commit on top of 4f76529.** The baseline ran on 4f76529, and the docs commit changes only `.scratch/`. origin/main is still 83977c8, so the push deploys the week 8 docs commits (7917cfc, d1cda98, 7b4f9e1), 04 (a7bca6d, 189b9a7), 01 (72b2c91 to f9b7c5e, plus b862f5b, f0be201 and 1364512), 03 (4d61352, 74e08d5, e38094d, 9126b02) and this ticket. 05 has not merged.
- **Decisions beyond the ticket text:**
  - Fixture: a seated head at (0, 1.15, 0), yaw 0, looking 25° down (quaternion x -0.21643961, w 0.97629601). With no planes the diorama floats with its centre at (0, 0.73, -0.45), yaw 0. That puts knob a at (-0.2, 0.97, -0.421), knob b at (0.05, 0.86, -0.421) and the chute's funnel centre at (-0.15, 1.12, -0.45). Besides the inputs the ticket lists, the unit test uses `DEFAULT_SETTINGS.offset` (a fresh save) and `CHUTE.lift`, because the chute point is the funnel centre, as in `hook.chute()`.
  - Enter XR is canvas point (180, 192), measured on a 1280x720 screenshot of the production flat view. The button spans about x 42-318, y 172-212.
  - Look rotation: the script imports `lookRotation` and `directionTo` from `iwer/lib/utils/control-math.js`. Those are the functions the CLI's look-at runs (`RemoteControlInterface.executeLookAt`). Targets go through the device's `remote.transformXROriginToGlobal`, as in the CLI. The script sets the hand position and `hands.right.quaternion` directly and calls `updatePinchValue(1|0)`, with xr-lib.sh's gesture timing.
  - Ready to click: the script waits for IWSDK's session offer, then two frames. IWSDK makes the offer right after the first level loads, just before `World.create` resolves and the systems register.
  - Session check: `remote.dispatch('get_session_status')`, a passive IWER query, gives the mode. The detail also says whether the offer is still pending ("offer still pending: true"), which shows the click started the session, not the offer.
  - AudioContext NOTE: an init script wraps `window.AudioContext` in a Proxy that records each instance, and the NOTE lists their states.
  - Save check: it also requires no solve in the save before the pinches ("before: no save").
- **Evidence, Oct 23 (Node v26.7.0 locally; .nvmrc and CI use 22.12.0, and no version manager is installed. The logs stay local because `*.log` is gitignored):**
  - Unit, written first: prodXrTargets went RED (ENOENT, fixture missing), then 6/6 green. With knob a moved 2 mm, its test fails.
  - prod-xr, red runs:
    - Enter XR point moved to (640, 700): exit 1 with `FAIL the Enter XR click starts an immersive-ar session — canvas (640, 700): no session within 5 s`. Then `NOTE fallback — entered through grantOfferedSession(): mode immersive-ar, blend alpha-blend`, and the solve still PASSes.
    - Knob a raised 10 cm: exit 1 with `FAIL level 1 solved by hand pinch only, read from the save — before: no save; after: no save`.
  - prod-xr, three repeat runs on 54f5eab: 14 PASS, 0 FAIL, 6 NOTE each, in 14.5-15.0 s.
  - Baseline run 1, on 54f5eab, right after `npm ci` (exit 0, 289 packages, package-lock.json unchanged) and a dev server restart (`dev up --headless --allow-browser-automation`). Everything was green except `test:e2e:hands`, which exited 1 in xr-controls, so gaze-pinch never ran. Log: `.scratch/week8/regression-baseline-first-run.log`.
  - **Defect (fixed here, 4f76529):** `FAIL pinching the chute starts a drop (idle)` / `aimed at {"x": -0.15, "y": 1.570000023841858, "z": -0.45}; now {"chute": {"x": -0.15, "y": 1.570000023841858, "z": -0.45}, ... "status": "idle", "levelId": "w1-01"}`. This is the race from ticket 01's review, which ticket 17 carried. With no thread, the drop ends and `status` goes back to `idle` before the probe reads it.
    - Red, reproduced on purpose: the same chute pinch, read 4 s later, gives `status=idle` and the old check FAILs.
    - Fix: xr-probe gains a `marbleCount` field. An unsolved drop's marbles stay until the next drop or level build. The check now passes on `status != idle || marbleCount > 0`, and it needs 0 marbles before the pinch.
    - After the fix, the late read gives `idle, 3 marbles` and PASSes. A pinch aimed 30 cm off the chute gives `idle, 0 marbles` and still FAILs.
    - xr-controls.sh then ran 3/3 with 9/9 checks. All three runs read `idle, 3 marbles`, so the old check would have failed all three.
  - **Baseline run 2, on 4f76529** (`.scratch/week8/regression-baseline.log`, week 6 layout plus `--- smoke`):
    - unit: `npm run typecheck` exit 0; `npm run coverage` exit 0 with 34 files, 281 tests, and 96.39 % statements, 94.82 % branches, 98.73 % functions, 97.12 % lines.
    - e2e: `npm run test:e2e` ran all 24 scripts with 137 checks, exit 0.
    - levels 24/24 exit 0; levels slow 24/24 exit 0; dailies 7/7 exit 0.
    - xr: `npm run test:e2e:hands` passed all 4 scripts, exit 0. That is 20 checks: hand-pinch 3, xr-full-level 5, xr-controls 9 and gaze-pinch 3. The busiest XR frame is 110 calls over 2 views, with no breach. After gaze-pinch, iwsdk.config.json has 0 changes.
    - build: `NODE_ENV=production npm run build` exit 0.
    - smoke: `npm run test:smoke` gave 17 PASS, 0 FAIL, 5 NOTE in 10.6 s, exit 0.
  - **prod-xr, local preview of 4f76529's build** (`.scratch/week8/prod-xr-smoke.log`, first section): 14 PASS, 0 FAIL, 6 NOTE in 14.2 s, exit 0.
    - Zero console errors and zero page errors. Status 200 for the physics worker, `HavokPhysics-BqNY-4N9.wasm` (served as `application/wasm`), `scenes/main.iwsdk.scene.json`, `ui/welcome.uikitml` and `ui/hud.uikitml`.
    - `PASS the Enter XR click starts an immersive-ar session — canvas (180, 192): mode immersive-ar, blend alpha-blend, offer still pending: true`.
    - `PASS level 1 solved by hand pinch only, read from the save — before: no save; after: best['w1-01'] 3, melody 6 notes`.
    - NOTEs: 2 AudioContexts, both `running` after the first pinch. Bundle `assets/index-BT5FWaKs.js`. The only cross-origin requests are jsDelivr's generic-hand `left.glb` and `right.glb`.
    - The screenshots (diorama placed, thread a to b, three marbles in the cup with 3 stars) were checked by eye and copied to `.scratch/week8/prod-xr/local-{entered,thread,solved}.png`. They are untracked, for step 4's commit.
    - Not errors, left as they are: IWSDK's two gaze warnings (no `gaze-tracking` on the Quest 3 preset) and Chromium's "GPU stall due to ReadPixels" warnings from the screenshots.
- **Pending, for the main session:** steps 2 to 4. Push main (the CI box), watch the run, run prod-xr and the smoke against the live URL (the live-URL box), add the live runs to `.scratch/week8/prod-xr-smoke.log` next to the local one, then commit and make the `.scratch/`-only push (the last two boxes). The dev server is still running headless with browser automation.
- **The deploying push (main session, Oct 23):**
  - `git push origin main` took origin from 83977c8 to c35811d. That deploys the week 8 docs commits plus tickets 04, 01, 03 and 02. Ticket 05 isn't merged.
  - Run https://github.com/SebAustin/threadbound/actions/runs/39991524233 succeeded. In build, `npm run test:smoke` passed (17:12:12-17:12:30Z) before `upload-pages-artifact` (17:12:30-17:12:32Z), and deploy succeeded. The run took about 11 min, of which `playwright install --with-deps` took 11 min (see ticket 03).
- **Live checks after the deploy:**
  - The live site serves `assets/index-BT5FWaKs.js`, the same bundle as the local production build of c35811d.
  - `SMOKE_URL=https://sebaustin.github.io/threadbound/ npm run test:smoke`: 17 PASS, 0 FAIL, 5 NOTE in 10.8 s, under SwiftShader WebGL. AR blend `alpha-blend`, both hands tracked, the session alive after 5 s.
  - `SMOKE_URL=... npm run test:e2e:prod-xr`: 14 PASS, 0 FAIL, 6 NOTE in 14.0 s.
    - The Enter XR click started `immersive-ar` (the offer was still pending, so it was the click that started it).
    - Level 1 was solved by hand pinch only: `best['w1-01']` 3.
    - Both AudioContexts were running.
    - Screenshots: `.scratch/week8/prod-xr/live-*.png`. Checked by eye: one thread, the marbles in the cup, 3 stars lit (hard to see on the gold header, which is gap 15 and ticket 15's fix).
  - Both runs are appended to `.scratch/week8/prod-xr-smoke.log`.
  - The saved melody had 4 notes live against 6 locally, for the same solution. That matches the frame-rate dependence ADR 0004 records, and ticket 10 should expect it.
- **Logs:** `*.log` is gitignored by design, so the logs stay local and this Comments entry is the committed evidence. The box is ticked on that basis.
