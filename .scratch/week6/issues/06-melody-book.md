# 06: Melody book (first to cut)

**What to build:** save each solved level's melody in progress, and make the plaque stars pokeable so they replay it.

**Blocked by:** none

**Status:** done

- [x] Unit: old saves load; the melody is capped; a better or equal solve overwrites it
- [x] E2E: after a solve the melody is saved; poking the stars (real pointer) replays it; on a level with no melody, poking does nothing
- [x] XR check: a pinch on the stars replays it (onTap)

## Comments
- Progress gains `melodies` (per campaign level, at most `MELODY_NOTES_MAX` = 16, zod default `{}` for old saves). An equal or better solve overwrites the tune; a worse one keeps it. Dailies don't write to the book.
- `recordCompletion(progress, solve: Solve)` now takes one object; six positional parameters would have been a data clump.
- MarbleSystem publishes the drop's melody in the same store update that marks the level complete, so the solve and its tune are recorded together. `playMelody` replays the saved tune unless a drop is running.
- The plaque stars (`#hud-stars`, padded for a bigger target) use `onTap`, so poke, pinch and click all work. Melody notes play as the `melody` cue, so E2E counts them.
- Trap: a `/* */` comment inside a UIKitML style rule broke the whole plaque (parse error, then the level failed to load). Moved it to an HTML comment.
- E2E `melody-book` (4 checks, in the chain), plus XR: pinching the stars replays 6/6 notes.
