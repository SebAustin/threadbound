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

**Status:** done

- [x] Unit: a new `tests/unit/contrast.test.ts` checks the method:
  - `contrastRatio` is 21 for black on white and 1 for any colour on itself;
  - `deltaE2000` matches Sharma et al.'s published test pairs to within 1e-4;
  - it reproduces the audit's figures: 1.93:1 for a lit star on the solved header, 6.49:1 for a ring on the playing header, and 13.9 (1.8 tritan) for `#ff6f1a` vs `#ff6b5a`.
- [x] Unit: the same file checks the real values in `src/lib/colors.ts`.
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
- [x] Unit: the literal plaque colours in `hud.uikitml`, ticket 11's hover and press colours included, equal `plaqueColors(false)`.
- [x] Unit: in `tests/unit/settings.test.ts`:
  - `highContrast` defaults to false;
  - a save without the field loads and keeps `slowMotion`;
  - a patch flips it and keeps the offset's identity.

  In `tests/unit/hud.test.ts`, `settingsModel` gives "High contrast: Off" and "High contrast: On".
- [x] Unit: a new `tests/unit/captions.test.ts`:
  - the cup flash alternates bright and dark at least twice, then returns null;
  - the star pulse is 1 at its start and end, and peaks at 1.3 or more;
  - notes 0, 1, 2 and 3 pulse stars 0, 1, 2 and 0.
- [x] E2E: a new `tests/e2e/high-contrast.e2e.mjs`, using real clicks (`plaqueElementAt` and `clickCanvas`):
  - clicking the settings button, then `set-contrast`, turns the mode on, and the label reads "High contrast: On";
  - `threadbound.settings.v1` holds `"highContrast":true`;
  - `appearance()` changes, while the threads and `frame()` stay the same;
  - after an in-frame reload (`first-melody.e2e.mjs:21-26`), the mode is still on;
  - with the mode on, `frameStats()` reports no breaches on w4-06 (the busiest level) or on w2-06 (6 glyphs);
  - a second click restores the starting `appearance()` exactly.

  Add the script to `test:e2e`, and add `highContrast: false` to `tests/e2e/reset-settings.e2e.mjs`.
- [x] E2E: extend `tests/e2e/color-rule.e2e.mjs`, the w2-03 mis-sort:
  - the azure cup flashes: `flashing` is seen at least once, and `flashes` ends above 0;
  - a cup that only received matching marbles never flashes;
  - the walls are back to the wall colour once the drop has ended.

  A w1-01 solve flashes no cup.
- [x] E2E: extend `tests/e2e/melody-book.e2e.mjs`:
  - clicking the stars raises `starPulses` by exactly the saved melody's length;
  - at every poll, it is at most one ahead of the `melody` cues;
  - on an unsolved level, a click pulses nothing.
- [x] XR: extend `tests/e2e/xr-controls.sh`, and add a `contrastToggle` entry beside `slowToggle` in `xr-probe.e2e.mjs`'s `PROBE_FIELDS` (ticket 01's table). A hand-ray pinch on `set-contrast` flips the setting in an emulated session.
- [x] Manual: take `browser_screenshot`s of w2-03 in both modes and save them under `.scratch/week8/`. Pegs, threads, cup outlines and glyphs should be easy to tell apart at a glance.

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

