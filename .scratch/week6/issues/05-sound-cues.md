# 05: Sound pass, one cue per event

**What to build:** a pure cue table mapping each game event (cup-correct, cup-wrong, button, peg-grab, thread-refused, settle, ambience) to synth parameters, wired into the systems that raise those events, with a master limiter and study-only ambience. Record every played cue in a dev-only cue log, readable from the hook.

**Blocked by:** none

**Status:** done

- [x] Unit: every event has a cue; pitches are in the scale; gains are under the ceiling
- [x] E2E: a solve logs cup-correct per scored marble; a mis-sort logs cup-wrong; a button press logs button
- [x] Existing refusal and settle sounds routed through the table

## Comments
- **Bug found:** `stringSynth.pluck` only played pitches pre-rendered from the pentatonic scale, so the 98 Hz refusal thunk had **never played** (it failed silently). The synth now pre-renders every cue pitch and renders any other pitch on first use.
- The cue table (`lib/soundCues.ts`) covers cupCorrect 880, cupWrong 110, button 587.33, pegGrab 659.25 (soft), refused 98, settle 392, snip 261.63, and ambience as an E-G-A-G phrase every 6 s at 0.1. Failure cues sit below the scale, so they never sound like part of a melody.
- The master gain feeds a DynamicsCompressor limiter (-6 dB threshold, 12:1).
- New audible events: cup correct and wrong (the wrong thud plays once per marble, via `Marble.rejected`), peg and tab grab, and plaque settings controls (they were silent before).
- Ambience plays only while the virtual study is visible and the game isn't paused, so never over passthrough.
- E2E `sound-cues` (9 checks, in the chain) reads a dev-only cue log, because automation can't hear audio and audio needs a gesture to unlock.
- Review decisions: the cue "envelope" is the string synth's fixed Karplus-Strong decay; the table sets pitch and gain only. Failure cues (refused 98 Hz, cupWrong 110 Hz) are deliberately below the scale, so they never read as music. After the review, thread creation and bounces are cues too (`thread`, `bounce`, with per-event pitch and gain), so every sound goes through the table and the cue log.
