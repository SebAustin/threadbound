# 13: Stars for solve, par and first drop; a skip after three misses (P1)

**What to build:** ADR 0005's stars, a star total on the settings face, and the skip (CONTEXT.md **Star**, **Thread limit**, **Skip**).
- **Thread limit = par + 1:** set `maxThreads` to `par + 1` in the 21 level files under `src/levels/world*/` where it equals par today (all but w1-01, w1-02 and w4-01). In `src/lib/levelSchema.ts`, replace "Par cannot exceed maxThreads" (:140) with "maxThreads must be par + 1", keep `.max(8)` (:26), and tighten the stored-solution check (:142) from `maxThreads` to `par`, so three stars stay reachable on every level. Dailies inherit the limit through `dailyVariant` (src/lib/dailyVariant.ts:14).
- **Drop counts, pure:** new `src/lib/attempts.ts` holding `{ drops, missedDrops }`:
  - `dropStarted`: a drop still in flight when the chute is pinched again counts as missed;
  - `dropEnded(solved)`: a solve resets the run of misses;
  - `afterBuild({ relocated, sameLevel })`: a different level resets both, Restart resets `drops` and keeps `missedDrops`, relocation keeps both;
  - `skipOffered`: 3 or more misses in a row on a campaign level that is unsolved, not already skipped and not the last.

  Both counts live in `PuzzleState` (src/features/puzzle/puzzleStore.ts:23-43, :81-95). Wire them in `MarbleSystem.drop` (src/features/marbles/MarbleSystem.ts:105-119), the unsolved end (:216-222) and the solve (:276-284), and in `PuzzleSystem.build` (src/features/puzzle/PuzzleSystem.ts:125-136). `relocate` (:176-183) restores both in the same update as `status` (:182).
- **Stars:** `starsFor({ threadsUsed, par, drops })` (src/lib/scoring.ts:2-6): one for the solve, one for threads used <= par, one when `drops === 1`. PuzzleSystem.ts:154 calls it for campaign levels and dailies alike. Saved stars are not rescored (ADR 0005).
- **Progress:** `src/lib/progress.ts` gains `skipped: z.array(z.string()).default([])`, the same `.default` migration as :18-29 (the key stays `threadbound.progress.v1`), an empty `skipped` in `INITIAL_PROGRESS` (:36-42), and `recordSkip`: adds the id once, raises `unlocked`, leaves `best` and `melodies` alone. `recordCompletion` (:54-67) removes a solved id from `skipped`.
- **Resume:** `resumeIndex(levels, best, skipped)` (src/lib/resume.ts:7-13) passes over skipped levels. Ticket 09's `resumeTarget` passes `skipped` through to it, so `PuzzleSystem.init` (PuzzleSystem.ts:51-52) resumes past a skip. `stepLevel` (src/lib/levelSelect.ts:8-17) passes `skipped` through, so the settings face's Next reaches the level after a skip and Prev returns to the skipped one. `campaignComplete` and the ending (HudSystem.ts:96) are ticket 09's. It reads `best` only, so a skipped level already holds the ending back, and this ticket adds no ending code.
- **Skip command:** `{ type: 'skip' }` on the command bus (puzzleStore.ts:46-76). `PuzzleSystem.handle` (:55-93) ignores it unless `skipOffered`, otherwise saves `recordSkip` and loads the next level.
- **Settings face:** wire ticket 12's hidden controls; this ticket changes no settings-face layout or ids (12 also renames today's level-select Next to `set-next`):
  - `set-stars` reads "Stars N/72" from `starsLabel(earned, possible)` in src/lib/hud.ts and `starTotal(LEVELS, best)` in scoring.ts (campaign ids only, out of 3 x `LEVELS.length`);
  - `set-skip` reads "Skip level", shows only while offered, and is bound with `onTap`.

  `SettingsFace` renders both from state the way `renderLevel` does (settingsFace.ts:65-70), and mirrors `{ starsLabel, skipOffered }` on `panel.userData` for the hook's `plaque()` (src/features/debug/testHook.ts:193-197).

**Blocked by:** 12, 09

**Status:** ready-for-agent

