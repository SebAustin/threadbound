# Week 6: content, polish, performance

Status: ready-for-agent

## Problem Statement

Worlds 2 and 3 stop at four levels each while Worlds 1 and 4 have six, so the campaign feels uneven and short. The **melody** a solve produces is heard once and lost. Many events are silent (a marble landing in a **cup**, pressing a ledge button, grabbing a **peg**), which hurts players who rely on sound. The diorama still looks like a prototype, both over passthrough and in the virtual study. Nobody has measured how many draw calls the busiest level costs, and the competition is judged on a Quest at a steady frame rate. And we have never run on a real headset.

## Solution

Two new levels each for Worlds 2 and 3 bring the campaign to 24 (6/6/6/6). Solved melodies are saved in progress, and poking a lit star on the **plaque** replays that level's melody. A sound pass gives every player-visible event an audio cue. An art pass refines materials and lighting for both backdrops. A performance pass measures every level against the existing budget, instances repeated meshes if any level is over it, and adds a draw-call assertion to the level proof. We draft a forum post asking for a real-Quest check, which the user posts.

## User Stories

1. As a puzzle fan, I want six levels in every world, so that the campaign feels complete and even.
2. As a player, I want the new World 2 levels to deepen color sorting, so that the world builds to a climax.
3. As a player, I want the new World 3 levels to deepen rail sliding, so that the world builds to a climax.
4. As a player, I want every new level solvable and never solving itself, so that each one is a fair puzzle.
5. As a player, I want the melody my solve made to be kept, so that each level has "its" tune.
6. As a player, I want to replay a level's melody by poking its stars, so that I can enjoy what I made.
7. As a player who leans on sound, I want a chime when a marble lands in the right cup, so that I know it scored without looking.
8. As a player who leans on sound, I want a different, soft sound when a marble lands in the wrong cup, so that I can tell the two apart.
9. As a player, I want a click when I press a ledge button or a plaque control, so that I know the press registered.
10. As a player, I want a soft cue when I pinch a peg, so that I know I am holding it.
11. As a player, I want a quiet ambience in the virtual study, so that the room feels alive.
12. As a player, I want sound to stay pleasant (no clipping, no drone), so that I keep the audio on.
13. As a player in passthrough, I want the diorama to look like a crafted wooden object on my table, so that it belongs in my room.
14. As a player in the virtual study, I want warm lighting and readable contrast, so that it feels cozy, not flat.
15. As a Quest player, I want a steady frame rate on every level, so that the game is comfortable.
16. As the developer, I want the level proof to fail when a level exceeds the draw-call budget, so that performance regressions are caught.
17. As the developer, I want someone with a real Quest to try the live build, so that we catch device-only problems before the deadline.

## Implementation Decisions

- **Levels:** two new World 2 levels and two new World 3 levels, registered after each world's existing four. They are designed with the probe and proven by the existing level proof (solvable 3x at normal speed, plus once in slow motion). Daily-pool indices are by level id, so they are unaffected.
- **Melody book:**
  - Progress gains a per-level saved melody (a short list of note pitches, capped at the existing maximum replay length). It is written on the first solve and overwritten by a better or equal-star solve.
  - Older saves are accepted, and the new field defaults to empty.
  - The plaque stars become pokeable. On a level with a saved melody, poking them dispatches a "play melody" command, which replays it through the existing string synth.
  - **The melody book is the first thing cut if the week runs late.**
- **Sound pass:** one pure cue table that maps a game event (cup-correct, cup-wrong, button, peg-grab, thread-refused, settle, ambience) to synth parameters (pitch from the existing pentatonic scale, gain, envelope). Each event has exactly one cue. A master limiter keeps the total gain in check. Ambience plays only in the virtual study (not over passthrough).
- **Art pass:**
  - Material and lighting refinements stay inside the existing procedural build: wood grain or tint variation, brass pegs, a soft contact shadow, a warmer study light.
  - A new or changed model goes through the build-model specialist; scene and lighting changes go through compose-scene.
  - The daily button gets a real icon (a sun glyph) instead of a placeholder.
- **Performance pass:**
  - Measure draw calls, triangles and physics bodies per level from the runtime render stats, against the `PERF_BUDGET` constants.
  - Instance repeated meshes (pegs, marbles, glyphs) only if some level is over budget.
  - The level proof records the stats and fails on any breach.
- **Real-device check:** a short forum or mentor post asking for a Quest test of the live URL, with what to try and what to report. It is drafted in the repo; the user posts it.

## Testing Decisions

- The same three seams. Tests observe state, progress and the plaque model through the dev hook, never ECS internals or meshes.
- Unit tests:
  - the progress schema accepts old saves and stores, caps and overwrites melodies;
  - the cue table (every event has a cue; pitches are in the scale; gains stay under the limiter ceiling);
  - the budget check (a pure function: stats against budget gives the list of breaches).
- E2E:
  - every level, including the four new ones, is proven by `levels.sh` at normal and slow speed;
  - after a solve, the saved melody is in progress, and poking the stars replays it (observed through the hook's replay state);
  - the level proof asserts the draw-call budget on every level;
  - sound cues are observed as a dev-only event log (cue name per event), since audio output can't be heard in automation.
- Visual checks:
  - one runtime screenshot per backdrop (passthrough-style and the virtual study) before and after the art pass, compared at 600 px;
  - one screenshot of the daily icon.

## Out of Scope

Exporting or sharing melodies, user-editable melodies, new mechanics, haptics (no headset to tune them), posting to forums ourselves.

## Further Notes

If the week runs short, cut in this order: melody book, then gaze-pinch polish, then World 4 levels 5–6 (these are already done, so in practice only the melody book is at risk).
