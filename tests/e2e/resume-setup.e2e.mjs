// E2E (part 1 of resume): fresh save, solve the first three levels and a daily,
// and change settings (slow motion, a raised and nearer diorama).
// Part 2 (resume-check) runs after run.sh reloads the page.
import { checks, freshSave, isComplete, loadIndex, waitFor } from './lib.mjs';

export const SOLVED = 3;
export const OFFSET = { up: 1, near: 1 };

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
  await waitFor(app, freshSave, 3000);
  for (let i = 0; i < SOLVED; i++) {
    await loadIndex(app, i);
    await app.evaluate(() => {
      window.__threadbound.solve();
      window.__threadbound.dispatch({ type: 'drop' });
    });
    check(`level ${i + 1} solved`, await waitFor(app, isComplete, 15000));
  }
  await app.evaluate(() => {
    window.__threadbound.dispatch({ type: 'daily', index: 0 });
    window.__threadbound.solve();
    window.__threadbound.dispatch({ type: 'drop' });
  });
  check('a daily solved', await waitFor(app, isComplete, 20000));
  await app.evaluate((offset) => window.__threadbound.dispatch({ type: 'settings', patch: { slowMotion: true, offset } }), OFFSET);
  return results;
}
