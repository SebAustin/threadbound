# 02: Bug bash, full-codebase review

**What to build:** two-axis review sub-agents (Standards and Spec) over the whole codebase, with the approved plan and the official Devpost criteria as the spec. File the findings as tickets and fix them test-first.

**Blocked by:** 01

**Status:** done

## Comments
- Standards: 11 HARD and 4 judgement findings, which became ticket 08. Two were fixed immediately: shared glyph geometries were disposed on every level teardown, and dev tooling (`PerfProbeSystem`) shipped in the production bundle. The bundle now has 0 hits for physicsBodies, __threadbound, meshBreakdown and frameStats.
- Spec (judge impact): device-facing defects went to ticket 06, revisiting levels, the ending and teaching went to ticket 07, and design/scope decisions went to ticket 09 for the user.
- Near pinch at the knob (the ghost hand's gesture): verified in the emulator. A hand 3 cm and 8 cm in front of the knob, pinching and moving, makes the thread. The residual device risk (shoulder-based ray direction at very close range) is in the forum-post questions.
