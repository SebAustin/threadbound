# 09: Decisions for the user (scope and design)

**Status:** done

Raised by the bug bash; each changes the design or the scope, so the user decides:
1. **Star balance:** most levels allow only one thread over par, so 3 stars is nearly automatic and 1 star is impossible. Option: allow par + 2 threads everywhere, so the stars reward economy. (It makes levels a little easier to brute-force.)
2. **Accessibility Forward award:** the criteria name "voice alternatives, eyes-only navigation, high-contrast modes". Options: (a) a high-contrast toggle on the settings face (small); (b) gaze-dwell to press ledge buttons and plaque controls without a pinch (medium); (c) voice commands ("drop", "restart", "next") via the Web Speech API, if Quest Browser supports it (needs a device check).
3. **Spatial anchors:** IWSDK's XRAnchor would keep the diorama on the table across a recenter, but our physics bodies live in world space, so anchoring needs a rework of how the diorama is built (medium-large). Currently listed as future work.
4. **Field of view:** at the default spot the player looks about 41 degrees down to the cups and 25 degrees up to the plaque. The diorama could tilt toward the player a little (visual-only; physics stays upright), or sit slightly higher.

## Comments

- **Oct 23 (week 8 ticket 06): all four decided in the Oct 22 grilling; see .scratch/week8/spec.md.** #1 star balance: ADR 0005 (a star each for the solve, par or fewer threads, and the first drop; the thread limit becomes par + 1). #2 Accessibility Forward: a high-contrast toggle and visual captions, no gaze-dwell or voice. #3 spatial anchors: ADR 0006 (the room places the diorama; anchors stay future work). #4 field of view: the hint line and thread count move to the ledge, and the gaps between controls widen to 12 mm.
