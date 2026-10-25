# 09: Guest play, and a finished campaign that reopens on the daily (P1)

**What to build:**
- **Guest play** (CONTEXT.md): opening the page with `?fresh=1` starts on the first level with the ghost hand. The saved progress is neither read nor changed, and nothing from the session is kept.
  - Add a pure `isGuestPlay(search: string): boolean` to `src/lib/storage.ts`. It is true only when the query has `fresh=1`; `?fresh=0` and a bare `?fresh` are not guest play.
  - `browserStorage()` (src/lib/storage.ts:40-49) takes `search = globalThis.location?.search ?? ''`.
  - For guest play it returns one module-level `memoryStorage()` (storage.ts:32-38), created on first use. PuzzleSystem (src/features/puzzle/PuzzleSystem.ts:36) and SettingsSystem (src/features/settings/SettingsSystem.ts:8) therefore share it for the page load.
  - It logs one `console.info` saying that progress is neither read nor saved.
  - Nothing else changes. An empty store makes `hasSolvedAny` false (src/features/onboarding/onboardingState.ts:10) and resumes at index 0, so `onboardingStep` (src/lib/onboarding.ts:16) shows the pinch-pull demo. Settings start at their defaults and aren't saved. Reset progress (PuzzleSystem.ts:76-80) only empties the in-memory copy.
- **Campaign complete, from saved progress:**
  - Add `campaignComplete(levels, best)` to `src/lib/resume.ts`. It is true when every campaign level id has best > 0.
  - It reads `best` only, so a level that was skipped (ticket 13) or never played keeps it false. Stars for removed levels or for dailies don't count.
  - HudSystem (src/features/hud/HudSystem.ts:96) passes `!state.daily && campaignComplete(LEVELS, state.progress.best)` in place of "the last level, status complete". The ending line (src/lib/hud.ts:60) then survives a reload, and shows on any campaign level once every level has a real solve.
  - Fix the `HudInput.campaignComplete` doc comment (hud.ts:26).
- **A finished campaign reopens on today's daily:**
  - Add `resumeTarget(levels, best)` to `src/lib/resume.ts`. It returns `{ daily: true, returnTo: levels.length - 1 }` when `campaignComplete`, and `{ daily: false, index: resumeIndex(...) }` otherwise.
  - `resumeIndex` keeps its fallback to the last level (resume.ts:12), because Prev/Next uses it as the upper bound (src/lib/levelSelect.ts:14). Reword its comment (resume.ts:4-5).
  - `PuzzleSystem.init` (PuzzleSystem.ts:51-52) follows `resumeTarget`.
  - `openDaily` (PuzzleSystem.ts:96-101) gains an optional `returnTo`. Without it, `returnTo` falls back to the store's starting `levelIndex` of 0 (src/features/puzzle/puzzleStore.ts:83), so the sun would send a finished player back to level 1.
  - The daily reopens even if today's daily is already solved. It then shows its stars.
- **Push, then check the live build:** ticket 02's one push (after its baseline) deploys 01-03 before this ticket's code exists, no other ticket pushes `main` before 17, and 17's gate needs every box here ticked. So this ticket pushes `main` itself, after a full local regression under ticket 03's README rule (spec.md:53, README.md:65-82 as 03 rewrites it).
  - **Guest run of the production bundle:** with `PROD_XR_GUEST=1`, ticket 02's `tests/e2e/prod-xr.mjs` runs a guest variant. An `addInitScript` seeds a solved `threadbound.progress.v1`. The script opens the `serve()` URL with `?fresh=1`, enters XR through prod-xr's own entry step, screenshots the ghost hand, solves level 1 by pinch and screenshots the lit stars. It passes when the stored value is byte-identical to the seed and the guest `console.info` was logged; it skips the plain run's read of the solve from the save.

