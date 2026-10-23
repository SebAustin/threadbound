# 14: The daily, signposts and return-visit hints (P1)

**What to build:**
- **The daily's own names** (gap 27): `dailyVariant` (src/lib/dailyVariant.ts:11-14) takes a name instead of keeping its campaign level's, and `DAILY_BASES` (src/levels/index.ts:63) becomes `{ base, name }` pairs. Ids stay `daily-<base>`, so saves and dailies.sh don't change. The draft names ship as written unless the user renames them; a later rename only changes data, and no box waits on it: w1-02 Hairpin Turn, w1-04 Pass It On, w1-06 Curtain Call, w2-02 Crossed Wires, w2-04 Odd Socks, w3-02 Going Up, w3-04 Key Change. Each is ASCII, at most 14 characters (as long as "Over and Under", the longest title measured on one plaque line), not a campaign name, and never "challenge".
- **Rename w4-03:** its title (src/levels/world4/03-budget.json:3) is a word on Spool's _Avoid_ list. It becomes "Thrift" (the user's choice, Oct 23). The id `w4-03` stays, so saves, the melody book and the level proofs don't change. Rename the file to `03-thrift.json`, with its import (src/levels/index.ts:23, :49). Ticket 17's drift list drops this item.
- **Only mechanics the player has reached** (gap 18): new pure `src/lib/dailyPool.ts`:
  - `levelMechanics(level)`: 'snip' (preset threads), 'color' (a sorting-color chute or cup), 'rail' (a rail peg). The tight spool isn't gated, because every daily has one; its readout and refusal line explain it.
  - `reachedMechanics(levels, best)`: the union over solved campaign levels (best > 0). That matches the teaching levels (w1-05, w2-01, w3-01), and a skipped teaching level stays unreached.
  - `dailyPick(day, pool, reached)`: a `DAILY_LEVELS` index, taking `dailyIndex(day, eligible.length)` (src/lib/daily.ts:25-28) among the eligible entries. With everything reached it equals `dailyIndex(day, 7)`, so finished players keep today's rotation.

  `openDaily` (src/features/puzzle/PuzzleSystem.ts:96-101) uses it when no index is given. `{ type: 'daily', index }` still picks a pool entry directly.
- **The sun pulses while today's daily is unsolved** (gaps 26, 45):
  - Pure `sunPulses({ inDaily, hasSolvedAny, solvedToday })` and `sunPulseScale(seconds)` go in new `src/lib/signposts.ts`. The sun pulses outside a daily, from the first campaign solve (so it never competes with the ghost hand), until `dailyStarsOn(progress, today())` (src/lib/progress.ts:80-82) is above 0.
  - A new `SunPulseSystem` (src/features/controls/, registered after ControlsSystem at src/index.ts:39) finds the sun with a `ControlButton` query, since every build replaces the ledge buttons. It works out the pulse again on each store change.
  - In `update()`, with no allocation, it scales only the sun icon (src/features/diorama/buildDiorama.ts:236, under `iconMount` :259-262). It touches the transform only, because `MATERIALS.walnut` is shared by every icon.
  - It mirrors `pulsing` in the button group's `userData`, and the hook's `button()` (src/features/debug/testHook.ts:143-145) returns it.
