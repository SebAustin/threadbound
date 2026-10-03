# 04: Spool rule

**What to build:** a level can declare a total thread length; threads that would overspend it are refused with an audible cue, and the plaque shows the remaining spool.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Thread rule: fits / overspends / presets excluded, unit-tested
- [ ] Schema refuses a solution longer than the spool
- [ ] E2E: overspend refused, spool readout tracks add and snip
