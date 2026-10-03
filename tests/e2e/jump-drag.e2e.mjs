// E2E regression: a drag that jumps straight from peg to peg (no intermediate
// moves), then a chute click, must still create one thread and start a drop.
import { canvasMapper, captureLogs, checks, drag, loadIndex, sleep } from './lib.mjs';

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  const logs = captureLogs(page);

  // Progress persists (resume at furthest level); these checks are for level 1.
  await loadIndex(app, 0);
  const at = await canvasMapper(app);
  const pegs = await app.evaluate(() => window.__threadbound.pegs());
  const peg = (id) => at(pegs.find((p) => p.id === id));

  await drag(page, peg('a'), peg('b'), 0);
  await sleep(150);
  const threads = await app.evaluate(() => window.__threadbound.state().threads.length);
  check('jump drag creates exactly one thread', threads === 1, `threads=${threads}`);

  const chute = await app.evaluate(() => window.__threadbound.chute());
  await page.mouse.click(...at(chute));
  await sleep(300);
  const status = await app.evaluate(() => window.__threadbound.state().status);
  check('chute click after jump drag starts a drop', status !== 'idle', `status=${status}`);
  results.push({ name: 'console', logs });
  return results;
}
