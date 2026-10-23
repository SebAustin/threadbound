# 15: High contrast and visual captions (P1)

**What to build:**
- **Palette as data (pure):** move the hex values out of `src/features/diorama/palette.ts:28-45` and `HUD.*Color` (`src/config/constants.ts:99-102`) into a new pure `src/lib/colors.ts`. It holds three things:
  - the default diorama palette;
  - its high-contrast overrides;
  - `plaqueColors(highContrast)`.

  Ticket 11's hover and target colours (`creamHot`, `goalHot`, `threadHot`, `threadPresetHot`, `brassTarget`) belong here too, with high-contrast overrides; whichever of 11 and 15 lands second moves them. It also moves 11's plaque hover and press colours (`.toggle:active`, `.stars:hover`, `.stars:active` in `hud.uikitml`) into `plaqueColors` with high-contrast values, which the literal-equality test below covers and which meet the high-contrast bounds. `palette.ts` builds its materials from it and gains `applyPalette(highContrast)`. That rewrites the shared materials in place (colour, emissive, `visible`), so switching needs no rebuild and the default mode draws nothing extra. Every new shared material in this ticket (back panel, cup and inner walls, glyph backing, wall blink) goes in `MATERIALS` or the glyph maps, so ticket 07's fade covers it.
- **Contrast math (pure):** a new `src/lib/contrast.ts` with:
  - `contrastRatio(a, b)` (WCAG 2.x);
  - `deltaE2000(a, b)`;
  - `simulateCvd(hex, 'protan' | 'deutan' | 'tritan')`, using Machado 2009 at severity 1 in linear sRGB. This is the method that reproduces the audit's figures.
- **Lit stars (gap 15):** on the solved header `#b8862f`, lit stars `#f2c14e` reach only 1.93:1, and the title 2.93:1. Darken the solved header. `#7a5418` gives stars 4.03:1, the title 6.13:1 and the rings 3.42:1; any value that passes the unit test will do.
- **Amber vs thread (gap 66):** `#ff6f1a` vs `#ff6b5a` is CIEDE2000 13.9 (7.3 deutan, 1.8 tritan). Change the player thread, not amber:
  - amber's separation from azure is already proven, and a yellower amber comes within 11 of the brass pegs;
  - `#ff96a8`, a lighter coral, gives 27.8 / 28.0 / 21.1 / 13.4 and 4.9:1 on walnut;
  - keep `threadPreview` (`palette.ts:36`) visibly different from it. The drag preview (`src/features/threads/ThreadSystem.ts:72`) and ticket 11's pressed thread both show it. `#ffb3a8` vs `#ff96a8` is CIEDE2000 10.9 (16.6 against today's thread), so it passes the unit test as it stands; if a later thread change makes it fail, lighten the preview (`#ffe0d8` gives 20.5).
- **High-contrast toggle:** add `highContrast: z.boolean().default(false)` to `SettingsSchema` (`src/lib/settings.ts:10-21`), so older saves still load.
  - **Control:** fill ticket 12's hidden `set-contrast` span on the settings face; this ticket changes no settings-face layout or ids. Its label, "High contrast: Off" or "On", comes from `settingsModel` (`src/lib/hud.ts:97-102`), and it dispatches a patch as `set-slow` does (`src/features/hud/settingsFace.ts:35-38`). `applySettingsPatch` keeps the offset's identity (`settings.ts:42-45`), so toggling never relocates the diorama.
  - **Diorama:** the back panel (`buildDiorama.ts:108`) gets its own material, and so do the walls: the cup walls (`:146-147`) and the inner walls (`:188`). Both split from `MATERIALS.walnut`, so the ledge and its buttons don't change. When the toggle is on:
    - the back panel goes near-black;
    - cup and inner walls go cream, so they read as outlines;
    - pegs, rails and chutes brighten;
    - threads and idle cup floors glow more.
  - **Glyphs:** `glyphMesh` (`palette.ts:253-261`) gives each glyph a dark backing disc. The disc uses a shared geometry, added to `SHARED_GEOMETRIES` (`:248-251`), and a shared material whose `visible` follows the setting. Today an amber glyph on a brass chute is 1.15:1.
  - **Text:** `HudSystem.apply` (`src/features/hud/HudSystem.ts:118-136`) paints the header, the stars, the plaque text and the settings-face controls from `plaqueColors`. Ticket 12's ledge text uses it too. `changed()` (`:102-116`) also compares `settings.highContrast`.
  - **Wiring:** a new `src/features/settings/ContrastSystem.ts`, registered in `src/index.ts`, calls `applyPalette` whenever the loaded or changed value differs from the one last applied.
