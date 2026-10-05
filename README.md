# Threadbound

**Pinch a thread, drop the marbles, hear your solution.**

A seated, hands-first mixed-reality puzzle for Meta Quest, built with the
[Immersive Web SDK](https://iwsdk.dev) for the Meta VR Start Developer
Competition 2026 (Gaming · New Experience).

**Play:** https://sebaustin.github.io/threadbound/ (Quest Browser, nothing to install)

A small walnut-and-brass diorama settles on your real table. **Pinch a brass
peg, pull, and release on another peg** to stretch an elastic thread. Pinch the
chute to drop marbles: they bounce off your threads into the cups. Every thread
is a string tuned by its length, so every solution plays as a melody.

## Try it in two minutes

1. Enter XR and follow the ghost hand on level 1: pinch, pull, release, then pinch the chute.
2. Poke **Next** on the front ledge and play a couple more levels.
3. Poke the **gear** on the ledge: try Slow-mo, Raise/Lower and Nearer/Farther.
4. Poke the **sun** for today's daily puzzle, then poke it again to come back.
5. Poke the lit **stars** on the plaque to replay a solved level's melody.

## What's in it

- **24 levels in four worlds:** threads and trampolines; color sorting
  (amber/azure, each with its own shape, so color is never the only cue); rail
  pegs you slide; and *Tension*, where a spool limits the total thread you may use.
- **Reasons to come back:** stars for using few threads, a daily puzzle with a
  streak, and a melody book of every solved level's tune.
- **Hands first, end to end:** pinch with hand rays, poke buttons, or look and
  pinch on eye-tracked headsets. Controllers and a desktop mouse work too.
- **Purposeful mixed reality:** the diorama lands on a table found by WebXR
  plane detection within seated reach, facing you. Without a table it floats
  at lap height in front of you. Where there's no passthrough, a cozy virtual
  study takes its place.
- **Comfortable and accessible:**
  - everything you touch is within a seated 2 ft;
  - one-handed height and distance adjustment;
  - slow motion that keeps every solution valid;
  - a sound for every event (cup chime, wrong-cup thud, refusal);
  - refusals explained on the plaque;
  - no floating menus: every control lives on the diorama.

## How it's tested

There's no headset in the loop, so the emulator (IWER) and automated tests carry the proof:

- **Over 200 unit tests** on the pure game logic in `src/lib` (96% coverage).
- **Every level is proven** solvable by its stored solution under real physics,
  not solved without the player, and within the frame budget. Each runs at
  normal speed and in slow motion (`npm run test:e2e:levels`).
- **Real-input E2E:**
  - mouse play, onboarding and the first melody from a cold start;
  - every touchable element within seated reach, on every level;
  - settings, the daily puzzle and streak, the melody book and sound cues;
  - resuming saves across reloads.
- **Emulated XR sessions:**
  - a full level played with hand pinches only;
  - pinching every ledge button and plaque control;
  - gaze plus pinch on an eye-tracked headset;
  - table placement on a detected plane.
- **Budget:** the busiest frame in an XR session is 55 draw calls and about 16k triangles per view, tracked hands included (budget: 80 calls, 100k triangles).

## Develop

```sh
npm install
npm run dev               # IWSDK dev server + managed browser with the IWER XR emulator
npm test                  # unit tests (vitest)
npm run coverage          # unit tests with coverage
npm run test:e2e          # real-input E2E suite (needs the dev server, see below)
npm run test:e2e:levels   # every level solvable, not self-solving, within budget
npm run test:e2e:hands    # emulated XR: hands-only level, ledge/plaque pinches, gaze + pinch
npm run build             # production build to dist/
```

E2E scripts need the dev server started with browser automation:
`npx @iwsdk/cli dev up --headless --allow-browser-automation`.

Level-design probe (the trajectory of each marble every 0.15 s):
`zsh tests/e2e/probe.sh <levelIndex> '[["a","b"]]' [seconds]`

## Layout

```
src/lib/        pure, unit-tested logic (rules, scoring, schema, progress, daily, sound cues)
src/features/   ECS systems by feature (puzzle, threads, marbles, sliders, hud, audio, placement...)
src/levels/     level data (JSON, validated with zod)
tests/          unit (vitest) and e2e (IWSDK CLI + Playwright) tests
docs/           decisions (ADRs), submission copy, video kit
```

Built from scratch during the competition window (first commit 2026-09-27).
