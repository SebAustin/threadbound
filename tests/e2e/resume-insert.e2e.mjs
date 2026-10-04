// E2E (real reload): a save made before levels were added to a world resumes at
// the first unsolved level by id, never at a shifted index.
import { checks, freshSave, waitFor } from './lib.mjs';

/** A live tester's save from before World 2/3 grew: w1-01..w2-04 solved, plus w3-01 (old index 10). */
const OLD_SAVE = {
  unlocked: 11,
  best: Object.fromEntries(
    ['w1-01', 'w1-02', 'w1-03', 'w1-04', 'w1-05', 'w1-06', 'w2-01', 'w2-02', 'w2-03', 'w2-04', 'w3-01'].map((id) => [id, 3]),
  ),
};

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  await app.evaluate((save) => localStorage.setItem('threadbound.progress.v1', JSON.stringify(save)), OLD_SAVE);
  // Reload the app's own frame (the managed window hosts it in an iframe); its handle survives navigation.
  // A marker on the old page tells it apart from the reloaded one.
  await app.evaluate(() => {
    window.__beforeReload = true;
    location.reload();
  }).catch(() => {});
  const target = app;
  await waitFor(target, () => !window.__beforeReload && Boolean(window.__threadbound?.state().level), 15000);
  const resumed = await target.evaluate(() => window.__threadbound.state().level.id);
  check('an old save resumes at the first unsolved level, by id', resumed === 'w2-05', resumed);
  await target.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
  await waitFor(target, freshSave, 3000);
  return results;
}
