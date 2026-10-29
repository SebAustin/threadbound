# 04: More XR coverage: rail tabs by hand, Next, controllers, left hand, input switches (P2)

**What to build:** week 9 spec item 3: emulated XR scripts for the paths the week 8 scripts don't drive, each sourced from tests/e2e/xr-lib.sh and added to `test:e2e:hands`.
- **Rail-tab drag by hand** (gap #23's open half): pinch a rail peg's tab and slide it along a horizontal rail (w3-01) and a vertical one (w3-02), by hand ray and up close; the peg follows within its limits, and threads attached to it follow too.
- **Next by hand:** after a solve, pinch Next on the ledge and land on the next level (the press acts on release, so the old ledge is disposed safely).
- **Controller mode:** `xr set-input-mode` to controllers; trigger-pull a thread from peg to peg, the chute, and a ledge button.
- **Left-hand play:** level 1 solved with the left hand only (xr-full-level.sh uses the right).
- **Switching input mid-drag:** hands to controllers (and back) while a pull is held leaves no stuck drag and no thread made by accident (the "lost hand" check in hand-pinch.sh is the model).

**Blocked by:** none

**Status:** ready-for-agent

- [ ] XR: `tests/e2e/xr-rail.sh`: both rails, ray and near, peg and attached thread follow, limits hold.
- [ ] XR: `xr-controls.sh` (or a new script) proves Next by hand after a solve.
- [ ] XR: `tests/e2e/xr-input-modes.sh`: controller-mode thread, chute and button; left-hand level 1; a switch mid-drag leaves `drags` at 0 and no new thread.
- [ ] Any defect found is fixed test-first, with the failing run quoted in Comments.
- [ ] `npm run test:e2e:hands` passes with the new scripts.

**Effort:** M (~1 day)

**Gaps closed:** #23 (the XR rail-tab drag half; week 8 ticket 13 closed the skip half)

**Risks:**
- `xr set-transform` only works during a session, and AR sessions re-place the diorama (wait for placement before measuring; see the dev gotchas memory).
- Hand input sends no `click`; the scripts must use the real pinch helpers, never the test hook's dispatch.

## Comments
