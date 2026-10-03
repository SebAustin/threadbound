// E2E (real input): the ledge gear opens the plaque's settings face; the slow
// motion toggle there makes marbles fall measurably slower and is remembered.
import { canvasMapper, checks, click, loadIndex, plaqueElementAt, waitFor } from './lib.mjs';

/** Drops the first level's marbles untouched; ms until the first falls 25 cm. */
const fallMs = () =>
  new Promise((resolve) => {
    const start = performance.now();
    window.__threadbound.dispatch({ type: 'drop' });
    const tick = () => {
      const [first] = window.__threadbound.marbles();
      const elapsed = performance.now() - start;
      if (first && first.y < 0.12) resolve(elapsed);
      else if (elapsed > 8000) resolve(-1);
      else requestAnimationFrame(tick);
    };
    tick();
  });

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  const at = await canvasMapper(app);
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'settings', patch: { slowMotion: false } }));
  await loadIndex(app, 0);
  const normal = await app.evaluate(fallMs);

  await loadIndex(app, 0);
  await click(page, at(await app.evaluate(() => window.__threadbound.button('settings'))));
  check('the ledge gear opens the settings face', await waitFor(app, () => window.__threadbound.plaque()?.face === 'settings', 2000));

  const toggle = await plaqueElementAt(app, 'set-slow');
  check('the slow motion toggle is on the plaque', Boolean(toggle), JSON.stringify(toggle));
  if (!toggle) return results;
  await click(page, at(toggle));
  check('poking it turns slow motion on', await waitFor(app, () => window.__threadbound.state().settings.slowMotion, 2000));
  const saved = await app.evaluate(() => localStorage.getItem('threadbound.settings.v1'));
  check('the setting is remembered', /"slowMotion":true/.test(saved ?? ''), saved);

  await click(page, at(await app.evaluate(() => window.__threadbound.button('settings'))));
  check('the gear flips back to the level face', await waitFor(app, () => window.__threadbound.plaque()?.face === 'level', 2000));
  await loadIndex(app, 0);
  const slow = await app.evaluate(fallMs);
  check('marbles fall about 1.5x slower', normal > 0 && slow / normal > 1.25, `normal=${Math.round(normal)}ms slow=${Math.round(slow)}ms`);

  // Leave the browser as other tests expect it.
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'settings', patch: { slowMotion: false } }));
  return results;
}
