# 02: Finger-strum: touch a thread and it sounds (P1)

**What to build:** week 9 spec item 1. A fingertip crossing a thread inside the marble channel plays that thread's **root** (CONTEXT.md **Root**). It is ticketed because week 8's melody ticket landed on Oct 24 (25538ef), before the Nov 4 cut-off (.scratch/week9/spec.md:11).
- **Pure logic first:** a new `src/lib/strum.ts` decides, from a fingertip's last and current positions in the diorama frame (x, y, z) and a thread's ends, whether the fingertip crossed the thread this frame: the segment between the two fingertip points passes within the thread's hit radius of the thread, inside the channel's depth (|z| <= `DIORAMA.channelHalfDepth`). It never fires twice for one crossing (a re-arm once the fingertip is clear of the thread by a margin), and never while that hand is pinching or holding a drag.
- **System:** a `StrumSystem` (registered after ThreadSystem) reads both hands' index-tip joints through IWSDK's input (`this.player` / `this.input.xr`, see src/AGENTS.md "XR input"), turns them into the diorama frame with `puzzleStore.frame`, and checks every thread from a query (never a tracked array). It allocates nothing in `update()`: scratch vectors are class fields, as in MarbleSystem. A strum plays the thread's root through `stringSynth.play` with a new `strum` cue in `src/lib/soundCues.ts` (positional, like `bounce`), sets the thread's `energy` so it vibrates, and is **not** recorded in the melody or the melody book.
- **Never during play:** no strum while a drop is running (`status === 'dropping'`), so a solve's melody stays the marbles' own.
- **CONTEXT.md:** add **Strum**: "A fingertip crossing a thread sounds its root. Not part of the melody." with _Avoid_: pluck (the marbles pluck).
- **Copy:** ticket 07 says "touch a string and it sounds", never "the loop depends on hands" (spec :11).

**Blocked by:** none

**Status:** ready-for-agent

- [ ] Unit: `tests/unit/strum.test.ts` written first: a crossing inside the channel fires once; moving along the thread without crossing doesn't; outside the channel depth doesn't; a pinching or dragging hand doesn't; it re-arms only after the fingertip is clear; every result is the same for a thread given either way round (threads are undirected).
- [ ] Unit: the `strum` cue is in the pentatonic scale's table (`soundCues.test.ts`) and positional (`cueSpace.test.ts`).
- [ ] XR: new `tests/e2e/xr-strum.sh` (sourced from xr-lib.sh): with a thread on w1-01, an emulated hand sweeps its index tip across it in the channel: one `strum` cue at the thread's root, a vibrating thread, an unchanged melody book; a sweep while pinching plays nothing; a sweep during a drop plays nothing. Added to `test:e2e:hands`.
- [ ] E2E: the whole `test:e2e` chain and `test:e2e:hands` (hand input changed) pass. Levels aren't affected (no physics change); say so in Comments.
- [ ] Standards: `update()` allocation-free and reads signals with `.peek()`; every subscription in `cleanupFuncs`.

**Effort:** M (~1 day)

**Gaps closed:** none listed; it answers the "depends on hands" overclaim with a hand-only feature the copy can name honestly.

**Risks:**
- IWER's emulated hands move in steps; a fast sweep can jump over a thread between frames, which is why the check is segment-against-segment, not point-in-radius.
- A fingertip resting near the glass would strum forever if the re-arm margin is too small; the unit test pins it.
- The ghost hand's fingertips are not a hand: they must never strum.

## Comments
