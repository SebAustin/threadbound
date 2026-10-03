# 09: Gaze-pinch research spike

Type: research

**What to build:** an answer to how IWSDK supports gaze targeting plus pinch (feature flag, input mode, interaction components) and how IWER emulates it for tests.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Findings appended under an Answer heading with source references

## Answer

**Enabling:** `world.xr.features.gazeTracking: true` in `iwsdk.config.json` (an optional session feature; `@iwsdk/core` `project/types.d.ts`). Registering the session feature is what registers `GazeSystem`; `world.gaze` tuning only overrides its defaults (cone 5 deg, 1-euro filter, dwell 0.15 s, `pointerTransformFollowsHand: true`). Devices without gaze simply do not grant the feature and keep hand/controller rays.

**How it works** (`@iwsdk/core` `gaze/gaze-system.js` header):
- Candidates are the same ray targets hand rays use (our `RayInteractable` pegs, chute, ledge buttons, threads).
- Selection is committed by either hand's pinch, per-hand exclusive until release.
- Hover and selection flow through ordinary ray pointer events, so our child-mesh `onPointer` listeners need no change.
- With `pointerTransformFollowsHand`, a gaze-started drag takes the pinching hand's ray as its pointer origin, so pinch-pull drags follow the hand.
- Hand/controller far rays are disabled while gaze is available; near touch/grab still wins (`suppressWhenDirectPointerActive`).

**Emulating in IWER** (`npx @iwsdk/cli xr --help`): a `gaze` device exists. `xr set-connected {device:"gaze"}`, aim with `xr look-at {device:"gaze", target}` (orientation only, origin follows the headset), and commit with a hand pinch: `xr set-select-value {device:"hand-right", value:1|0}`. During a drag, aim the pinching hand with `xr look-at {device:"hand-right"}`.

**Risk to check in ticket 10:** far hand rays are disabled while gaze is connected; the existing hand-pinch E2E must still pass (it may rely on rays).
