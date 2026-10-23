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
- **A mentor message** (Q43): `docs/mentor-message.md`, a short direct message (at most about 120 words) to a Start program mentor. It asks for the same five-minute check (asks 1-4 only), with the same framing and permission terms, and links to the forum post for the full list. The entrant has no Quest, so testers are the only real-device evidence: the post and the message both go out this week.

**Blocked by:** none. Do this ticket first, so reports have time to arrive before the Nov 10 feature freeze.

**Status:** ready-for-human (the user posts the forum request and sends the mentor message)

- [x] Check: the post keeps the title idea and the link, says it was built only in the emulator, numbers all seven asks, puts the framing and permission paragraph above the clip ask, and carries the bracketed `?fresh=1` line.
- [x] Check: every label the post names exists in the live build: `Enter XR` (public/ui/welcome.uikitml:71); `Slow-mo`, `Raise`, `Lower`, `Nearer` and `Farther` (public/ui/hud.uikitml:173-186); `Three Cups` (src/levels/world2/06-three-cups.json:3).
- [x] Check: `grep -inwE 'gear|poke[ds]?|poking|HUD|menu|budget|board|win|clear|goals?|we|our' docs/forum-post.md` prints nothing.
- [x] Check: the `?fresh=1` line stays bracketed until ticket 09's "XR (deployed build)" box passes (09 pushes, then runs it on the live URL). The user then adds it as an edit to the post, or drops the brackets before posting if 09 has already shipped.
- [x] Check: `docs/mentor-message.md` passes the same grep, keeps the framing and permission terms, and links to the post.
- [ ] Human: the user posts it in the competition Discord or forum channel of their choice, sends the mentor message, then adds the post link, the date and the deployed commit to Comments.
- [ ] Human: each tester reply is summarized in Comments against the seven asks, with no names or handles. Defects feed week 9 (.scratch/week9/spec.md:5). No clip enters the repo or the video edit before both the written yes and the frame-by-frame check.

**Effort:** S (~0.5 days, plus waiting on testers)

**Gaps closed:** #2 (the request half; the evidence only arrives when testers reply; asks from gap-analysis.md:138), follow-up "The forum post asks testers for clips but grants no rights and gives no framing rules" (gap-analysis-followups.md:298-319)

**Risks:**
- Three Cups is level 12, and Prev/Next never goes past the first unsolved level (src/lib/levelSelect.ts:14-16). A new tester has to solve 11 levels before reaching it, which is why ask 2 falls back to the furthest level reached.
- Reports describe a moving target. Until the freeze, every push to `main` redeploys within about a minute (gap-analysis-followups.md:54). Other week 8 tickets also change exactly what is asked about: Enter XR, placement, and the features behind the spatial-data prompt (ADR 0006). A report is only usable if the commit it tested is recorded.
- `.scratch/` is public. A pasted reply, handle or DM screenshot would publish a tester's identity, and crediting a tester anywhere in the entry breaks the rule against naming anyone but entrants.

## Comments

- **Oct 23, agent: docs written; nothing posted or sent.**
  - `docs/forum-post.md` rewritten:
    - Title keeps the idea and says "10-15 minutes, no install" ("5 minutes" dropped).
    - The opening paragraph says it was built without a headset, entirely in the IWER emulator (Meta's browser-based WebXR emulator), so a tester's run would be its first on a real Quest.
    - The link is unchanged, and the bracketed `?fresh=1` line is verbatim from this ticket.
    - Five try-it steps:
      - "pinch" for Enter XR, pegs, the chute, the rail tab and the settings-face controls;
      - "press" for ledge buttons, which take a pinch from a distance or a fingertip press;
      - the settings button is named as "the button between Restart (the leftmost ledge button) and the sun".
    - Seven numbered asks. The framing and permission paragraph sits directly above ask 7 and opens with the no-credit rule.
    - One addition: the asks' lead-in asks testers for the date they played, so a report can be matched to a deployed commit.
    - The author notes cover the deployed commit and date (`gh run list --workflow deploy.yml -L 1`), when to drop the `?fresh=1` brackets, DM screenshots kept outside the repo, never naming or crediting a tester, a written yes plus a frame-by-frame check before any clip is used, and the existing `tests/e2e/levels.sh` frame-cost pointer.
  - `docs/mentor-message.md` (new): 120 words by `wc -w` on the message body, counting list numbers, the URL and placeholders.
    - Asks 1-4 only. Ask 2 drops Three Cups, because five minutes can't reach level 12, and asks for a drop on any level.
    - Same no-credit, framing, mic-off and written-DM-yes terms.
    - The post link is a `[forum post link]` placeholder: the post doesn't exist until the user posts it. The header says to fill it in, along with `[name]`.
  - `.scratch/week6/issues/09-forum-post-draft.md` is left as history.
- **Check results (Oct 23):**
  - Box 1, by script:
    - the title matches `Quest owner.*WebXR marble puzzle.*no install`;
    - the link appears twice (main link and guest line);
    - "entirely in the IWER emulator" is in paragraph 1;
    - the asks are numbered 1-7 in order;
    - the framing paragraph is the only block between ask 6 and ask 7, and it contains every framing and permission term;
    - the bracketed `?fresh=1` line matches this ticket's text exactly;
    - no "5 minutes" or "five minutes" remains.
  - Box 2: each label found at the cited lines, namely `Enter XR` (public/ui/welcome.uikitml:71), `Slow-mo`, `Raise`, `Lower`, `Nearer` and `Farther` (public/ui/hud.uikitml:173-186), and `"name": "Three Cups"` (src/levels/world2/06-three-cups.json:3). Three Cups is level 12: World 1 has 6 levels and it is World 2's 6th. "Restart" is the leftmost ledge button's action, not a text label (`ControlActions.Restart`, src/features/diorama/buildDiorama.ts:320). The post names no other label.
  - Box 3: `grep -inwE 'gear|poke[ds]?|poking|HUD|menu|budget|board|win|clear|goals?|we|our' docs/forum-post.md` prints nothing (exit 1).
  - Box 4: the line is still bracketed (docs/forum-post.md:13). Ticket 09's "XR (deployed build)" box is unticked (09-guest-play.md:52), so it stays bracketed. Dropping the brackets, or adding the line as an edit, is the user's step, and the author notes say so.
  - Box 5: the same grep on `docs/mentor-message.md` prints nothing (exit 1). The message has the no-credit rule, "table and diorama only", the full no-people/faces/mirrors/screens/posters/brands list, mic off, "free of charge", "competition video" and "Only a written yes in a DM counts". It links the post through the placeholder and names `docs/forum-post.md` in its header.
- No code or tests changed, so typecheck and the test suites were not run. The dev server was not started.
