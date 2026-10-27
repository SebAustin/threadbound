// E2E (ADR 0005, from a fresh save): the first-drop star counts drops since the level loaded or
// restarted. A move made mid-drop waits for the marbles (PuzzleSystem's deferred relocation), and the
// rebuild must keep the count, or a first-drop solve silently loses its star; ticket 10's relocate
// also carries the solve's tune into the save. A move keeps the count, a real Restart clears it, and
// a daily solved on its second drop saves 2 stars for its day.
import { canvasMapper, checks, click, freshSave, waitFor } from './lib.mjs';

/** Page function: true once a drop has settled and, if it solved, its stars are recorded. */
const settled = () => {
  const s = window.__threadbound.state();
  return s.status === 'idle' || (s.status === 'complete' && s.stars > 0);
};
/** Page function: the current score and drop counts. */
const score = () => {
  const s = window.__threadbound.state();
  return { status: s.status, stars: s.stars, drops: s.drops, missedDrops: s.missedDrops };
};
const setUp = (app, up) => app.evaluate((u) => window.__threadbound.dispatch({ type: 'settings', patch: { offset: { up: u, near: 0 } } }), up);
const frameY = () => window.__threadbound.frame().origin[1];

/** Drops what is hung now and waits until the drop has settled. */
async function dropAndSettle(app) {
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'drop' }));
  await waitFor(app, () => window.__threadbound.state().status === 'dropping', 2000);
  await waitFor(app, settled, 20000);
  return app.evaluate(score);
}

/** A drop with nothing hung on level 1: every marble misses. */
async function miss(app) {
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'restart' }));
  return dropAndSettle(app);
}

/** The diorama raised while a first-drop solve is falling: the move waits, then keeps the third star. */
async function raisedMidDrop(app, check) {
  const before = await app.evaluate(frameY);
  await app.evaluate(() => {
    window.__threadbound.solve();
    window.__threadbound.dispatch({ type: 'drop' });
  });
  await setUp(app, 1);
  const waiting = await app.evaluate((y) => window.__threadbound.state().status === 'dropping' && window.__threadbound.frame().origin[1] === y, before);
  await waitFor(app, settled, 20000);
  const moved = await waitFor(app, (y) => window.__threadbound.frame().origin[1] > y + 1e-3, 3000, before);
  const s = await app.evaluate(score);
  check('raising the diorama during a first-drop solve waits, moves, and still earns 3 stars', waiting && moved && s.status === 'complete' && s.stars === 3, JSON.stringify({ waiting, moved, ...s }));
  const saved = await app.evaluate(() => JSON.parse(localStorage.getItem('threadbound.progress.v1') ?? '{}'));
  const tune = saved.melodies?.['w1-01'];
  check("the save keeps that solve's tune after the raise", (tune?.notes?.length ?? 0) > 0 && saved.best?.['w1-01'] === 3, JSON.stringify({ best: saved.best, tune }));
}

/** A miss, a raise, then the solution: the move kept the miss, so the solve was a second drop. */
async function missRaiseSolve(app, check) {
  const missed = await miss(app);
  const before = await app.evaluate(frameY);
  await setUp(app, 2);
  const moved = await waitFor(app, (y) => window.__threadbound.frame().origin[1] > y + 1e-3, 3000, before);
  const kept = await app.evaluate(score);
  await app.evaluate(() => window.__threadbound.solve());
  const s = await dropAndSettle(app);
  check('a miss, a raise, then the solution earns 2 (the move keeps the drop count)',
    missed.status === 'idle' && moved && kept.drops === 1 && s.status === 'complete' && s.stars === 2 && s.drops === 2, JSON.stringify({ missed, moved, kept, s }));
}

/** A miss, a real click on Restart, then the solution: Restart clears the drop count. */
async function missRestartSolve(page, app, check) {
  const missed = await miss(app);
  const at = await canvasMapper(app);
  await click(page, at(await app.evaluate(() => window.__threadbound.button('restart'))));
  const restarted = await waitFor(app, () => window.__threadbound.state().drops === 0 && window.__threadbound.state().threads.length === 0, 3000);
  await app.evaluate(() => window.__threadbound.solve());
  const s = await dropAndSettle(app);
  check('a miss, a real click on Restart, then the solution earns 3', missed.status === 'idle' && restarted && s.status === 'complete' && s.stars === 3 && s.drops === 1, JSON.stringify({ missed, restarted, s }));
}

/** A daily solved on its second drop saves 2 stars for its day. */
async function dailySecondDrop(app, check) {
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'daily', index: 0 }));
  await waitFor(app, () => window.__threadbound.state().daily !== null, 3000);
  const missed = await dropAndSettle(app);
  await app.evaluate(() => window.__threadbound.solve());
  const s = await dropAndSettle(app);
  const day = await app.evaluate(() => ({ daily: window.__threadbound.state().daily?.day, best: window.__threadbound.state().progress.dailyBest }));
  check('a daily solved on its second drop saves dailyBest.stars 2',
    missed.status === 'idle' && s.status === 'complete' && s.stars === 2 && day.best.day === day.daily && day.best.stars === 2, JSON.stringify({ missed, s, day }));
}

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  await setUp(app, 0);
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
  await waitFor(app, freshSave, 3000);
  try {
    await raisedMidDrop(app, check);
    await missRaiseSolve(app, check);
    await missRestartSolve(page, app, check);
    await dailySecondDrop(app, check);
  } finally {
    await setUp(app, 0);
    await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
    check('progress and the offset are reset for the scripts after this one', await waitFor(app, freshSave, 3000));
  }
  return results;
}
