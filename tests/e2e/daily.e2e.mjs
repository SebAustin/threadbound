// E2E (real input): the ledge sun loads today's daily puzzle; solving it starts
// a streak shown on the plaque, without touching campaign unlocks; the sun again
// returns to the campaign level the player came from.
import { canvasMapper, checks, click, freshSave, isComplete, loadIndex, waitFor } from './lib.mjs';

const RETURN_TO = 2;
const localDay = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const plaqueWorld = () => window.__threadbound.hud()?.model?.worldLabel;

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  const at = await canvasMapper(app);
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
  await waitFor(app, freshSave, 3000);
  await loadIndex(app, RETURN_TO);

  await click(page, at(await app.evaluate(() => window.__threadbound.button('daily'))));
  const loaded = await waitFor(app, () => window.__threadbound.state().level.id.startsWith('daily-'), 3000);
  const level = await app.evaluate(() => ({ id: window.__threadbound.state().level.id, spool: window.__threadbound.state().level.spool }));
  check('the ledge sun loads a daily puzzle on a tight spool', loaded && level.spool > 0, JSON.stringify(level));
  check('the plaque names the daily', (await app.evaluate(plaqueWorld)) === 'Daily puzzle', await app.evaluate(plaqueWorld));
  const session = await app.evaluate(() => window.__threadbound.state().daily);
  const today = await app.evaluate(localDay);
  check('the daily belongs to the day it was opened, and remembers where the player was', session?.day === today && session?.returnTo === RETURN_TO, JSON.stringify(session));
  check('the plaque says how to get back', (await app.evaluate(() => window.__threadbound.hud()?.model?.hint)) === 'Poke the sun to return');

  await app.evaluate(() => {
    window.__threadbound.solve();
    window.__threadbound.dispatch({ type: 'drop' });
  });
  check('the daily is solvable on its spool', await waitFor(app, isComplete, 20000));
  const after = await app.evaluate(() => {
    const s = window.__threadbound.state();
    return {
      streak: s.progress.streak,
      dailyBest: s.progress.dailyBest,
      best: s.progress.best,
      unlocked: s.progress.unlocked,
      next: window.__threadbound.button('next')?.visible,
    };
  });
  check('solving it starts a streak', after.streak.count === 1, JSON.stringify(after.streak));
  check('the plaque shows the streak', await waitFor(app, () => window.__threadbound.hud()?.model?.worldLabel === 'Daily - streak 1', 2000), await app.evaluate(plaqueWorld));
  const saved = await app.evaluate(() => localStorage.getItem('threadbound.progress.v1'));
  check('the streak is saved with progress', /"streak":\{"lastDay":"[0-9-]+","count":1\}/.test(saved ?? ''), saved);
  check('a daily never unlocks campaign levels or offers Next', after.unlocked === 0 && after.next === false, JSON.stringify(after));
  check("the stars belong to today's daily, not to the board", after.dailyBest.day === today && after.dailyBest.stars === 3 && Object.keys(after.best).length === 0, JSON.stringify(after));

  await click(page, at(await app.evaluate(() => window.__threadbound.button('daily'))));
  const back = await waitFor(app, ([i]) => window.__threadbound.state().levelIndex === i && window.__threadbound.state().daily === null, 3000, [RETURN_TO]);
  check('the sun again returns to the campaign level the player came from', back, JSON.stringify(await app.evaluate(() => window.__threadbound.state().levelIndex)));
  check('the campaign plaque counts campaign levels only', (await app.evaluate(plaqueWorld)) === 'World 1 - 3/6', await app.evaluate(plaqueWorld));
  return results;
}
