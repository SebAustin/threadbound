# 08: Enter XR that never misses, and a clear page without XR (P1)

**What to build:**
- **Enter XR on release, not `click`:** `src/panel.ts:50-54` listens for `click`. pmndrs pointer-events only fires `click` when the release comes within 300 ms of the press, on the same object (`node_modules/@pmndrs/pointer-events/dist/pointer.js:216`). Bind `xr-button` with `onTap` instead (`src/features/input/onTap.ts:21`, used the same way at `src/features/hud/settingsFace.ts:30` and `src/features/hud/HudSystem.ts:41`). A press of any length then enters XR, even if it drifts within the button. Delete `exit-button` and `exitXR` (`src/panel.ts:24, 49-54, 64`); gap-analysis §5 shows they can't be reached. After that, `panel.ts` has no `click` listeners left.
- **Resolve the mode once, then launch synchronously:** move the two `isSessionSupported` awaits out of the tap (`src/panel.ts:36-40`) and into `init()`. Cache the result, and resolve it again on `navigator.xr`'s `devicechange` event (put the teardown in `cleanupFuncs`). The tap then calls `world.launchXR` at once, guarded by `world.session == null && !world.sessionRequestPending`, while the press's user activation is still fresh.
- **Pure model:** extend `src/lib/xrMode.ts` with:
  - `entryView({ mode: ImmersiveMode | null | 'checking', launchFailed })`, returning `{ button, note }`;
  - `bootErrorMessage(error: unknown)`.

  The card and the DOM button both render from `entryView`. Nothing else decides this copy.
- **No XR in this browser:** when `resolveSessionMode` returns null, the card hides `xr-button`, and a new `xr-note` span reads "Open in Quest Browser to play in mixed reality". The `console.warn` at `src/panel.ts:42` goes. Flat mouse play doesn't change.
- **A failed request shows on screen:** IWSDK's `launchXR` turns a `requestSession` rejection into a `console.error` and nothing else (`node_modules/@iwsdk/core/dist/init/xr.js:308-325`). After a launch, if `sessionRequestPending` drops with no session, `xr-note` reads "Couldn't start XR - try Enter XR again" and the button stays.
- **Loading line and DOM fallback** (`index.html:12-15`), owned by a new runtime-only module `src/features/entry/bootScreen.ts`:
  - **Loading line:** a static `#boot` line ("Loading Threadbound...", `role="status"`) over an explicit dark-walnut body background (`#3d2f2a`, with cream `#f4ead8` text). The ~2.9 MB gzipped load never shows a blank white page.
  - **DOM button:** a real `<button id="enter-xr">` at the bottom centre. That keeps it away from IWER's pill at the top centre and of the card at the top left (`public/scenes/main.iwsdk.scene.json:46-51`). It calls the same launch and shows only when `entryView` offers the button. Without XR, `#boot` shows the same note instead.
  - **Never blocking mouse play:** once the game is up, the full-screen cover is removed, not just made transparent. The bottom bar is `pointer-events: none` everywhere except the button.
- **Boot failure shows on screen:** `src/index.ts:27-58` has no `.catch`. Chain one after the `.then`, so that a rejected `World.create`, or an error thrown while registering systems, shows `bootErrorMessage(error)` in `#boot`.
- **Restyle the card (gap 51):** `public/ui/welcome.uikitml:5-79` is the stock Horizon `Panel`/`Button`, with `#272727` text. Rebuild it from the plaque's palette and `.toggle` style (`public/ui/hud.uikitml:7-46, 86-102, 138-140`): a walnut header, a cream body and a brass border, with `xr-button` as a toggle-style span that has a `:hover` state. Keep the gesture sentence (`welcome.uikitml:62-65`).
- **Test hook:** add `welcome()` to `src/features/debug/testHook.ts`. It returns:
  - the card's `entryView`, mirrored on `panel.userData.entry` the way the plaque mirrors `userData.hud` (`src/features/hud/HudSystem.ts:121`);
  - each element's screen position, using the `plaqueElement` pattern (`testHook.ts:199-203`).
- **Production XR run (ticket 02):** the restyle moves `xr-button`, so the Enter XR canvas point in `tests/e2e/fixtures/prod-xr-w1-01.json` goes stale, and `tests/e2e/prod-xr.mjs` logs a FAIL and exits 1. Switch its entry to a real click on `#enter-xr` once it's visible (`page.locator('#enter-xr').click()`), which needs no canvas coordinates. Drop the Enter XR point from the fixture. The 5 s pass rule and the `grantOfferedSession()` fallback stay. The card's own Enter XR stays proven on the dev server by `enter-xr.sh`.

