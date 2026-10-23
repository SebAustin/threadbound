// E2E: every player-visible event plays its own cue (accessibility: follow the
// puzzle by ear). Audio can't be heard in automation, so the dev-only cue log
// records which cue each event asked for.
import { canvasMapper, checks, click, drag, isComplete, loadLevel, waitFor } from './lib.mjs';

const drain = () => window.__threadbound.cues();
const count = (cues, name) => cues.filter((c) => c === name).length;
/** Collects cues page-side across polls, so draining doesn't lose them between checks. */
const heardAmbience = () => {
  window.__heard = [...(window.__heard ?? []), ...window.__threadbound.cues()];
  return window.__heard.includes('ambience');
};
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
  await slidSettles(ctx);
  await ambienceStopsWhenPaused(ctx);
  return results;
}

/** A solve chimes once per scored marble; a mis-sorted marble thuds. */
async function cupsChimeOrThud({ app, check }) {
  await loadLevel(app, 'w1-01');
  await app.evaluate(drain);
  await app.evaluate(() => {
    window.__threadbound.solve();
    window.__threadbound.dispatch({ type: 'drop' });
  });
  await waitFor(app, isComplete, 15000);
  const solved = await app.evaluate(drain);
  const scored = await app.evaluate(() => window.__threadbound.state().scored);
  check('each scored marble chimes', count(solved, 'cupCorrect') === scored && scored > 0, JSON.stringify(solved));

  await loadLevel(app, 'w2-03');
  await app.evaluate(drain);
  await app.evaluate(() => {
    window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' });
    window.__threadbound.dispatch({ type: 'drop' });
  });
  await waitFor(app, () => window.__threadbound.state().status === 'idle', 15000);
  check('a marble in the wrong cup thuds instead', (await app.evaluate(drain)).includes('cupWrong'));
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
  await app.evaluate(setHidden, true);
  await waitFor(app, () => window.__threadbound.state().paused, 2000);
  await app.evaluate(() => {
    window.__heard = [];
    window.__threadbound.cues();
  });
  check('a paused game is silent', !(await waitFor(app, heardAmbience, AMBIENCE_WAIT_MS)));
  await app.evaluate(setHidden, false);
}
