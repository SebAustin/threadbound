// E2E: the core loop with real (mouse) pointer input in the managed browser.
// Run with: zsh tests/e2e/run.sh tests/e2e/first-thread.e2e.mjs
import { canvasMapper, captureLogs, checks, drag, hookReady, isComplete, loadIndex, waitFor } from './lib.mjs';

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  const logs = captureLogs(page);

  const ready = await waitFor(app, hookReady, 15000);
  check('level loaded', ready);
  if (!ready) return results;

  // Progress persists (resume at furthest level); these checks are for level 1.
  await loadIndex(app, 0);
  const at = await canvasMapper(app);
  const pegs = await app.evaluate(() => window.__threadbound.pegs());
  const peg = (id) => at(pegs.find((p) => p.id === id));

  // 0. Negative control: without a thread the puzzle must not solve itself.
  const chute0 = await app.evaluate(() => window.__threadbound.chute());
  await page.mouse.click(...at(chute0));
  check('no thread → no solve', !(await waitFor(app, isComplete, 4000)));

  // 1. Pinch-pull a thread from peg a to peg b.
  await drag(page, peg('a'), peg('b'), 8);
  await waitFor(app, () => window.__threadbound.state().threads.length > 0, 1000);
  const threads = await app.evaluate(() => window.__threadbound.state().threads);
  check('thread a→b created', threads.length === 1 && threads[0].from === 'a' && threads[0].to === 'b', JSON.stringify(threads));

  // 2. Duplicate thread (reverse direction) is rejected.
  await drag(page, peg('b'), peg('a'), 6);
  const afterDup = await app.evaluate(() => window.__threadbound.state().threads.length);
  check('duplicate thread rejected', afterDup === 1, `threads=${afterDup}`);

  // 3. Drop marbles and wait for the puzzle to resolve.
  const chute = await app.evaluate(() => window.__threadbound.chute());
  await page.mouse.click(...at(chute));
  check('chute starts a drop', await waitFor(app, () => window.__threadbound.state().status !== 'idle', 2000));
  const done = await waitFor(app, isComplete, 12000);
  const final = await app.evaluate(() => window.__threadbound.state());
  const marbles = done ? [] : await app.evaluate(() => window.__threadbound.marbles());
  check('puzzle completes', done, `status=${final.status} scored=${final.scored}/${final.level.marbles} marbles=${JSON.stringify(marbles)}`);

  if (logs.length) results.push({ name: 'console', logs });
  return results;
}
