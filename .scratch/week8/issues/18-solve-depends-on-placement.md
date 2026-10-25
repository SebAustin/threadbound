# 18: A stored solution's outcome depends on where the diorama is placed (P1, triaged Oct 25: first in batch 2)

**What was found:** ticket 05's video-kit work (Oct 23) found that the same hung solution solves or fails depending on the diorama's placement pose. A player whose table puts the diorama at that angle would see a solution that solves elsewhere end with the marbles at rest and the level unsolved. The level and daily proofs (`test:e2e:levels`, `test:e2e:dailies`) run only in the browser view's study pose (yaw 0), so nothing checks solvability anywhere else.

- **The sweep** (05's Comments, "Decisions beyond the ticket text"). Each daily board was opened by pool index (`dispatch({ type: 'daily', index })`, `DAILY_BASES` at src/levels/index.ts:63) and its solution hung (`hook.solve()`). Then the video shots' seated pose was entered and the solution dropped with `probe solve` (tests/e2e/xr-probe.e2e.mjs `SETUP_MODES.solve`):

  | Pool | Board | Browser view (study pose, yaw 0) | Passthrough, seated at the dining table (`placedOn: table`, yaw 1.5705 rad) |
  |---|---|---|---|
  | 0 | daily-w1-02 | complete | complete |
  | 1 | daily-w1-04 (Relay) | complete | **idle** |
  | 2 | daily-w1-06 | complete | complete |
  | 3 | daily-w2-02 | complete | **idle** |
  | 4 | daily-w2-04 | complete | complete |
  | 5 | daily-w3-02 | complete | complete |
  | 6 | daily-w3-04 | complete | **idle** |

  - Campaign w1-04 (Relay) also ends `idle` on the table at yaw 90 degrees.
  - daily-w1-04 solves in an unseated session (`placedOn: in front of you`, yaw 0), and fails again once seated at the table.
- **The seated pose** is the one tests/e2e/shot.sh enters for XR shots: `xr enter`, hand mode, headset `set-transform` to (-0.85, 1.15, 0.2), `look-at` (-1.5, 0.79, 0.2), then `xr exit` and `xr enter` so placement runs again from that pose, and `settle session`. The diorama then sits on the emulator's dining table at yaw 1.5705 rad. `probe`'s `yaw` and `placement` fields report the pose.
- **How the video kit avoids it today:** the `daily` shot uses pool 4, which solves on the table, and the `melody-book` shot drops Relay in the browser view before passthrough (tests/e2e/shot-setup.e2e.mjs:28-30). No shot is affected. The defect stands for players.

**Leads (not verified):**
- Physics is not exactly rotation-invariant: Havok's floating-point results differ when the same scene is turned 90 degrees. A solution that only just clears a peg, a thread end or a cup rim can flip either way. If that is the cause, the fix is in the levels (more margin, checked by the new proof below), not in placement.
- Something built in world axes rather than the diorama frame. The stall nudge already turns with the frame (`frame.anchor.quaternion`, src/features/marbles/MarbleSystem.ts:212). Spawn positions, collider orientation and any velocity set on release are worth checking.
- The `place` command (src/features/puzzle/PuzzleSystem.ts:81-84) takes an origin and a yaw. If it relocates the diorama in the browser view too, a browser-only repro, and a cheap proof over all 31 boards, is possible without XR.
- Ticket 07 changes the table pose (the frame lifted by `DIORAMA.slab`, a new near-edge inset). Re-run the sweep after 07 lands, because outcomes can shift again.

**Blocked by:** none

**Status:** done

Candidate boxes, for triage to keep, change or drop:
- [x] E2E (write first): every stored solution, the 24 campaign levels and the 7 dailies, solves at yaw 0 and at yaw pi/2 on a table pose, as it does in the study pose. Red today on w1-04, daily-w1-04, daily-w2-02 and daily-w3-04.
- [x] XR: in shot.sh's seated pose, `probe solve` completes on w1-04 and on daily pools 1, 3 and 6.
- [x] `test:e2e:levels`, `test:e2e:levels:slow` and `test:e2e:dailies` outcomes are unchanged.

**Effort:** S if the cause is a frame-versus-world bug in code; M if levels need more clearance (re-proven at both turns and both speeds).

## Comments

- **Oct 23, filed from ticket 05's review (finding 2).** The evidence is ticket 05's sweep, recorded in its Comments. Ticket 07's Comments point here.
- **Oct 24, from ticket 07's review (finding 6): the sweep, re-run at ticket 07's table pose** (frame lifted by `DIORAMA.slab`, ledge front on the table's near edge). Local run on main, log `.scratch/week8/logs/ticket18-sweep-after-07.log` (gitignored). Same method as above: each level opened (`load` for w1-04, `daily` by pool index), its solution hung, shot.sh's seated pose entered (`xr enter`, hand mode, headset at (-0.85, 1.15, 0.2) looking at (-1.5, 0.79, 0.2), `xr exit`, `xr enter`, `settle session`), then `probe solve`. Every run placed the diorama on the dining table: `placedOn: table`, 1 place, yaw 1.5705 rad.

  | Pool | Level | Before 07 (Oct 23) | After 07 (Oct 24) |
  |---|---|---|---|
  | - | w1-04 (Relay, campaign) | **idle** | **idle** |
  | 0 | daily-w1-02 | complete | complete (6 notes) |
  | 1 | daily-w1-04 (Relay) | **idle** | **idle** |
  | 2 | daily-w1-06 | complete | complete (14 notes) |
  | 3 | daily-w2-02 | **idle** | **idle** |
  | 4 | daily-w2-04 | complete | complete (2 notes) |
  | 5 | daily-w3-02 | complete | complete (6 notes) |
  | 6 | daily-w3-04 | **idle** | **idle** |

  - 07's pose change moves no outcome: the same four levels end `idle` at yaw 90 degrees, so the defect and the candidate boxes stand as written.
  - Ticket 05's `daily` shot (pool 4) still works at the new pose (`ticket18-daily-shot-after-07.log`). `zsh tests/e2e/shot.sh daily` staged it ("start recording": audio running, no emulator chrome, no Vite overlay). `zsh tests/e2e/take.sh daily` then solved it with the live chute pinch: the plaque read "Daily - streak 7", status `complete`, on daily-w2-04 at yaw 1.5705 rad.
- **Triage (user, Oct 25, Q48):** P1, first in batch 2, ahead of ticket 13, because 13 re-proves every level and should prove them at both turns. Keep all three candidate boxes.
  - Write the 0° and 90° table-pose proof first, and see it fail on w1-04 and daily pools 1, 3 and 6.
  - Find the cause before changing anything. A world-axis bug (spawn, collider orientation, release velocity, nudges) gets a code fix. Rounding sensitivity in the physics gets the smallest level-geometry change that gives the marginal contacts room, keeping each level's par and its idea.
  - Make the turned-pose proof a permanent part of `test:e2e:levels` and `test:e2e:dailies`, so tickets 13 and 14 re-prove at both turns.
- **Oct 25, agent: done, landed locally on main (not pushed).** One commit, `fix: stored solutions solve on a turned table (ticket 18)`. Logs are `.scratch/week8/logs/ticket18-*.log` (gitignored).
  - **The proof, written first** (tests/e2e/lib.mjs:96-146, levels.e2e.mjs:43 and :58-67, daily-proof.e2e.mjs:21-28). After the study-pose solve, each level and daily is stood on the emulator's dining table through passthrough's own `place` command (src/features/puzzle/PuzzleSystem.ts:88), reopened fresh there, and its solution dropped at yaw 0 and at the seated pose's own turn of about 90 degrees. The table centre (-1.242, 0.801, 0.2) and the 1.5705 rad turn are what shot.sh's seated pose produced (`frame()` read in XR: origin (-1.242, 0.801, 0.45), yaw 1.5704777). `test:e2e:levels` and `:slow` report `turned` per level; `test:e2e:dailies` adds two checks per daily. Both run in the browser view, so tickets 13 and 14 re-prove at both turns with no XR.
    - The first draft used exactly pi/2 and was red only on w1-04 and daily-w1-04 (`ticket18-red-levels.log` 23/1, `ticket18-red-dailies.log` 20/1). Exactly pi/2 is nearly as degenerate as 0 (cos is 6e-17): w2-02 and w3-04 solve there and fail at every other turn tried. The proof uses 1.5705; lib.mjs:96-103 says why.
    - **RED** at 1.5705 (`ticket18-red2-levels.log` 18 PASS / 6 FAIL, `ticket18-red2-dailies.log` 18 PASS / 3 FAIL): w1-04, w2-02, w3-04, w3-06, w4-03 and w4-06 fail at 90 degrees, and so do daily-w1-04, daily-w2-02 and daily-w3-04, exactly the sweep's pools 1, 3 and 6. Every level solves at 0 degrees. The sweep only looked at w1-04 among campaign levels, so the other five were new.
  - **The cause: rounding, not a world-axis bug.**
    - No world axis in code: spawn goes through `frame.localToWorld` (MarbleSystem.ts:159); every collider is posed by `frame.localToWorld`/`worldQuaternion` (buildDiorama.ts:65-66; threads ThreadSystem.ts:301); marbles spawn at rest (no release velocity); the nudge turns with the frame (MarbleSystem.ts:235). IWSDK creates each body from its object's pose with the shape in body space (node_modules/@iwsdk/core/dist/physics/physics-system.js:599, physics-runtime.js:75 and :160).
    - Browser repro (no XR): Relay fails at every turn tried, even 0.001 rad (12/12: 0.001, 0.01, 0.1, 0.785, 1.2, 1.4, 1.5, pi/2, pi, -pi/2), and solves when the diorama is only moved, by 0.5 m or 1 m (3/3). A geometry error of 0.001 rad cannot do that.
    - Per-frame traces show why. At yaw 0 every body sits in one world z plane, so a marble's channel depth stays exactly 0 until it reaches the cup: it balances on every thread's round crest. At any other turn, rounding puts it a hair off the crest. It rolls off sideways and runs pressed against the front or back glass (z = +-5 mm, the channel's limit), slowed by the glass.
    - The marginal contacts that then flip: on Relay, the slowed marble leaves d too slowly and hits the cup's right rim, and one perches on peg c by the right wall. On Over and Under and the three levels sharing its layout (w3-04, w3-06, w4-06), the azure's hop off r-s lands on peg r's crest (0.084 against a crest at 0.080) and rolls right into the amber cup. At yaw 0 it passed with about 0.1 m/s to spare. On Budget, marbles bounce back out over the cup's left rim.
    - Diagnostic only, reverted: frictionless front and back glass made Relay solve 9/9 and Budget 7/9, but Over and Under 0/8. Not adopted: triage's rule for rounding sensitivity is level geometry.
  - **The level changes** (par, thread limit and solution unchanged on all six):
    - w1-04 Relay: peg c 0.14 -> 0.15. c-d is steeper, so marbles leave d faster and clear the rim. Also tried: d.x 0.19 (9/9, but it puts peg d 2 cm from the chute's untouched fall: self-solve risk), a wider cup (5/6 slow) and c.x 0.475 (4/9).
    - w4-03 Budget: peg f 0.39 -> 0.38, so marbles drop nearer the cup's middle. The spool goes 0.23 -> 0.22 to keep it as tight (0.71 cm spare; it was 0.85). Also tried: f.y 0.16 (1 fail in 27), a wider cup (2 in 27) and combinations (2-3 fails in 18).
    - w2-02, w3-04, w3-06, w4-06: peg r 0.08 -> 0.11 and the amber chute 0.10 -> 0.135 (2.5 cm right of r, so amber still lands on r-s and rides it to its cup). The azure now strikes peg r's crest and keeps its leftward speed. Every r from 0.105 to 0.12 worked (9/9 each), and 0.11 is inside that window. w4-06's spool goes 0.63 -> 0.60 (0.76 cm spare; it was 0.84). Moving r alone, or changing q, p or s, failed even at the study pose: that path was a knife edge.
    - Robustness beyond the proof (exploration in `.tmp/`): each fixed level at the study pose plus 8 table turns (1.5705, 0.001, 0.785, pi, -pi/2, 1.2, 2.5, -0.5). Relay 27/27 over 3 runs and 6/6 slow; Budget 36/36 over 4 runs and 12/12 slow; the four shared-layout levels 18/18 each over 2 runs and 6/6 slow each.
    - Dailies follow their campaign levels: daily-w2-02 and daily-w3-04 spools are now 0.61 (were 0.64), computed by `dailyVariant`. tests/e2e/shot-setup.e2e.mjs loses its note that pools 1, 3 and 6 don't solve on the table. The `daily` shot keeps pool 4.
  - **Evidence on the final tree.** No Vite overlay (`no-overlay.e2e.mjs` true). The dev server stayed headless with browser automation (`browserCommandReady: true`).
    - `npm run typecheck` exit 0. `npm test`: 46 files, 611 tests passed.
    - `npm run test:e2e:levels` 24/24 and `test:e2e:levels:slow` 24/24, exit 0, every level `turned` true at 0 and 90 degrees. `test:e2e:dailies` 21/21 (7 spool solves, 14 turned), exit 0. Box 3: at the study pose every level still solves with 3 stars, the same marbles scored, the same thread count and no self-solve (compared with ticket11-final-*.log). Distinct-note counts vary by a note on some levels, as between earlier runs.
    - XR: new tests/e2e/xr-seated-solve.sh (with xr-seated-open.e2e.mjs) opens each level in the browser view, enters shot.sh's seated pose and runs `probe solve`. Before the level changes (stashed): 4 FAIL, all `idle` on the table at yaw 1.5704777 (`ticket18-xr-seated-red.log`). Final: 4 PASS, all `complete`, placedOn table, yaw 1.5704777: w1-04, daily:1, daily:3, daily:6 (`ticket18-xr-seated.log`). It is standalone, not in `test:e2e:hands`; hand input, xr-lib and xr-probe are unchanged, so that chain was not run.
    - `npm run test:e2e`: all 31 scripts, 236 PASS, 0 FAIL, exit 0 (touch-feedback's w4-06 snap from r onto u still makes r-s).
    - `NODE_ENV=production npm run build` exit 0. `npm run test:smoke`: 19 PASS, 0 FAIL, 5 NOTE.
  - **For the main session:** deploy with the next push. Ticket 13's level proofs now run the turned table poses as well.
