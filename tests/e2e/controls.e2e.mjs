// E2E: Restart / Next ledge buttons with real mouse clicks, plus stars + progress, and the
// solve's celebration: every thread shimmers and the plaque's stars light one at a time.
// Each rebuild fades in (week 8 ticket 07) while the level is already live underneath.
import { canvasMapper, checks, click, isComplete, loadIndex, waitFor } from './lib.mjs';

/** The fade lasts about 0.3 s (REVEAL_SECONDS); it must be over within this. */
const REVEAL_WITHIN_MS = 400;

/**
 * Page side: from now on, finds the first rendered frame of the next rebuild (its fade below 1)
 * and records what the level shows then. With `addOnBuild`, it adds the thread a->b on that very
 * frame, so the command bus is shown live during the fade. Then times the fade until it is 1.
 */
const watchFade = (addOnBuild) => {
  const hook = window.__threadbound;
  const log = { built: null, revealedMs: null };
  window.__fadeLog = log;
  const tick = () => {
    const reveal = hook.placement().reveal;
    if (log.built === null && reveal < 1) {
      const s = hook.state();
      if (addOnBuild) hook.dispatch({ type: 'addThread', from: 'a', to: 'b' });
      const live = hook.state();
      log.built = { at: performance.now(), reveal, levelIndex: s.levelIndex, status: s.status, threads: s.threads.length, afterAdd: live.threads.length };
    } else if (log.built !== null && reveal === 1) {
      log.revealedMs = Math.round(performance.now() - log.built.at);
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
const fadeLog = () => window.__fadeLog;

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
  await app.evaluate(watchFade, true);
  await click(page, at(next));
  const onLevel2 = await waitFor(app, () => window.__threadbound.state().levelIndex === 1, 3000);
  check('clicking Next loads level 2', onLevel2);
  await fadeCheck(app, check, 'Next', (b) => b.levelIndex === 1 && b.threads === 0 && b.afterAdd === 1);

  if ((await app.evaluate(() => window.__threadbound.state().threads.length)) === 0) {
    await app.evaluate(() => window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' }));
  }
  const restart = await app.evaluate(() => window.__threadbound.button('restart'));
  await app.evaluate(watchFade, false);
  await click(page, at(restart));
  await waitFor(app, () => window.__threadbound.state().threads.length === 0, 3000);
  await fadeCheck(app, check, 'Restart', (b) => b.levelIndex === 1 && b.threads === 0 && b.status === 'idle');
  const reset = await app.evaluate(() => {
    const s = window.__threadbound.state();
    return { index: s.levelIndex, threads: s.threads.length, status: s.status };
  });
  check('clicking Restart clears threads, stays on level', reset.index === 1 && reset.threads === 0 && reset.status === 'idle', JSON.stringify(reset));
  return results;
}

/** The rebuild after a real click fades in, while `live` holds for the level on its first frame. */
async function fadeCheck(app, check, button, live) {
  await waitFor(app, () => window.__fadeLog?.revealedMs !== null, 2000);
  const log = await app.evaluate(fadeLog);
  const b = log?.built;
  check(
    `after the real ${button} click, reveal is below 1 on the first frame and reaches 1 within ${REVEAL_WITHIN_MS / 1000} s, the level already live`,
    Boolean(b) && b.reveal < 1 && log.revealedMs !== null && log.revealedMs <= REVEAL_WITHIN_MS && live(b),
    JSON.stringify(log),
  );
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
