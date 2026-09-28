# Threadbound

A hands-first mixed-reality puzzle for Meta Quest, built with the
[Immersive Web SDK](https://iwsdk.dev) for the Meta VR Start Developer
Competition 2026 (Gaming · New Experience).

A small walnut-and-brass diorama sits on your real table. **Pinch a peg, pull,
and release on another peg** to stretch an elastic thread. Pinch the chute to
drop marbles: they bounce off your threads into the goal cups. Every thread is
a string tuned by its length, so every solution plays as a melody.

- Fully playable with hands (pinch + poke), seated, within arm's reach
- Mixed reality: the diorama finds your real table (or floats in front of you) and faces you
- A cozy VR study where passthrough isn't available (e.g. Safari on visionOS)
- Six World 1 puzzles, stars for thread economy, saved progress, Restart/Next on the diorama
- Also works with gaze + pinch (Meta VR Glasses) and a desktop mouse

## Develop

```sh
npm install
npm run dev               # IWSDK dev server + managed browser with the IWER XR emulator
npm test                  # unit tests (vitest)
npm run coverage          # unit tests with coverage (80% threshold on src/lib)
npm run test:e2e          # mouse E2E: core loop, jump-drag regression, Restart/Next + progress
npm run test:e2e:levels   # proves every level solvable (and not self-solving) under real physics
npm run test:e2e:hands    # hand pinch-pull in an emulated Quest 3 AR session
npm run build             # production build to dist/
```

Level-design probe (trajectory of each marble every 0.3 s):
`zsh tests/e2e/probe.sh <levelIndex> '[["a","b"]]' [seconds]`

E2E scripts need the dev server started with browser automation:
`npx @iwsdk/cli dev up --allow-browser-automation`.

## Layout

```
src/lib/        pure, unit-tested logic (geometry, tuning, rules, level schema)
src/features/   ECS systems by feature (puzzle, threads, marbles, audio, environment)
src/levels/     level data (JSON, validated with zod)
tests/          unit (vitest) and e2e (IWSDK CLI + Playwright) tests
```
