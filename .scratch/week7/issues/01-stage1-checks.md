# 01: Stage 1 bar as automated checks

**What to build:** prove the judged basics:
- **Hands only:** one full level played with hand pinches in an XR session (thread by pinch-pull, drop by pinch on the chute, solved).
- **Seated reach:** every interactive element within 2 ft (0.61 m) of the seated head, on every level, at the default and the extreme offsets.
- **First five minutes:** a cold start (fresh save) to the first melody in under 60 s with real input through the onboarding.
- **Frame cost in XR:** draw calls measured during an active session.
- **Scene understanding:** in passthrough the diorama lands on a detected table plane, and the fallback is documented.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] `xr-full-level.sh` passes
- [ ] `reach.e2e` passes across all 24 levels
- [ ] `first-melody.e2e` passes (time recorded)
- [ ] XR draw calls recorded (busiest level)
- [ ] Placement on a detected plane verified in the emulator's room
