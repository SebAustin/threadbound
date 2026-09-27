// E2E: the core loop with real (mouse) pointer input in the managed browser.
// Run with: npx @iwsdk/cli browser run tests/e2e/first-thread.e2e.mjs
// (dev server must be started with --allow-browser-automation; reload the page
// first with `npx @iwsdk/cli browser reload` for a clean state)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function canvasOrigin(frame) {
  const el = await frame.frameElement().catch(() => null);
  const frameBox = el ? await el.boundingBox() : { x: 0, y: 0 };
  const canvasBox = await frame.locator('canvas').first().boundingBox();
  return { x: frameBox.x + canvasBox.x, y: frameBox.y + canvasBox.y };
}

async function waitFor(frame, predicate, arg, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await frame.evaluate(predicate, arg)) return true;
    await sleep(100);
  }
  return false;
}

export default async function run({ page, frame }) {
  const results = [];
  const check = (name, pass, detail = '') => results.push({ name, pass, detail });
  const logs = [];
  page.on('console', (m) => {
    if (m.text().includes('[Threadbound]')) logs.push(m.text());
  });

  const app = frame ?? page.mainFrame();
  const hookReady = await waitFor(app, () => Boolean(window.__threadbound?.state().level), null, 15000);
  check('level loaded', hookReady);
  if (!hookReady) return results;

  const origin = await canvasOrigin(app);
  const pegs = await app.evaluate(() => window.__threadbound.pegs());
  const peg = (id) => pegs.find((p) => p.id === id);
  results.push({ name: 'geometry', origin, pegs });
  const at = (p) => [origin.x + p.x, origin.y + p.y];

  // 0. Negative control: without a thread the puzzle must not solve itself.
  const chute0 = await app.evaluate(() => window.__threadbound.chute());
  await page.mouse.click(origin.x + chute0.x, origin.y + chute0.y);
  const selfSolved = await waitFor(app, () => window.__threadbound.state().status === 'complete', null, 4000);
  check('no thread → no solve', !selfSolved);

  // 1. Pinch-pull a thread from peg a to peg b.
  await page.mouse.move(...at(peg('a')));
  await sleep(100);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    const a = peg('a');
    const b = peg('b');
    await page.mouse.move(origin.x + a.x + ((b.x - a.x) * i) / 8, origin.y + a.y + ((b.y - a.y) * i) / 8);
    await sleep(16);
  }
  await page.mouse.up();
  await sleep(100);
  const threads = await app.evaluate(() => window.__threadbound.state().threads);
  check('thread a→b created', threads.length === 1 && threads[0].from === 'a' && threads[0].to === 'b', JSON.stringify(threads));

  // 2. Duplicate thread is rejected.
  await page.mouse.move(...at(peg('b')));
  await page.mouse.down();
  await page.mouse.move(...at(peg('a')), { steps: 6 });
  await page.mouse.up();
  const afterDup = await app.evaluate(() => window.__threadbound.state().threads.length);
  check('duplicate thread rejected', afterDup === 1, `threads=${afterDup}`);

  // 3. Drop marbles and wait for the puzzle to resolve.
  const chute = await app.evaluate(() => window.__threadbound.chute());
  await page.mouse.click(origin.x + chute.x, origin.y + chute.y);
  const dropping = await waitFor(app, () => window.__threadbound.state().status !== 'idle', null, 2000);
  check('chute starts a drop', dropping);
  const done = await waitFor(app, () => window.__threadbound.state().status === 'complete', null, 12000);
  const final = await app.evaluate(() => window.__threadbound.state());
  const marbles = done ? [] : await app.evaluate(() => window.__threadbound.marbles());
  check('puzzle completes', done, `status=${final.status} scored=${final.scored}/${final.level.marbles} marbles=${JSON.stringify(marbles)}`);

  if (logs.length) results.push({ name: 'console', logs });
  return results;
}
