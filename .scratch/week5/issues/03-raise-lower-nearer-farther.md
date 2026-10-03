# 03: Raise, lower, nearer, farther

**What to build:** settings buttons move the diorama in fixed steps within a comfortable range, one-handed; the adjustment persists and the level still plays.

**Blocked by:** 01

**Status:** done

- [x] Offset clamping unit-tested
- [x] Poking Raise changes the frame's height by one step; the level is still solvable (E2E)
- [x] Offset survives a reload and applies on top of AR table placement

## Comments
- Offsets are whole steps (2.5 cm up, 4 cm toward the player along the diorama's facing), clamped; settings saved before offsets existed still load.
- Moving the diorama rebuilds its colliders; the layout is restored with pure restoreSteps (rail positions, snipped presets, player threads). levelBuilt carries `relocated`, so the settings face stays open while adjusting.
- Plaque now grows upward from a bottom anchor (it used to hang over the playfield when taller), and the settings face is wide rather than tall so its controls stay low.
- Slow-motion E2E now compares fall distance after 200 ms (median of three) instead of stopwatch time, which frame pacing made noisy.
