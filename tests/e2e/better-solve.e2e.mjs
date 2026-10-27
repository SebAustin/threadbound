// E2E (seam 2, ADR 0005): stars reward the solve, par threads and the first drop, and a better
// solve is recorded. Switchback's spare pegs c and d sit above the marbles' path, so a c-d thread
// is harmless but over par. On Trampoline (thread limit par + 1 = 2) a wrong first thread no
// longer blocks the right one (Q46).
import { checks, freshSave, loadLevel, waitFor } from './lib.mjs';

/** Page function: the stars this completion earned, and the level's saved best. */
const score = (id) => {
  const s = window.__threadbound.state();
  return { status: s.status, stars: s.stars, best: s.progress.best[id] ?? 0, drops: s.drops, threads: s.threads.length };
};

/** Drops, waits for the solve and for its stars to be recorded, and returns the score. */
async function dropAndScore(app, id) {
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'drop' }));
  await waitFor(app, () => window.__threadbound.state().status === 'dropping', 2000);
  await waitFor(app, () => window.__threadbound.state().status === 'complete' && window.__threadbound.state().stars > 0, 15000);
  return app.evaluate(score, id);
}

async function switchback(app, check) {
  await loadLevel(app, 'w1-02');
  await app.evaluate(() => {
    window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' });
    window.__threadbound.dispatch({ type: 'addThread', from: 'c', to: 'd' });
  });
  const over = await dropAndScore(app, 'w1-02');
  check('over par on the first drop earns two stars', over.stars === 2 && over.best === 2 && over.drops === 1, JSON.stringify(over));

  await app.evaluate(() => {
    window.__threadbound.dispatch({ type: 'snip', from: 'c', to: 'd' });
    window.__threadbound.dispatch({ type: 'drop' });
  });
  const reset = await app.evaluate(() => window.__threadbound.state().stars);
  check('a new drop starts unscored', reset === 0, String(reset));
  await waitFor(app, () => window.__threadbound.state().status === 'complete' && window.__threadbound.state().stars > 0, 15000);
  const later = await app.evaluate(score, 'w1-02');
  check('a second drop at par earns two stars, and the best stays two', later.stars === 2 && later.best === 2 && later.drops === 2, JSON.stringify(later));

  await app.evaluate(() => {
    window.__threadbound.dispatch({ type: 'restart' });
    window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' });
  });
  const first = await dropAndScore(app, 'w1-02');
  check('after Restart, the par thread on the first drop earns three, and the best goes to three', first.stars === 3 && first.best === 3 && first.drops === 1, JSON.stringify(first));
}

/** Q46: Trampoline allows 2 threads, so a wrong first thread (c-d) leaves room for a-b. */
async function trampoline(app, check) {
  await loadLevel(app, 'w1-03');
  await app.evaluate(() => {
    window.__threadbound.dispatch({ type: 'addThread', from: 'c', to: 'd' });
    window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' });
  });
  const linked = await app.evaluate(() => ({ threads: window.__threadbound.state().threads.length, refusal: window.__threadbound.state().refusal }));
  check('Trampoline: after a wrong first thread (c-d), a-b still links', linked.threads === 2 && linked.refusal === null, JSON.stringify(linked));
  const two = await dropAndScore(app, 'w1-03');
  check('and solves at 2 threads for 2 stars (solve and first drop)', two.status === 'complete' && two.stars === 2 && two.threads === 2, JSON.stringify(two));

  await app.evaluate(() => {
    window.__threadbound.dispatch({ type: 'restart' });
    window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' });
  });
  const three = await dropAndScore(app, 'w1-03');
  check('after a Restart, a-b alone earns 3 stars', three.stars === 3 && three.best === 3, JSON.stringify(three));
}

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
  await waitFor(app, freshSave, 3000);
  await switchback(app, check);
  await trampoline(app, check);
  return results;
}
