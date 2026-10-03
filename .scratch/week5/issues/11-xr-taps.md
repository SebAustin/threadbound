# 11: Taps work for every XR input (found while doing 10)

**What to build:** in a headset, pinching (hand ray or gaze), poking or clicking the chute, the ledge buttons, a thread, and the plaque's settings controls all work. Before this, only the mouse could.

**Blocked by:** None

**Status:** done

- [x] RED first: `tests/e2e/xr-controls.sh` pinched chute, Restart, a thread, the gear and a plaque toggle with an emulated hand: all failed
- [x] ECS taps use IWSDK `Pressed` queries (chute, ledge buttons, thread snip); UIKit controls use a pointerdown/up `onTap`
- [x] Snip and ledge buttons act on release, a frame later: disposing an entity a hand still holds swallowed that hand's next pinch (reproduced: snip then gear failed; second pinch worked)
- [x] Drag rays intersect the knob plane (AIM_PLANE_Z) instead of the back panel
- [x] hand-pinch.sh asserts instead of printing; XR scripts share tests/e2e/xr-lib.sh; `npm run test:e2e:hands` runs hand, controls and gaze

## Comments
Root cause: 'click' listeners. pmndrs only synthesises click for the mouse here; every E2E so far drove taps with the mouse, so the gap stayed invisible until the gaze work aimed real XR input at the chute.