**Blocked by:** 01, 02 and 03 (merge after 02's step-4 push)

**Status:** done except: the push box and the deployed-build box (main session: push the regressed SHA, watch the deploy, run the guest prod-xr against the live URL; exact commands in Comments)

- [x] Unit (new tests/unit/storage.test.ts): `isGuestPlay` is true for `?fresh=1` and `?x=2&fresh=1`, and false for `''`, `?fresh=0`, `?fresh` and `?refresh=1`.
- [x] Unit (storage.test.ts): stub `localStorage` with `vi.stubGlobal` and put a save in it. `browserStorage('?fresh=1')` reads null, and its writes never reach the stub. Two guest calls return the same object, and `browserStorage('')` returns the stub.
- [x] Unit (tests/unit/resume.test.ts): `campaignComplete` is false for an empty save, for a save missing one level, and for a save whose only stars belong to removed levels or dailies. It is true when every id has best >= 1.
- [x] Unit (resume.test.ts): `resumeTarget` gives the first unsolved level, or the daily with `returnTo` set to the last index. The existing `resumeIndex` case (resume.test.ts:21-24) still passes.
- [x] Unit (tests/unit/hud.test.ts, extending :92-97): with `campaignComplete` set, the ending line also shows on a level that isn't the last.
- [x] E2E (new tests/e2e/guest-play.e2e.mjs, added to `test:e2e` after resume-insert, package.json:18):
  - Seed exact values for `threadbound.progress.v1` (levels 1-3 solved, a streak, a melody) and `threadbound.settings.v1` (slow motion on).
  - Navigate the app frame to `?fresh=1`, using resume-insert's marker pattern (tests/e2e/resume-insert.e2e.mjs:16-24).
  - Assert level index 0, no stars, default settings, and the ghost visible on 'pinch-pull'.
  - Play level 1 with a real drag and a real chute click (as onboarding.e2e.mjs:23-38), and turn slow motion on. Both saved values stay byte-identical.
  - Reload, still on `?fresh=1`: level 1 and the ghost again.
  - On the plain URL, the save resumes at level 4.
- [x] E2E (new tests/e2e/finished-campaign.e2e.mjs, in the same chain):
  - Seed a save with every campaign level solved, then reload. Today's daily opens: `state().daily` is set, `levelIndex >= levels().length`, and `returnTo` is the last index. No daily id is hardcoded.
  - A real click on the sun (`button('daily')`, as daily.e2e.mjs:55) returns to the last level. Its hint is the ending line, matched on `All ${n} solved`.
  - A save missing one level reopens on that level, not on the daily.
  - End with resetProgress.
- [x] E2E: tests/e2e/level-select.e2e.mjs:44-46 solves only levels 0, 1 and the last, so under `campaignComplete` the last solve no longer ends the campaign. The check becomes "solving the last level with earlier levels unsolved shows no ending" (no `All N solved` hint); finished-campaign.e2e proves the ending. Ticket 12 renames the script's `set-skip` to `set-next` (:36-37), and ticket 14 changes only the ending's wording.
- [x] XR (new tests/e2e/xr-guest.sh, added to `test:e2e:hands`, package.json:19):
  - Seed a solved save, navigate to `?fresh=1`, then run `xr_start`; its reload keeps the query (see Risks).
  - The first probe, taken without `load0`, shows level 1 with the ghost visible on 'pinch-pull'.
  - Solve level 1 with `pinch_pull` and `pinch_at` (tests/e2e/xr-lib.sh:42-61). The saved values are unchanged. Navigate back to the plain URL.
  - `tests/e2e/xr-probe.e2e.mjs` gains `PROBE_FIELDS` entries (ticket 01's table) for `levelIndex`, `ghost` and the two saved values; `run()` stays as it is.
- [ ] Push (main session; the regression part is done, see Comments): once every box above is ticked, run README "Develop"'s full pre-push regression on main's head and keep its log as `.scratch/week8/regression-09.log`. From the start of the regression until the push, 02's rule for a running regression holds and nothing merges into main. Push only if every step is green, and push exactly the SHA that was regressed (`git push origin <sha>:main`). `gh run list --workflow deploy.yml -L 1` then shows that SHA's run green, smoke step included.
- [ ] XR (deployed build; main session for the live run, the local-preview run is done, see Comments): `PROD_XR_GUEST=1 npm run test:e2e:prod-xr` passes on the local preview before the push (after `NODE_ENV=production npm run build`) and, after that deploy, with `SMOKE_URL=https://sebaustin.github.io/threadbound/`. Its screenshots, checked by eye, show the ghost hand on level 1 and the lit stars. Record the deployed commit in Comments. This check lets ticket 04 drop the brackets around its guest link.

**Effort:** S (~1.5 days, including the pre-push regression)

**Gaps closed:** follow-ups "A reused headset or browser profile never shows the ghost hand again" (gap-analysis-followups.md:127-154) and "A fully played device reopens on the last, hardest level" (gap-analysis-followups.md:156-175)

**Risks:**
- `fresh_page` (tests/e2e/xr-lib.sh:20-25) runs before every script in run.sh. It reloads with `location.reload()` (node_modules/@iwsdk/vite-plugin-dev/dist/index.js:21207-21208), which keeps `?fresh=1`.
  - If a guest script dies before navigating back, the rest of the chain stays in guest play. Every later persistence check then fails for the wrong reason (controls.e2e.mjs:23-24, settings, daily, melody-book, resume-insert).
  - Navigate back in a `finally`, and make the last check `location.search === ''`.
- Ticket 13 also edits resume.ts (resume passes over skipped levels) and progress.ts (a skipped record plus a migration). It is blocked by this ticket.
  - This ticket owns `campaignComplete`, the HudSystem.ts:96 change and the level-select last-level check. Ticket 13 adds only the unit case "every level solved but one skipped: not complete, reopens on the campaign", and passes `skipped` through `resumeTarget` to `resumeIndex`.
  - `campaignComplete` must keep reading `best` only.
- The daily ticket changes which level is today's daily and what it is called, so the E2E checks the daily session and never an id.
- The push deploys everything on `main`, not only this ticket, to the URL testers and judges open, ahead of 17's review. The regression log is what makes that safe. If a step fails on another ticket's work, don't push: record the failure in Comments and in that ticket.
- Cited lines are from main at 83977c8. Ticket 01's merge adds two lines to `loadJson` in storage.ts.

## Comments

- **Oct 25, agent: landed locally on main as `3c47e44 feat: guest play on ?fresh=1 that reads and keeps nothing, an ending read from the save, and a finished campaign that reopens on today's daily (ticket 09)`, plus the docs commit carrying these Comments and the guest screenshots. Nothing pushed.** Blockers 01, 02 and 03 are done (02 made its deploying push, c35811d, and its docs push, e328f30).
- **What changed (src):**
  - Guest play: `isGuestPlay` (src/lib/storage.ts:46) is `URLSearchParams(search).get('fresh') === '1'`. `browserStorage(search = globalThis.location?.search ?? '')` (:66) returns guest play's one module-level `memoryStorage()` (:53-59), made on first use with one `console.info` ("[Threadbound] guest play (?fresh=1): progress is neither read nor saved", :56). PuzzleSystem and SettingsSystem share it for the page load. Nothing else changed: the empty store gives level 1, the ghost hand and default settings, and Reset progress empties only the in-memory copy.
  - `campaignComplete(levels, best)` (src/lib/resume.ts:21) reads `best` only: true when every campaign id has best > 0 (and the campaign isn't empty). `resumeTarget` (:37) gives `{ daily: true, returnTo: levels.length - 1 }` or `{ daily: false, index: resumeIndex(...) }`. `resumeIndex` keeps its last-level fallback (Prev/Next's bound) with a reworded comment (:1-7).
  - `PuzzleSystem.init` follows `resumeTarget` (src/features/puzzle/PuzzleSystem.ts:57-59). `openDaily(index?, returnTo?)` (:119-123) uses `returnTo ?? daily?.returnTo ?? levelIndex`. The daily reopens whether or not it is solved; a solved one shows its stars (HudSystem's `bestStarsOf` reads `dailyStarsOn`).
  - HudSystem passes `!state.daily && campaignComplete(LEVELS, state.progress.best)` (src/features/hud/HudSystem.ts:159). The `HudInput.campaignComplete` doc comment is fixed (src/lib/hud.ts:26).
- **What changed (tests):**
  - `navigateApp(app, search)` (tests/e2e/lib.mjs:44) is resume-insert's marker pattern as a helper: reload (`search` null) or navigate to `search` on the same path, wait for the new page's game, resolve its `location.search`.
  - tests/e2e/guest-play.e2e.mjs and tests/e2e/finished-campaign.e2e.mjs join `test:e2e` right after resume-insert (30 scripts now). Both restore the page in a `finally`: guest-play ends on the plain URL with progress reset and slow motion off, and its last check is `location.search === ''`; finished-campaign ends with resetProgress.
  - tests/e2e/xr-guest.sh joins the end of `test:e2e:hands` (8 scripts). It seeds and navigates through tests/e2e/guest-nav.e2e.mjs, which reuses guest-play's exported `SEED`. It restores the plain URL from `trap back_to_plain EXIT` and `trap 'back_to_plain; exit 1' INT TERM` (:30-31), and its last check is the plain URL.
  - tests/e2e/xr-probe.e2e.mjs gains `PROBE_FIELDS` entries `levelIndex`, `ghost`, `savedProgress` and `savedSettings` (:113-118). `run()` is unchanged.
  - tests/e2e/prod-xr.mjs: with `PROD_XR_GUEST=1` an init script (`seedSave`, :148) seeds a solved `threadbound.progress.v1` and the page opens on `?fresh=1` (`guestUrl`, :338). Entry and pinches are prod-xr's own (`pinchLevelOne`, :278, now shared with the plain run). `guestChecks` (:307) screenshots `guest-ghost`, `guest-thread` and, 9 s after the chute pinch, `guest-stars`. It passes when the stored value is byte-identical to the seed and exactly one guest `console.info` was logged, and skips the read of the solve from the save. The plain run's solved detail now also prints how long after the chute pinch the save showed the solve (0.6-0.7 s), which is what the 9 s guest wait is set against (:60-67). README "Develop" documents `PROD_XR_GUEST=1`.
- **Decisions beyond the ticket text:**
  - The hud.test.ts case (tests/unit/hud.test.ts:109) passed as soon as it was written: `hudModel` already showed the ending whenever the flag was set. The behaviour change is in HudSystem, and finished-campaign and level-select prove it (both RED before, below).
  - guest-play turns slow motion on with a real poke on the settings face's Slow-mo (as settings.e2e does), not through the bus.
  - level-select's last check now also requires the last level to be solved (`status === 'complete'`), so "no ending" can't pass because the solve failed.
  - xr-guest's INT/TERM trap exits after restoring. With a plain `trap ... INT`, zsh ran the restore and then went on with the script.
- **Red first (logs local in `.scratch/week8/logs/`):**
  - Unit: storage.test.ts and resume.test.ts RED with 14 failures (`isGuestPlay`/`campaignComplete`/`resumeTarget` missing, guest reads returning the save, no `console.info`), then green.
  - guest-play with storage.ts reverted: 7 FAIL, e.g. "a guest starts on level 1 ... — {"levelIndex":3,...}" and "settings start at their defaults — {"slowMotion":true,...}". Its `finally` still left the page on the plain URL (PASS).
  - finished-campaign before the PuzzleSystem/HudSystem change: 3 FAIL ("reopens on today's daily — {"levelIndex":23,"daily":null,...}", "returns to the last level", "its ledge shows the ending"). level-select: FAIL "no ending — {"status":"complete","hint":"All 24 solved - poke the sun for a daily"}".
  - xr-guest.sh with storage.ts reverted: exit 1, "FAIL the guest enters XR on level 1 ... (level 3, {"step": "done", "visible": false})" and "FAIL the guest solves level 1 ... (idle)". Interrupted with SIGINT mid-run: exit 1, and afterwards the page reads `search ''`, level 0, no stars, slow motion off.
  - prod-xr guest on a production build with storage.ts reverted: 15 PASS, 1 FAIL ("guest play logs one console.info — none").
- **Regression on 3c47e44** (README "Develop"'s full pre-push list plus this ticket's prod-xr runs; `.scratch/week8/regression-09.log`, gitignored; header: tree clean, Oct 25 06:58-07:24 CDT, node v26.7.0 against .nvmrc/CI 22.12.0, npm 11.19.0):
  - unit: `npm run typecheck` exit 0. `npm run coverage` exit 0: 42 files, 580 tests, 97.53 % statements, 95.68 % branches, 99.12 % functions, 97.93 % lines.
  - build: `NODE_ENV=production npm run build` exit 0, bundle `assets/index-Ce8HK3Za.js`.
  - smoke: `npm run test:smoke` 19 PASS, 0 FAIL, 5 NOTE, exit 0.
  - prod-xr, local preview: plain 15 PASS, 0 FAIL, 6 NOTE ("level 1 solved by hand pinch only, read from the save — before: no save; after: best['w1-01'] 3, melody 3 notes (0.6 s after the chute pinch)"). Guest (`PROD_XR_GUEST=1`) 16 PASS, 0 FAIL, 7 NOTE: "page loads — http://127.0.0.1:4173/threadbound/?fresh=1 → 200", "the Enter XR click starts an immersive-ar session — #enter-xr", "guest play leaves the stored save byte-identical to the seed — 185 bytes, unchanged", "guest play logs one console.info — [Threadbound] guest play (?fresh=1): progress is neither read nor saved". Zero console and page errors.
  - Guest screenshots checked by eye, copied to `.scratch/week8/prod-xr/local-guest-{ghost,thread,stars}.png`. ghost: First Thread, World 1 - 1/6, three empty stars, the ghost fingertips on the two knobs, and the ledge hint "Pinch a glowing peg, pull, release on the other". stars: the gold solved header with three lit stars, the thread a-b and three marbles in the cup.
  - dev server: `dev status` running with `browserCommandReady: true`; no Vite overlay (`no-overlay` true).
  - e2e: `npm run test:e2e` exit 0, 30/30 scripts, 206 checks, 0 FAIL. guest-play 10/10, finished-campaign 7/7, level-select 7/7. finished-campaign opened today's daily at index 24 (`returnTo` 23); the day before it was index 28. That shows the check needs no id.
  - levels 24/24 and levels slow 24/24, exit 0. dailies 7/7, exit 0.
  - xr: `npm run test:e2e:hands` exit 0, 8/8 scripts, 45 checks, 0 FAIL. xr-guest 5/5. The busiest XR frame is 116 calls over 2 views, with no breach.
- **Left for the main session** (the two open boxes). Nothing may merge into main between this regression and the push. If main moved past the docs commit with anything outside `.scratch/`, re-run the regression first.
  1. Check `git log --oneline origin/main..main`. It should list 3c47e44, the commits below it back to d8d2c75 (tickets 05, 06, 08, 12, 10 and 07), and above it only this ticket's docs commit (`.scratch/` only).
  2. `git push origin 3c47e44:main`. This deploys exactly the regressed SHA, with tickets 05-08, 10 and 12 on it.
  3. `gh run list --workflow deploy.yml -L 1`, then `gh run watch <id>`: 3c47e44's run must be green with `npm run test:smoke` before `upload-pages-artifact`. Record the run URL here (push box).
  4. Once it deploys: `curl -s https://sebaustin.github.io/threadbound/ | grep -o 'assets/index-[^"]*\.js'` should name `assets/index-Ce8HK3Za.js`. Then run `PROD_XR_GUEST=1 SMOKE_URL=https://sebaustin.github.io/threadbound/ npm run test:e2e:prod-xr` (and the plain run with the same `SMOKE_URL`). Check `.tmp/prod-xr/guest-ghost.png` and `guest-stars.png` by eye, copy them to `.scratch/week8/prod-xr/live-guest-*.png`, and record the deployed commit (3c47e44) here (deployed-build box). Ticket 04 can then drop the brackets around its guest link.
  5. `git push origin main` for the docs commit(s): `.scratch/` only, so `paths-ignore` starts no deploy.
