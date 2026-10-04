# Draft: real-Quest test request

Where to post it: the competition Discord or forum's feedback or mentor channel. **The author posts this; nothing has been posted automatically.**

---

**Title:** Looking for a Quest owner to try a WebXR marble puzzle (5 minutes, no install)

Hi all! I'm entering **Threadbound** in the Gaming track: a seated, hands-first mixed-reality puzzle. You pinch-pull elastic threads between brass pegs on a little walnut diorama, then drop marbles. Every thread is a string, so each solution plays as a melody.

I don't own a headset, so everything so far has been built and tested in the IWER emulator. I'd be very grateful if someone could spend about five minutes on a real Quest.

**Link (Quest Browser, nothing to install):** https://sebaustin.github.io/threadbound/

**Please try:**
1. Enter XR and play level 1 with your hands: pinch a glowing peg, pull, and release on another peg; then pinch the chute.
2. Play two or three more levels. Rail pegs (World 3) slide when you pinch their tab.
3. Tap the gear on the front ledge: toggle Slow-mo, and try Raise/Lower and Nearer/Farther.
4. Tap the sun on the ledge for today's daily puzzle, then tap it again to go back.
5. If you have controllers handy, try one level with them too.

**What would help most:**
- **Smoothness:** does it ever stutter or drop frames, especially while marbles are falling?
- **Comfort:** is the diorama at a good height and distance while seated? Is anything out of reach?
- **Hands:** did pinches ever miss or go to the wrong peg? Did a tap on a button or the plaque fail?
- **Mixed reality:** did the diorama land sensibly on your real table?
- **Anything broken or confusing**, plus a screenshot or a short clip if it's easy.

Thank you! Happy to return the favour and test your entry in the emulator.

---

*Notes for the author (not part of the post):* the URL is the live GitHub Pages build of `main`. If a tester reports frame drops, the per-level frame cost in the level proof is the first place to look (`tests/e2e/levels.sh` prints calls, triangles and bodies). The busiest level is Three Cups at 57/80 draw calls in the browser view, which includes the browser-only welcome panel.
