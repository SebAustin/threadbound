// E2E (real input): drag a rail peg's brass tab with the mouse, then the
// re-hung preset thread solves "Slide".
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
  const check = (name, pass, detail = '') => results.push({ name, pass, detail });
  const el = await app.frameElement().catch(() => null);
  const fb = el ? await el.boundingBox() : { x: 0, y: 0 };
  const cb = await app.locator('canvas').first().boundingBox();
  const at = (p) => [fb.x + cb.x + p.x, fb.y + cb.y + p.y];

  const index = await app.evaluate(() => window.__threadbound.levels().findIndex((l) => l.id === 'w3-01'));
  await app.evaluate((i) => window.__threadbound.dispatch({ type: 'load', index: i }), index);
  await sleep(250);

  const tab = await app.evaluate(() => window.__threadbound.handle('a'));
  check('rail peg has a pinchable tab', Boolean(tab));
  if (!tab) return results;
  // Target: the tab's spot when peg a sits at x = 0.05 (tab hangs 0.03 below the peg).
  const target = await app.evaluate(() => window.__threadbound.project(0.05, 0.21, 0.029));

  await page.mouse.move(...at(tab));
  await sleep(80);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(at(tab)[0] + ((target.x - tab.x) * i) / 10, at(tab)[1] + ((target.y - tab.y) * i) / 10);
    await sleep(16);
  }
  await page.mouse.up();
  await sleep(200);

  const pos = await app.evaluate(() => window.__threadbound.state().pegPositions.a);
  check('peg slid along its rail to the drag target', Math.abs(pos.x - 0.05) < 0.02 && Math.abs(pos.y - 0.24) < 1e-6, JSON.stringify(pos));
  const threads = await app.evaluate(() => window.__threadbound.state().threads.length);
  check('attached thread was rebuilt, not lost', threads === 1, `threads=${threads}`);

  await app.evaluate(() => window.__threadbound.dispatch({ type: 'drop' }));
  const solved = await waitFor(app, () => window.__threadbound.state().status === 'complete', 15000);
  check('re-hung thread solves the level', solved);
  return results;
}
