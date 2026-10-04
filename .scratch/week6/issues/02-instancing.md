# 02: Instance repeated meshes (only if over budget)

**What to build:** if ticket 01 finds a level over budget, instance pegs, marbles and glyphs so it fits. If every level is comfortably under budget (headroom of at least 25%), close this as not needed and record the numbers.

**Blocked by:** 01

**Status:** done

- [x] Every level within budget, proven by the level proof

## Comments
- Measured with `tests/e2e/perf-split.e2e.mjs` (diagnostic, not in the suite), which groups visible meshes by owner through the dev hook's `meshBreakdown()`.
- Findings on w4-06 (61 calls): pegs 14 (pin + knob, same brass), the virtual room 7 (table top + 4 legs, same wood), and about 10 camera-parented planes from the browser-only welcome panel, which is hidden in XR.
- Merged instead of instanced: one shared peg geometry (pin + knob) and one table mesh, via `mergeParts` (Three's `mergeGeometries` isn't re-exported by `@iwsdk/core`). Instancing pegs would complicate rail slides for little gain.
- Result: the busiest frame is w4-06 at **52/80** (35% headroom; about 42 in XR without the welcome panel). The shared peg geometry also stops allocating a new `CylinderGeometry` per peg on every level load. Hover glow now lights the whole peg, not just the knob.
- 20/20 levels, pointer, slider and XR hand-pinch tests pass. Baselines are in `.scratch/week6/perf-baseline.log` (before) and `perf-merged.log` (after).
