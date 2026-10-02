// Level-design probe: load LEVEL, apply SLIDES ([[pegId, to], ...]), snip presets
// unless KEEP_PRESETS=1, add THREADS ([[from, to], ...]), drop, and sample marble
// positions every 150 ms for SECONDS. Marbles are tagged e=teal, m=amber, z=azure.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const args = {
    index: Number(process.env.LEVEL ?? 0),
    threads: JSON.parse(process.env.THREADS ?? '[]'),
    slides: JSON.parse(process.env.SLIDES ?? '[]'),
    keepPresets: process.env.KEEP_PRESETS === '1',
  };
  const seconds = Number(process.env.SECONDS ?? 6);
  await app.evaluate(({ index, threads, slides, keepPresets }) => {
    const hook = window.__threadbound;
    hook.dispatch({ type: 'load', index });
    const level = hook.state().level;
    for (const [pegId, to] of slides) {
      const peg = level.pegs.find((p) => p.id === pegId);
      const x = peg.rail.axis === 'x' ? to : peg.x;
      const y = peg.rail.axis === 'y' ? to : peg.y;
      hook.dispatch({ type: 'movePeg', pegId, x, y });
    }
    if (!keepPresets) for (const p of level.presetThreads) hook.dispatch({ type: 'snip', from: p.from, to: p.to });
    for (const [from, to] of threads) hook.dispatch({ type: 'addThread', from, to });
    hook.dispatch({ type: 'drop' });
  }, args);
  const frames = [];
  for (let t = 0; t < seconds * 1000; t += 150) {
    await sleep(150);
    const ms = await app.evaluate(() => window.__threadbound.marbles());
    frames.push(ms.map((m) => `${m.color[1]}${m.x.toFixed(2)},${m.y.toFixed(2)}`).join(' '));
  }
  const state = await app.evaluate(() => {
    const s = window.__threadbound.state();
    return `${s.status} scored=${s.scored}/${s.level.marbles}`;
  });
  return { state, trace: frames.filter((_, i) => i % 2 === 0) };
}
