// E2E: daily puzzle DAILY (pool index) is solvable on its tight spool by its
// stored solution, with every solution thread accepted by the spool rule, in the
// study pose and (ticket 18) on a passthrough table turned 0 and 90 degrees.
import { hookReady, isComplete, leaveTable, placeOnTable, solveAndDrop, TABLE_YAWS, waitFor } from './lib.mjs';

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
  const results = [{ name: `daily ${s.id} solves on its spool`, pass: solved, detail: JSON.stringify(s) }];
  for (const yaw of TABLE_YAWS) {
    await placeOnTable(app, yaw, (i) => window.__threadbound.dispatch({ type: 'daily', index: i }), index);
    const turned = await solveAndDrop(app, 15000);
    const marbles = turned ? [] : await app.evaluate(() => window.__threadbound.marbles());
    results.push({ name: `daily ${s.id} solves on a table turned ${Math.round((yaw * 180) / Math.PI)} degrees`, pass: turned, detail: turned ? '' : JSON.stringify(marbles) });
  }
  await leaveTable(app);
  return results;
}
