# Draft: real-Quest test request

Where to post it: the competition Discord or forum's feedback or mentor channel. **The author posts this; nothing has been posted automatically.** The short version for a Start program mentor is `docs/mentor-message.md`.

---

**Title:** Looking for a Quest owner to try a WebXR marble puzzle (10-15 minutes, no install)

Hi all! I'm entering **Threadbound** in the Gaming track. I built it without a headset, entirely in the IWER emulator (Meta's browser-based WebXR emulator), so your run would be its first on a real Quest. It's a seated mixed-reality puzzle played with your hands: you pinch-pull elastic threads between brass pegs on a small walnut diorama, then drop marbles that bounce off the threads into cups. Every thread is a string tuned by its length, so the bounces play notes.

**Link (Quest Browser, nothing to install):** https://sebaustin.github.io/threadbound/

[Enable once week 8 ticket 09's deployed guest-play check passes] Played on this headset before? https://sebaustin.github.io/threadbound/?fresh=1 starts from level 1 and leaves your save alone.

**Try it:**
1. Open the link in Quest Browser and pinch **Enter XR**.
2. Level 1: pinch a glowing peg, pull, and release on another peg to stretch a thread. Then pinch the chute to drop the marbles.
3. After a solve, press the arrow that appears at the right end of the ledge (the diorama's front lip) for the next level. In World 3, rail pegs slide when you pinch the brass tab hanging off them.
4. Press the button between Restart (the leftmost ledge button) and the sun. The plaque on top of the diorama flips to its settings side: pinch **Slow-mo**, then try **Raise**, **Lower**, **Nearer** and **Farther**. Press the same button again to flip it back.
5. Press the sun for today's daily puzzle, then press it again to return.

Ledge buttons take a pinch from a distance or a fingertip press.

**What would help most** (please answer by number, and skip any you can't do; the date you played helps too, since the build still gets fixes):
1. **Time to the first melody:** a stopwatch time from tapping the link to the first melody, the notes level 1 plays when you solve it.
2. **Frame rate:** an OVR Metrics Tool screenshot with the fps overlay on, taken during a drop on **Three Cups**. It's level 12 and the heaviest frame in the game. If you don't get that far, a drop on the furthest level you reach.
3. **Permission prompts:** every prompt you saw, in order, and what you chose, especially the spatial-data prompt (the game asks for room data to find your table). If you denied it, did the diorama still appear?
4. **Placement:** did the diorama land on your real table, and was it still there after a recenter (hold the Meta button)?
5. **Pinching:** how reliable was it? Any misses, or pinches that went to the wrong peg? Please also try one deliberately long or slow pinch on **Enter XR**: did it start the session?
6. **Other hands, if you have the hardware:** one level with your left hand only, and one with controllers.

**If you share a clip:** the entry rules allow no credit by name or handle, so I can't credit you anywhere in the entry. Please frame only the table and the diorama: no people, faces, mirrors, screens, posters or brands. Keep the mic off (the app's own audio still records). And say whether I may use the clip, free of charge, in my competition video. Only a written yes in a DM counts.

7. **A clip:** 10-20 seconds of a drop on your real table.

Thank you! Happy to return the favour and test your entry in the emulator.

---

*Notes for the author (not part of the post):*
- When posting, record the deployed commit and the date in ticket 04's Comments, with the post link. `gh run list --workflow deploy.yml -L 1` shows the commit the live URL serves. Until the freeze, every push to `main` redeploys within about a minute, so a report is only usable against the commit it tested.
- The `?fresh=1` line stays bracketed until ticket 09's "XR (deployed build)" box passes. Then drop the brackets before posting, or add the line to the post as an edit.
- Keep DM permission screenshots outside the repo: `.scratch/` is public.
- Never name or credit a tester anywhere in the entry: the video, README, Devpost text, in-game, or `.scratch/`. Summarize replies against the seven asks, with no names or handles.
- Use a clip only after a written yes in a DM and a frame-by-frame check (spec, "Video"). Blur or crop anything branded, any artwork or photos, and any person, reflections included.
- If a tester reports frame drops, the per-level frame cost in the level proof is the first place to look (`tests/e2e/levels.sh` prints calls, triangles and bodies). The busiest level is Three Cups at 57/80 draw calls in the browser view, which includes the browser-only welcome panel.
