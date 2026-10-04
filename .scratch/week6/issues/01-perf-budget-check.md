# 01: Draw-call budget in the level proof

**What to build:** a pure budget check (render stats + body count against `PERF_BUDGET` gives a list of breaches), and the level proof that records each level's stats and fails on any breach. Measure all current levels and note the busiest.

**Blocked by:** none

**Status:** done

- [x] Unit: within budget gives no breaches; each over-limit metric is named
- [x] `levels.sh` prints stats per level and fails on a breach
- [x] Busiest level and its numbers recorded in Comments

## Comments
- Baseline (busiest frame: solution hung, every marble in flight), from `.scratch/week6/perf-baseline.log`. Busiest: **w4-06 Last Thread, 61 calls / 7.5k tris / 22 bodies**. Then w3-04 Crossfade 57, w2-04 Mixed Up and w4-05 Split Spool 56. Quietest: w1-01 First Thread 39. Triangles and bodies have huge headroom (8%, 55%); draw calls are the only tight metric (76%).
- Physics bodies are counted by a dev-only `PerfProbeSystem` query (installed by the test hook), not by reading ELICS internals.
