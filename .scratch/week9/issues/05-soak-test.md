# 05: Soak test: every level and daily in one page (P2)

**What to build:** week 9 spec item 4. One page, no reloads, plays all 24 campaign levels and the 7 dailies in order by their stored solutions, sampling memory and body counts, to catch leaks a per-level fresh page hides.
- **Script:** `tests/e2e/soak.sh`, one level per `browser run` lease (leases cap at 110 s), but no `fresh_page` between levels. Each step loads the next level through the command bus, drops its solution (as levels.e2e.mjs does), and records `performance.memory.usedJSHeapSize` (Chromium), the hook's physics body count, entity count and `renderer.info.memory` (geometries, textures).
- **Verdict:** every level solves; after the last, body and entity counts are back to a single level's; geometries and textures don't grow from level to level beyond the busiest level's own (a leak shows as a steady climb); heap growth over the run is recorded and stays under a stated bound (start with 50 MB and record the measured figure).

**Blocked by:** none

**Status:** ready-for-agent

- [ ] E2E: `zsh tests/e2e/soak.sh` passes: 31/31 solved, counts back to baseline, no geometry or texture climb; the per-level samples are printed as a table and the figures go in Comments.
- [ ] Any leak found is fixed test-first (a unit or E2E check that failed on the old code), and the levels suites rerun.

**Effort:** S (~0.5 day)

**Gaps closed:** none listed (week 9 spec item 4)

**Risks:**
- `performance.memory` is coarse and GC-timed; judge geometry and body counts, not heap alone.
- A run of 31 leases takes about 25 minutes; don't edit `src/` while it runs (HMR).

## Comments