- **Captions:** always on, in both modes. The behaviour lives in a new `src/features/captions/CaptionSystem.ts`, and the timing curves in a pure `src/lib/captions.ts`.
  - **Wrong cup:** `MarbleSystem.reject` (`src/features/marbles/MarbleSystem.ts:288-292`) takes the cup index and also emits `{ type: 'cupRejected', cup }`. Ticket 16's positional thud needs the same parameter: whichever of 15 and 16 lands first adds it, and the other reuses it.
    - That cup's two walls blink bright and dark for about 0.5 s. They are exposed as `BuiltDiorama.cupWalls` (`buildDiorama.ts:37-44, 137-163`).
    - The blink is a change in brightness, not colour. It swaps each wall mesh's material and then restores the wall material.
    - A drop or a rebuild cancels it.
    - The floor stays untouched, because it carries the filled-cup glow (`MarbleSystem.ts:272`).
  - **Replayed note:** wherever ticket 10's replay sounds a saved melody note (today `replayDue`, `MarbleSystem.ts:321-328`), emit `{ type: 'melodyNote', index }` for each `replaySchedule` entry with `cue === 'melody'`, with `index` set to its `note`. The closing cadence that ticket 10 adds to a melody-book replay (`cue === 'cadence'`) emits nothing, so the pulse count still equals the saved notes.
    - Star `index % 3` (`hud-star-1..3`) scales up and back (`transformScaleX/Y`) in about 0.2 s.
    - This covers the replay after a solve and the melody-book replay.
  - **Not here:** the ledge line that explains a failed drop (ticket 14), the settings face's play-all, the welcome card, gaze-dwell and voice.
- **Test hook** (`src/features/debug/testHook.ts`):
  - `appearance()` returns `highContrast`, the back-panel, wall and header colours as hex, and whether glyph backings show;
  - `captions()` returns `starPulses` and, for each cup, `{ color, flashes, flashing }`, mirrored from `userData`.

**Blocked by:** 10, 12

**Status:** ready-for-agent

- [ ] Unit: a new `tests/unit/contrast.test.ts` checks the method:
  - `contrastRatio` is 21 for black on white and 1 for any colour on itself;
  - `deltaE2000` matches Sharma et al.'s published test pairs to within 1e-4;
  - it reproduces the audit's figures: 1.93:1 for a lit star on the solved header, 6.49:1 for a ring on the playing header, and 13.9 (1.8 tritan) for `#ff6f1a` vs `#ff6b5a`.
- [ ] Unit: the same file checks the real values in `src/lib/colors.ts`.
  - Default mode:
    - lit stars are at least 3:1 on both headers;
    - the title is at least 4.5:1 on both headers, and so is the rest of the plaque text;
    - amber marble vs player thread is at least 20 in normal vision and at least 10 under each simulation;
    - amber vs azure is at least 40 under each simulation;
    - teal vs player thread is at least 10 under each simulation;
    - player thread vs `threadPreview` is at least 10 in normal vision;
    - the thread is at least 3:1 on walnut.
  - High contrast:
    - all plaque text is at least 7:1;
    - lit fills and unlit rings are at least 4.5:1 on both headers;
    - pegs, both kinds of thread, all three marbles, cup floors and walls are at least 4.5:1 on the back panel;
    - each glyph is at least 4.5:1 on its backing;
    - ticket 11's hot and target colours meet the same bound as the part they light, and its plaque hover and press colours meet the plaque bounds above (whichever of 11 and 15 lands second adds this).
