# 06: Week 4 code-review findings

**What to build:** fixes for the two-axis review of 6a64f40..5a8105d (Standards + Spec sub-agents).

**Blocked by:** 01, 02, 03, 04, 05

**Status:** done

## Fixed
- [x] A drop where every marble misses never ended (status stuck on dropping, ghost stuck on "watch"). Drops now end once every marble has rested; RED-first missed-drop E2E.
- [x] Encore failed its proof one run in three: a marble balanced on peg d's crest (physics holds the unstable equilibrium). Marbles perched above the floor outside a cup now get a small sideways nudge; Encore 5/5. Pure rest/stall/drop-over logic unit-tested.
- [x] Melody played through a pause (setTimeout); now stepped in the paused marble system. Ghost clock pauses too; a page that loads hidden starts paused.
- [x] Ghost pose allocated every frame; now written into a reused object (unit-tested).
- [x] Target-peg rings blinked at the loop seam; they now glow steadily with a slow pulse.
- [x] Hidden welcome panel could still catch rays; it now opts out of pointer hit-testing.
- [x] Unknown level ids in a save could skip the tutorial; only real levels count.
- [x] Plaque after an AR-style placement covered by E2E.
- [x] Test hook resolves the plaque by scene node id.
- [x] Player-thread counting shared (one function, four callers); plaque re-renders only when its inputs change (rail drags no longer rebuild it per frame).
- [x] Named ghost constants; ghost resources disposed; dead field removed.
- [x] E2E timer waits replaced by condition waits (intentional sleeps kept: frozen-marble window, probe tools).
- [x] hud.e2e renamed plaque.e2e (glossary).

## Deferred
- Input is not gated while paused (a drop requested during blur would wait for resume). Low risk: the runtime delivers almost no input while blurred.
- The ghost demonstrates `solution[0]`; level 1 has no presets or rails today. Revisit if level 1 changes.
- Hook-only `userData` (plaque model, ghost step) stays: it is how the dev hook observes rendered state without touching ECS internals.
