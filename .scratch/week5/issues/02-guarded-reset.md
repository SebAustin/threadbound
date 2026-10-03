# 02: Guarded progress reset

**What to build:** a reset control on the settings face that needs two pokes within a short window; it wipes stars and unlocks and brings back the tutorial.

**Blocked by:** 01

**Status:** done

- [x] One poke arms (plaque shows "Poke again to reset"), timeout disarms
- [x] Second poke resets: level 1, no stars, ghost hand back (E2E)

## Comments
Pure two-poke guard (4 s window) unit-tested; real-click E2E: one poke arms, two wipe and bring the ghost hand back.
