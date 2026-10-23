# 03: Deploys: docs don't redeploy, a production smoke test gates upload (P1)

**What to build:**
- **Docs stop redeploying:** add `paths-ignore: ['docs/**', '**/*.md', '.scratch/**']` under `push:` in `.github/workflows/deploy.yml:4-6`. Today `push: branches: [main]` has no filter, so the docs-only commits cb5880e and fbcaf52 each rebuilt and redeployed the game. `workflow_dispatch` stays.
- **A shared production harness, `tests/smoke/harness.mjs`** (plain Node and Playwright, with no dev server and no `npx @iwsdk/cli`). It's needed because every existing E2E reads the DEV-only hook (`src/index.ts:49-57`, `tests/e2e/lib.mjs:16-17`), so none of them can run against `dist/`. This ticket owns the only copy. Ticket 02's `tests/e2e/prod-xr.mjs` imports it and adds just the Enter XR click and the level-1 pinch solve. It exports:
  - `serve()`: when `SMOKE_URL` is set, it returns that URL and serves nothing. Otherwise it serves `dist/` with Vite's `preview()` API under `/threadbound/`, as Pages does, with `configFile: false` so the IWSDK dev plugin never loads. `SMOKE_URL` is the only target variable for both scripts, so 02 drops `BASE_URL` and its own `vite preview`;
  - `inject()`: launches headless Chromium at a fixed 1280x720 viewport (02 measures its Enter XR point at that size) with two init scripts. The first is IWER's UMD build (`node_modules/iwer/build/iwer.min.js`). The second runs `new IWER.XRDevice(IWER.metaQuest3)` with `installRuntime({ forceInstall: true })` and keeps the device on `window`, so each caller sets its own input mode and head pose. It uses plain `iwer`, not `@iwer/devui`;
  - `record()`: listens on the browser context, so requests made by workers count too. It collects every console message, page error and failed request, the status and content type of each response, the running workers, the name of the served `assets/index-*.js` and every cross-origin request (the jsDelivr hand models). It writes the console log and named screenshots to `.tmp/<script>/`, which is already gitignored (`.gitignore:37`).
- **A pure verdict module, `tests/smoke/verdict.mjs`:** it turns a `record()` result plus the caller's own named checks into PASS, FAIL and NOTE lines in the `tests/e2e/run.sh` style, with exit code 1 on any FAIL. A caller check is either `{ name, pass, detail }` (PASS/FAIL) or `{ name, note }` (NOTE). Built-in FAILs:
  - a console error, a page error or a failed same-origin request;
  - no running worker;
  - any status but 200 for `scenes/main.iwsdk.scene.json`, `ui/welcome.uikitml`, `ui/hud.uikitml`, the physics worker (`physics-worker-*.js`, created at `node_modules/@iwsdk/core/dist/physics/physics-transport.js:105`) or `HavokPhysics-*.wasm`;
  - a wasm not served as `application/wasm`.

  The bundle name and the cross-origin requests are NOTE lines. Each failure detail names the URL or message at fault. There's no ignore list; any entry added later needs a stated reason and a ticket.
- **The CI smoke, `tests/smoke/prod-smoke.mjs`**, composes the harness and adds two checks of its own. It writes to `.tmp/prod-smoke/`.
  - Flat: from load to network idle, the canvas isn't blank (a canvas screenshot, decoded in the page, so no image library is needed).
  - XR: because of `offer: "always"` (`iwsdk.config.json:13-14`), IWSDK calls `navigator.xr.offerSession` at startup (`node_modules/@iwsdk/core/dist/init/world-initializer.js:349`). The script waits for `device.sessionOffered`, calls `grantOfferedSession()` (`node_modules/iwer/lib/device/XRDevice.d.ts:261-263`) and sets `primaryInputMode = 'hand'`. It then asserts that `session.environmentBlendMode` is `'alpha-blend'`, and that 5 s later the session is still active with no errors. It doesn't click Enter XR. That click and the level-1 solve belong to ticket 02, and the Enter XR ticket is rewriting `src/panel.ts:36-51`.
