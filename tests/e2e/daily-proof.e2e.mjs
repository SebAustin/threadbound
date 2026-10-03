// E2E: daily puzzle DAILY (pool index) is solvable on its tight spool by its
// stored solution, with every solution thread accepted by the spool rule.
import { hookReady, isComplete, waitFor } from './lib.mjs';

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  await waitFor(app, hookReady, 15000);
  const index = Number(process.env.DAILY ?? 0);
  await app.evaluate((i) => window.__threadbound.dispatch({ type: 'daily', index: i }), index);
  await waitFor(app, () => window.__threadbound.state().level.id.startsWith('daily-'), 3000);
  await app.evaluate(() => {
    window.__threadbound.solve();
    window.__threadbound.dispatch({ type: 'drop' });
  });
  const solved = await waitFor(app, isComplete, 15000);
  const s = await app.evaluate(() => {
    const st = window.__threadbound.state();
    return { id: st.level.id, threads: st.threads.filter((t) => !t.preset).length, wanted: st.level.solution.length, spool: st.level.spool };
  });
  return [{ name: `daily ${s.id} solves on its spool`, pass: solved, detail: JSON.stringify(s) }];
}
