// E2E (seam 2): solving again with fewer threads is recorded. Switchback's spare
// pegs c and d sit above the marbles' path, so a c-d thread is harmless but costs a star.
import { checks, freshSave, isComplete, loadLevel, waitFor } from './lib.mjs';

const best = () => window.__threadbound.state().progress.best['w1-02'] ?? 0;

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
  await waitFor(app, freshSave, 3000);
  await loadLevel(app, 'w1-02');
  await app.evaluate(() => {
    window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' });
    window.__threadbound.dispatch({ type: 'addThread', from: 'c', to: 'd' });
    window.__threadbound.dispatch({ type: 'drop' });
  });
  await waitFor(app, isComplete, 15000);
  check('a solve over par earns two stars', (await app.evaluate(best)) === 2, String(await app.evaluate(best)));

  await app.evaluate(() => {
    window.__threadbound.dispatch({ type: 'snip', from: 'c', to: 'd' });
    window.__threadbound.dispatch({ type: 'drop' });
  });
  const reset = await app.evaluate(() => window.__threadbound.state().stars);
  check('a new drop starts unscored', reset === 0, String(reset));
  await waitFor(app, isComplete, 15000);
  const improved = await waitFor(app, () => (window.__threadbound.state().progress.best['w1-02'] ?? 0) === 3, 3000);
  check('re-solving at par records the better score', improved, String(await app.evaluate(best)));
  return results;
}
