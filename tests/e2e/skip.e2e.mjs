// E2E (real clicks, from a fresh save): the skip (CONTEXT.md Skip). With thread b-c on level 1 the
// marbles fall past it, so every drop misses. Two misses leave the settings face's Skip hidden, a third
// shows it, and Skip moves on to level 2 with level 1 saved as skipped: no stars, still reachable with
// Prev. A skip dispatched while it isn't offered does nothing. One three-miss run per script: a missed
// drop takes up to ~15 s to settle and a browser lease is capped at 110 s. Ticket 14: the ledge says what to
// try after the second miss, and after the third it points to the skip, before the settings face is ever opened.
import { canvasMapper, checks, click, clickCanvas, drag, freshSave, plaqueElementAt, waitFor } from './lib.mjs';

const MISSED = 'Missed - pinch a thread to snip it, or restart';
const SKIP_POINTER = 'Stuck? Skip is on the settings face';

/** Page function: the skip offer as the settings face renders it, the drop counts behind it, the face shown and the ledge's hint. */
const offer = () => {
  const hook = window.__threadbound;
  const s = hook.state();
  return { status: s.status, missedDrops: s.missedDrops, skipOffered: hook.plaque()?.skipOffered, skipped: s.progress.skipped, face: hook.plaque()?.face, hint: hook.ledge()?.text.hint };
};

/** A real click on the chute, then the wait until the drop has settled, unsolved. */
async function missWithClick(page, app, at) {
  await click(page, at(await app.evaluate(() => window.__threadbound.chute())));
  await waitFor(app, () => window.__threadbound.state().status === 'dropping', 2000);
  await waitFor(app, () => window.__threadbound.state().status === 'idle', 20000);
  return app.evaluate(offer);
}

async function hangBC(page, app, at, check) {
  const [b, c] = await app.evaluate(() => ['b', 'c'].map((id) => window.__threadbound.pegs().find((p) => p.id === id)));
  await drag(page, at(b), at(c), 8);
  const threads = await app.evaluate(() => window.__threadbound.state().threads);
  check('a real drag hangs thread b-c on level 1', threads.length === 1 && [threads[0].from, threads[0].to].sort().join('-') === 'b-c', JSON.stringify(threads));
}

/** Three misses: Skip stays hidden after two (and a dispatched skip does nothing), shows after the third. */
async function threeMisses(page, app, at, check) {
  const first = await missWithClick(page, app, at);
  const second = await missWithClick(page, app, at);
  check('two misses leave Skip hidden', first.missedDrops === 1 && second.missedDrops === 2 && second.skipOffered === false, JSON.stringify({ first, second }));
  check('after the second miss the ledge shows the missed line', second.hint === MISSED, second.hint);
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'skip' }));
  const ignored = !(await waitFor(app, () => window.__threadbound.state().levelIndex !== 0, 1000));
  const still = await app.evaluate(offer);
  check('a skip dispatched while it is not offered does nothing', ignored && still.skipped.length === 0, JSON.stringify(still));
  const third = await missWithClick(page, app, at);
  check('a third miss shows Skip', third.missedDrops === 3 && third.skipOffered === true, JSON.stringify(third));
  check(`after the third the ledge reads "${SKIP_POINTER}", before the settings face is ever opened`, third.hint === SKIP_POINTER && third.face === 'level', JSON.stringify({ hint: third.hint, face: third.face }));
}

/** The settings button, then Skip: level 2, level 1 saved as skipped with no stars. */
async function skipToLevelTwo(page, app, at, check) {
  await click(page, at(await app.evaluate(() => window.__threadbound.button('settings'))));
  await waitFor(app, () => window.__threadbound.plaque()?.face === 'settings', 2000);
  await clickCanvas(page, app, at, await plaqueElementAt(app, 'set-skip'));
  const moved = await waitFor(app, () => window.__threadbound.state().level.id === 'w1-02', 3000);
  const after = await app.evaluate(() => {
    const hook = window.__threadbound;
    const s = hook.state();
    const saved = JSON.parse(localStorage.getItem('threadbound.progress.v1') ?? '{}');
    return { level: s.level.id, skipped: s.progress.skipped, best: s.progress.best['w1-01'] ?? null, saved: saved.skipped, stars: hook.plaque()?.starsLabel, offered: hook.plaque()?.skipOffered };
  });
  check("Skip loads level 2 with skipped ['w1-01'] (saved), no best for w1-01, and Stars 0/72",
    moved && JSON.stringify(after.skipped) === '["w1-01"]' && JSON.stringify(after.saved) === '["w1-01"]' && after.best === null && after.stars === 'Stars 0/72',
    JSON.stringify(after));
  check('level 2 offers no skip', after.offered === false, JSON.stringify(after));
}

/** Prev on the settings face still reaches the skipped level. */
async function prevReachesSkipped(page, app, at, check) {
  if ((await app.evaluate(() => window.__threadbound.plaque()?.face)) !== 'settings') {
    await click(page, at(await app.evaluate(() => window.__threadbound.button('settings'))));
    await waitFor(app, () => window.__threadbound.plaque()?.face === 'settings', 2000);
  }
  await clickCanvas(page, app, at, await plaqueElementAt(app, 'set-prev'));
  const back = await waitFor(app, () => window.__threadbound.state().level.id === 'w1-01', 3000);
  const there = await app.evaluate(offer);
  check('Prev reaches the skipped level 1, which offers no skip', back && there.skipOffered === false && JSON.stringify(there.skipped) === '["w1-01"]', JSON.stringify(there));
}

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
  await waitFor(app, freshSave, 3000);
  const at = await canvasMapper(app);
  try {
    await hangBC(page, app, at, check);
    await threeMisses(page, app, at, check);
    await skipToLevelTwo(page, app, at, check);
    await prevReachesSkipped(page, app, at, check);
  } finally {
    await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
    check('progress is reset for the scripts after this one', await waitFor(app, freshSave, 3000));
  }
  return results;
}
