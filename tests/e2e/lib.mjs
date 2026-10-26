// Shared helpers for the Playwright E2E scripts (run via `npx @iwsdk/cli browser run`).
// Predicates passed to `waitFor` run inside the app frame, so they must be self-contained.

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Polls `predicate` inside the app frame until it is truthy or `timeoutMs` passes. */
export async function waitFor(app, predicate, timeoutMs, arg) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await app.evaluate(predicate, arg)) return true;
    await sleep(150);
  }
  return false;
}

export const isComplete = () => window.__threadbound.state().status === 'complete';
export const hookReady = () => Boolean(window.__threadbound?.state().level);
/** True once a resetProgress has landed: level 1, no stars. */
export const freshSave = () => {
  const s = window.__threadbound.state();
  return s.levelIndex === 0 && Object.keys(s.progress.best).length === 0 && s.threads.length === 0;
};

/** Collects PASS/FAIL checks in the shape run.sh prints. */
export function checks() {
  const results = [];
  return { results, check: (name, pass, detail = '') => results.push({ name, pass, detail }) };
}

/** Loads a level by id through the same command bus the player's buttons use. */
export async function loadLevel(app, id) {
  const index = await app.evaluate((levelId) => window.__threadbound.levels().findIndex((l) => l.id === levelId), id);
  if (index < 0) throw new Error(`unknown level ${id}`);
  await loadIndex(app, index);
  return index;
}

/**
 * Reloads the app's own frame (`search` null), or navigates it to `search` on the same path ('' is
 * the plain URL), then waits for the new page's game. The managed window hosts the app in an iframe
 * whose handle survives navigation; a marker on the old page tells it apart from the new one
 * (resume-insert.e2e.mjs). Resolves the new page's `location.search`, or null if it never came up.
 */
export async function navigateApp(app, search = null, timeoutMs = 15000) {
  await app
    .evaluate((s) => {
      window.__beforeNavigation = true;
      if (s === null) location.reload();
      else location.href = location.pathname + s;
    }, search)
    .catch(() => {});
  const up = await waitFor(app, () => !window.__beforeNavigation && Boolean(window.__threadbound?.state().level), timeoutMs);
  return up ? app.evaluate(() => location.search) : null;
}

/** Frames the ECS needs after a build to create physics bodies and wire pointer listeners. */
const SETTLE_FRAMES = 4;

export async function loadIndex(app, index) {
  await app.evaluate((i) => window.__threadbound.dispatch({ type: 'load', index: i }), index);
  if (!(await waitFor(app, (i) => window.__threadbound.state().levelIndex === i, 5000, index))) {
    throw new Error(`level ${index} did not load`);
  }
  const { complete, rendered } = await frames(app, SETTLE_FRAMES);
  if (!complete) throw new Error(`level ${index}: frames stalled (rendered ${rendered} of ${SETTLE_FRAMES} in 1 s)`);
}

/**
 * Opens daily puzzle `pool` (its index in DAILY_LEVELS) fresh, like loadIndex for the campaign.
 * A daily's level index follows the campaign's (src/levels/index.ts PLAYABLE).
 */
export async function loadDaily(app, pool) {
  await app.evaluate((i) => window.__threadbound.dispatch({ type: 'daily', index: i }), pool);
  const opened = (i) => {
    const hook = window.__threadbound;
    return hook.state().levelIndex === hook.levels().length + i;
  };
  if (!(await waitFor(app, opened, 5000, pool))) throw new Error(`daily ${pool} did not open`);
  const { complete, rendered } = await frames(app, SETTLE_FRAMES);
  if (!complete) throw new Error(`daily ${pool}: frames stalled (rendered ${rendered} of ${SETTLE_FRAMES} in 1 s)`);
}

/**
 * Waits for `n` rendered frames, for at most 1 s so a hidden page can't hang a test.
 * Reports whether all `n` ran (`complete`) and how many did (`rendered`).
 */
export async function frames(app, n) {
  return app.evaluate(
    (count) =>
      new Promise((resolve) => {
        let rendered = 0;
        const done = () => resolve({ complete: rendered === count, rendered });
        const timeout = setTimeout(done, 1000);
        const step = () => {
          if (rendered === count) {
            clearTimeout(timeout);
            done();
            return;
          }
          requestAnimationFrame(() => {
            rendered += 1;
            step();
          });
        };
        step();
      }),
    n,
  );
}

