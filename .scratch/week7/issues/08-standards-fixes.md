# 08: Standards fixes from the bug bash

**What to build:** the HARD items and the cheap judgement items from the Standards report:
- ~~glyph geometries disposed~~ (done);
- ~~dev tooling in the prod bundle~~ (done: dynamic import);
- the stale MarbleSystem comment;
- the slider and thread drag paths allocating per move;
- `nextButton.object3D!`;
- the hook's `marbles().scored` (always false);
- a CHUTE constants block;
- `DEFAULT_PITCH_HZ`;
- dead exports (`clampToRail`, `closestPointOnSegment`, `REST_SPEED`);
- `loadIndex`'s fixed sleep becomes a state wait;
- long test functions split;
- AIM_PLANE_Z reused (Onboarding, buildDiorama);
- `pegPoints` lookup without allocation;
- storage warns on a schema fallback;
- a type guard for the plane's native info.

**Blocked by:** 02

**Status:** ready-for-agent