- **The hint line** (on the ledge since ticket 12). This ticket owns the whole order of `hintFor` (src/lib/hud.ts:66-70): refusal, missed drop, onboarding, level hint, no table, ending, first-solve stars, daily ready, then the daily's way back.
  - The no-table line ("No table found - run Space Setup") is ticket 07's. If 07 hasn't merged, add its optional `noTable` input and text here, and 07 then only wires the condition.
  - HudSystem.render (src/features/hud/HudSystem.ts:81-97) feeds the new `HudInput` fields. `lastDropMissed`, `firstSolve`, `returnVisit` and ticket 13's drop counts also go in `changed()` (:102-116), or the line never updates.
  - Every new line fits ticket 12's `LEDGE_HINT_MAX_CHARS` (48): the missed line is 46 characters, the skip pointer 35, daily ready 35 at a three-digit streak, the ending 41.
  - **Missed drop:** "Missed - pinch a thread to snip it, or restart". It shows while the level is idle after a drop that ended unsolved, with a thread (presets count) on the diorama. New `PuzzleState.lastDropMissed` is set where an unsolved drop ends (src/features/marbles/MarbleSystem.ts:220). A drop, a build, a thread added or snipped, or a slide resets it, next to the existing `refusal: null` writes (src/features/threads/ThreadSystem.ts:310, :320, src/features/sliders/SliderSystem.ts:133, PuzzleSystem.ts:134). It outranks onboarding, so level 1 stops saying "Now pinch the chute" after a wrong thread (gap 49). It is the accessibility ticket's "ledge line explaining a failed drop"; that ticket adds no second line.
  - **Skip pointer:** while ticket 13's `skipOffered` holds, the missed slot reads "Stuck? Skip is on the settings face" instead (same thread condition). Skip lives only on the flipped settings face, so without this a stuck player who never opens it never learns of it (user story 9).
  - **First solve:** "Pinch the stars to hear it again", while a campaign level is complete after its first solve and the book holds its tune. `PuzzleState.firstSolve` is set in the update that records the solve, when the previous best was 0 (PuzzleSystem.ts:151-165). It resets on a build or a drop, and `relocate` (:176-183) carries it like `status`.
  - **Daily ready:** "Today's daily is ready - streak N", or "Today's daily is ready" at streak 0. It shows on a campaign level while today's daily is unsolved, until the first drop or until the daily opens. It needs a session that loaded a save with a campaign solve: `PuzzleState.returnVisit`, set in `init` (PuzzleSystem.ts:45-46) and never saved. ASCII " - " replaces the spec's middle dot, because the panel font has no typographic glyphs (hud.ts:72, levelSchema.ts:31).
  - "Poke the sun to return" and "All N solved - poke the sun for a daily" (hud.ts:58, :60) become "Press the sun ...": ledge buttons are pressed, and ticket 06 left these lines here.
- **A refusal goes when a drop starts** (a live bug: "Those pegs are already joined" stayed beside three stars). Add `refusal: null` to the drop's update at MarbleSystem.ts:118.
- **Melody book play-all** (gap 28):
  - Fill ticket 12's hidden `set-play-all` control; this ticket changes no settings-face layout or ids. It reads "Play all melodies (N)" or "Stop", and hides while the book is empty. It is bound with `onTap`, like the other plaque controls (src/features/hud/settingsFace.ts:29-33).
  - Pure `bookPlaylist(levels, melodies, restSeconds)` goes in new `src/lib/melodyBook.ts`. In campaign order, skipping levels with no entry, it joins ticket 10's `replaySchedule` for each entry, keeping each item's `cue` and `note`, and each next tune starts 0.8 s after the previous tune's cadence. Each tune keeps its cadence, so the book plays every tune exactly as its stars replay it, and the cadence marks where one tune ends. It has no timing of its own: timed entries keep their real offsets and old bare-array entries keep the 0.22 s step, both from `replaySchedule`.
  - New bus commands `playBook` and `stopBook`. MarbleSystem walks the playlist through the stars' replay path (`playMelody`/`replayDue`, :315-328, as ticket 10 rewrites them). A drop or a build stops it, and it doesn't start during a drop.

**Blocked by:** 10, 12, 13

**Status:** ready-for-agent

- [ ] Unit: tests/unit/hud.test.ts, written first:
  - the priority order above, one case per adjacent pair, including level hint over no table and no table over the ending;
  - the missed line needs a thread on the diorama (with none, onboarding shows);
  - with `skipOffered`, the missed slot reads the skip pointer, and with no thread onboarding still shows;
  - daily ready at streak 2 and at streak 0, and never inside a daily;
  - the press wording (the expectations at :78 and :94-96 change);
  - every line `hintFor` returns is ASCII. The missed line, the skip pointer, first solve, daily ready at streak 999 and both press lines join ticket 12's `LEDGE_HINT_MAX_CHARS` test.
- [ ] Unit: new tests/unit/dailyPool.test.ts:
  - mechanics of Snip, Fork and Slide, and none for Short Spool;
  - nothing is reached on `{}`, and snip plus color are reached after w1-01 to w2-01;
  - a fresh save picks only w1-02 or w1-04 on each of 28 days;
  - with everything reached, `dailyPick` equals `dailyIndex(day, 7)`;
  - at least two pool entries need no mechanic.
