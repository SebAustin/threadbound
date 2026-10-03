// E2E (real input): wiping progress from the settings face takes two pokes;
// one poke only arms it. A reset brings back level 1 and the ghost hand.
import { canvasMapper, checks, click, clickCanvas, isComplete, loadIndex, plaqueElementAt, waitFor } from './lib.mjs';

const bestCount = () => Object.keys(window.__threadbound.state().progress.best).length;

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  const at = await canvasMapper(app);

  await loadIndex(app, 0);
  await app.evaluate(() => {
    window.__threadbound.solve();
    window.__threadbound.dispatch({ type: 'drop' });
  });
  await waitFor(app, isComplete, 15000);
  check('there is progress to lose', (await app.evaluate(bestCount)) > 0);

  await click(page, at(await app.evaluate(() => window.__threadbound.button('settings'))));
  await waitFor(app, () => window.__threadbound.plaque()?.face === 'settings', 2000);
  const reset = await plaqueElementAt(app, 'set-reset');
  check('the reset control is on the settings face', Boolean(reset), JSON.stringify(reset));
  if (!reset) return results;

  await clickCanvas(page, app, at, reset);
  const armed = await waitFor(app, () => window.__threadbound.plaque()?.resetLabel === 'Confirm reset', 2000);
  check('one poke only arms the reset', armed && (await app.evaluate(bestCount)) > 0, await app.evaluate(() => window.__threadbound.plaque()?.resetLabel));

  await clickCanvas(page, app, at, reset);
  const wiped = await waitFor(app, () => {
    const s = window.__threadbound.state();
    const g = window.__threadbound.ghost();
    return Object.keys(s.progress.best).length === 0 && s.levelIndex === 0 && g?.step === 'pinch-pull' && g.visible;
  }, 3000);
  check('a second poke wipes progress and brings the tutorial back', wiped);
  check('the plaque returns to the level face', (await app.evaluate(() => window.__threadbound.plaque()?.face)) === 'level');
  return results;
}
