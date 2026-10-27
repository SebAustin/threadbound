// E2E (real input): high contrast. The settings face's toggle repaints the diorama and the
// plaque in place (no rebuild: the threads and the frame stay), is remembered across a
// reload, keeps the busiest levels within the draw-call budget with every glyph backed,
// still lights a hovered toggle, and a second press restores the default look exactly.
import { canvasMapper, checks, click, clickCanvas, loadLevel, navigateApp, plaqueElementAt, sleep, waitFor } from './lib.mjs';

const KEY = 'threadbound.settings.v1';
/** plaqueColors(true).toggleHover / .toggle and plaqueColors(false).toggleHover in src/lib/colors.ts. */
const BOLD_TOGGLE = { rest: '#ffffff', hover: '#ffd23f' };
const PLAIN_TOGGLE_HOVER = '#f2c14e';
/** Layout rounding (0.01 mm). */
const SLACK = 1e-5;

const appearance = () => window.__threadbound.appearance();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Page function: the look, the threads and the frame, which a repaint must leave alone. */
const scene = () => {
  const hook = window.__threadbound;
  return { appearance: hook.appearance(), threads: hook.state().threads, frame: hook.frame() };
};

async function openSettings({ page, app, at }) {
  if ((await app.evaluate(() => window.__threadbound.plaque()?.face)) === 'settings') return true;
  await click(page, at(await app.evaluate(() => window.__threadbound.button('settings'))));
  return waitFor(app, () => window.__threadbound.plaque()?.face === 'settings', 2000);
}

/** Presses the settings face's high-contrast toggle; true once the setting and the look read `want`. */
async function pressContrast({ page, app, at }, want) {
  const toggle = await plaqueElementAt(app, 'set-contrast');
  if (!toggle) return false;
  await clickCanvas(page, app, at, toggle);
  const landed = (w) => window.__threadbound.state().settings.highContrast === w && window.__threadbound.appearance().highContrast === w;
  return waitFor(app, landed, 2000, want);
}

/** The toggle's background while the mouse rests on it, then once the mouse has moved off. */
async function hoverBackground({ page, app, at }) {
  const toggle = await plaqueElementAt(app, 'set-contrast');
  const [x, y] = at(toggle);
  await page.mouse.move(x - 3, y - 3);
  await page.mouse.move(x, y);
  await sleep(300);
  const over = await app.evaluate(() => window.__threadbound.plaqueElement('set-contrast')?.background);
  await page.mouse.move(x, y + 400);
  await sleep(300);
  const off = await app.evaluate(() => window.__threadbound.plaqueElement('set-contrast')?.background);
  return { over, off };
}

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  const ctx = { page, app, check, at: await canvasMapper(app) };
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'settings', patch: { highContrast: false } }));
  try {
    const before = await turnOn(ctx);
    if (!before) return results;
    await survivesReload(ctx, before);
    await busiestLevels(ctx);
    await turnOff(ctx, before);
  } finally {
    // Leave the browser as the other scripts expect it, even after a failure.
    await app.evaluate(() => window.__threadbound.dispatch({ type: 'settings', patch: { highContrast: false } })).catch(() => {});
  }
  return results;
}

