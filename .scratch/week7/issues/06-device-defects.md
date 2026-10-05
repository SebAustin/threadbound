# 06: Device-facing defects from the bug bash (P0)

**What to build:** fix what a judge on a real Quest could hit, each test-first.
1. **Audio unlock in XR:** unlock on the XR session's select/squeeze events (user activation) and on the first DOM pointer gesture, so a session started from the browser's own UI still has sound. Check: synth state after an XR pinch on nothing.
2. **A better solve is recorded:** a drop resets the current stars, so re-solving at par after a worse solve updates the stars and the melody book. RED: a 2-thread solve then a 1-thread solve shows best 3.
3. **No stuck drags:** pointercancel, losing tracking mid-pinch and leaving the session end any drag (thread or rail). Check: disconnect the hand mid-pinch, reconnect, and a new pinch-pull works.
4. **Placement within reach:** only tables whose placement keeps everything within a seated 2 ft are accepted. Measure the reach after table placement in `xr-full-level`. Assess oriented tables (rotated planes).
5. **A drop survives entering passthrough:** placement waits for the drop to end, like Raise/Lower.
6. **Near pinch:** a permanent XR test for a pinch-and-move with the hand at the knob (verified to work in the emulator).

**Blocked by:** 02

**Status:** done

## Comments
1. **Audio:** RED was confirmed: after an XR pinch at nothing, audio stayed `locked`. A new `AudioUnlockSystem` unlocks on the session's `selectstart`/`squeezestart` (WebXR user activation) and on the first DOM pointerdown (the Enter XR button), following session changes. GREEN: `running`. Checked in `xr-full-level.sh`.
2. **A better solve is recorded:** RED was confirmed (the second drop kept 2 stars). `drop()` now resets stars and melody. `better-solve.e2e` (in the chain): 2 stars, then 3.
3. **Stuck drags:** not reproducible. IWSDK's MultiPointer cancels and then sends `pointerup` when tracking is lost, which ends the drag. `pointercancel` is still handled in the thread and slider drags as insurance, and the tracking-loss scenario is a permanent check in `hand-pinch.sh`.
4. **Placement:**
   - A table's near edge must be within 45 cm (it was 1.0 m), so a far table falls back to floating within reach. The unit test was RED, then GREEN.
   - **Rotated tables:** candidates now carry the plane's pose (world position, yaw) and the WebXR polygon's plane-space bounds. Placement works in the plane's own frame, and the base's four corners (facing the player) must rest on the table, nudged inward if not. A table too small for the base is skipped. Unit tests cover 0, 25 and 40 degree tables and a too-small table. A fit loop that re-aimed the yaw failed to converge; the facing is now fixed once, then a single exact shift is applied.
   - In the emulator room it still lands on the table, with reach 0.569 m from the actual head pose (checked in `xr-full-level.sh`).
5. **A drop survives placement:** RED was confirmed (the drop ended at idle). `place`/`resetPlacement` now defer the rebuild until the drop ends (`relocatePending`, cleared by any build). Checked in raise-lower.e2e.
6. **Near pinch:** a hand 3 cm in front of the knob, pinching and moving, makes the thread. A permanent check in `hand-pinch.sh`.
- Not done: spatial anchors (decision in ticket 09).
