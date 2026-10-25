// E2E (real reload, real input): a finished campaign reopens on today's daily. With every campaign
// level solved, a reload opens the daily (checked as the daily session and an index past the
// campaign, never by id: the daily ticket renames them), returning to the last level; the sun takes
// the player there, and the ledge shows the ending. A save missing one level reopens on that level.
import { canvasMapper, checks, click, freshSave, navigateApp, waitFor } from './lib.mjs';

/** A save missing this campaign level reopens on it. */
const MISSING = 10;

/** Page function: saves every campaign level as solved, except the one at index `missing` (-1 for none). */
const seedSolved = (missing) => {
  const levels = window.__threadbound.levels();
  const best = Object.fromEntries(levels.filter((_, i) => i !== missing).map((l) => [l.id, 3]));
  localStorage.setItem('threadbound.progress.v1', JSON.stringify({ unlocked: levels.length - 1, best }));
};

/** Page function: where the game opened, and the campaign's length. */
const opened = () => {
  const hook = window.__threadbound;
  const s = hook.state();
  return { levelIndex: s.levelIndex, daily: s.daily, campaign: hook.levels().length, hint: hook.ledge()?.text.hint };
};

async function reopensOnDaily(page, app, check) {
  await app.evaluate(seedSolved, -1);
  await navigateApp(app);
  const o = await app.evaluate(opened);
  const last = o.campaign - 1;
  check("a finished campaign reopens on today's daily", Boolean(o.daily) && o.levelIndex >= o.campaign, JSON.stringify(o));
  check('the daily returns to the last level', o.daily?.returnTo === last, JSON.stringify(o.daily));

  const at = await canvasMapper(app);
  await click(page, at(await app.evaluate(() => window.__threadbound.button('daily'))));
  const back = await waitFor(app, (i) => window.__threadbound.state().levelIndex === i && window.__threadbound.state().daily === null, 3000, last);
  const after = await app.evaluate(opened);
  check('the sun returns to the last level', Boolean(o.daily) && back, JSON.stringify(after));
  check('its ledge shows the ending', (after.hint ?? '').includes(`All ${o.campaign} solved`), after.hint);
}

async function missingLevelReopensThere(app, check) {
  await app.evaluate(seedSolved, MISSING);
  await navigateApp(app);
  const o = await app.evaluate(opened);
  check('a save missing one level reopens on that level, not on the daily', o.levelIndex === MISSING && o.daily === null, JSON.stringify(o));
  check('and shows no ending there', !/All \d+ solved/.test(o.hint ?? ''), o.hint);
}

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  try {
    await reopensOnDaily(page, app, check);
    await missingLevelReopensThere(app, check);
  } finally {
    await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
    check('progress is reset for the scripts after this one', await waitFor(app, freshSave, 3000));
  }
  return results;
}
