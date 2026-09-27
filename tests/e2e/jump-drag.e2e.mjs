// E2E regression: a drag that jumps straight from peg to peg (no intermediate
// moves), then a chute click, must still create one thread and start a drop.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const results = [];
  const check = (name, pass, detail = '') => results.push({ name, pass, detail });
  const logs = [];
  page.on('console', (m) => m.text().includes('[Threadbound]') && logs.push(m.text()));

  const el = await app.frameElement().catch(() => null);
  const fb = el ? await el.boundingBox() : { x: 0, y: 0 };
  const cb = await app.locator('canvas').first().boundingBox();
  const o = { x: fb.x + cb.x, y: fb.y + cb.y };
  const pegs = await app.evaluate(() => window.__threadbound.pegs());
  const a = pegs.find((p) => p.id === 'a');
  const b = pegs.find((p) => p.id === 'b');

  await page.mouse.move(o.x + a.x, o.y + a.y);
  await page.mouse.down();
  await page.mouse.move(o.x + b.x, o.y + b.y); // single jump
  await page.mouse.up();
  await sleep(150);
  const threads = await app.evaluate(() => window.__threadbound.state().threads.length);
  check('jump drag creates exactly one thread', threads === 1, `threads=${threads}`);

  const chute = await app.evaluate(() => window.__threadbound.chute());
  await page.mouse.click(o.x + chute.x, o.y + chute.y);
  await sleep(300);
  const status = await app.evaluate(() => window.__threadbound.state().status);
  check('chute click after jump drag starts a drop', status !== 'idle', `status=${status}`);
  results.push({ name: 'console', logs });
  return results;
}
