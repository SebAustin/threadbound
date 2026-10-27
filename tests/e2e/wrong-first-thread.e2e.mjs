// E2E (Q46, real mouse drags and clicks, from a fresh save): the trap the user found on w1-03.
// Wrong threads fill the thread limit (c-d first); a further link is refused, and the ledge says how
// to snip, which isn't taught until w1-05. A real click on a wrong thread snips it, then a-b links and
// the chute drop solves. The kept wrong thread, c-d, hangs at the far left, clear of the marbles.
import { canvasMapper, checks, click, drag, freshSave, isComplete, loadLevel, waitFor } from './lib.mjs';

const LIMIT_LINE = 'No threads left - pinch one to snip it';

/** Page function: the threads on the diorama as sorted 'x-y' pairs, the refusal and the ledge's hint. */
const shown = () => {
  const hook = window.__threadbound;
  const s = hook.state();
  return {
    threads: s.threads.map((t) => [t.from, t.to].sort().join('-')).sort(),
    refusal: s.refusal,
    hint: hook.ledge()?.text.hint ?? '',
    maxThreads: s.level.maxThreads,
  };
};

/** Real drag from one peg's knob to another's. */
async function link(page, app, at, from, to) {
  const [a, b] = await app.evaluate(([f, t]) => [f, t].map((id) => window.__threadbound.pegs().find((p) => p.id === id)), [from, to]);
  await drag(page, at(a), at(b), 8);
}

/** Screen point of the middle of the thread between two pegs. */
async function threadMiddle(app, at, from, to) {
  const p = await app.evaluate(([f, t]) => {
    const hook = window.__threadbound;
    const { pegPositions } = hook.state();
    const a = pegPositions[f];
    const b = pegPositions[t];
    return hook.project((a.x + b.x) / 2, (a.y + b.y) / 2, 0);
  }, [from, to]);
  return at(p);
}

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
  await waitFor(app, freshSave, 3000);
  await loadLevel(app, 'w1-03');
  const at = await canvasMapper(app);

  await link(page, app, at, 'c', 'd');
  await link(page, app, at, 'b', 'd');
  const full = await app.evaluate(shown);
  check('wrong threads c-d, then b-d, fill w1-03 thread limit of 2', JSON.stringify(full.threads) === '["b-d","c-d"]' && full.maxThreads === 2, JSON.stringify(full));

  await link(page, app, at, 'a', 'b');
  const told = await waitFor(app, (line) => window.__threadbound.ledge()?.text.hint === line, 2000, LIMIT_LINE);
  const refused = await app.evaluate(shown);
  check(`a further link is refused, and the ledge says "${LIMIT_LINE}"`, told && refused.refusal === 'limit' && JSON.stringify(refused.threads) === '["b-d","c-d"]', JSON.stringify(refused));

  await click(page, await threadMiddle(app, at, 'b', 'd'));
  const snipped = await waitFor(app, () => window.__threadbound.state().threads.length === 1, 2000);
  const after = await app.evaluate(shown);
  check('a real click on wrong thread b-d snips it, and the refusal line goes', snipped && JSON.stringify(after.threads) === '["c-d"]' && after.refusal === null && after.hint !== LIMIT_LINE, JSON.stringify(after));

  await link(page, app, at, 'a', 'b');
  const linked = await app.evaluate(shown);
  check('then a-b links', JSON.stringify(linked.threads) === '["a-b","c-d"]', JSON.stringify(linked));

  await click(page, at(await app.evaluate(() => window.__threadbound.chute())));
  const solved = await waitFor(app, isComplete, 20000);
  const end = await app.evaluate(() => ({ status: window.__threadbound.state().status, level: window.__threadbound.state().level.id }));
  check('a real chute click drops, and w1-03 is complete', solved && end.level === 'w1-03', JSON.stringify(end));

  await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
  check('progress is reset for the scripts after this one', await waitFor(app, freshSave, 3000));
  return results;
}
