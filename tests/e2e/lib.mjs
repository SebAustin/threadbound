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

export async function loadIndex(app, index) {
  await app.evaluate((i) => window.__threadbound.dispatch({ type: 'load', index: i }), index);
  await sleep(250);
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

/** Records `[Threadbound]` dev logs for failure diagnostics. */
export function captureLogs(page) {
  const logs = [];
  page.on('console', (m) => m.text().includes('[Threadbound]') && logs.push(m.text()));
  return logs;
}
