// E2E: daily puzzle DAILY (pool index) is solvable on its tight spool by its
// stored solution, with every solution thread accepted by the spool rule, in the
// study pose and (ticket 18) on a passthrough table turned 0 and 90 degrees. Like the
// campaign proofs (ADR 0005), the solution earns all 3 stars on the daily's first drop.
import { hookReady, isComplete, leaveTable, loadDaily, placeOnTable, reopenDaily, solveAndDrop, TABLE_YAWS, waitFor } from './lib.mjs';

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  await waitFor(app, hookReady, 15000);
  const index = Number(process.env.DAILY ?? 0);
  await loadDaily(app, index);
  await app.evaluate(() => {
    window.__threadbound.solve();
    window.__threadbound.dispatch({ type: 'drop' });
  });
  const solved = await waitFor(app, isComplete, 15000);
  if (solved) await waitFor(app, () => window.__threadbound.state().stars > 0, 2000);
  const s = await app.evaluate(() => {
    const st = window.__threadbound.state();
    return {
      id: st.level.id,
      threads: st.threads.filter((t) => !t.preset).length,
      wanted: st.level.solution.length,
      spool: st.level.spool,
      par: st.level.par,
      maxThreads: st.level.maxThreads,
      stars: st.stars,
      drops: st.drops,
    };
  });
  const results = [{ name: `daily ${s.id} solves on its spool with 3 stars on the first drop`, pass: solved && s.stars === 3, detail: JSON.stringify(s) }];
  for (const yaw of TABLE_YAWS) {
    await placeOnTable(app, yaw, reopenDaily, index);
    const turned = await solveAndDrop(app, 15000);
    const marbles = turned ? [] : await app.evaluate(() => window.__threadbound.marbles());
    results.push({ name: `daily ${s.id} solves on a table turned ${Math.round((yaw * 180) / Math.PI)} degrees`, pass: turned, detail: turned ? '' : JSON.stringify(marbles) });
  }
  await leaveTable(app);
  return results;
}
