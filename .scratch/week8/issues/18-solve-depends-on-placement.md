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

**Status:** ready-for-agent

Candidate boxes, for triage to keep, change or drop:
- [ ] E2E (write first): every stored solution, the 24 campaign levels and the 7 dailies, solves at yaw 0 and at yaw pi/2 on a table pose, as it does in the study pose. Red today on w1-04, daily-w1-04, daily-w2-02 and daily-w3-04.
- [ ] XR: in shot.sh's seated pose, `probe solve` completes on w1-04 and on daily pools 1, 3 and 6.
- [ ] `test:e2e:levels`, `test:e2e:levels:slow` and `test:e2e:dailies` outcomes are unchanged.

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
