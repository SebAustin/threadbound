// E2E: Restart / Next ledge buttons with real mouse clicks, plus stars + progress.
import { canvasMapper, checks, click, isComplete, loadIndex, sleep, waitFor } from './lib.mjs';

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  const at = await canvasMapper(app);

  await loadIndex(app, 0);
  const hiddenAtStart = await app.evaluate(() => window.__threadbound.button('next')?.visible === false);
  check('Next hidden before solving', hiddenAtStart);

  await app.evaluate(() => {
    window.__threadbound.solve();
    window.__threadbound.dispatch({ type: 'drop' });
  });
  const solved = await waitFor(app, isComplete, 15000);
  const after = await app.evaluate(() => {
    const s = window.__threadbound.state();
    return { stars: s.stars, best: s.progress.best['w1-01'], unlocked: s.progress.unlocked };
  });
  check('solve awards 3 stars and saves progress', solved && after.stars === 3 && after.best === 3 && after.unlocked >= 1, JSON.stringify(after));
  const saved = await app.evaluate(() => localStorage.getItem('threadbound.progress.v1'));
  check('progress persisted to localStorage', Boolean(saved && saved.includes('w1-01')), saved ?? 'null');

  const next = await app.evaluate(() => window.__threadbound.button('next'));
  check('Next visible after solving', next?.visible === true);
  await click(page, at(next));
  const onLevel2 = await waitFor(app, () => window.__threadbound.state().levelIndex === 1, 3000);
  check('clicking Next loads level 2', onLevel2);

  await app.evaluate(() => window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' }));
  const restart = await app.evaluate(() => window.__threadbound.button('restart'));
  await click(page, at(restart));
  await sleep(300);
  const reset = await app.evaluate(() => {
    const s = window.__threadbound.state();
    return { index: s.levelIndex, threads: s.threads.length, status: s.status };
  });
  check('clicking Restart clears threads, stays on level', reset.index === 1 && reset.threads === 0 && reset.status === 'idle', JSON.stringify(reset));
  return results;
}