- [ ] Unit: tests/unit/dailyVariant.test.ts:12-13 expects the given name. Daily names are unique, ASCII, at most 14 characters, never a campaign name, and never "challenge". tests/unit/levels.test.ts: w4-03 keeps its id under its new name, and no campaign or daily name contains "budget" or "challenge".
- [ ] Unit: new tests/unit/signposts.test.ts. `sunPulses` is off before a campaign solve and on after one, off inside a daily, and off once today's daily has stars. `sunPulseScale` stays in [1, 1.15] and repeats.
- [ ] Unit: new tests/unit/melodyBook.test.ts. The playlist equals each entry's `replaySchedule` in campaign order, `cue` and `note` included, offset so each tune starts 0.8 s after the previous tune's cadence. Each tune ends on its cadence, levels with no entry are skipped, a bare-array entry keeps the 0.22 s step, and an empty book gives an empty playlist.
- [ ] E2E: extend tests/e2e/missed-drop.e2e.mjs:
  - the empty case keeps its checks, and its hint isn't the missed line;
  - on level 1 with thread b-c (the marbles fall past it), a real chute click gives the missed line once idle, not "Now pinch the chute...". A real click that snips b-c removes the line;
  - a-b, then a duplicate a-b, shows "Those pegs are already joined". The refusal is gone once the drop starts, and the solve shows "Pinch the stars to hear it again".
- [ ] E2E: extend ticket 13's tests/e2e/skip.e2e.mjs: with thread b-c on level 1, the line after the second miss is the missed line, and after the third it reads "Stuck? Skip is on the settings face", before the settings face is ever opened.
- [ ] E2E: new tests/e2e/daily-signs.e2e.mjs, with real clicks:
  - on a fresh save the sun doesn't pulse on level 1, and it pulses once level 1 is solved;
  - clicking it opens daily-w1-02 or daily-w1-04, not titled with a campaign name. Inside it the sun doesn't pulse, and the hint is "Press the sun to return";
  - after the daily is solved and the player clicks back, the sun stops pulsing.

  Update daily.e2e.mjs:31 to the press wording. level-select.e2e.mjs:46 no longer reads the ending once ticket 09 rewrites it, and 09's finished-campaign.e2e and 13's skip-resume.e2e.mjs match only `All ${n} solved`, so none of them needs a wording change here.
- [ ] E2E: new tests/e2e/return-visit.e2e.mjs:
  - seed a save: w1-01 to w1-03 solved, streak `{ lastDay: yesterday, count: 2 }`, dailyBest yesterday;
  - reload in-frame (first-melody.e2e.mjs:21-26). Expect "Today's daily is ready - streak 2" and a pulsing sun, and after a drop the line is gone;
  - a save whose daily was solved today shows neither.
- [ ] E2E: extend tests/e2e/melody-book.e2e.mjs. Solve w1-01 and w1-02, open the settings face, and `clickCanvas` on `set-play-all`: the melody cues equal the two entries' note counts summed. In ticket 10's `cueTrace()`, each tune ends on its cadence (C5 E5 G5), and the second tune starts at least 0.8 s after it. Stop mid-play ends the notes, and after `resetProgress` the toggle is hidden.
- [ ] XR: tests/e2e/xr-controls.sh pinches `set-play-all`, with a new `playAll` entry in xr-probe.e2e.mjs's `PROBE_FIELDS` (ticket 01's table). Drained melody cues must be > 0, like the stars step (:40-48).
- [ ] Check: daily-signs and return-visit join `test:e2e` (package.json:18). Typecheck, `npm test`, `test:e2e`, `test:e2e:hands` and `test:e2e:dailies` pass.

**Effort:** L (~2.5 days)

**Gaps closed:** #18, #26, #27 (names; mirrored variants are week 9, the VO line is ticket 06's), #28, #45, #49, and follow-up "A refusal line stays on the plaque after the level is solved" (gap-analysis-followups.md:86); also the w4-03 title from ticket 17's term drift

**Risks:**
- **UIKit:** hide `set-play-all` rather than emptying its text, and keep ticket 12's placeholder text in its span: a UIKit span with no text never lays out. Any note added to hud.uikitml's `<style>` goes in `<!-- -->`, or the plaque fails to load.
- **Line length:** the 46-character missed line is within `LEDGE_HINT_MAX_CHARS` but near it. Check with UIKit layout, as ticket 12 does for the 47-character onboarding line, that it wraps to at most two ledge lines; don't judge it from a downscaled screenshot.
- **Changing pool:** the pool grows mid-day when a teaching level is first solved, so the daily's level can change on an unsolved day. A solved day stays solved, because stars belong to the day (progress.ts:22-25). E2E asserts membership in the eligible set, never one level, because the pick follows the real date.
- **The sun's button:** Restart disposes every ledge button, so the pulse must find the sun through its query on every build. It scales only the icon, leaving the cap to the hover and press feedback (gap 13).

## Comments
