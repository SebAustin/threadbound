# 04: World 3 levels 5–6

**What to build:** two harder rail puzzles that build on Slide through Crossfade. Register them after w3-04, prove each solvable and not self-solving, and keep them within the draw-call budget.

**Blocked by:** 01

**Status:** done

- [x] Each proven 3x at normal speed and 1x in slow motion
- [x] Plaque shows World 3 - 6/6; 24 campaign levels

## Comments
- **Hinge** (w3-05): one vertical-rail peg is shared by two preset threads. Low, it makes a valley that pools both colors mid-board; slid up, a roof that splits them to their cups. A pure-slide solve (0 player threads, par 1). No thread-only alternative exists: one thread pushes one way, and neither chute falls into its cup unaided.
- **Rail Yard** (w3-06, finale): Crossfade's proven crossing geometry with both ramp ends on rails (x-rail `q` lengthens the high ramp, y-rail `s` lowers a preset that starts tilted the wrong way), plus one thread. Probed: each partial solution (only `s`; `s` + thread without `q`; `q` + thread without `s`) scores 2/4.
- Fixes during design: Hinge's azure marbles wedged between peg `r` and the side wall (a 1.9 cm gap is under a 2.6 cm marble), so `r` moved inward. The schema rejected `q`'s rail grazing `s`, so `s`'s rail moved out to x 0.44.
- Each proven 3x at normal speed plus 1x in slow motion. Cost: 49 and 53 calls. The plaque checks every world's finale reads 6/6, and a unit test pins the 6/6/6/6 campaign.
