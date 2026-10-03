// E2E (part 1 of resume): fresh save, solve the first three levels.
// Part 2 (resume-check) runs after run.sh reloads the page.
import { checks, freshSave, isComplete, loadIndex, waitFor } from './lib.mjs';

export const SOLVED = 3;

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
  return results;
}
