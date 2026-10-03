# 04: Spool rule

**What to build:** a level can declare a total thread length; threads that would overspend it are refused with an audible cue, and the plaque shows the remaining spool.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Thread rule: fits / overspends / presets excluded, unit-tested
- [x] Schema refuses a solution longer than the spool
- [x] E2E: overspend refused, spool readout tracks add and snip

## Comments
- Every refused thread (duplicate, limit, spool) now plays a low G2 thunk: an audio cue for each event.
- Rail-slid peg positions shared via positionAlong (schema check and solutionSteps).
- The E2E runs on w4-01 "Short Spool", delivered here as the first ticket-05 level.
