// E2E (seam 2): a marble resting in a cup of another color must NOT score.
// "Duet" with the tight A→B trampoline throws amber into azure's corner cup.
// Ticket 15's visual caption: that cup's walls blink, and only that cup's; they end on
// the wall colour. Cups that only receive marbles they accept never blink.
import { checks, isComplete, loadLevel, waitFor } from './lib.mjs';

const AZURE_CUP = { minX: 0.4, maxX: 0.49 };

/**
 * Page side: watches every rendered frame from now on and keeps, per cup, whether it was
 * ever seen blinking (captions() mirrors `flashing`, which lasts about 0.5 s).
 */
const watchFlashes = () => {
  window.__flashSeen = [];
  window.__watchFlashes = true;
  const tick = () => {
    window.__threadbound.captions().cups.forEach((cup, i) => {
      window.__flashSeen[i] = window.__flashSeen[i] || cup.flashing;
    });
    if (window.__watchFlashes) requestAnimationFrame(tick);
  };
  tick();
};
const stopWatching = () => {
  window.__watchFlashes = false;
  return { seen: window.__flashSeen, captions: window.__threadbound.captions(), wall: window.__threadbound.appearance().wall };
};

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();

  await loadLevel(app, 'w2-03');
  await app.evaluate(watchFlashes);
  await app.evaluate(() => {
    window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' });
    window.__threadbound.dispatch({ type: 'drop' });
  });
  // A mis-sorted drop ends by itself once every marble is at rest.
  const ended = await waitFor(app, () => window.__threadbound.state().status === 'idle', 15000);
  check('the mis-sorted drop ends unsolved', ended);
  const marbles = await app.evaluate(() => window.__threadbound.marbles());
  const state = await app.evaluate(() => {
    const s = window.__threadbound.state();
    return { scored: s.scored, status: s.status };
  });
  const amberInAzureCup = marbles.filter(
    (m) => m.color === 'amber' && m.x > AZURE_CUP.minX && m.x < AZURE_CUP.maxX && m.y < 0.05,
  );
  check('amber marbles came to rest inside the azure cup', amberInAzureCup.length > 0, JSON.stringify(marbles));
  check('wrong-color marbles do not score', state.scored === 2, JSON.stringify(state));
  check('level is not complete while colors are mis-sorted', state.status !== 'complete', state.status);
  await misSortCaptions(app, check);
  await solvesFlashNothing(app, check, 'w2-03');
  await solvesFlashNothing(app, check, 'w1-01');
  return results;
}

/** w2-03's cups: [0] amber, [1] azure. Only the azure cup received a wrong marble. */
async function misSortCaptions(app, check) {
  const { seen, captions, wall } = await app.evaluate(stopWatching);
  const [amber, azure] = captions.cups;
  const detail = JSON.stringify({ seen, cups: captions.cups, wall });
  check('the azure cup blinks: seen blinking, and its flash count is above 0', seen[1] === true && azure.flashes > 0, detail);
  check('the amber cup, which received no wrong marble, never blinks', seen[0] !== true && amber.flashes === 0, detail);
  check('once the drop has ended, every cup wall is back to the wall colour', captions.cups.every((c) => c.color === wall && !c.flashing), detail);
}

/** A solve's cups only receive marbles they accept: none of them blinks. */
async function solvesFlashNothing(app, check, id) {
  await loadLevel(app, id);
  await app.evaluate(watchFlashes);
  await app.evaluate(() => {
    window.__threadbound.solve();
    window.__threadbound.dispatch({ type: 'drop' });
  });
  const solved = await waitFor(app, isComplete, 15000);
  const { seen, captions } = await app.evaluate(stopWatching);
  const quiet = captions.cups.every((c) => c.flashes === 0) && !seen.some(Boolean);
  check(`a ${id} solve blinks no cup`, solved && quiet, JSON.stringify({ solved, seen, cups: captions.cups }));
}
