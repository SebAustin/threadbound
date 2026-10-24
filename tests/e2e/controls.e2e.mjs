// E2E: Restart / Next ledge buttons with real mouse clicks, plus stars + progress, and the
// solve's celebration: every thread shimmers and the plaque's stars light one at a time.
import { canvasMapper, checks, click, isComplete, loadIndex, waitFor } from './lib.mjs';

/**
 * Page side: samples the celebration on every rendered frame until stopped. Keeps each new
 * count of lit stars, and every thread's energy on the first frame that shows the solve.
 */
const sampleCelebration = () => {
  const hook = window.__threadbound;
  const log = { stars: [], energy: null, stop: false };
  window.__celebrationLog = log;
  const tick = () => {
    const c = hook.celebration();
    if (log.stars[log.stars.length - 1] !== c.starsShown) log.stars.push(c.starsShown);
    if (log.energy === null && hook.state().status === 'complete') log.energy = c.threadEnergy;
    if (!log.stop) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
const stopSampling = () => {
  const log = window.__celebrationLog;
  log.stop = true;
  return { stars: log.stars, energy: log.energy };
};

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  const at = await canvasMapper(app);

  await loadIndex(app, 0);
  const hiddenAtStart = await app.evaluate(() => window.__threadbound.button('next')?.visible === false);
  check('Next hidden before solving', hiddenAtStart);

  await app.evaluate(sampleCelebration);
  await app.evaluate(() => {
    window.__threadbound.solve();
    window.__threadbound.dispatch({ type: 'drop' });
  });
  const solved = await waitFor(app, isComplete, 15000);
  await celebrationChecks(app, check);
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
  await waitFor(app, () => window.__threadbound.state().threads.length === 0, 3000);
  const reset = await app.evaluate(() => {
    const s = window.__threadbound.state();
    return { index: s.levelIndex, threads: s.threads.length, status: s.status };
  });
  check('clicking Restart clears threads, stays on level', reset.index === 1 && reset.threads === 0 && reset.status === 'idle', JSON.stringify(reset));
  return results;
}

/** On the solve every thread has energy, and the stars refill from empty one at a time up to the best. */
async function celebrationChecks(app, check) {
  await waitFor(app, () => window.__threadbound.celebration().starsShown === 3 && window.__celebrationLog.stars.includes(0), 3000);
  const seen = await app.evaluate(stopSampling);
  const energy = seen.energy ?? [];
  check('on the solve, every thread shimmers (energy > 0)', energy.length > 0 && energy.every((e) => e > 0), JSON.stringify(energy));
  const refill = seen.stars.slice(seen.stars.lastIndexOf(0));
  check('the stars light one at a time after the solve', JSON.stringify(refill) === '[0,1,2,3]', JSON.stringify(seen.stars));
}
