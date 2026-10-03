# 01: Settings face on the plaque, with slow motion

**What to build:** a gear button on the ledge flips the plaque to a settings face; a slow-motion toggle there makes marbles fall visibly slower, persists across reloads, and keeps every solution valid.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Shared never-throwing storage helper; progress uses it (prefactor)
- [x] Settings schema + defaults unit-tested
- [x] Real mouse click on the gear shows the settings face; again returns to the level face
- [x] Slow motion on: same marble takes measurably longer to reach the floor (E2E)
- [x] Sample of level proofs pass with slow motion on
- [x] Setting survives a reload

## Comments
- Slow motion was first built by scaling gravity (and then damping). Crossfade still failed: Havok's low-speed contact handling uses absolute thresholds, so gravity scaling is not exact. Replaced with true time dilation: a SimulationClockSystem steps physics with delta x 2/3; the simulation is the identical fixed-step sequence, played slower. All 14 levels pass in slow motion.
- Relay in slow motion exposed a nudge bug: the sideways nudge had a fixed direction per marble, pushing a marble balanced on a wall-side peg into the wall forever. Nudges now go toward the middle first, then alternate.
- New scripts: settings.e2e in test:e2e; test:e2e:levels:slow.
