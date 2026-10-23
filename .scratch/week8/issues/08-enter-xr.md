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

**Status:** ready-for-agent

- [ ] Unit: in `tests/unit/xrMode.test.ts`, `entryView`:
  - shows the button and no note for either immersive mode;
  - shows no button and exactly "Open in Quest Browser to play in mixed reality" for null;
  - shows nothing while checking;
  - shows the button and the retry note after a failed launch.
- [ ] Unit: `bootErrorMessage` gives a short, plain line with the reason for an `Error`, and a generic line for a string, `undefined` or an object. It never includes a stack.
- [ ] Unit: new `tests/unit/onTap.test.ts`, with a fake target:
  - a press released after any delay fires once;
  - a release from another pointer doesn't fire;
  - the teardown removes both listeners.
- [ ] Unit: `index.html` has the `#boot` loading line and an explicit body background that isn't white.
- [ ] E2E: new `tests/e2e/enter-xr.sh`, using `fresh_page` and `settle session` from `xr-lib.sh`:
  - a real mouse press on the card's Enter XR, held 800 ms and drifting 3 px inside the button, starts an IWER session (`room().blendMode` isn't null);
  - after `xr_stop`, the card and `#enter-xr` are back, and a second long press enters again;
  - after a fresh `fresh_page`, focusing `#enter-xr` and pressing Enter starts a session. This proves the DOM path without the canvas.
- [ ] E2E: new `no-xr.e2e.mjs`. With `navigator.xr.isSessionSupported` stubbed to return false and a `devicechange` dispatched:
  - the card and `#boot` show the Quest Browser line, and `#enter-xr` is hidden;
  - a press where the button was starts no session and logs no console error;
  - a real mouse drag from a to b on level 1 still makes the thread.

  Removing the stub brings back "Enter XR".
- [ ] E2E: in the same script, with `requestSession` stubbed to reject, a long press shows "Couldn't start XR - try Enter XR again" and starts no session.
- [ ] E2E: new `boot-screen.e2e.mjs`:
  - after an in-frame reload (the pattern at `first-melody.e2e.mjs:21-26`), the loading line is gone once the hook is ready, and `elementFromPoint` hits the canvas at both the card and peg a;
  - with `scenes/main.iwsdk.scene.json` aborted through `page.route`, `#boot` shows the boot error.
- [ ] E2E: whichever of 05 and 08 lands second makes ticket 05's `tests/e2e/shot-preflight.e2e.mjs` hide `#enter-xr` in browser-view shots, and `npm run test:e2e:shots` fails while it shows.
- [ ] In `package.json`, add `no-xr` and `boot-screen` to `test:e2e`, and `enter-xr.sh` to `test:e2e:hands`.
- [ ] XR: after `NODE_ENV=production npm run build`, `npm run test:e2e:prod-xr` passes on the local preview. It enters AR through the click on `#enter-xr`, without the `grantOfferedSession()` fallback, and `tests/unit/prodXrTargets.test.ts` stays green (it checks only the knob and chute points).
- [ ] Manual: run `npm run build && npm run preview` in desktop Chrome with no headset and no emulator. Expect the loading line, then the Quest Browser line, and a clean console.

**Effort:** M (~1.5 days)

**Gaps closed:** #7, #48, #51, #59, and follow-up "On a non-XR browser, Enter XR fails silently"

**Risks:**
- **User activation:** `requestSession` needs transient user activation. A mouse press starts it, and Chrome keeps it for about 5 s, which is why the mode is resolved before the tap. A hold longer than that fails, and the retry note covers it.
- **Real pinch unproven:** IWER can't show how Quest Browser delivers a long hand pinch to a 2D page. Confirm it on the production XR smoke test or on a tester's device.
- **Card load:** UIKit spans that start empty never lay out text, so give `xr-note` placeholder text in `welcome.uikitml`. Notes in its `<style>` must use `<!-- -->`, never `/* */`. Otherwise the card fails to load and `PanelSystem` returns early (`src/panel.ts:25-27`), which leaves only the DOM button.
- **Boot-error test:** if aborting the scene JSON makes `World.create` hang instead of reject, block the first request whose failure does reject it, and record which one in Comments.

## Comments
