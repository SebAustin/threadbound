# Week 4: first five minutes, plaque, resume, pause

Status: ready-for-agent

## Problem Statement

A first-time player puts on a headset, sees a box of pegs on their table, and has no idea what to do: there is no title menu by design, the only instructions were on a floating browser panel that does not exist in XR, and nothing tells them which level they are on, how well they did, or that their progress is kept. If they glance at the system menu mid-drop, the marbles keep falling and the moment is lost.

## Solution

The diorama teaches and reports by itself. On a fresh save a **ghost hand** demonstrates pinch-pull between the two pegs that matter, then points at the **chute**, then steps back while the first **melody** plays. A **plaque** on the diorama's top edge names the level and its place in the world, shows best **stars** and the thread budget, and carries a one-line hint while onboarding. Progress is saved and the game resumes at the furthest unlocked level. Whenever the player cannot see the puzzle (system menu, headset off, hidden tab) the simulation pauses and resumes exactly where it was.

## User Stories

1. As a first-time player, I want to be shown the pinch-pull gesture on the actual pegs, so that I make my first thread within 20 seconds.
2. As a first-time player, I want the two pegs to glow, so that I know which pegs the demonstration means.
3. As a first-time player, I want the demonstration to move to the chute once I've made a thread, so that I learn how to start a drop.
4. As a first-time player, I want the demonstration to get out of the way while marbles fall, so that I watch and hear the melody.
5. As a returning player, I want never to see the tutorial again after my first solve, so that it never patronises me.
6. As a player who snipped my only thread, I want the demonstration to come back, so that I am not stuck.
7. As a deaf or low-vision player, I want the hint as text on the plaque too, so that the tutorial does not rely on one sense.
8. As a player, I want to see the level's name and its place in its world, so that I know where I am.
9. As a player, I want to see my best stars for this level, so that I know whether to try for par.
10. As a player, I want to see threads used against the limit and par, so that I can plan.
11. As a player, I want a clear, glanceable change when I solve a level, so that success reads from a distance.
12. As a player in XR, I want no floating menus, so that the diorama is the only interface.
13. As a returning player, I want to resume at the furthest level I unlocked with my stars intact, so that my progress feels kept.
14. As a player, I want the puzzle to pause when I open the system menu, take the headset off, or switch tabs, so that I never miss a drop.
15. As a player, I want it to resume exactly where it left off, so that pausing never changes the outcome.

## Implementation Decisions

- **Onboarding** is derived, not stored: the step (pinch-pull, drop, watch, done) is a pure function of puzzle state. It is "done" once any level has been solved, on any level other than the first, or after a solve. A pure, looping ghost timeline (fade in, pinch, pull, release, hold, fade out) drives the rendering. The ghost demonstrates the level's first solution thread. Ghost meshes ignore pointer events.
- **Plaque**: a UIKitML panel authored in the scene and repositioned onto the diorama's frame after every level build. A pure model turns state into ASCII copy and star flags. The header block turns gold on a solve.
- **Reset progress** is a command on the bus (fresh save, back to level 1). Settings will reuse it in week 5.
- **Pause**: a pure policy (blurred or hidden XR session, or a hidden document) stops the physics, marble-release and vibration systems and publishes `paused` in state. Physics caps catch-up steps, so resuming never fast-forwards.
- **Resume**: progress (furthest unlocked level, best stars per level) is persisted and validated on load, falling back to a fresh save when unreadable. Startup loads the furthest unlocked level.

## Testing Decisions

- The seams are the three agreed ones: the pure domain library (vitest); the command bus via the dev test hook (Playwright E2E); real mouse or emulated-hand input (E2E). Tests observe state and the hook, never ECS internals or meshes.
- Unit tests cover onboarding steps, hints and the ghost timeline; the plaque model; and the pause policy. Prior art: the thread rules and level schema tests.
- E2E coverage:
  - the onboarding flow with real mouse drags (prior art: first-thread);
  - plaque content and placement (prior art: controls);
  - pause by faking a hidden document mid-drop;
  - resume after a browser reload;
  - the onboarding comeback after a snip.

## Out of Scope

Settings, daily puzzles, World 4, real hand models for the ghost (week 6 art pass), and timing the first five minutes on a real device.

## Further Notes

Built under ADR-0002 (emulator-only): visual checks are compact runtime screenshots, at most two per slice.
