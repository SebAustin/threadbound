# 10: Gaze and pinch play

**What to build:** with gaze input, looking at a peg and pinching starts a thread; looking at another and releasing completes it; the chute and ledge buttons work the same way.

**Blocked by:** 09

**Status:** done

- [x] E2E through IWER's gaze mode: thread made and level solved
- [x] Existing hand and mouse E2E unaffected

## Comments
- `gazeTracking` enabled in iwsdk.config.json. `gaze-pinch.sh` runs on IWER's Quest Pro preset (the only one granting gaze-tracking), asserts gaze is granted, then: gaze + pinch-pull makes a thread; gaze at the chute + pinch starts a drop.
- The first "passing" run was the hand ray in disguise (Quest 3 has no eye tracking): the test now fails fast if gaze is not granted.
- Pursuing the chute failure exposed ticket 11 (XR taps never worked) and a drag-aim bias (rays intersected the back panel, not the knob face, so low hands landed ~3.5 cm past their target). Both fixed.
