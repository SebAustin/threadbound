# Week 5: reasons to come back, and accessibility

Status: ready-for-agent

## Problem Statement

After the campaign hooks a player, nothing invites them back tomorrow. Players who are one-handed, slower to react, seated at an awkward table height, or using gaze-and-pinch glasses have no way to adapt the experience. And the last "world" the pitch promises (Tension) does not exist yet.

## Solution

A settings face on the **plaque**, opened from a gear button on the ledge, offers slow motion, diorama height/distance adjustments, and a guarded progress reset, all one-handed and persisted. World 4 introduces the **spool**: a total length of thread per level, so tight short threads become a resource. A **daily puzzle**, picked by date from a pool of challenge levels, comes with a streak shown on the plaque. Gaze-and-pinch input lets glasses-style devices play hands-free of controllers.

## User Stories

1. As a player who reacts slowly, I want a slow-motion toggle, so that I can follow every bounce.
2. As a player, I want slow motion to keep my solutions valid, so that the puzzle is the same puzzle.
3. As a player, I want my settings remembered, so that I set them once.
4. As a seated player at a high or low table, I want to raise or lower the diorama, so that my hands stay below heart level.
5. As a player with short reach, I want to bring the diorama nearer, so that everything is within a 2 ft radius.
6. As a one-handed player, I want every adjustment to be a single poke or pinch, so that I never need two hands.
7. As a player, I want settings on the diorama itself, so that there are still no floating menus.
8. As a player, I want resetting progress to require confirmation, so that I never wipe it by accident.
9. As a player, I want a reset to bring back the tutorial, so that someone new can use my headset.
10. As a puzzle fan, I want a new rule in World 4, so that the last world feels fresh.
11. As a player in World 4, I want to see how much spool is left, so that I can plan thread lengths.
12. As a player, I want an overspending thread to be refused with feedback, so that I understand why.
13. As a player, I want six World 4 puzzles that are solvable and do not solve themselves, so that the world is complete.
14. As a returning player, I want a new daily puzzle each day, so that I have a reason to come back.
15. As a returning player, I want a streak counter, so that coming back daily feels rewarded.
16. As a player who misses a day, I want the streak to restart rather than vanish silently, so that the rule is clear.
17. As a player, I want the daily puzzle reachable from the ledge, so that it never needs a menu.
18. As a player, I want the daily puzzle's stars kept separately from the campaign, so that the campaign stays orderly.
19. As a VR-glasses or gaze-input player, I want to look at a peg and pinch to start a thread, so that I can play without pointing.
20. As a player whose saves predate the daily mode, I want my progress kept when the save format grows, so that nothing is lost.

## Implementation Decisions

- **Prefactor:** one never-throwing JSON storage helper (validate with a schema, fall back to a default) shared by progress and settings.
- **Settings** are a small validated record: slow motion (on/off) and diorama offset (height, distance in fixed steps, clamped to a comfortable range), with their own storage key.
- **Slow motion** scales marble gravity and the release interval. Under gravity scaling, trajectories from rest keep their shape, so the stored solutions stay valid. The level proofs check this.
- **Diorama adjustments** reuse the existing placement command with a new pose; colliders rebuild as for any placement. There is no scaling, because physics sizes are real meters.
- **Plaque faces:** the plaque has a "level" face (today's) and a "settings" face. The gear button on the ledge toggles between them. Settings controls are buttons on the plaque that dispatch commands.
- **Reset progress** reuses the existing command behind a confirm state: the first poke arms it, a second poke within a few seconds confirms, and it disarms after a timeout.
- **Spool:** an optional per-level total length budget. The thread rules reject a thread that would overspend it (a new refusal reason, alongside duplicate / same peg / limit). The schema refuses a level whose solution exceeds its spool. The plaque shows the remaining spool when a level has one.
- **Daily puzzle:**
  - A separate pool of seven challenge levels, picked by a pure function of the local calendar date. A "daily" command loads it; tests can override the index.
  - Daily solves update a streak: same day leaves it unchanged; the next day adds one; a gap restarts it at one.
  - The streak and daily stars live in progress v2. v1 saves migrate on load.
  - A ledge button opens the daily; the plaque shows "Daily" and the streak.
- **Gaze and pinch:** a research spike first, to find IWSDK's supported gaze-pinch input and how IWER emulates it. Then enable it so the existing peg and chute interactions work under gaze targeting.

## Testing Decisions

- The three agreed seams. Tests observe state and the plaque model via the dev hook, never ECS internals.
- Unit tests:
  - the settings schema and defaults;
  - the storage helper's fallback;
  - the spool rule (fits / overspends / presets excluded) and schema refusal;
  - the daily pick (deterministic, in range, different on consecutive days, local-date based);
  - the streak rollover (same day, next day, gap, month and year boundaries);
  - the progress v1→v2 migration.
- E2E:
  - the gear button by real mouse click, then toggling slow motion and observing a longer marble fall time;
  - all campaign proofs still passing with slow motion on, for a sample of levels;
  - Raise/Lower changes the frame and the level stays solvable;
  - reset needs two pokes;
  - an overspending thread is refused, and the plaque spool readout tracks;
  - the daily loads today's pick and a solve increments the streak;
  - World 4 and daily levels proven solvable and not self-solving by the existing level proof;
  - a gaze-pinch thread (seam 3) once the spike settles how IWER drives it.

## Out of Scope

Scaling the diorama, leaderboards or online sharing of daily results, melody book (week 6), new art.

## Further Notes

The "two hands on the base" adjustment in the master plan was replaced with one-handed buttons for accessibility (story 6).