- [ ] Unit: the literal plaque colours in `hud.uikitml`, ticket 11's hover and press colours included, equal `plaqueColors(false)`.
- [ ] Unit: in `tests/unit/settings.test.ts`:
  - `highContrast` defaults to false;
  - a save without the field loads and keeps `slowMotion`;
  - a patch flips it and keeps the offset's identity.

  In `tests/unit/hud.test.ts`, `settingsModel` gives "High contrast: Off" and "High contrast: On".
- [ ] Unit: a new `tests/unit/captions.test.ts`:
  - the cup flash alternates bright and dark at least twice, then returns null;
  - the star pulse is 1 at its start and end, and peaks at 1.3 or more;
  - notes 0, 1, 2 and 3 pulse stars 0, 1, 2 and 0.
- [ ] E2E: a new `tests/e2e/high-contrast.e2e.mjs`, using real clicks (`plaqueElementAt` and `clickCanvas`):
  - clicking the settings button, then `set-contrast`, turns the mode on, and the label reads "High contrast: On";
  - `threadbound.settings.v1` holds `"highContrast":true`;
  - `appearance()` changes, while the threads and `frame()` stay the same;
  - after an in-frame reload (`first-melody.e2e.mjs:21-26`), the mode is still on;
  - with the mode on, `frameStats()` reports no breaches on w4-06 (the busiest level) or on w2-06 (6 glyphs);
  - a second click restores the starting `appearance()` exactly.

  Add the script to `test:e2e`, and add `highContrast: false` to `tests/e2e/reset-settings.e2e.mjs`.
- [ ] E2E: extend `tests/e2e/color-rule.e2e.mjs`, the w2-03 mis-sort:
  - the azure cup flashes: `flashing` is seen at least once, and `flashes` ends above 0;
  - a cup that only received matching marbles never flashes;
  - the walls are back to the wall colour once the drop has ended.

  A w1-01 solve flashes no cup.
- [ ] E2E: extend `tests/e2e/melody-book.e2e.mjs`:
  - clicking the stars raises `starPulses` by exactly the saved melody's length;
  - at every poll, it is at most one ahead of the `melody` cues;
  - on an unsolved level, a click pulses nothing.
- [ ] XR: extend `tests/e2e/xr-controls.sh`, and add a `contrastToggle` entry beside `slowToggle` in `xr-probe.e2e.mjs`'s `PROBE_FIELDS` (ticket 01's table). A hand-ray pinch on `set-contrast` flips the setting in an emulated session.
- [ ] Manual: take `browser_screenshot`s of w2-03 in both modes and save them under `.scratch/week8/`. Pegs, threads, cup outlines and glyphs should be easy to tell apart at a glance.

**Effort:** M (~2 days)

**Gaps closed:** #15, #66, and #16 together with ticket 14 (this ticket covers the wrong cup and the replay; ticket 14 explains a failed drop)

**Risks:**
- **Hover:** setting `backgroundColor` on a `.toggle` may override its `:hover` style (`hud.uikitml:138-140`). Check that hover still shows in high contrast.
- **Allocation:** the star pulse sets UIKit properties every frame for about 0.2 s. Reuse one properties object, since `update()` must not allocate (AGENTS.md).
- **Teardown:** the backing geometry must be in `SHARED_GEOMETRIES`, or level teardown disposes it (commit 3fb6f91).
- **UIKit load:**
  - keep ticket 12's placeholder text in `set-contrast`, because a span that starts empty never lays out text;
  - notes in its `<style>` must use `<!-- -->`, never `/* */`.
- **Fit:** "High contrast: Off" must fit on one line in ticket 12's layout. Measure it with UIKit layout inspection, as week 7 ticket 07 did.

## Comments
