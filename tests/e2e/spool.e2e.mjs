// E2E (seam 2): World 4's spool refuses an overspending thread and the plaque
// tracks what is left as threads are added and snipped.
import { checks, loadLevel, waitFor } from './lib.mjs';

const plaque = () => window.__threadbound.hud()?.model?.spoolLabel;
const threadCount = () => window.__threadbound.state().threads.length;

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  await loadLevel(app, 'w4-01');
  check('the plaque shows a full spool', (await app.evaluate(plaque)) === 'Spool 12/12 cm', await app.evaluate(plaque));

  await app.evaluate(() => window.__threadbound.dispatch({ type: 'addThread', from: 'c', to: 'd' }));
  check('a thread longer than the spool is refused', (await app.evaluate(threadCount)) === 0);

  await app.evaluate(() => window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' }));
  const spent = await waitFor(app, () => window.__threadbound.hud()?.model?.spoolLabel === 'Spool 4/12 cm', 2000);
  check('a short thread fits and the readout drops', spent, await app.evaluate(plaque));

  await app.evaluate(() => window.__threadbound.dispatch({ type: 'snip', from: 'a', to: 'b' }));
  const back = await waitFor(app, () => window.__threadbound.hud()?.model?.spoolLabel === 'Spool 12/12 cm', 2000);
  check('snipping gives the spool back', back, await app.evaluate(plaque));

  await app.evaluate(() => window.__threadbound.dispatch({ type: 'load', index: 0 }));
  const plain = await waitFor(app, () => window.__threadbound.hud()?.model?.spoolLabel === '', 2000);
  check('levels without a spool show no spool line', plain);
  return results;
}
