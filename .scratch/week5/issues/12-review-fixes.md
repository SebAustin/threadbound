# 12: End-of-week-5 review fixes

**What to build:** fix the findings from the two-axis review of `bbd7009..HEAD`, test-first wherever behaviour changes.

**Blocked by:** 01–11

**Status:** done

## Spec axis (behaviour)
- [x] S1 Plaque world count includes daily variants ("World 1 - 1/9"). The HUD should count campaign levels only. RED: plaque.e2e already fails (2/6).
- [x] S2 A rail slide can overspend the spool. Decision: a slide that would overspend is refused and the peg returns to its last spot, with the refusal cue. Pure check in threadRules.
- [x] S3 Relocation could drop an overspent thread. Fixed by S2, since a valid state replays validly. Add a relocation-keeps-threads assertion.
- [x] S4 Moving the diorama resets a solved level and kills a drop. Decision: relocation keeps the solved status and stars; an offset change during a drop is applied when the drop ends; `stepOffset` at the clamp is a no-op (same object).
- [x] S5 Streak credited by the solve time. Decision: credit the day the daily was loaded.
- [x] S6 Daily stars persist per board across weeks. Decision: a daily's plaque stars show only today's result.
- [x] Missing way back from a daily. Decision: on a daily, the sun button returns to the campaign level you came from, and the plaque hint says so.
- [x] Overspend gives sound-only feedback. Decision: a refusal also sets a plaque hint ("Not enough spool", "Thread limit reached", and so on) until the next successful action.
- [x] Height range too small for "a high or low table". Widen up/down from ±3 to ±6 steps (±15 cm).
- [x] raise-lower, guarded-reset, daily and settings E2E are not in the npm chain. Add them.
- [x] Reload persistence is only checked through localStorage. Extend resume-setup/resume-check to cover settings (slow motion plus offset) surviving a real reload.

## Standards axis
- [x] Hand-tracked `released` / `pendingSnips` entity arrays → a `TapReleased` tag component plus queries (AGENTS.md "queries, never manually tracked entity arrays").
- [x] Fixed sleeps in XR shell tests → poll XR status and `browserCommandReady` (web/testing.md). Gesture hold durations stay as they are.
- [x] `installTestHook` is about 120 lines → split it into small builders and merge the duplicate local/world pairs.
- [x] Repeated `{x, y}` shape → one shared `Point2` type; `toCm` / `cm` → one `lib/units`.
- [x] `onTap` should narrow its target rather than cast it; `ControlAction` should be validated; `settingsModel` should take `Settings`.
- [x] `timeScale` is computed twice per frame → SimulationClockSystem owns it and MarbleSystem reads it.
- [x] Daily-ness is encoded two ways, and `localDayKey(new Date())` appears three times → systems now read the `state.daily` session; `isDailyIndex` remains only in `loadLevel`'s keep-the-session rule; one `today()`.
- [x] `loadLevel(index, relocated)` flag argument → `loadLevel(index)` / `openDaily()` / `relocate()` are the entry points; the flag survives only inside the private `build()` and the `levelBuilt` event (the HUD needs it to keep its face).
- [x] Settings patch isn't validated → parse the merge through the settings schema.
- [x] Magic `+ 50` → a named constant. Fix the misplaced doc comment.
- [x] gaze-pinch.sh should announce the dev-server restart; move the python lerp into xr-lib.sh.
- [x] CONTEXT.md: add Spool, Daily, Streak, Settings face, Slow motion, Offset/Relocate.

## Accepted, not changed
- Progress "v2" stays a zod default on the v1 key rather than a version bump. It is a lossless migration; a version field arrives with the next breaking change.
- `userData.face` / `resetLabel` stay as the dev hook's read-only window into UIKit. The alternative (a store mirror) duplicates state.
- UIKitML colour tokens are deferred to the week 6 art pass.

## Comments
- RED evidence: plaque.e2e failed on `2/6` before the S1 fix. The new spool, daily and raise-lower checks were written alongside the fix, so they were confirmed RED by stashing `src/` and running them against the old code (the slide went through to x=0.29; a move wiped the solve to idle/0 stars; daily had no session).
- Unit tests: 183 → 196 (dailyBest per day, offset identity at the clamp, validated settings patch, slideFitsSpool, refusal and daily hints).
- Trap found while fixing: zod `parse` clones, so returning `parsed.data` from a settings patch would give the offset a new identity, and toggling slow motion would have rebuilt the diorama mid-drop. `applySettingsPatch` validates but returns the merge (pinned by a unit test).
- The sun button now dispatches `toggleDaily`; `daily` with an index stays for tests and the daily proofs. The XR check covers both pinches.
- Release-acting taps now use a `TapReleased` tag plus queries (`tagRelease` skips entities disposed mid-press). The xr-controls suite passes (7/7).
- Fixed sleeps after reloads (`run.sh`, `levels.sh`, `probe.sh`, `xr_start`, the gaze device switch) are replaced by `fresh_page` / `settle` / `wait_ready`, which poll in-page and on the bridge. The sub-second sleeps that remain are gesture timing.
- **Correction:** the first post-fix regression's level sections only proved `w1-02` (40 times). The new `wait_ready`/`fresh_page` helpers looped with a global `i` (zsh function variables are global), which clobbered `levels.sh`'s loop index after every reload. That regression is committed with the fixes (5c03a54); its level results were not real. Fixed with `local i`, plus a guard: `levels.sh` now errors unless each run reports the exact index it asked for. Rerun on the review-fix code: 20/20 distinct levels at normal speed and 20/20 in slow motion.
