// E2E: Restart / Next ledge buttons with real mouse clicks, plus stars + progress.
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
  const click = async (p) => {
    // Move first: the screen pointer only re-targets on pointermove.
    await page.mouse.move(fb.x + cb.x + p.x - 4, fb.y + cb.y + p.y - 4);
    await page.mouse.move(fb.x + cb.x + p.x, fb.y + cb.y + p.y);
    await page.mouse.click(fb.x + cb.x + p.x, fb.y + cb.y + p.y);
  };

  await app.evaluate(() => window.__threadbound.dispatch({ type: 'load', index: 0 }));
  await sleep(200);
  const hiddenAtStart = await app.evaluate(() => window.__threadbound.button('next')?.visible === false);
  check('Next hidden before solving', hiddenAtStart);

  await app.evaluate(() => {
    const hook = window.__threadbound;
    hook.dispatch({ type: 'addThread', from: 'a', to: 'b' });
    hook.dispatch({ type: 'drop' });
  });
  const solved = await waitFor(app, () => window.__threadbound.state().status === 'complete', 15000);
  const after = await app.evaluate(() => {
    const s = window.__threadbound.state();
    return { stars: s.stars, best: s.progress.best['w1-01'], unlocked: s.progress.unlocked };
  });
  check('solve awards 3 stars and saves progress', solved && after.stars === 3 && after.best === 3 && after.unlocked >= 1, JSON.stringify(after));
  const saved = await app.evaluate(() => localStorage.getItem('threadbound.progress.v1'));
  check('progress persisted to localStorage', Boolean(saved && saved.includes('w1-01')), saved ?? 'null');

  const next = await app.evaluate(() => window.__threadbound.button('next'));
  check('Next visible after solving', next?.visible === true);
  await click(next);
  const onLevel2 = await waitFor(app, () => window.__threadbound.state().levelIndex === 1, 3000);
  check('clicking Next loads level 2', onLevel2);

  await app.evaluate(() => window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' }));
  const restart = await app.evaluate(() => window.__threadbound.button('restart'));
  await click(restart);
  await sleep(300);
  const reset = await app.evaluate(() => {
    const s = window.__threadbound.state();
    return { index: s.levelIndex, threads: s.threads.length, status: s.status };
  });
  check('clicking Restart clears threads, stays on level', reset.index === 1 && reset.threads === 0 && reset.status === 'idle', JSON.stringify(reset));
  return results;
}