- **package.json:** add `"test:smoke": "node tests/smoke/prod-smoke.mjs"` next to `preview` (`package.json:15`). Pin `playwright` 1.63.0 and `iwer` 2.5.0 in `devDependencies` (`package.json:32`). Both are only transitive today (through `@iwsdk/vite-plugin-dev` and `@iwer/devui`), and these are the versions the lockfile already holds. These are the only pins; ticket 02 adds none.
- **CI gate:** in the `build` job, between `npm run build` and `actions/upload-pages-artifact` (`deploy.yml:29-34`), add three steps: `npx playwright install --with-deps chromium`, `npm run test:smoke`, then `actions/upload-artifact` of `.tmp/prod-smoke/` with `if: failure()`. Keeping it in the same job means `dist/` doesn't have to be handed between jobs, and a failing smoke never uploads.
- **README.md "Develop" (`README.md:65-82`):**
  - add `npm run test:smoke` to the command list;
  - add a "Before any push to `main` that deploys" paragraph (a push touching any path outside `paths-ignore`): run the full local regression and keep its log in `.scratch/<week>/`. That means `npm run coverage` and `NODE_ENV=production npm run build && npm run test:smoke` (the build CI runs, `deploy.yml:29-31`), then, with the dev server up, `test:e2e`, `test:e2e:levels`, `test:e2e:levels:slow`, `test:e2e:hands` and `test:e2e:dailies`;
  - say that CI runs only typecheck, unit tests, the build and the smoke, and that pushes touching only docs, Markdown or `.scratch/` don't deploy.
- **The freeze steps are not part of this ticket.** Don't change the trigger to tags, don't add a ruleset and don't disable the workflow. The only other ticket file to edit is `.scratch/week7/issues/05-freeze-and-tag.md`, which has no Comments heading yet. Append a `## Comments` heading with one bullet: the freeze plan is now to tag `v1.0`, deploy from `v*` tags (or `workflow_dispatch`) only, and have a ruleset block pushes to `main` until about Dec 11. The bullet also notes that the github-pages environment's main-only branch policy must then admit `v*` tags (gap 8).

**Blocked by:** none

**Status:** ready-for-agent

- [x] Unit: `tests/unit/smokeVerdict.test.ts`, written first. A clean record passes, and a cross-origin request or the bundle name gives a NOTE, not a FAIL. A caller `{ name, note }` check prints a NOTE line and leaves the exit code at 0. Each of these fails, with the URL or message in the detail: a console error, a page error, a failed same-origin request, a 404 for the wasm, the scene JSON or a `.uikitml`, a wasm served as anything but `application/wasm`, no worker, and a failed caller check (a one-colour canvas, no session, the wrong blend mode, a session that ended)
- [x] Unit: `tests/unit/deployWorkflow.test.ts` reads `deploy.yml` as text. It checks that the three `paths-ignore` globs sit under `push`, and that `npm run test:smoke` comes after `npm run build` and before `upload-pages-artifact`
- [x] E2E (red first): after a build, delete `dist/assets/HavokPhysics-*.wasm`; `npm run test:smoke` exits 1 and names the wasm URL. Truncate `dist/ui/hud.uikitml`; it exits 1 on the console error the broken plaque raises
- [x] E2E: after a clean `NODE_ENV=production npm run build`, `npm run test:smoke` prints all PASS locally in under 90 s
- [x] XR: in that run, the production bundle enters an `immersive-ar` session through the offer path, switches to hand mode, and stays in the session 5 s with no console errors. The XR screenshot in `.tmp/prod-smoke/` is checked by eye and shows the diorama
- [x] E2E (red first): `SMOKE_URL=http://127.0.0.1:9/threadbound/ npm run test:smoke` starts no preview, exits 1 and names that URL, which proves the override. This ticket doesn't run the live Pages URL; ticket 02 does
- [ ] CI: push the branch only (`git push -u origin <branch>`; `push:` is main-only, so nothing deploys), then `gh workflow run deploy.yml --ref <branch>` runs the build and the smoke green on ubuntu-latest, and the environment policy refuses the deploy job. This ticket then merges into main locally, deletes the remote branch, and never pushes main. The post-merge push and the docs-only no-run check are ticket 02's CI boxes, so they don't hold this ticket open
- [x] README "Develop" lists the pre-push regression, and week 7 ticket 05 has the freeze-plan comment