**Blocked by:** 02 (merge after its step-4 log push; also for the prod-xr change). The rest can start at once on a branch in its own worktree (02).

**Status:** done

- [x] Unit: in `tests/unit/xrMode.test.ts`, `entryView`:
  - shows the button and no note for either immersive mode;
  - shows no button and exactly "Open in Quest Browser to play in mixed reality" for null;
  - shows nothing while checking;
  - shows the button and the retry note after a failed launch.
- [x] Unit: `bootErrorMessage` gives a short, plain line with the reason for an `Error`, and a generic line for a string, `undefined` or an object. It never includes a stack.
- [x] Unit: new `tests/unit/onTap.test.ts`, with a fake target:
  - a press released after any delay fires once;
  - a release from another pointer doesn't fire;
  - the teardown removes both listeners.
- [x] Unit: `index.html` has the `#boot` loading line and an explicit body background that isn't white.
- [x] E2E: new `tests/e2e/enter-xr.sh`, using `fresh_page` and `settle session` from `xr-lib.sh`:
  - a real mouse press on the card's Enter XR, held 800 ms and drifting 3 px inside the button, starts an IWER session (`room().blendMode` isn't null);
  - after `xr_stop`, the card and `#enter-xr` are back, and a second long press enters again;
  - after a fresh `fresh_page`, focusing `#enter-xr` and pressing Enter starts a session. This proves the DOM path without the canvas.
- [x] E2E: new `no-xr.e2e.mjs`. With `navigator.xr.isSessionSupported` stubbed to return false and a `devicechange` dispatched:
  - the card and `#boot` show the Quest Browser line, and `#enter-xr` is hidden;
  - a press where the button was starts no session and logs no console error;
  - a real mouse drag from a to b on level 1 still makes the thread.

  Removing the stub brings back "Enter XR".
- [x] E2E: in the same script, with `requestSession` stubbed to reject, a long press shows "Couldn't start XR - try Enter XR again" and starts no session.
- [x] E2E: new `boot-screen.e2e.mjs`:
  - after an in-frame reload (the pattern at `first-melody.e2e.mjs:21-26`), the loading line is gone once the hook is ready, and `elementFromPoint` hits the canvas at both the card and peg a;
  - with `scenes/main.iwsdk.scene.json` aborted through `page.route`, `#boot` shows the boot error.
- [x] E2E: whichever of 05 and 08 lands second makes ticket 05's `tests/e2e/shot-preflight.e2e.mjs` hide `#enter-xr` in browser-view shots, and `npm run test:e2e:shots` fails while it shows.
- [x] In `package.json`, add `no-xr` and `boot-screen` to `test:e2e`, and `enter-xr.sh` to `test:e2e:hands`.
- [x] XR: after `NODE_ENV=production npm run build`, `npm run test:e2e:prod-xr` passes on the local preview. It enters AR through the click on `#enter-xr`, without the `grantOfferedSession()` fallback, and `tests/unit/prodXrTargets.test.ts` stays green (it checks only the knob and chute points).
- [x] Manual: run `npm run build && npm run preview` in desktop Chrome with no headset and no emulator. Expect the loading line, then the Quest Browser line, and a clean console. (user: see Comments for a headless stand-in run)

**Effort:** M (~1.5 days)

**Gaps closed:** #7, #48, #51, #59, and follow-up "On a non-XR browser, Enter XR fails silently"

**Risks:**
- **User activation:** `requestSession` needs transient user activation. A mouse press starts it, and Chrome keeps it for about 5 s, which is why the mode is resolved before the tap. A hold longer than that fails, and the retry note covers it.
- **Real pinch unproven:** IWER can't show how Quest Browser delivers a long hand pinch to a 2D page. Confirm it on the production XR smoke test or on a tester's device.
- **Card load:** UIKit spans that start empty never lay out text, so give `xr-note` placeholder text in `welcome.uikitml`. Notes in its `<style>` must use `<!-- -->`, never `/* */`. Otherwise the card fails to load and `PanelSystem` returns early (`src/panel.ts:25-27`), which leaves only the DOM button.
- **Boot-error test:** if aborting the scene JSON makes `World.create` hang instead of reject, block the first request whose failure does reject it, and record which one in Comments.

## Comments

