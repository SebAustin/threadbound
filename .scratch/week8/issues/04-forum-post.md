# 04: Rewrite the real-Quest test request (P1)

**What to build:** a rewrite of `docs/forum-post.md` that asks a Quest owner for specific evidence and sets the terms for any clip they share. This ticket only changes docs: no code or tests. It supersedes week 6 ticket 09 (`.scratch/week6/issues/09-forum-post-draft.md`, still ready-for-human), whose draft has sat unposted since Oct 4. Leave that file as history.
- **Keep:** the title idea (a Quest owner, a WebXR marble puzzle, no install) and the link `https://sebaustin.github.io/threadbound/` (docs/forum-post.md:7, :13). Drop "5 minutes": the new asks take 10-15.
- **Say plainly** in the opening paragraph that the game was built without a headset, entirely in the IWER emulator (Meta's browser-based WebXR emulator), so this would be its first run on a real Quest (ADR 0002).
- **Replace the vague "What would help most" list** (docs/forum-post.md:22-27) with seven numbered asks that a tester can answer by number:
  1. A stopwatch time from tapping the URL to the first melody (the level 1 solve).
  2. An OVR Metrics Tool screenshot with the fps overlay, taken during a drop on Three Cups. It is level 12 and the heaviest frame in the campaign (src/levels/world2/06-three-cups.json:3, tests/e2e/xr-probe.e2e.mjs:11-13). If they don't get that far, a drop on the furthest level they reach.
  3. Every permission prompt they saw, in order, and what they chose, especially the spatial-data prompt (the build requests hands, anchors, planes and meshes at iwsdk.config.json:15-21). If they denied it, did the diorama still appear?
  4. Did the diorama land on their real table, and was it still there after a recenter (hold the Meta button)? Today placement searches once, for 3 s (src/features/placement/PlacementSystem.ts:15), and nothing listens for a recenter.
  5. How reliable pinching was: misses or wrong pegs, plus a deliberately long or slow pinch on Enter XR (public/ui/welcome.uikitml:71, which fires on `click` at src/panel.ts:50).
  6. If they have the hardware: one level with the left hand only, and one with controllers. Every XR script drives only the right hand (tests/e2e/xr-lib.sh:29, :46-60).
  7. A 10-20 s clip of a drop on a real table.
- **Framing and permission paragraph**, directly above ask 7. If you share a clip:
  - frame only the table and the diorama: no people, faces, mirrors, screens, posters or brands;
  - keep the mic off (app audio still records);
  - say whether the entrant may use the clip, free of charge, in the competition video. Only a written yes in a DM counts.

  The paragraph also says up front that the entry rules allow no credit by name or handle.
- **Try-it steps in current copy:** "pinch" for pegs and the chute, "press" for ledge buttons. Never "gear" or "poke": docs/forum-post.md:18 says "Tap the gear". Name the settings button by where it sits, between Restart and the sun (src/features/diorama/buildDiorama.ts:320-322), so the post stays true after the rename. Use the labels exactly as they appear in public/ui/hud.uikitml:173-186.
- **Guest link placeholder,** as one bracketed line: `[Enable once week 8 ticket 09's deployed guest-play check passes] Played on this headset before? https://sebaustin.github.io/threadbound/?fresh=1 starts from level 1 and leaves your save alone.`
- **Author notes** (below the post, not part of it), replacing "the live GitHub Pages build of `main`" (docs/forum-post.md:33):
  - record the deployed commit and the date when posting (`gh run list --workflow deploy.yml -L 1`);
  - keep DM permission screenshots outside the repo;
  - never name or credit a tester anywhere in the entry;
  - use a clip only after a frame-by-frame check (spec, "Video");
  - keep the existing pointer to `tests/e2e/levels.sh` for frame cost.

**Blocked by:** none

**Status:** ready-for-agent (then ready-for-human: the user posts it)

- [ ] Check: the post keeps the title idea and the link, says it was built only in the emulator, numbers all seven asks, puts the framing and permission paragraph above the clip ask, and carries the bracketed `?fresh=1` line.
- [ ] Check: every label the post names exists in the live build: `Enter XR` (public/ui/welcome.uikitml:71); `Slow-mo`, `Raise`, `Lower`, `Nearer` and `Farther` (public/ui/hud.uikitml:173-186); `Three Cups` (src/levels/world2/06-three-cups.json:3).
- [ ] Check: `grep -inwE 'gear|poke[ds]?|poking|HUD|menu|budget|board|win|clear|goals?|we|our' docs/forum-post.md` prints nothing.
- [ ] Check: the `?fresh=1` line stays bracketed until ticket 09's "XR (deployed build)" box passes (09 pushes, then runs it on the live URL). The user then adds it as an edit to the post, or drops the brackets before posting if 09 has already shipped.
- [ ] Human: the user posts it in the competition Discord or forum channel of their choice, then adds the post link, the date and the deployed commit to Comments.
- [ ] Human: each tester reply is summarized in Comments against the seven asks, with no names or handles. Defects feed week 9 (.scratch/week9/spec.md:5). No clip enters the repo or the video edit before both the written yes and the frame-by-frame check.

**Effort:** S (~0.5 days, plus waiting on testers)

**Gaps closed:** #2 (the request half; the evidence only arrives when testers reply; asks from gap-analysis.md:138), follow-up "The forum post asks testers for clips but grants no rights and gives no framing rules" (gap-analysis-followups.md:298-319)

**Risks:**
- Three Cups is level 12, and Prev/Next never goes past the first unsolved level (src/lib/levelSelect.ts:14-16). A new tester has to solve 11 levels before reaching it, which is why ask 2 falls back to the furthest level reached.
- Reports describe a moving target. Until the freeze, every push to `main` redeploys within about a minute (gap-analysis-followups.md:54). Other week 8 tickets also change exactly what is asked about: Enter XR, placement, and the features behind the spatial-data prompt (ADR 0006). A report is only usable if the commit it tested is recorded.
- `.scratch/` is public. A pasted reply, handle or DM screenshot would publish a tester's identity, and crediting a tester anywhere in the entry breaks the rule against naming anyone but entrants.

## Comments
