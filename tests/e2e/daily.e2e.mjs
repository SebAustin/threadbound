// E2E (real input): the ledge sun loads today's daily puzzle; solving it starts
// a streak shown on the plaque, without touching campaign unlocks.
import { canvasMapper, checks, click, freshSave, isComplete, waitFor } from './lib.mjs';

const plaqueWorld = () => window.__threadbound.hud()?.model?.worldLabel;

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  const at = await canvasMapper(app);
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
  await waitFor(app, freshSave, 3000);

  await click(page, at(await app.evaluate(() => window.__threadbound.button('daily'))));
  const loaded = await waitFor(app, () => window.__threadbound.state().level.id.startsWith('daily-'), 3000);
  const level = await app.evaluate(() => ({ id: window.__threadbound.state().level.id, spool: window.__threadbound.state().level.spool }));
  check('the ledge sun loads a daily puzzle on a tight spool', loaded && level.spool > 0, JSON.stringify(level));
  check('the plaque invites a streak', (await app.evaluate(plaqueWorld)) === 'Daily - start a streak', await app.evaluate(plaqueWorld));

  await app.evaluate(() => {
    window.__threadbound.solve();
    window.__threadbound.dispatch({ type: 'drop' });
  });
  check('the daily is solvable on its spool', await waitFor(app, isComplete, 20000));
  const after = await app.evaluate(() => {
    const s = window.__threadbound.state();
    return { streak: s.progress.streak, unlocked: s.progress.unlocked, next: window.__threadbound.button('next')?.visible };
  });
  check('solving it starts a streak', after.streak.count === 1, JSON.stringify(after.streak));
  check('the plaque shows the streak', await waitFor(app, () => window.__threadbound.hud()?.model?.worldLabel === 'Daily - streak 1', 2000), await app.evaluate(plaqueWorld));
  const saved = await app.evaluate(() => localStorage.getItem('threadbound.progress.v1'));
  check('the streak is saved with progress', /"streak":\{"lastDay":"[0-9-]+","count":1\}/.test(saved ?? ''), saved);
  check('a daily never unlocks campaign levels or offers Next', after.unlocked === 0 && after.next === false, JSON.stringify(after));
  return results;
}
