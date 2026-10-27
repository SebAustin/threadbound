// E2E: every level is solvable by its stored solution under real physics, and
// no level solves itself untouched. Levels are driven through the same command
// bus the player's buttons use; physics and scoring are fully live. The busiest
// frame (solution hung, every marble in flight) must fit the performance budget.
// Ticket 18: the same solution also solves on a passthrough table, turned 0 and 90 degrees.
// ADR 0005: the stored solution earns all 3 stars on the first drop after a load. That drop
// follows the no-thread drop, so this also proves a load resets the drop count.
import {
  hookReady,
  isComplete,
  leaveTable,
  loadIndex,
  placeOnTable,
  reopenLevel,
  setSlowMotion,
  solveAndDrop,
  solvesUntouched,
  TABLE_YAWS,
  waitFor,
} from './lib.mjs';

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
  const selfSolved = await solvesUntouched(app, (a) => loadIndex(a, i));
  const { frameStats, solved } = await solveWithSolution(app, i, slowMotion);
  const state = await app.evaluate(() => {
    const s = window.__threadbound.state();
    // Distinct notes the solve played (ADR 0004: bounces climb, so few levels should play one note).
    return {
      scored: s.scored,
      marbles: s.level.marbles,
      stars: s.stars,
      drops: s.drops,
      threads: s.threads.length,
      par: s.level.par,
      maxThreads: s.level.maxThreads,
      notes: new Set(s.melody.notes).size,
    };
  });
  const marbles = solved ? [] : await app.evaluate(() => window.__threadbound.marbles());
  const turned = await solvesTurned(app, i, slowMotion);
  return {
    index: i,
    level: `${id} ${name}${slowMotion ? ' (slow motion)' : ''}`,
    pass: solved && state.stars === 3 && !selfSolved && frameStats.breaches.length === 0 && Object.values(turned).every(Boolean),
    solved,
    turned,
    selfSolved,
    ...state,
    cost: `${frameStats.drawCalls} calls, ${frameStats.triangles} tris, ${frameStats.physicsBodies} bodies`,
    ...(frameStats.breaches.length ? { breaches: frameStats.breaches } : {}),
    ...(solved ? {} : { marbles }),
  };
}

/** Ticket 18: the stored solution on the passthrough table at each turn, keyed by the turn in degrees. */
async function solvesTurned(app, i, slowMotion) {
  const turned = {};
  for (const yaw of TABLE_YAWS) {
    await placeOnTable(app, yaw, reopenLevel, i);
    turned[`${Math.round((yaw * 180) / Math.PI)} degrees`] = await solveAndDrop(app, slowMotion ? 25000 : 15000);
  }
  await leaveTable(app);
  return turned;
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
  // The solve is recorded in the update after the one that completes it: wait for its stars.
  if (solved) await waitFor(app, () => window.__threadbound.state().stars > 0, 2000);
  return { frameStats, solved };
}