- [ ] Unit: `tests/unit/scoring.test.ts` rewritten first: over par on a later drop = 1, par on a later drop = 2, over par on the first drop = 2, par or fewer on the first drop = 3; `starTotal` ignores daily and stale ids and tops out at 72.
- [ ] Unit: new `tests/unit/attempts.test.ts` covers every transition above. `skipOffered` is false at 2 misses, on a daily, on the last level, and on a solved or skipped level; it is true at 3.
- [ ] Unit: `levelSchema.test.ts` rejects `maxThreads` of par and of par + 2 (replacing the test at :48) and a stored solution above par (:78). `levels.test.ts` asserts `maxThreads === par + 1` on every campaign level and every daily; its body check (:15-22) still holds (busiest, w2-06, goes to 26 of 40).
- [ ] Unit: `progress.test.ts`: `recordSkip` doesn't mutate its input, adds once, unlocks the next level and keeps best and melodies; a later solve removes the id; a save without `skipped` loads with none; `skipped` round-trips through storage.
- [ ] Unit: `resume.test.ts` and `levelSelect.test.ts`: resume passes over skips; with every level solved but one skipped, `campaignComplete` is false and `resumeTarget` returns `daily: false` (the case 09's Risks hand to this ticket); Next steps past a skip and Prev reaches it. `hud.test.ts`: `starsLabel(14, 72)` is "Stars 14/72".
- [ ] E2E: `better-solve.e2e.mjs`: over par on the first drop = 2; a second drop at par = 2 and best stays 2; Restart, the par thread, first drop = 3.
- [ ] E2E: new `first-drop.e2e.mjs`, from a fresh save: raising the diorama during a first-drop solve still earns 3 (deferred relocation keeps the count), and the save's `melodies['w1-01']` is non-empty after the raise (ticket 10's relocate carry; whichever of 10 and 13 lands second adds this assertion); a miss, a raise, then the solution = 2; a miss, a real click on Restart, then the solution = 3; a daily solved on its second drop saves `dailyBest.stars` 2.
- [ ] E2E: new `skip.e2e.mjs`, real clicks from a fresh save: with thread b-c hung on level 1 (the marbles fall past it), two misses leave `set-skip` hidden and a third shows it. Ticket 14 extends this same run with its missed and skip-pointer lines, which need a thread on the diorama. The settings button then Skip load level 2 with `skipped: ['w1-01']`, no best for w1-01, "Stars 0/72", and Prev able to reach level 1. Dispatching `skip` when it isn't offered does nothing. No daily here: `attempts.test.ts` covers a daily, and a second three-miss run would break the lease (see Risks).
- [ ] E2E: new `skip-resume.e2e.mjs`, using the in-frame reload of `resume-insert.e2e.mjs:16-24`:
  - a save with w1-01 to w2-04 solved and w2-05 skipped resumes on w2-06 and reads "Stars 30/72";
  - with every other level solved and w2-05 skipped, solving w4-06 shows no ending and solving w2-05 does (09's ending, proven against a skip). The ending is matched only on `All ${n} solved`, as 09's finished-campaign.e2e does.

  `resume-insert.e2e.mjs` (an old save with no `skipped`) passes unchanged.
- [ ] E2E: this ticket doesn't edit `level-select.e2e.mjs`: ticket 12 moves it to `set-next` (:36-37) and ticket 09 rewrites its last-level check (:44-46). Add first-drop, skip and skip-resume to `test:e2e` (package.json:18).
- [ ] E2E: level proofs. `levels.e2e.mjs` also requires 3 stars from the stored solution on the first drop after a load. It runs after the no-thread drop (:21-24), so this also proves a load resets the count. It reports `par` and `maxThreads`; `daily-proof.e2e.mjs` checks the same 3 stars. `npm run test:e2e:levels` and `test:e2e:levels:slow` (24/24 each) and `test:e2e:dailies` (7/7) pass; paste the summary lines in Comments.
- [ ] XR: new `tests/e2e/xr-skip.sh` in `test:e2e:hands` (package.json:19), from a fresh save: pinch the chute three times, waiting out each drop. Skip appears only after the third. Pinch the settings button, then Skip, and expect `w1-02` with `skipped: ['w1-01']`. `xr-probe.e2e.mjs` reuses ticket 12's `fresh` and gains only the `SETUP_MODES` entry `settle` (wait while dropping), plus `PROBE_FIELDS` entries `skipToggle`, `skipOffered` and `skipped` (ticket 01's tables).
- [ ] Check: `npm run --if-present typecheck`, `npm test`, `npm run test:e2e` and `npm run test:e2e:hands` pass.

**Effort:** M (~1.5 days)

**Gaps closed:** #24, #29, #23 (the skip only; the XR rail-tab drag stays open)

**Risks:**
- A move during a drop waits (PuzzleSystem.ts:141-146), so a first-drop solve is recorded only after `relocate`'s update at :182. If `drops` isn't restored in that same update, the star is lost silently.
- UIKit spans that start empty never lay out text: keep ticket 12's placeholder text in `set-stars` and `set-skip`, and hide `set-skip` rather than emptying it. Notes inside its `<style>` must use `<!-- -->`, never `/* */`; a bad comment stops the plaque loading and leaves the hook undefined.
- Skip rebuilds the diorama, so act on release. `onTap` already does (src/features/input/onTap.ts:28-31); don't add a press handler.
- A missed drop takes up to ~15 s to settle (missed-drop.e2e.mjs:13), and a `browser run` lease is capped at 110 s. Keep one three-miss sequence per script.
- Ticket 10 also changes the progress schema (melody timing). Whichever ticket lands second keeps both fields defaulted for older saves.

## Comments

- **Oct 24, from ticket 10 (landed first):** this ticket lands second, so it adds the first-drop box's assertion that the save's `melodies['w1-01']` is non-empty after the raise. Ticket 10's `relocate` already carries `melody` in the update at PuzzleSystem.ts:184; `drops` and `missedDrops` join that same update. Melody-book entries now load as `{ notes, times }` (bare arrays from old saves included), so `recordSkip` must keep `melodies` as it is, and a new `skipped` default sits beside the `melodies` default.
