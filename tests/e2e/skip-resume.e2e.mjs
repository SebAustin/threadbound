// E2E (real reload, as resume-insert.e2e.mjs): a skipped level is passed over on resume, earns no
// stars, and still holds the campaign's ending back (ticket 09's ending, read from `best` only).
// The ending is matched only on `All ${n} solved`, as finished-campaign.e2e.mjs does.
import { checks, freshSave, isComplete, loadLevel, navigateApp, waitFor } from './lib.mjs';

/** Page function: saves `solved` (ids, 3 stars each) and `skipped`. */
const seed = ({ solved, skipped }) => {
  const best = Object.fromEntries(solved.map((id) => [id, 3]));
  localStorage.setItem('threadbound.progress.v1', JSON.stringify({ unlocked: solved.length, best, skipped }));
};
/** Page function: where the game opened, its star total and the ledge's hint. */
const opened = () => {
  const hook = window.__threadbound;
  const s = hook.state();
  return { level: s.level.id, daily: s.daily, skipped: s.progress.skipped, stars: hook.plaque()?.starsLabel, hint: hook.ledge()?.text.hint ?? '' };
};
const ending = (n) => new RegExp(`All ${n} solved`);

async function solveOpenLevel(app) {
  await app.evaluate(() => {
    window.__threadbound.solve();
    window.__threadbound.dispatch({ type: 'drop' });
  });
  await waitFor(app, () => window.__threadbound.state().status === 'complete' && window.__threadbound.state().stars > 0, 15000);
  return app.evaluate(opened);
}

/** w1-01 to w2-04 solved and w2-05 skipped: the game reopens on w2-06 with 30 stars of 72. */
async function resumesPastSkip(app, ids, check) {
  const solved = ids.slice(0, ids.indexOf('w2-05'));
  await app.evaluate(seed, { solved, skipped: ['w2-05'] });
  await navigateApp(app);
  const o = await app.evaluate(opened);
  check('a save with w2-05 skipped resumes on w2-06', o.level === 'w2-06' && o.daily === null, JSON.stringify(o));
  check('and reads Stars 30/72', o.stars === 'Stars 30/72', o.stars);
}

/** Every other level solved, w2-05 skipped: w4-06's solve shows no ending, w2-05's solve does. */
async function skipHoldsEndingBack(app, ids, check) {
  const n = ids.length;
  await app.evaluate(seed, { solved: ids.filter((id) => id !== 'w2-05' && id !== 'w4-06'), skipped: ['w2-05'] });
  await navigateApp(app);
  const o = await app.evaluate(opened);
  check('with only w2-05 (skipped) and w4-06 unsolved, the game reopens on w4-06', o.level === 'w4-06' && o.daily === null, JSON.stringify(o));
  const last = await solveOpenLevel(app);
  check('solving w4-06 with w2-05 skipped shows no ending', (await app.evaluate(isComplete)) && !ending(n).test(last.hint), last.hint);
  await loadLevel(app, 'w2-05');
  const skippedOne = await solveOpenLevel(app);
  check('solving w2-05 shows the ending, and takes it off the skipped list',
    ending(n).test(skippedOne.hint) && skippedOne.skipped.length === 0 && skippedOne.stars === `Stars ${3 * n}/${3 * n}`, JSON.stringify(skippedOne));
}

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  const ids = await app.evaluate(() => window.__threadbound.levels().map((l) => l.id));
  try {
    await resumesPastSkip(app, ids, check);
    await skipHoldsEndingBack(app, ids, check);
  } finally {
    await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
    check('progress is reset for the scripts after this one', await waitFor(app, freshSave, 3000));
  }
  return results;
}
