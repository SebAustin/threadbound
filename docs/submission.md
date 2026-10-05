# Threadbound: submission copy

Paste-ready text for the Devpost form. **The author submits.** Items marked
**[decide]** need the author's input before submitting.

- **Project name:** Threadbound
- **Track:** Gaming
- **Division:** New Experience (built from scratch during the window; first commit 2026-09-27)
- **Build link:** https://sebaustin.github.io/threadbound/ (WebXR on GitHub Pages; open in Quest Browser)
- **Source:** https://github.com/SebAustin/threadbound
- **Video:** **[decide]** a YouTube or Vimeo link (see `docs/video/`)

## Tagline

Pinch a thread, drop the marbles, hear your solution.

## Description

**Threadbound** is a seated, hands-first mixed-reality puzzle. A small
walnut-and-brass diorama lands on your real table. You pinch a brass peg, pull,
and release on another peg to stretch an elastic thread; then you pinch the
chute and watch marbles bounce off your threads into their cups. Every thread is
a string tuned by its length, so every solution plays back as a melody.

### Inspiration

Hand tracking is at its best when the gesture *is* the game, not a stand-in for
a button. Pinch-and-pull is the most natural thing a hand can do, and an
elastic string is the most natural thing to pinch and pull. Strings make sound,
so we made the threads musical: solving a puzzle is also writing a short tune.
We wanted something you can play seated at your own table for five minutes a
day, where the world you see through passthrough stays the stage.

### How we built it

- **Stack:** the Immersive Web SDK (IWSDK): Three.js, an entity-component
  system, and Havok physics, shipped as a WebXR page on GitHub Pages. No
  install, and it runs in Quest Browser.
- **Hands first:** threads are made by pinch-pull with hand rays, buttons are
  poked or pinched, and on eye-tracked headsets you can look and pinch.
  Controllers and a mouse work through the same input path, but nothing needs
  them.
- **Mixed reality:** WebXR plane detection finds a table within seated reach
  and places the diorama on it, facing you. Without one it floats at lap height
  in front of you; without passthrough, a cozy virtual study takes its place.
- **Physics you can trust:** every level is proven by an automated test that
  plays its stored solution under real physics (and checks it isn't solved
  without the player), at normal speed and in slow motion. Slow motion dilates
  time rather than gravity, so every solution stays valid.
- **No headset in the loop:** we built and tested entirely in the IWER
  emulator. Over 200 unit tests, real-input end-to-end tests and emulated XR
  sessions (hands-only play, gaze plus pinch, table placement) stand in for a
  device.
- **Sound:** a small Karplus-Strong string synthesizer, with one sound per game
  event and a limiter, all in the pentatonic scale, so any combination of
  threads sounds musical.

### What's next

- More worlds and mechanics (springs, gates, moving pegs) and a level editor
  for building and sharing boards on your own table.
- Shared daily boards and a melody gallery, so players can hear each other's
  solutions.
- Spatial anchors, so the diorama remembers its spot on your table between sessions.
- **Target launch date:** **[decide]** (suggestion: Q1 2027 on the Meta Horizon
  Store as a packaged web app).

## How it meets the criteria

| Criterion | Where it shows |
|---|---|
| **Innovation & Creativity** | Threads are both the puzzle and the instrument: every solution is a melody. The core loop depends on hands and real-world scale (pinch-pull on a real table). |
| **Experience Design** | Seated, everything you touch within a seated 2 ft (tested on every level). No floating menus: every control lives on the diorama. The ghost hand teaches the gesture in one line of text. Passthrough is the stage, and the table is found automatically. |
| **Technical Implementation** | Hand tracking (rays and poke), gaze plus pinch, WebXR plane detection for table placement, physics. A frame budget is enforced by tests on every level: the busiest frame is 55 draw calls per view, within 80. |
| **Polish & Presentation** | A cohesive walnut-and-brass art direction, a sound for every event, and a plaque that explains refusals. The video shows real emulator gameplay only. |

**Special awards targeted:**
- **Best First Five Minutes:** a ghost hand demonstrates the gesture on the board, with one short hint line. A cold start reaches the first melody within seconds of the first pinch (tested).
- **Best Reason to Come Back:** stars for thread economy, a daily puzzle with a streak, and a melody book of every solved level's tune.
- **Best Accessibility Forward:**
  - eyes-plus-pinch input on eye-tracked headsets;
  - color always paired with a shape (amber triangle, azure circle);
  - slow motion that keeps solutions valid;
  - one-handed height and distance adjustment;
  - every event has a distinct sound, and failure sounds sit outside the music;
  - refusals are explained on the plaque.

## Accessibility notes

- Fully playable seated and one-handed; no controller required.
- Color is never the only signal: sorting colors carry glyphs (triangle and
  circle), chosen to stay distinct under common color-vision deficiencies.
- Slow motion (two thirds speed) for players who need more time to follow bounces.
- Height (±15 cm) and distance adjustments without standing or reaching.
- Every player-caused event has its own sound (cup correct and wrong, button,
  grab, refusal, snip, settle). The wrong-cup and refusal sounds are
  deliberately dull and off-scale.
- A guarded progress reset (two pokes), so nothing is lost by accident.

## Testing instructions for judges

1. On Quest, open **https://sebaustin.github.io/threadbound/** in Quest Browser.
2. Tap **Enter XR** and allow passthrough and hand tracking if asked.
3. Sit at a table if you can. The diorama finds it (or floats in front of you).
4. Follow the ghost hand on level 1, then poke **Next**. The **gear** opens
   settings, the **sun** opens today's daily (poke it again to return), and the
   lit **stars** replay a level's melody.
