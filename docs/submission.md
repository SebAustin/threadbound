# Threadbound: submission copy

Paste-ready text for the Devpost form. **The author submits.** Items marked
**[decide]** or **[author writes]** need the author's input before submitting,
and **[if shipped]** notes name the features a claim waits on. HTML comments
(`<!-- -->`) are re-check notes for the final copy pass: leave them out when pasting.

- **Project name:** Threadbound
- **Track:** Gaming
- **Division:** New Experience (built from scratch during the window; first commit 2026-09-27)
- **Build link:** https://sebaustin.github.io/threadbound/ (WebXR on GitHub Pages; open in Quest Browser)
- **Source:** https://github.com/SebAustin/threadbound
- **Video:** **[decide]** a YouTube or Vimeo link (see `docs/video/`)

## Tagline

Pinch elastic threads between brass pegs, drop the marbles, and hear your solution play. A seated hand-tracked puzzle in Quest Browser.

## Description

**Threadbound** is a seated, hands-first mixed-reality puzzle. A small
walnut-and-brass diorama lands on a table in your room, or floats in front of
you. You pinch a brass peg, pull, and release on another peg to stretch an
elastic thread; then you pinch the chute and watch marbles bounce off your
threads into their cups. Every thread is a string tuned by its length, so every solution plays back as a melody. <!-- true once week 8 ticket 10 lands; re-check in week 9's final copy pass -->

### Inspiration

Hand tracking is at its best when the gesture *is* the game, not a stand-in for
a button. Pinch-and-pull is the most natural thing a hand can do, and an
elastic string is the most natural thing to pinch and pull. Strings make sound,
so I made the threads musical: solving a puzzle is also writing a short tune.
I wanted something you can play seated at your own table for five minutes a
day.

### How I built it

- **Stack:** the Immersive Web SDK (IWSDK): Three.js, an entity-component
  system, and Havok physics, shipped as a WebXR page on GitHub Pages. No
  install, and it runs in Quest Browser.
- **Hands first:** threads are made by pinch-pull, by hand ray or up close.
  Threads, the chute, the plaque's controls and its stars are pinched, and the
  ledge buttons are pressed with a pinch or a fingertip. On eye-tracked headsets
  you can look and pinch. A mouse works through the same input path, but
  nothing needs it.
- **Placement:** WebXR plane detection finds a table within seated reach and
  places the diorama on it, facing you. That is the room's whole job. Without a
  table it floats at lap height in front of you; without passthrough, a virtual
  study takes its place.
- **Physics you can trust:** every level is proven by an automated test that
  plays its stored solution under real physics (and checks it isn't solved
  without the player), at normal speed and in slow motion. Slow motion dilates
  time rather than gravity, so every solution stays valid.
- **No headset in the loop:** I built and tested entirely in the IWER
  emulator. Over 200 unit tests, real-input end-to-end tests and emulated XR
  sessions (hands-only play, gaze plus pinch, table placement) stand in for a
  device. Frame rate on a Quest is not measured.
- **Sound:** a small Karplus-Strong string synthesizer, with one sound per game
  event and a limiter. Thread notes and the musical cues use the pentatonic
  scale, so any combination of threads sounds musical; the failure sounds are
  low and dull, below the melody.

### What's next

- More worlds and mechanics (springs, gates, moving pegs) and a level editor
  for building and sharing levels on your own table.
- Shared dailies and a melody gallery, so players can hear each other's
  solutions.
- Spatial anchors, so the diorama remembers its spot on your table between sessions.
- **Glasses:** hands-only play and gaze plus pinch are proven in the IWER
  emulator, but Threadbound has never run on glasses.
- **Target launch date:** Q1 2027 on the Meta Horizon Store as a packaged web app, title subject to trademark check.

## Hand Interactions

Threadbound is played with bare hands, no controller needed:

- **Make a thread:** pinch a brass peg, pull, and release on another peg, by
  hand ray or up close at the peg.
- **Snip a thread:** pinch it.
- **Drop the marbles:** pinch the chute.
- **Replay a melody:** pinch the lit stars on the plaque.
- **Ledge buttons** (Restart, the settings button, the sun, Next): press them,
  with a pinch or a fingertip.
- **Settings face:** pinch its toggles (Slow-mo, Raise/Lower, Nearer/Farther).
- **Gaze plus pinch:** on eye-tracked headsets, look at a peg or the chute and
  pinch; the pinching hand can rest anywhere.
- **The ghost hand:** on the first level, translucent fingertips demonstrate
  the pinch-pull and the chute pinch.

