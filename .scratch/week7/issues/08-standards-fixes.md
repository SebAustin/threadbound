# 08: Standards fixes from the bug bash

**What to build:** the HARD items and the cheap judgement items from the Standards report:
- ~~glyph geometries disposed~~ (done);
- ~~dev tooling in the prod bundle~~ (done: dynamic import);
- ~~the stale MarbleSystem comment~~ (done);
- ~~the slider and thread drag paths allocating per move~~ (done: `intersectRayWithPlaneZInto`, one reused `pegPreview` command, and the slider move resolves the peg and tab once per grab);
- ~~`nextButton.object3D!`~~ (done);
- ~~the hook's `marbles().scored` (always false)~~ (done);
- ~~a CHUTE constants block~~ (done, with `FRICTION` and `GOAL.insetThickness`);
- ~~`DEFAULT_PITCH_HZ`~~ (done);
- ~~dead exports (`clampToRail`, `closestPointOnSegment`, `REST_SPEED`)~~ (done, plus the array-form `intersectRayWithPlaneZ`);
- ~~`loadIndex`'s fixed sleep becomes a state wait~~ (done; a frame stall now throws);
- ~~long test functions split~~ (done: none over 50 lines);
- ~~AIM_PLANE_Z reused (Onboarding, buildDiorama)~~ (done);
- ~~`pegPoints` lookup without allocation~~ (done: `pegPoint(id)` finds one peg; two allocations accepted, see Comments);
- ~~storage warns on a schema fallback~~ (done);
- ~~a type guard for the plane's native info~~ (done on main in e63d92d, `isNativePlane`).

**Blocked by:** 02

**Status:** done

## Comments

- **Oct 23, agent: done through week 8 ticket 01. Landed on main by fast-forward 189b9a7..f9b7c5e, local only, nothing pushed.** The refactor is one commit, `72b2c91 refactor: standards fixes from the bug bash (week 7 ticket 08)`: 91e558c rebased onto 189b9a7. Scope widened by the user on Oct 23 (Q45), and the follow-ups are separate commits:
  - the first review's fixes: `53e19c0` (frame stalls throw), `6e0eb96` (unused `SLIDER` import), `38a7a26` (slider move finds nothing per move), `3f04949` (`restartWithThread`) and `aba7a24` (warn spy restored in `afterEach`);
  - the three E2E scripts that also failed on main: `b3e5b07` (spool's refusal check), plus `ff0ff43` and `f2084a5` (the flat-view camera, so the whole settings face is on screen again for settings and guarded-reset);
  - `f9b7c5e` (xr-controls chute diagnostics; 5/5 on main and 5/5 on the branch).
- Regression on f9b7c5e (`.scratch/week7/regression.log`, gitignored):
  - typecheck exit 0; 237 unit tests;
  - `test:e2e` 24/24 scripts, 137 checks, 0 FAIL;
  - levels 24/24, levels slow 24/24, dailies 7/7;
  - `test:e2e:hands` 4/4 scripts, 20 checks;
  - xr-probe before and after the split: the same 15 keys and points.

  Details are in week 8 ticket 01's Comments.
- Accepted allocations, neither per move: `pegPoint` (src/features/threads/ThreadSystem.ts:100) spreads one object per lookup, and `pegPoints` (:94) maps the peg list once per thread release (:165) and once per rail settle (:270).
