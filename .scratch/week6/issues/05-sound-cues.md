# 05: Sound pass, one cue per event

**What to build:** a pure cue table mapping each game event (cup-correct, cup-wrong, button, peg-grab, thread-refused, settle, ambience) to synth parameters, wired into the systems that raise those events, with a master limiter and study-only ambience. Record every played cue in a dev-only cue log, readable from the hook.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] Unit: every event has a cue; pitches are in the scale; gains are under the ceiling
- [ ] E2E: a solve logs cup-correct per scored marble; a mis-sort logs cup-wrong; a button press logs button
- [ ] Existing refusal and settle sounds routed through the table