Tested in the IWER emulator only, with emulated hands: `hand-pinch.sh` (pinch-pull
by ray and up close, and a hand lost mid-pinch), `xr-full-level.sh` (level 1 by
hand pinches only), `xr-controls.sh` (pinching the chute, a thread, Restart, the
settings button, Slow-mo, the sun and the stars) and `gaze-pinch.sh` (gaze plus
pinch). The tests press ledge buttons by pinch; the fingertip press is untested.

## What excites you about the future of VR

**[author writes]**

## Team

Sebastien Henry, solo developer (design, code, audio)

## How it meets the criteria

| Criterion | Where it shows |
|---|---|
| **Innovation & Creativity** | Threads are both the puzzle and the instrument: every solution is a melody. <!-- true once week 8 ticket 10 lands; re-check in week 9's final copy pass --> One length, three effects: a thread's length sets its pitch, its bounce and its spool cost, across 24 levels in four worlds. |
| **Experience Design** | Seated: everything you touch is within a seated 2 ft in the study pose and on any table it accepts (tested on every level in the study pose, and on level 1's table in an XR session). <!-- every accepted table: true once week 8 ticket 07's ACCEPT_REACH lands --> No floating menus: every control lives on the diorama. The ghost hand teaches the gesture in one line of text. The table is found automatically. |
| **Technical Implementation** | Hand tracking (rays, near pinch, and a fingertip press on ledge buttons), gaze plus pinch, WebXR plane detection for table placement, Havok physics. A draw-call budget is checked on every level: the busiest frame is 55 draw calls per view, within 80. Frame rate on a Quest is not measured. |
| **Polish & Presentation** | A cohesive walnut-and-brass art direction, a sound for every event, and a plaque that explains refusals. The video shows real emulator gameplay only. |

**Special awards targeted:**
- **Best First Five Minutes** (the headline): a ghost hand demonstrates the gesture on the diorama, with one short hint line. From a cold start, the first melody plays about two seconds after the chute pinch (tested).
- **[if shipped] Best Reason to Come Back.** Author note: name this award only
  once ADR 0005's stars (ticket 13), the return-visit hints and the melody
  book's play-all (ticket 14) ship. Draft for then: stars for thrift and for a
  first-drop solve, a daily puzzle on a tight spool with a streak, a reminder
  when today's daily is waiting, and a melody book of every solved level's
  tune, with play-all.
- **[if shipped] Best Accessibility Forward.** Author note: name this award
  only once the high-contrast toggle and the visual captions (ticket 15) ship.
  Draft for then: eyes-plus-pinch input on eye-tracked headsets; color always
  paired with a shape on cups and chutes (amber triangle, azure circle); a
  high-contrast mode; visual captions for events that only sound; slow motion
  that keeps solutions valid; one-handed height and distance adjustment;
  failure sounds low and dull, below the melody; refusals explained on the
  plaque.

## Accessibility notes

- Fully playable seated and one-handed; no controller required.
- Color is never the only signal: sorting colors carry glyphs (triangle and
  circle) on their cups and chutes, chosen to stay distinct under common
  color-vision deficiencies.
- Slow motion (two thirds speed) for players who need more time to follow bounces.
- Height (±15 cm) and distance adjustments without standing or reaching.
- Every player-caused event has its own sound (cup correct and wrong, button,
  grab, refusal, snip, settle). The wrong-cup and refusal sounds are low and
  dull, below the melody.
- A guarded progress reset (pinch it twice), so nothing is lost by accident.

## Content and privacy

- **Ages 10+,** under the Meta Content Guidelines: marbles, threads and music.
- No accounts, analytics, ads, purchases or chat.
- Your progress stays in this browser's local storage.
- In XR, the hand and controller models load from jsDelivr (`cdn.jsdelivr.net`).
  In an emulated XR session with hands, that is the only outside host the game
  contacts.

## Testing instructions for judges

1. On Quest, run **Space Setup** first and allow spatial data when Quest Browser
   asks, or the diorama floats in front of you instead of finding your table.
2. Open **https://sebaustin.github.io/threadbound/** in Quest Browser.
3. Tap **Enter XR** and allow passthrough and hand tracking if asked.
4. Sit at a table if you can. The diorama finds it (or floats in front of you).
5. Follow the ghost hand on level 1, then press **Next** on the ledge. The
   **settings button** opens the settings face, the **sun** opens today's daily
   (press it again to return), and pinching the lit **stars** replays a level's
   melody.
6. To start a level over, press **Restart**, the leftmost ledge button.
