// E2E (week 8 ticket 08): the page shell around the game. After a cold start the loading screen is
// gone, not just see-through, so mouse play reaches the canvas; and a boot that fails says so in
// #boot instead of leaving a blank page.
import { checks, hookReady, waitFor, welcomeElementAt } from './lib.mjs';
import { BOOT_ERROR_START } from './entry-notes.mjs';

const BOOT_TIMEOUT_MS = 15000;
/** The request the boot-error check aborts: World.create rejects without its scene. */
const SCENE_ROUTE = '**/scenes/main.iwsdk.scene.json*';

/** Page function: what the shell shows. The cover only counts while it is in the DOM. */
const shellState = () => {
  const boot = document.getElementById('boot');
  const shown = boot ? boot.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) : false;
  return { cover: Boolean(document.getElementById('boot-cover')), hasBoot: Boolean(boot), bootShown: shown, bootText: boot?.textContent.trim() ?? null };
};

/** Page function: the element under each canvas-relative point, and whether it is the canvas. */
const hitsAt = (points) => {
  const canvas = document.querySelector('canvas');
  const box = canvas.getBoundingClientRect();
  return points.map(({ x, y }) => {
    const el = document.elementFromPoint(box.x + x, box.y + y);
    return { at: [Math.round(x), Math.round(y)], canvas: el === canvas, hit: el ? `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}` : null };
  });
};

/** Reloads the app frame and waits for the new page (a marker tells the old page from the new one). */
async function reloadFrame(app, ready, timeoutMs = BOOT_TIMEOUT_MS, arg = undefined) {
  await app.evaluate(() => {
    window.__beforeReload = true;
    location.reload();
  }).catch(() => {});
  return waitFor(app, ready, timeoutMs, arg);
}

async function coldStartChecks(app, check) {
  const up = await reloadFrame(app, () => !window.__beforeReload && Boolean(window.__threadbound?.state().level));
  const shell = await app.evaluate(shellState);
  check('the loading line is gone once the game is up, and its cover removed', up && shell.hasBoot && !shell.bootShown && !shell.cover, JSON.stringify(shell));
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'load', index: 0 }));
  await waitFor(app, () => window.__threadbound.state().levelIndex === 0, 5000);
  const card = await welcomeElementAt(app, 'welcome-card');
  const [pegA] = await app.evaluate(() => window.__threadbound.pegs());
  const hits = card && pegA ? await app.evaluate(hitsAt, [card, pegA]) : [];
  check('elementFromPoint hits the canvas at the card and at peg a', hits.length === 2 && hits.every((h) => h.canvas), JSON.stringify(hits));
}

async function bootErrorChecks(page, app, check) {
  const aborted = [];
  await page.route(SCENE_ROUTE, (route) => {
    aborted.push(route.request().url());
    return route.abort();
  });
  try {
    const failed = await reloadFrame(
      app,
      (start) => !window.__beforeReload && document.getElementById('boot')?.textContent.trim().startsWith(start),
      BOOT_TIMEOUT_MS,
      BOOT_ERROR_START,
    ).catch(() => false);
    const shell = await app.evaluate(shellState);
    check(
      'with the scene request aborted, #boot shows the boot error',
      failed && shell.bootShown && String(shell.bootText ?? "").startsWith(BOOT_ERROR_START),
      `${shell.bootText}; aborted: ${aborted.map((u) => new URL(u).pathname).join(', ') || 'nothing'}`,
    );
  } finally {
    await page.unroute(SCENE_ROUTE);
    await reloadFrame(app, () => !window.__beforeReload && Boolean(window.__threadbound?.state().level));
  }
}

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  await waitFor(app, hookReady, BOOT_TIMEOUT_MS);
  await coldStartChecks(app, check);
  await bootErrorChecks(page, app, check);
  return results;
}
