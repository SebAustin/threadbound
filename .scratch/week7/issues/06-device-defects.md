# 06: Device-facing defects from the bug bash (P0)

**What to build:** fix what a judge on a real Quest could hit, each test-first.
1. **Audio unlock in XR:** unlock on the XR session's select/squeeze events (user activation) and on the first DOM pointer gesture, so a session started from the browser's own UI still has sound. Check: synth state after an XR pinch on nothing.
2. **A better solve is recorded:** a drop resets the current stars, so re-solving at par after a worse solve updates the stars and the melody book. RED: a 2-thread solve then a 1-thread solve shows best 3.
3. **No stuck drags:** pointercancel, losing tracking mid-pinch and leaving the session end any drag (thread or rail). Check: disconnect the hand mid-pinch, reconnect, and a new pinch-pull works.
4. **Placement within reach:** only tables whose placement keeps everything within a seated 2 ft are accepted. Measure the reach after table placement in `xr-full-level`. Assess oriented tables (rotated planes).
5. **A drop survives entering passthrough:** placement waits for the drop to end, like Raise/Lower.
6. **Near pinch:** a permanent XR test for a pinch-and-move with the hand at the knob (verified to work in the emulator).

**Blocked by:** 02

**Status:** ready-for-agent
