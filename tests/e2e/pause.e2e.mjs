// E2E: hiding the page mid-drop freezes the marbles; showing it resumes the drop.
import { checks, isComplete, loadIndex, sleep, waitFor } from './lib.mjs';

/** Fakes the tab being hidden/shown, exactly as the browser reports it. */
const setHidden = (hidden) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
};
const marbleSnapshot = () => JSON.stringify(window.__threadbound.marbles().map((m) => [m.x, m.y]));

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  await loadIndex(app, 0);
  await app.evaluate(() => {
    window.__threadbound.solve();
    window.__threadbound.dispatch({ type: 'drop' });
  });
  await waitFor(app, () => window.__threadbound.marbles().length > 0, 3000);
  await sleep(300);

  await app.evaluate(setHidden, true);
  await waitFor(app, () => window.__threadbound.state().paused, 2000);
  const paused = await app.evaluate(() => window.__threadbound.state().paused);
  const before = await app.evaluate(marbleSnapshot);
  await sleep(1000);
  const after = await app.evaluate(marbleSnapshot);
  check('hidden page pauses the puzzle', paused === true, `paused=${paused}`);
  check('marbles are frozen while paused', before === after && before !== '[]', `${before} → ${after}`);

  await app.evaluate(setHidden, false);
  const resumed = await app.evaluate(() => window.__threadbound.state().paused === false);
  check('visible page resumes', resumed);
  check('the drop finishes after resuming', await waitFor(app, isComplete, 15000));
  return results;
}
