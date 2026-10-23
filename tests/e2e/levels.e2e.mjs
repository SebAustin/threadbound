// E2E: every level is solvable by its stored solution under real physics, and
// no level solves itself untouched. Levels are driven through the same command
// bus the player's buttons use; physics and scoring are fully live. The busiest
// frame (solution hung, every marble in flight) must fit the performance budget.
import { hookReady, isComplete, loadIndex, waitFor } from './lib.mjs';

const setSlowMotion = (app, slow) =>
  app.evaluate((s) => window.__threadbound.dispatch({ type: 'settings', patch: { slowMotion: s } }), slow);
/** All marbles released, or the drop already over: the busiest frame of a drop. */
const allReleased = () => {
  const s = window.__threadbound.state();
  return s.status === 'complete' || window.__threadbound.marbles().length >= s.level.marbles;
};

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const only = process.env.LEVEL ? Number(process.env.LEVEL) : null;
  // SLOW=1 proves the same solutions hold in slow motion (time dilation: physics steps scaled time).
  const slowMotion = process.env.SLOW === '1';
  await waitFor(app, hookReady, 15000);
  const levels = await app.evaluate(() => window.__threadbound.levels());
  await setSlowMotion(app, slowMotion);

  const results = [];
  for (let i = 0; i < levels.length; i++) {
    if (only === null || i === only) results.push(await proveLevel(app, i, levels[i], slowMotion));
  }
  if (slowMotion) await setSlowMotion(app, false);
  return results;
}

/** One level: it doesn't solve itself, its stored solution solves it, and its busiest frame fits the budget. */
async function proveLevel(app, i, { id, name }, slowMotion) {
  const selfSolved = await solvesUntouched(app, i);
  const { frameStats, solved } = await solveWithSolution(app, i, slowMotion);
  const state = await app.evaluate(() => {
    const s = window.__threadbound.state();
    return { scored: s.scored, marbles: s.level.marbles, stars: s.stars, threads: s.threads.length };
  });
  const marbles = solved ? [] : await app.evaluate(() => window.__threadbound.marbles());
  return {
    index: i,
    level: `${id} ${name}${slowMotion ? ' (slow motion)' : ''}`,
    pass: solved && !selfSolved && frameStats.breaches.length === 0,
    solved,
    selfSolved,
    ...state,
    cost: `${frameStats.drawCalls} calls, ${frameStats.triangles} tris, ${frameStats.physicsBodies} bodies`,
    ...(frameStats.breaches.length ? { breaches: frameStats.breaches } : {}),
    ...(solved ? {} : { marbles }),
  };
}

/** Negative control: presets untouched, no player threads. */
async function solvesUntouched(app, i) {
  await loadIndex(app, i);
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'drop' }));
  return waitFor(app, isComplete, 6000);
}

/** Hangs the stored solution and drops, reading the frame cost once every marble is in flight. */
async function solveWithSolution(app, i, slowMotion) {
  await loadIndex(app, i);
  await app.evaluate(() => {
    window.__threadbound.solve();
    window.__threadbound.dispatch({ type: 'drop' });
  });
  await waitFor(app, allReleased, 8000);
  const frameStats = await app.evaluate(() => window.__threadbound.frameStats());
  const solved = await waitFor(app, isComplete, slowMotion ? 25000 : 15000);
  return { frameStats, solved };
}
