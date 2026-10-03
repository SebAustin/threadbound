// E2E: every level is solvable by its stored solution under real physics, and
// no level solves itself untouched. Levels are driven through the same command
// bus the player's buttons use; physics and scoring are fully live.
import { hookReady, isComplete, loadIndex, waitFor } from './lib.mjs';

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const results = [];
  const only = process.env.LEVEL ? Number(process.env.LEVEL) : null;
  await waitFor(app, hookReady, 15000);
  const levels = await app.evaluate(() => window.__threadbound.levels());
  // SLOW=1 proves the same solutions hold in slow motion (scaled gravity keeps trajectories).
  const slowMotion = process.env.SLOW === '1';
  await app.evaluate((slow) => window.__threadbound.dispatch({ type: 'settings', patch: { slowMotion: slow } }), slowMotion);

  for (let i = 0; i < levels.length; i++) {
    if (only !== null && i !== only) continue;
    const { id, name } = levels[i];

    // Negative control: presets untouched, no player threads.
    await loadIndex(app, i);
    await app.evaluate(() => window.__threadbound.dispatch({ type: 'drop' }));
    const selfSolved = await waitFor(app, isComplete, 6000);

    await loadIndex(app, i);
    await app.evaluate(() => {
      window.__threadbound.solve();
      window.__threadbound.dispatch({ type: 'drop' });
    });
    const solved = await waitFor(app, isComplete, slowMotion ? 25000 : 15000);
    const state = await app.evaluate(() => {
      const s = window.__threadbound.state();
      return { scored: s.scored, marbles: s.level.marbles, stars: s.stars, threads: s.threads.length };
    });
    const marbles = solved ? [] : await app.evaluate(() => window.__threadbound.marbles());
    results.push({
      level: `${id} ${name}${slowMotion ? ' (slow motion)' : ''}`,
      pass: solved && !selfSolved,
      solved,
      selfSolved,
      ...state,
      ...(solved ? {} : { marbles }),
    });
  }
  if (slowMotion) await app.evaluate(() => window.__threadbound.dispatch({ type: 'settings', patch: { slowMotion: false } }));
  return results;
}
