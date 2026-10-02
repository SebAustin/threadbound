// Visual-gate helper: load LEVEL, optionally apply its solution and drop, then wait WAIT_MS.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  await app.evaluate(({ index, solve }) => {
    const hook = window.__threadbound;
    hook.dispatch({ type: 'load', index });
    if (!solve) return;
    const level = hook.state().level;
    for (const s of level.slides) {
      const peg = level.pegs.find((p) => p.id === s.peg);
      hook.dispatch({ type: 'movePeg', pegId: s.peg, x: peg.rail.axis === 'x' ? s.to : peg.x, y: peg.rail.axis === 'y' ? s.to : peg.y });
    }
    for (const t of level.solution) hook.dispatch({ type: 'addThread', from: t.from, to: t.to });
    hook.dispatch({ type: 'drop' });
  }, { index: Number(process.env.LEVEL), solve: process.env.SOLVE === '1' });
  await sleep(Number(process.env.WAIT_MS ?? 300));
  return 'ok';
}