- **Oct 27, agent: landed locally on main as `1382f6d feat: high contrast and visual captions for the wrong cup and replayed notes (ticket 15)`, plus the docs commit carrying these Comments. Nothing pushed.** Tickets 10, 11 and 12 had landed (their Comments), so this ticket lands second to 11 and moves its hot, target and plaque hover/press colours. It lands first to 16: `MarbleSystem.reject(marble, cup)` now takes the cup index (src/features/marbles/MarbleSystem.ts:302, :335), so ticket 16's positional thud reuses that parameter. Ticket 05's request is done: `highContrast: false` is in `DEFAULT_SETTINGS` in tests/e2e/reset-settings.e2e.mjs:4.
  - **Palette as data:** `src/lib/colors.ts` holds the default diorama palette (:30), its high-contrast overrides (:83, `dioramaPalette` :107) and `plaqueColors(highContrast)` (:191) for the plaque and ledge strip, ticket 11's `creamHot`, `goalHot`, `threadHot`, `threadPresetHot`, `brassTarget` and the `.toggle:active`, `.stars:hover`, `.stars:active` colours included. `COLORS` (palette.ts) and `HUD.*Color` (constants.ts) are gone. palette.ts builds every shared material from it and `applyPalette(highContrast)` (src/features/diorama/palette.ts:192) repaints colour, emissive and `visible` in place. The new shared materials (`backPanel`, `wall`, `glyphBacking`, `wallBlinkBright`, `wallBlinkDark`, palette.ts:153-184) are in `MATERIALS`, so RevealSystem's fade (`DIORAMA_MATERIALS`, :257) covers them; the backing disc's geometry is in `GLYPH_GEOMETRIES` (:244), so `SHARED_GEOMETRIES` (:270) keeps teardown from disposing it. In the default mode the backing material is hidden, so it draws nothing (three.js skips a hidden material).
  - **Gaps 15 and 66:** solved header `#7a5418` (colors.ts:143): lit stars 4.03:1, title 6.13:1, rings 3.42:1. Player thread `#ff96a8` (:46): amber vs thread 27.8 / 28.0 / 21.1 / 13.4 (normal / protan / deutan / tritan), 4.89:1 on walnut; `threadPreview` stays `#ffb3a8`, 10.9 from the thread. Amber vs azure is 55.1 / 61.0 / 68.9 under the simulations, teal vs thread 10.3 / 26.7 / 58.0. High contrast: plaque text at least 9.77:1, lit fills and rings at least 5.16:1 on both headers and under the stars' hover and press, every part on the back panel at least 4.92:1 (hot and target colours included), glyphs 7.18 and 4.97 on their backing.
  - **Contrast math:** `src/lib/contrast.ts`: `contrastRatio` (:85), `simulateCvd` (:92, Machado 2009 severity 1 in linear sRGB) and `deltaE2000` (:130).
  - **Toggle and wiring:** `highContrast: z.boolean().default(false)` (src/lib/settings.ts:34). `set-contrast` keeps ticket 12's placeholder and id; `settingsModel` labels it (src/lib/hud.ts:135) and it dispatches a patch like `set-slow` (src/features/hud/settingsFace.ts:53). `HudSystem.paint` (src/features/hud/HudSystem.ts:120) repaints the plaque (`paintPlaque`, src/features/hud/paintPlaque.ts), the settings face (settingsFace.ts:151, hover and press set as conditional properties so they still show) and the ledge strip (src/features/hud/ledgeStrip.ts:45); `changed()` compares `settings.highContrast` (HudSystem.ts:196). `ContrastSystem` (src/features/settings/ContrastSystem.ts, registered at src/index.ts:40) calls `applyPalette` when the value differs from the one last applied.
  - **Captions:** pure curves in `src/lib/captions.ts` (`cupFlash` :14, `starPulseScale` :25, `starForNote` :33). `reject` emits `cupRejected(cup)` and the replay emits `melodyNote(note)` for `melody` cues only (src/features/marbles/celebration.ts:102); both events are cached per index (src/features/puzzle/puzzleStore.ts:114, :119), so a frame that emits one allocates nothing. `CaptionSystem` (src/features/captions/CaptionSystem.ts, registered at src/index.ts:56) swaps a wrong cup's two walls (`BuiltDiorama.cupWalls`, src/features/diorama/buildDiorama.ts:49, :390) between the bright and dark blink materials and back to `wall`; a drop or a rebuild ends it (CaptionSystem.ts:49-50), and the floor is never touched. Star pulses reuse one properties object (:33).
  - **Test hook:** `appearance()` and `captions()` (src/features/debug/testHook.ts:104, :109, :420); `plaque()` also returns `contrastLabel`; `plaqueElement()` returns the element's live `background`; `meshBreakdown()` skips meshes with a hidden material (:481).
  - **Red first.** The earlier attempt wrote the tests before the code: `.scratch/week8/logs/ticket15-unit-red.log` (6 failed of 664: captions, contrast and plaqueColors could not import their modules, plus the hud and settings cases), `ticket15-e2e-red.log` (high-contrast, color-rule and melody-book stopped on the missing hook) and `ticket15-mutation-red.log` (with the behaviour disabled, 11 FAIL across color-rule, melody-book, high-contrast and xr-controls).
  - **Evidence on the final tree** (logs `.scratch/week8/logs/ticket15-*.log`, gitignored). The dev server was restarted with `dev restart --headless --allow-browser-automation` (`browserCommandReady: true`), and there was no Vite overlay (`no-overlay.e2e.mjs` true).
    - `npm run typecheck` exit 0. `npm test`: 51 files, 717 tests passed (contrast 26, captions 5, plaqueColors 22, settings 20, hud 43).
    - `npm run test:e2e`: all 35 scripts, 284 PASS, 0 FAIL, exit 0 (`ticket15-e2e.log`). high-contrast 16/16: "High contrast: Off" fits on one line (10.95 x 2.25 cm, the same height as set-slow, on the 44 cm face), the label reads On, `"highContrast":true` is saved, the back panel, walls and header repaint with backings shown while the threads and `frame()` stay the same, a hovered toggle lights `#ffd23f` in high contrast and `#f2c14e` without it, the mode survives an in-frame reload, w4-06 (57 draw calls, 4 backings) and w2-06 (63 draw calls, 6 backings) have no budget breach, and a second press restores the starting `appearance()` exactly. color-rule 9/9: the azure cup was seen blinking (`flashes` 2), the amber cup never blinked, the walls ended on the wall colour, and w2-03 and w1-01 solves blinked no cup. melody-book 11/11: 6 star pulses for a 6-note melody, never more than one ahead of the `melody` cues over 14 polls, and 0 pulses on an unsolved level.
    - `npm run test:e2e:hands`: all 9 scripts, 64 PASS, 0 FAIL, exit 0 (`ticket15-hands.log`). xr-controls 21/21, including "pinching the high-contrast toggle turns high contrast on in XR" (`contrastToggle` in xr-probe's `PROBE_FIELDS`, tests/e2e/xr-probe.e2e.mjs:142; check at tests/e2e/xr-controls.sh:86-90).
    - `test:e2e:levels` 24/24 and `test:e2e:levels:slow` 24/24, exit 0. `test:e2e:dailies`: 7 dailies, 21/21 checks, exit 0.
    - `RUNS=3 npm run test:e2e:levels:robust`: "every level solved 3/3 in every condition", 558 of 558 drops (24 levels and 7 dailies, normal and slow, study pose and table at 0 and 90 degrees), exit 0 (`ticket15-levels-robust.log`, 66 minutes).
    - `NODE_ENV=production npm run build` exit 0 (bundle `assets/index-Brupejm_.js`). `npm run test:smoke`: 19 PASS, 0 FAIL, 5 NOTE, exit 0.
  - **Manual:** `browser_screenshot`s of w2-03 with the a-b thread, retaken on the final tree: `.scratch/week8/accessibility/w2-03-default.jpg` and `w2-03-high-contrast.jpg`. In high contrast the back panel is near-black, the pegs bright yellow, the coral thread and cream wall outlines stand out, and both glyphs sit on dark discs.
  - **Risks checked:** hover still shows in high contrast (above); the star pulse allocates nothing per frame; the backing geometry is shared; the placeholder text stays in `set-contrast` and hud.uikitml gained no `/* */`; "High contrast: On" is 10.73 cm, also one line.