/** The first press: on, labelled, saved, repainted in place. Returns the starting scene and the high-contrast look. */
async function turnOn(ctx) {
  const { app, check } = ctx;
  await loadLevel(app, 'w1-01');
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' }));
  await waitFor(app, () => window.__threadbound.state().threads.length === 1, 2000);
  const start = await app.evaluate(scene);
  check('the settings button opens the settings face', await openSettings(ctx));
  await labelFits(ctx, 'High contrast: Off');
  check('the default toggle still lights under the mouse', (await hoverBackground(ctx)).over === PLAIN_TOGGLE_HOVER);
  check('pressing set-contrast turns high contrast on', await pressContrast(ctx, true));
  const label = await app.evaluate(() => window.__threadbound.plaque()?.contrastLabel);
  check('the toggle reads "High contrast: On"', label === 'High contrast: On', label);
  await labelFits(ctx, 'High contrast: On');
  const saved = await app.evaluate((key) => localStorage.getItem(key), KEY);
  check('the setting is remembered', /"highContrast":true/.test(saved ?? ''), saved);
  const on = await app.evaluate(scene);
  const changed = ['backPanel', 'wall', 'header'].every((k) => on.appearance[k] !== start.appearance[k]) && on.appearance.glyphBackings;
  check('the back panel, walls and header repaint, and glyph backings show', changed, JSON.stringify({ from: start.appearance, to: on.appearance }));
  check('nothing was rebuilt: the threads and the frame stay the same', same(on.threads, start.threads) && same(on.frame, start.frame), JSON.stringify(on.frame));
  const hover = await hoverBackground(ctx);
  check('a toggle still lights under the mouse in high contrast', hover.over === BOLD_TOGGLE.hover && hover.off === BOLD_TOGGLE.rest, JSON.stringify(hover));
  return { start: start.appearance, on: on.appearance };
}

/** The label is laid out on one line: as tall as the slow-motion toggle beside it, and within the face. */
async function labelFits({ app, check }, text) {
  // A face just shown lays out over a frame or two: wait for steady positions before reading sizes.
  await plaqueElementAt(app, 'set-contrast');
  await plaqueElementAt(app, 'set-slow');
  const sizes = await app.evaluate(() => {
    const hook = window.__threadbound;
    const size = (id) => {
      const e = hook.plaqueElement(id);
      return e && { w: e.width, h: e.height };
    };
    return { contrast: size('set-contrast'), slow: size('set-slow'), face: size('plaque') };
  });
  const laidOut = sizes.contrast?.h > 0 && sizes.slow?.h > 0;
  const fits = laidOut && sizes.contrast.h <= sizes.slow.h + SLACK && sizes.contrast.w < sizes.face.w;
  check(`"${text}" fits on one line`, Boolean(fits), JSON.stringify(sizes));
}

/** An in-frame reload (first-melody.e2e.mjs) loads the saved setting: still on, same look. */
async function survivesReload(ctx, before) {
  const { app, check } = ctx;
  const up = await navigateApp(app, null);
  ctx.at = await canvasMapper(app);
  const look = await app.evaluate(appearance);
  check('after a reload high contrast is still on, with the same look', up !== null && look.highContrast && same(look, before.on), JSON.stringify(look));
}

/** With every glyph backed, the busiest frames stay within the budget. */
async function busiestLevels({ app, check }) {
  for (const id of ['w4-06', 'w2-06']) {
    await loadLevel(app, id);
    await app.evaluate(() => {
      window.__threadbound.solve();
      window.__threadbound.dispatch({ type: 'drop' });
    });
    const allOut = () => window.__threadbound.marbles().length >= window.__threadbound.state().level.marbles;
    await waitFor(app, allOut, 8000);
    const stats = await app.evaluate(() => window.__threadbound.frameStats());
    const glyphs = await app.evaluate(() => window.__threadbound.meshBreakdown()['glyph-backing'] ?? 0);
    check(`high contrast on ${id}: no budget breach (${stats.drawCalls} draw calls, ${glyphs} glyph backings)`, stats.breaches.length === 0 && glyphs > 0, JSON.stringify(stats));
  }
}

/** The second press: off, and the default look back exactly. */
async function turnOff(ctx, before) {
  const { app, check } = ctx;
  await loadLevel(app, 'w1-01');
  check('the settings face opens again after the reload', await openSettings(ctx));
  check('a second press turns high contrast off', await pressContrast(ctx, false));
  const look = await app.evaluate(appearance);
  check('the starting look is restored exactly', same(look, before.start), JSON.stringify({ want: before.start, got: look }));
}