**Effort:** S (~1 day)

**Gaps closed:**
- #8: the docs-push half. The tag half moves to week 7 ticket 05.
- Follow-up "CI gates deploys on unit tests and the build only": the production smoke. The full suite stays a local gate.
- Follow-up "Pages deploys whatever is on main": the `paths-ignore` part.

**Risks:**
- **WebGL on the runner:** headless Chromium on a runner with no GPU needs SwiftShader for WebGL, and recent Chrome no longer falls back to it on its own. If the WebGL context fails, launch with `--use-angle=swiftshader --enable-unsafe-swiftshader`. Prove this on the branch dry-run first.
- **IWER install:** Chromium already exposes `navigator.xr`, so `installRuntime()` without `forceInstall: true` installs nothing (`XRDevice.d.ts:104-108`). The app then logs "no immersive session mode is supported here" (`src/panel.ts:42`).
- **jsDelivr:** in XR the hand models load from jsDelivr (follow-up "In XR, the hand models load at runtime from a third-party CDN (jsDelivr)"), so a CDN blip fails the gate. Re-run once. If it fails again, treat it as real; don't ignore the error.
- **Existing errors:** the first run may surface errors the live build already logs. Fix or file them; don't hide them.
- **Branch dry-run:** it's only safe if the github-pages environment really refuses refs other than `main`. Check with `gh api repos/SebAustin/threadbound/environments/github-pages/deployment-branch-policies` before dispatching, or the branch build ships.

## Comments

- **Oct 23, agent: the local parts landed on main; nothing pushed, no workflow dispatched.** Three commits:
  - `4d61352 test: production smoke for dist/ with a shared harness and a pure verdict`: tests/smoke/{harness,verdict,prod-smoke}.mjs, tests/unit/smokeVerdict.test.ts, the `test:smoke` script and the `playwright` 1.63.0 / `iwer` 2.5.0 pins.
  - `74e08d5 ci: docs pushes stop deploying, and the production smoke gates the Pages upload`: deploy.yml and tests/unit/deployWorkflow.test.ts.
  - `e38094d docs: README pre-push regression rule and the week 7 freeze plan`: README "Develop" (and the Layout line for tests/), and week 7 ticket 05's Comments.
- **For ticket 02 (the harness API):**
  - `serve()` returns `{ url, previewed, close }`.
  - `inject()` returns `{ browser, context, page }`, and the device is `window.iwerDevice` (exported as `DEVICE_GLOBAL`). `VIEWPORT`, `BASE_PATH` and `CHROMIUM_ARGS` are exported too.
  - `record(context, page, { script, url })` returns `{ outDir, result(), save(), shot(name) }`. Take `result()` before closing the browser, because closing it ends every worker and "a worker is running" then FAILs (the first local run did exactly that).
  - `verdict(result, checks)` returns `{ lines, exitCode, counts }`.
