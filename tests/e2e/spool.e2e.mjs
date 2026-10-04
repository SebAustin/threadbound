// E2E (seam 2): World 4's spool refuses an overspending thread or slide, the
// plaque says why, and it tracks what is left as threads are added and snipped.
import { checks, loadLevel, waitFor } from './lib.mjs';

const plaque = () => window.__threadbound.hud()?.model?.spoolLabel;
const threadCount = () => window.__threadbound.state().threads.length;
const hint = () => window.__threadbound.hud()?.model?.hint;
const pegB = () => window.__threadbound.state().pegPositions.b;

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  await loadLevel(app, 'w4-01');
  check('the plaque shows a full spool', (await app.evaluate(plaque)) === 'Spool 12/12 cm', await app.evaluate(plaque));

  await app.evaluate(() => window.__threadbound.dispatch({ type: 'addThread', from: 'c', to: 'd' }));
  check('a thread longer than the spool is refused', (await app.evaluate(threadCount)) === 0);
  const told = await waitFor(app, () => window.__threadbound.hud()?.model?.hint === 'Not enough spool for that thread', 2000);
  check('the plaque says why, not only the thunk', told, await app.evaluate(hint));

  await app.evaluate(() => window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' }));
  const spent = await waitFor(app, () => window.__threadbound.hud()?.model?.spoolLabel === 'Spool 4/12 cm', 2000);
  check('a short thread fits and the readout drops', spent, await app.evaluate(plaque));
  check('success clears the refusal', await waitFor(app, () => window.__threadbound.hud()?.model?.hint === '', 2000), await app.evaluate(hint));

  await app.evaluate(() => window.__threadbound.dispatch({ type: 'snip', from: 'a', to: 'b' }));
  const back = await waitFor(app, () => window.__threadbound.hud()?.model?.spoolLabel === 'Spool 12/12 cm', 2000);
  check('snipping gives the spool back', back, await app.evaluate(plaque));

  // Slide to Fit: a-b fits the 8 cm spool only once b slides in. Sliding b back
  // out would stretch the thread past the spool, so that slide is refused.
  await loadLevel(app, 'w4-04');
  await app.evaluate(() => {
    window.__threadbound.slide('b', 0.16);
    window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' });
  });
  check('the slid-in springboard fits', (await app.evaluate(threadCount)) === 1);
  await app.evaluate(() => window.__threadbound.slide('b', 0.29));
  const stayed = await app.evaluate(pegB);
  check('a slide that would overspend the spool is refused', Math.abs(stayed.x - 0.16) < 1e-6, JSON.stringify(stayed));
  check('the slide refusal is explained too', await waitFor(app, () => window.__threadbound.hud()?.model?.hint === 'Not enough spool for that thread', 2000), await app.evaluate(hint));
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'c' }));
  check('the thread limit is explained', await waitFor(app, () => window.__threadbound.hud()?.model?.hint === 'No threads left - snip one first', 2000), await app.evaluate(hint));

  await app.evaluate(() => window.__threadbound.dispatch({ type: 'load', index: 0 }));
  const plain = await waitFor(app, () => window.__threadbound.hud()?.model?.spoolLabel === '', 2000);
  check('levels without a spool show no spool line', plain);
  return results;
}
