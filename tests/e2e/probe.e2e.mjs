// Level-design probe: load LEVEL, add THREADS (JSON [[from,to],...]), drop, and
// sample marble positions every 150 ms for SECONDS. Prints a compact trajectory.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const index = Number(process.env.LEVEL ?? 0);
  const threads = JSON.parse(process.env.THREADS ?? '[]');
  const seconds = Number(process.env.SECONDS ?? 6);
  await app.evaluate(({ index, threads }) => {
    const hook = window.__threadbound;
    hook.dispatch({ type: 'load', index });
    const level = hook.state().level;
    for (const p of level.presetThreads) hook.dispatch({ type: 'snip', from: p.from, to: p.to });
    for (const [from, to] of threads) hook.dispatch({ type: 'addThread', from, to });
    hook.dispatch({ type: 'drop' });
  }, { index, threads });
  const frames = [];
  for (let t = 0; t < seconds * 1000; t += 150) {
    await sleep(150);
    const ms = await app.evaluate(() => window.__threadbound.marbles().map((m) => [m.x, m.y]));
    frames.push(ms.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' '));
  }
  const state = await app.evaluate(() => {
    const s = window.__threadbound.state();
    return `${s.status} scored=${s.scored}/${s.level.marbles}`;
  });
  return { state, trace: frames.filter((f, i) => i % 2 === 0) };
}
