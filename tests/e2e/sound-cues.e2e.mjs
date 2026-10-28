// E2E: every player-visible event plays its own cue (accessibility: follow the
// puzzle by ear). Audio can't be heard in automation, so the dev-only cue log
// records which cue each event asked for.
import { canvasMapper, checks, click, drag, frames, isComplete, loadLevel, waitFor } from './lib.mjs';

const drain = () => window.__threadbound.cues();
/** The same log as records: name, pitch, time, where it was heard from and whether it was panned. */
const trace = () => window.__threadbound.cueTrace();
const count = (cues, name) => cues.filter((c) => c === name).length;
/** Collects cue records page-side across polls, so draining doesn't lose them between checks. */
const heardAmbience = () => {
  window.__heard = [...(window.__heard ?? []), ...window.__threadbound.cueTrace()];
  return window.__heard.some((record) => record.name === 'ambience');
};
/** Where w1-01's cues should come from: the a-b thread's midpoint and each cup's centre at half wall height. */
const expectedSources = () => {
  const hook = window.__threadbound;
  const { a, b } = hook.state().pegPositions;
  const halfWall = 0.0175; // GOAL.wallHeight / 2 (src/config/constants.ts): a page function can't import it.
  return {
    threadMid: hook.worldOf((a.x + b.x) / 2, (a.y + b.y) / 2),
    cups: hook.state().level.goals.map((g) => hook.worldOf(g.x, halfWall)),
  };
};
/** Metres between two world points; NaN (never within a tolerance) when either is missing. */
const dist = (p, q) => (p && q ? Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) : NaN);
/** Cue sources are rounded to 1 mm. */
const MM = 0.001;
const setHidden = (hidden) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
};
/** One ambience interval plus slack. */
const AMBIENCE_WAIT_MS = 8000;

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  const ctx = { page, app, check, at: await canvasMapper(app) };

  await cupsChimeOrThud(ctx);
  await ledgeButtonClicks(ctx);
  await pegCues(ctx);
  await pullMisses(ctx);
  await slidSettles(ctx);
  await ambienceStopsWhenPaused(ctx);
  return results;
}

/** A solve chimes once per scored marble, each cue placed where it happened; a mis-sorted marble thuds. */
async function cupsChimeOrThud({ app, check }) {
  await loadLevel(app, 'w1-01');
  await app.evaluate(drain);
  await app.evaluate(() => {
    window.__threadbound.solve();
    window.__threadbound.dispatch({ type: 'drop' });
  });
  await waitFor(app, isComplete, 15000);
  const records = await app.evaluate(trace);
  const solved = records.map((r) => r.name);
  const scored = await app.evaluate(() => window.__threadbound.state().scored);
  check('each scored marble chimes', count(solved, 'cupCorrect') === scored && scored > 0, JSON.stringify(solved));
  checkSources(check, records, await app.evaluate(expectedSources));

  await loadLevel(app, 'w2-03');
  await app.evaluate(drain);
  await app.evaluate(() => {
    window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' });
    window.__threadbound.dispatch({ type: 'drop' });
  });
  await waitFor(app, () => window.__threadbound.state().status === 'idle', 15000);
  const thuds = (await app.evaluate(trace)).filter((r) => r.name === 'cupWrong');
  check('a marble in the wrong cup thuds instead', thuds.length > 0);
  const { cups } = await app.evaluate(expectedSources);
  check(
    'the thud is heard from a cup\'s centre (within 1 mm), the cup that took the marble',
    thuds.length > 0 && thuds.every((r) => cups.some((cup) => dist(r.source, cup) <= MM)),
    JSON.stringify({ cups, thuds: thuds.map((r) => r.source) }),
  );
}

/**
 * The solve's plucks and chimes say where they happened (ticket 16): every bounce and the strung
 * thread at the a-b midpoint, every cup chime at its cup's centre, and nothing panned in the browser.
 */
