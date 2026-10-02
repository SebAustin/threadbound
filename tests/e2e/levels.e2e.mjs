// E2E: every level is solvable by its stored solution under real physics, and
// no level solves itself untouched. Levels are driven through the same command
// bus the player's buttons use; physics and scoring are fully live.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(app, predicate, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await app.evaluate(predicate)) return true;
    await sleep(150);
  }
  return false;
}

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const results = [];
  const only = process.env.LEVEL ? Number(process.env.LEVEL) : null;
  await waitFor(app, () => Boolean(window.__threadbound?.state().level), 15000);
  const levels = await app.evaluate(() => window.__threadbound.levels());

  for (let i = 0; i < levels.length; i++) {
    if (only !== null && i !== only) continue;
    const { id, name } = levels[i];

    // Negative control: presets untouched, no player threads.
    await app.evaluate((index) => window.__threadbound.dispatch({ type: 'load', index }), i);
    await sleep(200);
    await app.evaluate(() => window.__threadbound.dispatch({ type: 'drop' }));
    const selfSolved = await waitFor(app, () => window.__threadbound.state().status === 'complete', 6000);

    // Solution: snip presets it doesn't keep, add its threads, drop.
    await app.evaluate((index) => window.__threadbound.dispatch({ type: 'load', index }), i);
    await sleep(200);
    await app.evaluate(() => {
      const hook = window.__threadbound;
      const level = hook.state().level;
      const same = (a, b) => (a.from === b.from && a.to === b.to) || (a.from === b.to && a.to === b.from);
      // Rail slides first: threads attached to a moved peg are rebuilt at its new spot.
      for (const slide of level.slides) {
        const peg = level.pegs.find((p) => p.id === slide.peg);
        const x = peg.rail.axis === 'x' ? slide.to : peg.x;
        const y = peg.rail.axis === 'y' ? slide.to : peg.y;
        hook.dispatch({ type: 'movePeg', pegId: slide.peg, x, y });
      }
      for (const p of level.presetThreads) {
        if (!level.solution.some((s) => same(s, p))) hook.dispatch({ type: 'snip', from: p.from, to: p.to });
      }
      for (const s of level.solution) {
        if (!level.presetThreads.some((p) => same(s, p))) hook.dispatch({ type: 'addThread', from: s.from, to: s.to });
      }
      hook.dispatch({ type: 'drop' });
    });
    const solved = await waitFor(app, () => window.__threadbound.state().status === 'complete', 15000);
    const state = await app.evaluate(() => {
      const s = window.__threadbound.state();
      return { scored: s.scored, marbles: s.level.marbles, stars: s.stars, threads: s.threads.length };
    });
    const marbles = solved ? [] : await app.evaluate(() => window.__threadbound.marbles());
    results.push({
      level: `${id} ${name}`,
      pass: solved && !selfSolved,
      solved,
      selfSolved,
      ...state,
      ...(solved ? {} : { marbles }),
    });
  }
  return results;
}
