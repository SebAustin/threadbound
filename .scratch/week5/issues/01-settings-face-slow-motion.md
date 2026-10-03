# 01: Settings face on the plaque, with slow motion

**What to build:** a gear button on the ledge flips the plaque to a settings face; a slow-motion toggle there makes marbles fall visibly slower, persists across reloads, and keeps every solution valid.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Shared never-throwing storage helper; progress uses it (prefactor)
- [ ] Settings schema + defaults unit-tested
- [ ] Real mouse click on the gear shows the settings face; again returns to the level face
- [ ] Slow motion on: same marble takes measurably longer to reach the floor (E2E)
- [ ] Sample of level proofs pass with slow motion on
- [ ] Setting survives a reload