function checkSources(check, records, { threadMid, cups }) {
  const plucks = records.filter((r) => r.name === 'bounce' || r.name === 'thread');
  const offThread = plucks.filter((r) => !(dist(r.source, threadMid) <= MM));
  check(
    'every bounce and the strung thread are heard from the a-b midpoint (within 1 mm)',
    plucks.some((r) => r.name === 'bounce') && plucks.some((r) => r.name === 'thread') && offThread.length === 0,
    JSON.stringify({ plucks: plucks.length, threadMid, offThread: offThread.slice(0, 3) }),
  );
  const chimes = records.filter((r) => r.name === 'cupCorrect');
  const offCup = chimes.filter((r) => !cups.some((cup) => dist(r.source, cup) <= MM));
  check('every cup chime is heard from its cup\'s centre (within 1 mm)', chimes.length > 0 && offCup.length === 0, JSON.stringify({ cups, offCup }));
  const panned = records.filter((r) => r.spatial !== false);
  check('the browser is mono: no cue went through a panner', records.length > 0 && panned.length === 0, JSON.stringify(panned.slice(0, 3)));
}

/** A real click on Restart (the w2-03 thread is still hung) plays the button cue. */
async function ledgeButtonClicks({ page, app, at, check }) {
  await click(page, at(await app.evaluate(() => window.__threadbound.button('restart'))));
  await waitFor(app, () => window.__threadbound.state().threads.length === 0, 2000);
  check('pressing a ledge button clicks', (await app.evaluate(drain)).includes('button'));
}

/** Grabbing a peg, a refused thread and a snip each have their own cue. */
async function pegCues({ page, app, at, check }) {
  await loadLevel(app, 'w1-01');
  await app.evaluate(drain);
  const pegs = await app.evaluate(() => window.__threadbound.pegs());
  const [a, b] = pegs.map((p) => at(p));
  await drag(page, a, b);
  check('taking hold of a peg is heard', (await app.evaluate(drain)).includes('pegGrab'));

  await app.evaluate(() => window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' }));
  check('a refused thread thunks', (await app.evaluate(drain)).includes('refused'));

  await app.evaluate(() => window.__threadbound.dispatch({ type: 'snip', from: 'a', to: 'b' }));
  check('a snip is heard', (await app.evaluate(drain)).includes('snip'));
}

/** A pull released on bare panel misses, softly; a press and release on a peg is a tap, and silent. */
async function pullMisses({ page, app, at, check }) {
  await loadLevel(app, 'w1-01');
  const pegs = await app.evaluate(() => window.__threadbound.pegs());
  const a = at(pegs.find((p) => p.id === 'a'));
  // Bare back panel on the knobs' plane (AIM_PLANE_Z), clear of every peg's snap radius.
  const bare = at(await app.evaluate(() => window.__threadbound.project(0.25, 0.3, 0.029)));
  await app.evaluate(drain);
  await drag(page, a, bare);
  await frames(app, 2);
  const missed = await app.evaluate(drain);
  const threads = await app.evaluate(() => window.__threadbound.state().threads.length);
  check(
    'a pull released on bare panel logs one dragMiss and no thread',
    count(missed, 'dragMiss') === 1 && count(missed, 'thread') === 0 && threads === 0,
    JSON.stringify({ missed, threads }),
  );
  await click(page, a);
  await frames(app, 2);
  const tapped = await app.evaluate(drain);
  check('a press and release on a peg logs no dragMiss', tapped.includes('pegGrab') && count(tapped, 'dragMiss') === 0, JSON.stringify(tapped));
}

/** A peg slid along its rail settles audibly. */
async function slidSettles({ app, check }) {
  await loadLevel(app, 'w3-01');
  await app.evaluate(drain);
  await app.evaluate(() => window.__threadbound.slide('a', 0.05));
  check('a slid peg settles audibly', (await app.evaluate(drain)).includes('settle'));
}

/** The study hums now and then, and falls silent while the game is paused. */
async function ambienceStopsWhenPaused({ app, check }) {
  await app.evaluate(() => {
    window.__heard = [];
  });
  check('the virtual study hums a quiet phrase', await waitFor(app, heardAmbience, AMBIENCE_WAIT_MS));
  const hum = await app.evaluate(() => window.__heard.filter((record) => record.name === 'ambience'));
  check(
    'the hum comes from nowhere in particular (source null, not panned)',
    hum.length > 0 && hum.every((record) => record.source === null && record.spatial === false),
    JSON.stringify(hum.slice(0, 2)),
  );
  await app.evaluate(setHidden, true);
  await waitFor(app, () => window.__threadbound.state().paused, 2000);
  await app.evaluate(() => {
    window.__heard = [];
    window.__threadbound.cues();
  });
  check('a paused game is silent', !(await waitFor(app, heardAmbience, AMBIENCE_WAIT_MS)));
  await app.evaluate(setHidden, false);
}
