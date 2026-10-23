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

**Status:** ready-for-agent

- [ ] Unit (new tests/unit/storage.test.ts): `isGuestPlay` is true for `?fresh=1` and `?x=2&fresh=1`, and false for `''`, `?fresh=0`, `?fresh` and `?refresh=1`.
- [ ] Unit (storage.test.ts): stub `localStorage` with `vi.stubGlobal` and put a save in it. `browserStorage('?fresh=1')` reads null, and its writes never reach the stub. Two guest calls return the same object, and `browserStorage('')` returns the stub.
- [ ] Unit (tests/unit/resume.test.ts): `campaignComplete` is false for an empty save, for a save missing one level, and for a save whose only stars belong to removed levels or dailies. It is true when every id has best >= 1.
- [ ] Unit (resume.test.ts): `resumeTarget` gives the first unsolved level, or the daily with `returnTo` set to the last index. The existing `resumeIndex` case (resume.test.ts:21-24) still passes.
- [ ] Unit (tests/unit/hud.test.ts, extending :92-97): with `campaignComplete` set, the ending line also shows on a level that isn't the last.
- [ ] E2E (new tests/e2e/guest-play.e2e.mjs, added to `test:e2e` after resume-insert, package.json:18):
  - Seed exact values for `threadbound.progress.v1` (levels 1-3 solved, a streak, a melody) and `threadbound.settings.v1` (slow motion on).
  - Navigate the app frame to `?fresh=1`, using resume-insert's marker pattern (tests/e2e/resume-insert.e2e.mjs:16-24).
  - Assert level index 0, no stars, default settings, and the ghost visible on 'pinch-pull'.
  - Play level 1 with a real drag and a real chute click (as onboarding.e2e.mjs:23-38), and turn slow motion on. Both saved values stay byte-identical.
  - Reload, still on `?fresh=1`: level 1 and the ghost again.
  - On the plain URL, the save resumes at level 4.
- [ ] E2E (new tests/e2e/finished-campaign.e2e.mjs, in the same chain):
  - Seed a save with every campaign level solved, then reload. Today's daily opens: `state().daily` is set, `levelIndex >= levels().length`, and `returnTo` is the last index. No daily id is hardcoded.
  - A real click on the sun (`button('daily')`, as daily.e2e.mjs:55) returns to the last level. Its hint is the ending line, matched on `All ${n} solved`.
  - A save missing one level reopens on that level, not on the daily.
  - End with resetProgress.
- [ ] E2E: tests/e2e/level-select.e2e.mjs:44-46 solves only levels 0, 1 and the last, so under `campaignComplete` the last solve no longer ends the campaign. The check becomes "solving the last level with earlier levels unsolved shows no ending" (no `All N solved` hint); finished-campaign.e2e proves the ending. Ticket 12 renames the script's `set-skip` to `set-next` (:36-37), and ticket 14 changes only the ending's wording.
- [ ] XR (new tests/e2e/xr-guest.sh, added to `test:e2e:hands`, package.json:19):
  - Seed a solved save, navigate to `?fresh=1`, then run `xr_start`; its reload keeps the query (see Risks).
  - The first probe, taken without `load0`, shows level 1 with the ghost visible on 'pinch-pull'.
  - Solve level 1 with `pinch_pull` and `pinch_at` (tests/e2e/xr-lib.sh:42-61). The saved values are unchanged. Navigate back to the plain URL.
  - `tests/e2e/xr-probe.e2e.mjs` gains `PROBE_FIELDS` entries (ticket 01's table) for `levelIndex`, `ghost` and the two saved values; `run()` stays as it is.
- [ ] Push: once every box above is ticked, run README "Develop"'s full pre-push regression on main's head and keep its log as `.scratch/week8/regression-09.log`. From the start of the regression until the push, 02's rule for a running regression holds and nothing merges into main. Push only if every step is green, and push exactly the SHA that was regressed (`git push origin <sha>:main`). `gh run list --workflow deploy.yml -L 1` then shows that SHA's run green, smoke step included.
- [ ] XR (deployed build): `PROD_XR_GUEST=1 npm run test:e2e:prod-xr` passes on the local preview before the push (after `NODE_ENV=production npm run build`) and, after that deploy, with `SMOKE_URL=https://sebaustin.github.io/threadbound/`. Its screenshots, checked by eye, show the ghost hand on level 1 and the lit stars. Record the deployed commit in Comments. This check lets ticket 04 drop the brackets around its guest link.

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
