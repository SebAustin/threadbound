// E2E (seam 2): World 4's spool refuses an overspending thread or slide, the
// ledge says why, and it tracks what is left as threads are added and snipped.
import { checks, loadLevel, waitFor } from './lib.mjs';

/** The spool readout as the model has it and as the ledge strip shows it, when they agree. */
const spool = () => {
  const model = window.__threadbound.hud()?.model?.spoolLabel;
  return model === window.__threadbound.ledge()?.text.spool ? model : `model ${model} vs ledge ${window.__threadbound.ledge()?.text.spool}`;
};
/** The hint line, likewise. */
const hint = () => {
  const model = window.__threadbound.hud()?.model?.hint;
  return model === window.__threadbound.ledge()?.text.hint ? model : `model ${model} vs ledge ${window.__threadbound.ledge()?.text.hint}`;
};
const threadCount = () => window.__threadbound.state().threads.length;
const pegB = () => window.__threadbound.state().pegPositions.b;
/** No refusal is held, and the hint line is back to the level's own hint (or empty without one). */
const refusalCleared = () => {
  const s = window.__threadbound.state();
  const shown = window.__threadbound.ledge()?.text.hint;
  return s.refusal === null && window.__threadbound.hud()?.model?.hint === (s.level.hint ?? '') && shown === (s.level.hint ?? '');
};

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  await loadLevel(app, 'w4-01');
  const full = await waitFor(app, () => window.__threadbound.ledge()?.text.spool === 'Spool 12/12 cm', 2000);
  check('the ledge shows a full spool', full && (await app.evaluate(spool)) === 'Spool 12/12 cm', await app.evaluate(spool));

  await app.evaluate(() => window.__threadbound.dispatch({ type: 'addThread', from: 'c', to: 'd' }));
  check('a thread longer than the spool is refused', (await app.evaluate(threadCount)) === 0);
  const told = await waitFor(app, () => window.__threadbound.ledge()?.text.hint === 'Not enough spool for that thread', 2000);
  check('the ledge says why, not only the thunk', told && (await app.evaluate(hint)) === 'Not enough spool for that thread', await app.evaluate(hint));

  await app.evaluate(() => window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' }));
  const spent = await waitFor(app, () => window.__threadbound.ledge()?.text.spool === 'Spool 4/12 cm', 2000);
  check('a short thread fits and the readout drops', spent && (await app.evaluate(spool)) === 'Spool 4/12 cm', await app.evaluate(spool));
  // The refusal line gives way to whatever the ledge showed before it: here w4-01's own level hint.
  check('success clears the refusal', await waitFor(app, refusalCleared, 2000), await app.evaluate(hint));

  await app.evaluate(() => window.__threadbound.dispatch({ type: 'snip', from: 'a', to: 'b' }));
  const back = await waitFor(app, () => window.__threadbound.ledge()?.text.spool === 'Spool 12/12 cm', 2000);
  check('snipping gives the spool back', back && (await app.evaluate(spool)) === 'Spool 12/12 cm', await app.evaluate(spool));

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
  check('the slide refusal is explained too', await waitFor(app, () => window.__threadbound.ledge()?.text.hint === 'Not enough spool for that thread', 2000), await app.evaluate(hint));

  await app.evaluate(() => window.__threadbound.dispatch({ type: 'load', index: 0 }));
  const plain = await waitFor(app, () => window.__threadbound.hud()?.model?.spoolLabel === '' && window.__threadbound.ledge()?.text.spool === '', 2000);
  check('levels without a spool show no spool readout on the ledge', plain, await app.evaluate(spool));
  // The thread limit is par + 1 (ADR 0005): level 1 takes two threads, and a third is refused. A
  // tight spool refuses a spare thread before the limit can, so this is checked without one.
  await app.evaluate(() => {
    window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' });
    window.__threadbound.dispatch({ type: 'addThread', from: 'b', to: 'c' });
    window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'c' });
  });
  const limited = await app.evaluate(() => ({ threads: window.__threadbound.state().threads.length, refusal: window.__threadbound.state().refusal }));
  check('the thread limit is explained', limited.threads === 2 && limited.refusal === 'limit' &&
    await waitFor(app, () => window.__threadbound.ledge()?.text.hint === 'No threads left - snip one first', 2000), `${JSON.stringify(limited)} ${await app.evaluate(hint)}`);
  return results;
}
