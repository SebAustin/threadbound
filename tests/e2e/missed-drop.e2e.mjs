// E2E: a drop where every marble misses ends by itself, without the cadence a solve
// closes on, so the player (and the ghost hand) can try again without pressing Restart.
// Ticket 14 (real drags and clicks on level 1, from a fresh save): with thread b-c the marbles fall
// past it, and once the drop is idle the ledge says what to try next instead of "Now pinch the
// chute"; a real click that snips b-c takes the line away. A duplicate a-b is refused, the refusal
// goes when the drop starts, and the first solve says how to hear the tune again.
import { canvasMapper, checks, click, drag, freshSave, isComplete, waitFor } from './lib.mjs';

const MISSED = 'Missed - pinch a thread to snip it, or restart';
const PINCH_PULL = 'Pinch a glowing peg, pull, release on the other';
const DUPLICATE = 'Those pegs are already joined';
const FIRST_SOLVE = 'Pinch the stars to hear it again';
/** Ledge type is 1.1 cm with 1.32 cm lines (ticket 12): two lines lay out under 2.7 cm. */
const TWO_LINES_M = 0.027;

const ledgeHint = () => window.__threadbound.ledge()?.text.hint ?? '';
const idle = () => window.__threadbound.state().status === 'idle';

async function link(page, app, at, from, to) {
  const [a, b] = await app.evaluate(([f, t]) => [f, t].map((id) => window.__threadbound.pegs().find((p) => p.id === id)), [from, to]);
  await drag(page, at(a), at(b), 8);
}

async function clickChute(page, app, at) {
  await click(page, at(await app.evaluate(() => window.__threadbound.chute())));
  return waitFor(app, () => window.__threadbound.state().status !== 'idle', 2000);
}

/** The drop with no thread: it ends by itself, with no cadence, and the ghost hand comes back. */
async function emptyDrop(app, check) {
  await app.evaluate(() => {
    window.__threadbound.cues();
    window.__threadbound.dispatch({ type: 'drop' });
  });
  check('the drop starts', await waitFor(app, () => window.__threadbound.state().status === 'dropping', 2000));
  const ended = await waitFor(app, idle, 15000);
  const state = await app.evaluate(() => ({ status: window.__threadbound.state().status, ghost: window.__threadbound.ghost(), hint: window.__threadbound.ledge()?.text.hint }));
  check('a drop where every marble misses ends by itself', ended, JSON.stringify(state));
  const cadence = (await app.evaluate(() => window.__threadbound.cues())).filter((c) => c === 'cadence').length;
  check('a missed drop ends without the cadence', ended && cadence === 0, `${cadence} cadence cues`);
  check('the ghost hand comes back to teach the pinch-pull', state.ghost?.step === 'pinch-pull' && state.ghost.visible, JSON.stringify(state.ghost));
  check('with no thread on the diorama the hint is the onboarding line, not the missed line', state.hint === PINCH_PULL, state.hint);
}

/** Thread b-c misses: the missed line once idle, in at most two ledge lines; a real click on b-c snips it and the line goes. */
async function missedWithThread(page, app, at, check) {
  await link(page, app, at, 'b', 'c');
  const hung = await app.evaluate(() => window.__threadbound.state().threads.length);
  const started = await clickChute(page, app, at);
  const ended = await waitFor(app, idle, 20000);
  const shown = await app.evaluate(() => ({ hint: window.__threadbound.ledge()?.text.hint, model: window.__threadbound.hud()?.model?.hint, size: window.__threadbound.ledge()?.hintSize }));
  check('on level 1 with b-c, a real chute click misses and the idle ledge says what to try next (not "Now pinch the chute")',
    hung === 1 && started && ended && shown.hint === MISSED && shown.model === MISSED, JSON.stringify(shown));
  const height = shown.size?.height ?? 0;
  check('the 46-character missed line lays out in at most two ledge lines', height > 0 && height <= TWO_LINES_M, JSON.stringify(shown.size));
  const [b, c] = await app.evaluate(() => ['b', 'c'].map((id) => window.__threadbound.state().pegPositions[id]));
  await click(page, at(await app.evaluate(([p, q]) => window.__threadbound.project((p.x + q.x) / 2, (p.y + q.y) / 2, 0), [b, c])));
  const snipped = await waitFor(app, () => window.__threadbound.state().threads.length === 0, 2000);
  const after = await app.evaluate(ledgeHint);
  check('a real click that snips b-c takes the missed line away', snipped && after !== MISSED && after === PINCH_PULL, after);
}

/** A duplicate a-b is refused; the drop clears the refusal; the first solve points to the stars. */
async function refusalThenSolve(page, app, at, check) {
  await link(page, app, at, 'a', 'b');
  await link(page, app, at, 'a', 'b');
  const refused = await waitFor(app, (line) => window.__threadbound.ledge()?.text.hint === line, 2000, DUPLICATE);
  check(`a duplicate a-b shows "${DUPLICATE}"`, refused, await app.evaluate(ledgeHint));
  const started = await clickChute(page, app, at);
  const during = await app.evaluate(() => ({ status: window.__threadbound.state().status, refusal: window.__threadbound.state().refusal, hint: window.__threadbound.ledge()?.text.hint }));
  check('the refusal is gone once the drop starts', started && during.refusal === null && during.hint !== DUPLICATE, JSON.stringify(during));
  const solved = await waitFor(app, isComplete, 15000);
  const told = await waitFor(app, (line) => window.__threadbound.ledge()?.text.hint === line, 2000, FIRST_SOLVE);
  check(`the first solve shows "${FIRST_SOLVE}"`, solved && told, await app.evaluate(ledgeHint));
}

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
  await waitFor(app, freshSave, 3000);
  const at = await canvasMapper(app);
  try {
    await emptyDrop(app, check);
    await missedWithThread(page, app, at, check);
    await refusalThenSolve(page, app, at, check);
  } finally {
    await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
    check('progress is reset for the scripts after this one', await waitFor(app, freshSave, 3000));
  }
  return results;
}
