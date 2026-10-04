# 03: World 2 levels 5–6

**What to build:** two harder color-sorting puzzles that build on Fork through Mixed Up. Register them after w2-04, prove each solvable and not self-solving, and keep them within the draw-call budget.

**Blocked by:** 01

**Status:** done

- [x] Each proven 3x at normal speed and 1x in slow motion
- [x] Plaque shows World 2 - 6/6

## Comments
- **Untangle** (w2-05): a long preset ramp tips both colors into the amber cup, and a second preset under the azure chute sits starved beneath it. The fix is one snip plus one thread (par 1). There are no high pegs on the right, so azure can't be saved while the big ramp stays. It worked as first drafted.
- **Three Cups** (w2-06, finale): amber / amber / azure cups and three chutes; the preset sends everything left (right for amber, wrong for azure). The fix is to snip it and hang two ramps in opposite directions (par 2); the middle amber then falls straight into its cup.
- Design lessons from the failed drafts: (1) short threads are trampolines, and a long fall onto a short, steep thread throws the marble sideways; (2) a ramp ending at a mid-board cup overshoots, so end ramps at a side wall, which absorbs the momentum; (3) keep decoy pegs out of every chute's fall column.
- `probe.sh` snips *all* presets, so a solution that keeps a preset can blow the thread limit there. Use `levels.sh <index>`, which applies the stored solution.
- Each proven 3x at normal speed plus 1x in slow motion; plaque.e2e now asserts World 2 - 6/6. Cost: 49 and 56 calls.