/**
 * Ticket 18: where shot.sh's seated passthrough pose stands the diorama, the emulator's dining
 * table (frame centre, world meters), and the turns every stored solution is proven at there:
 * 0, and the seated pose's own turn of about 90 degrees (1.5705 rad). At yaw 0 every body sits
 * exactly in one channel plane, so no marble ever leaves it. At any other turn rounding tips
 * marbles off a thread's crest against the glass, as on a player's own table. Exactly pi/2
 * rounds almost as cleanly as 0 (its cosine is 6e-17), so it would hide the defect.
 */
export const TABLE_CENTER = [-1.242, 0.801, 0.2];
export const TABLE_YAWS = [0, 1.5705];

/**
 * Stands the open level on the table at `yaw` through passthrough's own `place` command (the
 * frame origin is the base's left end, half the level's width from the centre), then rebuilds
 * it fresh there with `reopen` (a page function), and waits for its physics bodies.
 */
export async function placeOnTable(app, yaw, reopen, arg) {
  await app.evaluate(
    ({ center, yaw }) => {
      const hook = window.__threadbound;
      const half = hook.state().level.size[0] / 2;
      const origin = [center[0] - half * Math.cos(yaw), center[1], center[2] + half * Math.sin(yaw)];
      hook.dispatch({ type: 'place', origin, yaw, surface: 'table' });
    },
    { center: TABLE_CENTER, yaw },
  );
  if (!(await waitFor(app, (y) => Math.abs(window.__threadbound.frame().yaw - y) < 1e-6, 3000, yaw))) {
    throw new Error(`the diorama did not turn to yaw ${yaw}`);
  }
  await app.evaluate(reopen, arg);
  await frames(app, SETTLE_FRAMES);
}

/** Page functions for placeOnTable's `reopen`: a campaign level by index, a daily by pool index. */
export const reopenLevel = (index) => window.__threadbound.dispatch({ type: 'load', index });
export const reopenDaily = (pool) => window.__threadbound.dispatch({ type: 'daily', index: pool });

/** Slow motion on or off through the settings command, as the player's toggle does. */
export const setSlowMotion = (app, slow) =>
  app.evaluate((s) => window.__threadbound.dispatch({ type: 'settings', patch: { slowMotion: s } }), slow);

/**
 * Negative control: opens a level fresh with `open(app)` (presets untouched, no player threads),
 * drops, and reports whether it solved itself within 6 s. levels.e2e.mjs proves no level does;
 * levels-robust.e2e.mjs runs it first so its drops follow the same steps as that proof's.
 */
export async function solvesUntouched(app, open) {
  await open(app);
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'drop' }));
  return waitFor(app, isComplete, 6000);
}

/** Back to the study pose (the default spot on the virtual study's table, yaw 0). */
export async function leaveTable(app) {
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetPlacement' }));
  await waitFor(app, () => window.__threadbound.frame().yaw === 0, 3000);
}

/** True once a drop is over, solved or not (page function). */
export const dropEnded = () => window.__threadbound.state().status !== 'dropping';

/** Hangs the open level's stored solution, drops, and reports whether it solved within `timeoutMs`. */
export async function solveAndDrop(app, timeoutMs) {
  await app.evaluate(() => {
    window.__threadbound.solve();
    window.__threadbound.dispatch({ type: 'drop' });
  });
  await waitFor(app, dropEnded, timeoutMs);
  return app.evaluate(isComplete);
}

/** Page-coordinate converter for canvas-relative points from the test hook. */
export async function canvasMapper(app) {
  const el = await app.frameElement().catch(() => null);
  const fb = el ? await el.boundingBox() : { x: 0, y: 0 };
  const cb = await app.locator('canvas').first().boundingBox();
  return (p) => [fb.x + cb.x + p.x, fb.y + cb.y + p.y];
}

/** Real mouse drag in `steps` moves (0 = a single jump), like a pinch-pull. */
export async function drag(page, from, to, steps = 10) {
  await page.mouse.move(...from);
  await sleep(80);
  await page.mouse.down();
  for (let i = 1; i <= Math.max(1, steps); i++) {
    const t = steps === 0 ? 1 : i / steps;
    await page.mouse.move(from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t);
    await sleep(16);
  }
  await page.mouse.up();
}

