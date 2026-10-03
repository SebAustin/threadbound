// E2E (real input): the ledge gear opens the plaque's settings face; the slow
// motion toggle there makes marbles fall measurably slower and is remembered.
import { canvasMapper, checks, click, clickCanvas, loadIndex, plaqueElementAt, waitFor } from './lib.mjs';

/**
 * Drops the first level's marbles untouched and reports how far (m) the first
 * marble has fallen 200 ms after it appears. Distance grows with time squared,
 * so slow motion (2/3 speed) should fall about 0.44x as far; frame-pacing lag
 * affects both runs alike, unlike a stopwatch on the whole fall.
 */
const fallenAfter200ms = () =>
  new Promise((resolve) => {
    const deadline = performance.now() + 8000;
    let spawned = null;
    window.__threadbound.dispatch({ type: 'drop' });
    const tick = () => {
      const now = performance.now();
      const [first] = window.__threadbound.marbles();
      if (first && spawned === null) spawned = { at: now, y: first.y };
      if (spawned && now - spawned.at >= 200) resolve(spawned.y - first.y);
      else if (now > deadline) resolve(-1);
      else requestAnimationFrame(tick);
    };
    tick();
  });

/** Median of three drops, each on a freshly loaded level. */
async function typicalFall(app) {
  const falls = [];
  for (let i = 0; i < 3; i++) {
    await loadIndex(app, 0);
    falls.push(await app.evaluate(fallenAfter200ms));
  }
  return falls.sort((x, y) => x - y)[1];
}

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  const at = await canvasMapper(app);
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'settings', patch: { slowMotion: false } }));
  const normal = await typicalFall(app);

  await loadIndex(app, 0);
  await click(page, at(await app.evaluate(() => window.__threadbound.button('settings'))));
  check('the ledge gear opens the settings face', await waitFor(app, () => window.__threadbound.plaque()?.face === 'settings', 2000));

  const toggle = await plaqueElementAt(app, 'set-slow');
  check('the slow motion toggle is on the plaque', Boolean(toggle), JSON.stringify(toggle));
  if (!toggle) return results;
  await clickCanvas(page, app, at, toggle);
  check('poking it turns slow motion on', await waitFor(app, () => window.__threadbound.state().settings.slowMotion, 2000));
  const saved = await app.evaluate(() => localStorage.getItem('threadbound.settings.v1'));
  check('the setting is remembered', /"slowMotion":true/.test(saved ?? ''), saved);

  await click(page, at(await app.evaluate(() => window.__threadbound.button('settings'))));
  check('the gear flips back to the level face', await waitFor(app, () => window.__threadbound.plaque()?.face === 'level', 2000));
  const slow = await typicalFall(app);
  check('marbles fall visibly slower', normal > 0 && slow > 0 && slow < 0.7 * normal, `fell in 200 ms: normal=${normal.toFixed(3)} m, slow=${slow.toFixed(3)} m`);

  // Leave the browser as other tests expect it.
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'settings', patch: { slowMotion: false } }));
  return results;
}
