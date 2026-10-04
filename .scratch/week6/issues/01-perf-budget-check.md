# 01: Draw-call budget in the level proof

**What to build:** a pure budget check (render stats + body count against `PERF_BUDGET` gives a list of breaches), and the level proof that records each level's stats and fails on any breach. Measure all current levels and note the busiest.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] Unit: within budget gives no breaches; each over-limit metric is named
- [ ] `levels.sh` prints stats per level and fails on a breach
- [ ] Busiest level and its numbers recorded in Comments