- **Decisions beyond the ticket text:**
  - `serve()` previews with `appType: 'mpa'`, so a missing file is a 404 as on Pages. With Vite's default SPA fallback, a deleted wasm came back as index.html with status 200: the content-type check still failed it, but the 200 check passed.
  - SwiftShader is always on (`--use-angle=swiftshader --enable-unsafe-swiftshader`), so a local run renders the way CI will. A NOTE line names the renderer: "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0) (0x0000C0DE)), SwiftShader driver)".
  - Verdict: a same-origin response with status 400 or more counts as a failed same-origin request. A required file that is never requested FAILs ("never requested"), and so does a run with no .wasm response. A failed cross-origin request stays a NOTE with "(failed: ...)" appended; the console error it causes still FAILs. Each detail stays on one line, and repeats (a retried fetch) are listed once. A caller check with neither `pass` nor `note` FAILs as malformed.
  - The XR stage also checks that the input is tracked hands: mode `hand`, with 2 hand input sources out of 2.
  - deploy.yml: upload-artifact v4 skips dot-directories such as `.tmp/` unless `include-hidden-files: true`, so the failure artifact sets it. It also sets `if-no-files-found: ignore` for failures before the smoke ran.
  - Lockfile: only the root devDependencies and three `peer: true` flags (iwer, gl-matrix, webxr-layers-polyfill) changed. No version moved. `npm ci --dry-run` on a copy of package.json and package-lock.json exits 0.
- **Evidence, Oct 23 (Node v26.7.0 locally; .nvmrc and CI use 22.12.0; the run logs are local only):**
  - Unit, written first: smokeVerdict RED (module missing), then 29/29 green. Two more tests (one-line details, repeats listed once) went RED 2/31, then 31/31. deployWorkflow went RED (6 of 7 failing), then 7/7. Afterwards `npm run typecheck` exit 0, `npm test` 33 files / 275 tests, and `npm run coverage` exit 0 (96.39 % statements, 94.82 % branches, 98.73 % functions, 97.12 % lines).
  - E2E: `rm -rf dist`, `NODE_ENV=production npm run build` exit 0, then `npm run test:smoke` exit 0: 17 PASS, 0 FAIL, 5 NOTE in 10.6 s (11 s wall). Three repeats gave 17/0/5 each, in 10.2-10.5 s. Bundle `assets/index-BT5FWaKs.js`. The only cross-origin requests are jsDelivr's generic-hand `left.glb` and `right.glb`.
  - Red, wasm deleted: exit 1, `FAIL 200 for HavokPhysics-*.wasm — http://127.0.0.1:4173/threadbound/assets/HavokPhysics-BqNY-4N9.wasm → 404`. The console errors, the failed request, "no worker running" and the wasm content type FAIL too.
  - Red, `dist/ui/hud.uikitml` cut to 300 bytes: exit 1, `FAIL no console errors — 1 error(s): [LevelSystem] Failed to load level Error: Failed to parse UIKitML hud-plaque: / Unclosed <style> block. at 5:0 ...`. The page error, a blank canvas ("1 colour (#ffffff)") and "no offer within 20 s" FAIL too.
  - Red, `SMOKE_URL=http://127.0.0.1:9/threadbound/ npm run test:smoke`: exit 1 in 0.4 s, `NOTE target — SMOKE_URL http://127.0.0.1:9/threadbound/ (no preview started)` and `FAIL page loads — http://127.0.0.1:9/threadbound/: page.goto: net::ERR_UNSAFE_PORT ...`. Nothing listened on port 4173 before or after. Chromium refuses port 9 outright, so the error is ERR_UNSAFE_PORT rather than a refused connection; either way no preview started.
  - XR: in the clean runs the offered session started through `grantOfferedSession()` with blend mode `alpha-blend` (immersive-ar), switched to hands (left and right), and was still active 5 s later with no end event. Zero console errors and zero page errors over the whole run. `.tmp/prod-smoke/xr.png`, checked by eye, shows the diorama, the "First Thread" plaque and both hand outlines.
  - Not errors, left as they are: IWSDK's gaze warnings (`gaze-tracking` isn't granted on the Quest 3 preset, and no gaze input source appears within 3 s), and Chromium's "GPU stall due to ReadPixels" warnings from the canvas screenshot.
- **Pending: the main session runs the branch dry run** (the CI box stays unticked). A read-only check has been done for it: `gh api repos/SebAustin/threadbound/environments/github-pages/deployment-branch-policies` lists one policy, branch `main` (`custom_branch_policies: true`), so the deploy job of a branch dispatch should be refused. On ubuntu-latest, watch the SwiftShader flags and the jsDelivr hand models.
