// E2E (real drags and clicks, from a fresh save): the sun signposts today's daily. It doesn't pulse on
// level 1 before any solve (the ghost hand teaches there), and pulses once level 1 is solved. Clicking it
// opens a daily the player has the mechanics for (w1-02 or w1-04 on a save with only level 1 solved),
// under a name of its own; inside it the sun doesn't pulse and the ledge says how to get back. Once the
// daily is solved and the player clicks back, the sun stops pulsing.
import { canvasMapper, checks, click, drag, freshSave, isComplete, waitFor } from './lib.mjs';

/** Dailies a save with only level 1 solved can open: boards that need no mechanic. */
const FIRST_DAILIES = ['daily-w1-02', 'daily-w1-04'];

/** Page function: the sun as drawn (its pulse and its icon's scale) and where the player is. */
const sun = () => {
  const hook = window.__threadbound;
  const button = hook.button('daily');
  const s = hook.state();
  return { pulsing: button?.pulsing ?? null, iconScale: button?.iconScale ?? null, level: s.level.id, name: s.level.name, daily: s.daily, hint: hook.ledge()?.text.hint };
};

/** Page function: true once the sun reads `want` and its icon matches (resting at 1 unless it pulses). */
const sunReads = (want) => {
  const button = window.__threadbound.button('daily');
  return button?.pulsing === want && (want || button.iconScale === 1);
};

/** Icon scales sampled a frame apart: a pulsing sun's icon grows and shrinks. */
const iconScales = () =>
  new Promise((resolve) => {
    const seen = [];
    const step = () => {
      seen.push(window.__threadbound.button('daily')?.iconScale ?? null);
      if (seen.length >= 30) resolve(seen);
      else requestAnimationFrame(step);
    };
    step();
  });

async function solveLevelOne(page, app, at) {
  const [a, b] = await app.evaluate(() => ['a', 'b'].map((id) => window.__threadbound.pegs().find((p) => p.id === id)));
  await drag(page, at(a), at(b), 8);
  await click(page, at(await app.evaluate(() => window.__threadbound.chute())));
  return waitFor(app, isComplete, 15000);
}

async function campaignSun(page, app, at, check) {
  await waitFor(app, sunReads, 1000, false);
  const before = await app.evaluate(sun);
  check('on a fresh save the sun does not pulse on level 1', before.pulsing === false && before.iconScale === 1 && before.level === 'w1-01', JSON.stringify(before));
  const solved = await solveLevelOne(page, app, at);
  const pulsing = await waitFor(app, sunReads, 2000, true);
  const scales = await app.evaluate(iconScales);
  const moving = new Set(scales).size > 1 && scales.every((s) => s >= 1 && s <= 1.15);
  check('it pulses once level 1 is solved (real drag and chute click), its icon swelling within 1 to 1.15', solved && pulsing && moving, JSON.stringify({ min: Math.min(...scales), max: Math.max(...scales) }));
}

async function insideTheDaily(page, app, at, check) {
  await click(page, at(await app.evaluate(() => window.__threadbound.button('daily'))));
  const opened = await waitFor(app, () => window.__threadbound.state().level.id.startsWith('daily-'), 3000);
  const campaignNames = await app.evaluate(() => window.__threadbound.levels().map((l) => l.name));
  await waitFor(app, sunReads, 1000, false);
  const inside = await app.evaluate(sun);
  check(`clicking the sun opens ${FIRST_DAILIES.join(' or ')}`, opened && FIRST_DAILIES.includes(inside.level), JSON.stringify(inside));
  check('the daily is not titled with a campaign name', inside.name.length > 0 && !campaignNames.includes(inside.name), inside.name);
  check('inside the daily the sun does not pulse', inside.pulsing === false && inside.iconScale === 1, JSON.stringify(inside));
  check('and the hint is "Press the sun to return"', inside.hint === 'Press the sun to return', inside.hint);
}

async function solvedToday(page, app, at, check) {
  await app.evaluate(() => {
    window.__threadbound.solve();
    window.__threadbound.dispatch({ type: 'drop' });
  });
  const solved = await waitFor(app, isComplete, 20000);
  await click(page, at(await app.evaluate(() => window.__threadbound.button('daily'))));
  const back = await waitFor(app, () => window.__threadbound.state().daily === null, 3000);
  await waitFor(app, sunReads, 1000, false);
  const after = await app.evaluate(sun);
  check('after the daily is solved and the player clicks back, the sun stops pulsing', solved && back && after.pulsing === false && after.iconScale === 1 && after.level === 'w1-01', JSON.stringify(after));
}

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
  await waitFor(app, freshSave, 3000);
  const at = await canvasMapper(app);
  try {
    await campaignSun(page, app, at, check);
    await insideTheDaily(page, app, at, check);
    await solvedToday(page, app, at, check);
  } finally {
    await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
    check('progress is reset for the scripts after this one', await waitFor(app, freshSave, 3000));
  }
  return results;
}