- **Oct 23, agent: landed locally on main as one commit; nothing pushed.** 02 and 05 had both landed (02's step-4 push is done, 05 is in), so 08 lands second and adds the `#enter-xr` hiding to 05's preflight.
- **Where things are:**
  - model: `entryView` src/lib/xrMode.ts:43, `bootErrorMessage` :58, the two notes :35-36.
  - PanelSystem (src/panel.ts): the mode resolved in `init()` and again on `devicechange` (:41-43, teardown in `cleanupFuncs`), `onTap` on `xr-button` (:44), the DOM button's launch (:45), the failed-launch watch in `update()` (:54), `resolveMode` (:62), the synchronous guarded `launch` (:71-77), `render` from `entryView` (:81). `exit-button`, `exitXR` and every `click` listener are gone, and so is the "no immersive session mode" `console.warn`.
  - shell: src/features/entry/bootScreen.ts (`ready` :24 removes `#boot-cover`, `fail` :33, `showEntry` :43, `onEnter` :49); index.html's walnut body (`#3d2f2a`, cream `#f4ead8`), `#boot` (`role="status"`), `#boot-cover`, and the bottom bar (`pointer-events: none`, only `#enter-xr` takes `auto`).
  - src/index.ts: `bootScreen.ready()` after the last system registers (:51), and the `.catch` after the `.then` (:64), which also logs the error.
  - card: public/ui/welcome.uikitml rebuilt from the plaque (walnut header, cream body, 3px brass border, `xr-button` as a toggle span with `:hover` and `:active`, `xr-note` with placeholder text, notes only in `<!-- -->`). The gesture sentence is unchanged.
  - test hook: `welcome()` src/features/debug/testHook.ts:202 returns `{ entry, visible, elements }` for `welcome-card`, `xr-button` and `xr-note`; `entry` mirrors `panel.userData.entry`. `plaqueElement` now shares `locateElement` with it.
  - E2E: tests/e2e/enter-xr.sh with its helper enter-xr.e2e.mjs (STEP press/key/state), no-xr.e2e.mjs, boot-screen.e2e.mjs, entry-notes.mjs (the notes mirrored for Playwright); lib.mjs gains `longPress`, `clearOverCanvas` (split out of `clickCanvas`, same behaviour), `welcomeElementAt` (shares `steadyPoint` with `plaqueElementAt`) and `entryState`.
  - preflight: shot-preflight.e2e.mjs:33-36 hides `#enter-xr` in browser-view shots only; in XR the game hides it, so `visibleChrome` still catches one that shows in a session.
  - prod-xr: tests/e2e/prod-xr.mjs:144 `clickEnterXr` waits for `#enter-xr` and clicks it (`page.locator('#enter-xr').click()`); the 5 s rule and the `grantOfferedSession()` fallback are unchanged. The fixture drops `enterXr`, and prodXrTargets.test.ts's Enter XR point test became "the fixture carries no Enter XR point".
- **Decisions beyond the ticket text:**
  - **A failed launch** is caught by a `launching` flag that `update()` clears once `sessionRequestPending` drops: no session then means `launchFailed`. That also covers a `requestSession` that throws synchronously. `update()` does nothing else and allocates nothing.
  - **The DOM button hides during a session**, like the card's button. XR shots rely on that (their preflight would report it as chrome).
  - **The note's text is never blanked:** an empty note is `display: none` only, because a span emptied once may not lay out its next text (the empty-span gotcha).
  - **The bar sits below the ledge.** On all 24 levels the ledge buttons project at y 425 of the 469 px managed canvas (sun at x 319, Next at x 503). The button is 13 px text with 4 px padding, 6 px from the bottom: x 334-422, y 435-463. It overlaps none of them.
  - **Boot-error test:** aborting `scenes/main.iwsdk.scene.json` makes `World.create` reject ("Failed to fetch"), with no hang, so the scene JSON is the request it blocks. #boot then read "Threadbound couldn't start: Failed to fetch. Reload the page to try again."
  - `bootErrorMessage` quotes the first line of an Error's message, capped at 80 characters; a string, `undefined`, an object or an empty Error get the generic line.
  - `isSupported`'s `console.warn` for a query that throws stays: only the "no mode" warning was the one to go.
  - tests/unit/e2eDefaults.test.ts now also checks entry-notes.mjs against `entryView` and `bootErrorMessage`, as it does for `DEFAULT_SETTINGS`.
- **Red first** (logs `.scratch/week8/logs/08-*-red.log`, gitignored):
  - unit, before the model and the page shell: 16 failed (entryView 6, bootErrorMessage 7, index.html 3). onTap.test.ts passed at once (8 tests): `onTap` already behaves, so its red is the panel's old `click`, shown next.
  - E2E against the old panel, card and index.html (only the `welcome()` hook was in): enter-xr.sh 0/4, and the 800 ms drifting press at (115, 122) on the old card's Enter XR started no session; no-xr 3 PASS, 5 FAIL; boot-screen 0/3.
  - With `#enter-xr` in the page but before the preflight hid it, `shot.sh study` took its do-not-record branch (exit 1) with chrome `["#enter-xr"]`. Afterwards: `hid ["Enter XR pill", "#enter-xr"]`, chrome `[]`, start recording.
- **Evidence, Oct 23, all on the final tree** (logs `.scratch/week8/logs/08-*.log`, gitignored, so this entry is the committed evidence):
  - unit: `npm run typecheck` exit 0; `npm run coverage`: 38 files, 384 tests, 96.49 % statements, 95.01 % branches, 98.75 % functions, 97.19 % lines, exit 0.
  - `npm run test:e2e`: all 26 scripts, 148 PASS, 0 FAIL, exit 0. That is 137 before plus no-xr 8 and boot-screen 3.
    - no-xr: the card and #boot read "Open in Quest Browser to play in mixed reality", #enter-xr hidden; a long press where Enter XR was started no session and logged no console error; a mouse drag a (251, 266) to b (410, 336) made the thread; removing the stub brought Enter XR back on the card and as #enter-xr; with `requestSession` rejecting, a long press showed "Couldn't start XR - try Enter XR again", kept both buttons and started no session.
    - boot-screen: after the in-frame reload the cover is gone and #boot hidden; `elementFromPoint` hit the canvas at the card (115, 82) and at peg a (251, 266); the aborted scene showed the boot error in #boot.
  - `npm run test:e2e:hands`: 28 PASS, exit 0: hand-pinch 5, xr-full-level 5, xr-controls 9, xr-hosts 2, gaze-pinch 3 and enter-xr 4 (long press enters, both buttons back after `xr_stop`, a second long press enters, Enter on the focused #enter-xr enters). iwsdk.config.json had no changes afterwards.
  - `npm run test:e2e:shots`: 43 PASS, 0 FAIL, exit 0 (browser-view shots now hide #enter-xr; XR shots find it hidden by the game).
  - `npm run test:e2e:levels` 24/24 exit 0; `npm run test:e2e:levels:slow` 24/24 exit 0; `npm run test:e2e:dailies` 7/7 exit 0. Run because the bottom bar sits over the canvas, though no physics, level or thread code changed.
  - `NODE_ENV=production npm run build` exit 0; `npm run test:smoke`: 18 PASS, 0 FAIL, 5 NOTE in 10.4 s.
  - `npm run test:e2e:prod-xr` on the local preview: 14 PASS, 0 FAIL, 6 NOTE in 14.0 s, exit 0. `PASS the Enter XR click starts an immersive-ar session — #enter-xr: mode immersive-ar, blend alpha-blend, offer still pending: true`, so the click started it and the fallback never ran. Level 1 solved by hand pinch only (`best['w1-01']` 3, melody 3 notes). prodXrTargets.test.ts is green.
  - Before each dev-server run: no Vite overlay (`no-overlay.e2e.mjs` true), and the server stayed headless with browser automation (`browserCommandReady: true`).
  - UI checks (iwsdk-ui): `ui inspect` shows `#xr-button` displayed with "Enter XR" and `#xr-note` `display: none` on a 344 x 225 card; a preview and a runtime capture were checked by eye (card in the plaque's palette, top left; #enter-xr bottom centre, clear of the ledge). Not committed.
- **Open for the user: the Manual box.** Run `npm run build && npm run preview` in desktop Chrome with no headset and no emulator. Expect "Loading Threadbound..." on walnut, then "Open in Quest Browser to play in mixed reality" at the bottom centre with no Enter XR, and a clean console.
  - A headless stand-in (plain Chromium, no IWER, against the production preview, not committed) saw exactly that: "Loading Threadbound..." over `rgb(61, 47, 42)` with the cover up, then the Quest Browser line with #enter-xr hidden. The console held only IWSDK's banner and Chromium's "GPU stall due to ReadPixels" warnings from its screenshot. It doesn't replace the headed check.
- **Not proven here:** a real long hand pinch on Quest Browser's 2D page (the ticket's risk). Confirm it on the production XR smoke or a tester's device; the forum post already asks testers for a long pinch on Enter XR.
- **Manual check (user, Oct 25):** the user ran `npm run build && npm run preview` in desktop Chrome with no headset and no emulator, opened https://localhost:4173/, and confirmed the expected result ("yes"): the loading line, then the Quest Browser line, and a clean console. The build included ticket 11's work in progress, which doesn't affect this check.
