// E2E (real input): the settings face's Prev/Next revisit any level reached so far
// and never skip ahead; new mechanics are taught on the plaque; the last level ends
// the campaign with a pointer to the daily.
import { canvasMapper, checks, click, clickCanvas, freshSave, isComplete, loadIndex, loadLevel, plaqueElementAt, waitFor } from './lib.mjs';

const index = () => window.__threadbound.state().levelIndex;
const hint = () => window.__threadbound.hud()?.model?.hint;

async function solveIndex(app, i) {
  await loadIndex(app, i);
  await app.evaluate(() => {
    window.__threadbound.solve();
    window.__threadbound.dispatch({ type: 'drop' });
  });
  await waitFor(app, isComplete, 15000);
}

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  const at = await canvasMapper(app);
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
  await waitFor(app, freshSave, 3000);
  await solveIndex(app, 0);
  await solveIndex(app, 1);
  await loadIndex(app, 2);

  await click(page, at(await app.evaluate(() => window.__threadbound.button('settings'))));
  await waitFor(app, () => window.__threadbound.plaque()?.face === 'settings', 2000);
  const press = async (id, want) => {
    await clickCanvas(page, app, at, await plaqueElementAt(app, id));
    return waitFor(app, (w) => window.__threadbound.state().levelIndex === w, 2000, want);
  };
  check('Prev revisits the level before', await press('set-prev', 1), String(await app.evaluate(index)));
  check('and the one before that', await press('set-prev', 0), String(await app.evaluate(index)));
  check('Next comes back up to where the player is', (await press('set-skip', 1)) && (await press('set-skip', 2)), String(await app.evaluate(index)));
  await clickCanvas(page, app, at, await plaqueElementAt(app, 'set-skip'));
  check('Next never skips past the first unsolved level', !(await waitFor(app, () => window.__threadbound.state().levelIndex === 3, 1200)));
  check('the settings face stays open while stepping', (await app.evaluate(() => window.__threadbound.plaque()?.face)) === 'settings');

  await loadLevel(app, 'w1-05');
  check('a level introducing a mechanic teaches it on the plaque', (await app.evaluate(hint)) === 'Pinch a thread to snip it', await app.evaluate(hint));

  const last = await app.evaluate(() => window.__threadbound.levels().length - 1);
  await solveIndex(app, last);
  check('solving the last level ends the campaign and points to the daily', /^All \d+ solved - poke the sun for a daily$/.test(await app.evaluate(hint)), await app.evaluate(hint));
  return results;
}