/** Click with a lead-in move: the screen pointer only re-targets on pointermove. */
export async function click(page, [x, y]) {
  await page.mouse.move(x - 4, y - 4);
  await page.mouse.move(x, y);
  await page.mouse.click(x, y);
}

/**
 * Long press with a lead-in move: down, hold `holdMs` while drifting `driftPx` right and down
 * in small steps (a wobbly pinch), then release where the drift ended.
 */
export async function longPress(page, [x, y], { holdMs = 800, driftPx = 3 } = {}) {
  const STEPS = 4;
  await page.mouse.move(x - 4, y - 4);
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= STEPS; i++) {
    await sleep(holdMs / (STEPS + 1));
    await page.mouse.move(x + (driftPx * i) / STEPS, y + (driftPx * i) / STEPS);
  }
  await sleep(holdMs / (STEPS + 1));
  await page.mouse.up();
}

/**
 * Makes sure no emulator chrome sits on top of a canvas-relative point. IWER draws
 * its floating "Enter XR" pill inside a shadow root in the app document, invisible
 * to elementFromPoint, so overlays are found by piercing shadow roots. That chrome
 * only exists in the desktop emulator view.
 */
export async function clearOverCanvas(app, point) {
  await app.evaluate(({ x, y }) => {
    const canvas = document.querySelector('canvas');
    const box = canvas.getBoundingClientRect();
    const px = box.x + x;
    const py = box.y + y;
    const deepest = () => {
      let el = document.elementFromPoint(px, py);
      while (el?.shadowRoot) {
        const inner = el.shadowRoot.elementFromPoint(px, py);
        if (!inner || inner === el) break;
        el = inner;
      }
      return el;
    };
    for (let i = 0; i < 20; i++) {
      const hit = deepest();
      if (!hit || hit === canvas || hit.contains(canvas)) break;
      hit.style.pointerEvents = 'none';
    }
  }, point);
}

/** Click a canvas-relative point once no emulator chrome sits on top of it (clearOverCanvas). */
export async function clickCanvas(page, app, at, point) {
  await clearOverCanvas(app, point);
  await click(page, at(point));
}

/** Records `[Threadbound]` dev logs for failure diagnostics. */
export function captureLogs(page) {
  const logs = [];
  page.on('console', (m) => m.text().includes('[Threadbound]') && logs.push(m.text()));
  return logs;
}

/** Polls `read` for a screen point until two reads in a row agree (within half a pixel), or null. */
async function steadyPoint(read, timeoutMs) {
  let last = null;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const p = await read();
    if (p && last && Math.abs(p.x - last.x) < 0.5 && Math.abs(p.y - last.y) < 0.5) return p;
    last = p;
    await sleep(100);
  }
  return null;
}

/**
 * Screen position of a plaque element once UIKit has laid it out (a face that was
 * just shown reports a stale position for a frame or two): two equal reads in a row.
 */
export function plaqueElementAt(app, id, timeoutMs = 3000) {
  return steadyPoint(() => app.evaluate((elementId) => window.__threadbound.plaqueElement(elementId), id), timeoutMs);
}

/** Screen position of a welcome-card element ('welcome-card', 'xr-button', 'xr-note') once laid out. */
export function welcomeElementAt(app, id, timeoutMs = 3000) {
  return steadyPoint(
    () => app.evaluate((elementId) => window.__threadbound.welcome()?.elements[elementId] ?? null, id),
    timeoutMs,
  );
}

/**
 * Page function: where the player can enter XR. The card's entryView and visibility, the
 * DOM #boot line's text when shown (null when hidden), whether #enter-xr is shown, and the
 * session's blend mode (null outside XR).
 */
export const entryState = () => {
  const hook = window.__threadbound;
  const welcome = hook.welcome();
  const shown = (el) =>
    Boolean(el) && el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && el.getBoundingClientRect().width > 0;
  const boot = document.getElementById('boot');
  return {
    card: welcome ? { visible: welcome.visible, button: welcome.entry?.button ?? null, note: welcome.entry?.note ?? null } : null,
    boot: shown(boot) ? boot.textContent.trim() : null,
    domButton: shown(document.getElementById('enter-xr')),
    session: hook.room().blendMode,
  };
};
