// E2E (part 2 of resume): after a real page reload the game resumes at the
// furthest unlocked level with stars, streak and settings intact, and no tutorial.
import { checks, hookReady, loadIndex, waitFor } from './lib.mjs';
import { OFFSET, SOLVED } from './resume-setup.e2e.mjs';

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  await waitFor(app, hookReady, 15000);
  const start = await app.evaluate(() => {
    const s = window.__threadbound.state();
    return {
      index: s.levelIndex,
      best: s.progress.best,
      streak: s.progress.streak.count,
      settings: s.settings,
      ghost: window.__threadbound.ghost(),
    };
  });
  check('reload resumes at the furthest unlocked level', start.index === SOLVED, JSON.stringify(start));
  check('best stars survive the reload', Object.values(start.best).filter((n) => n === 3).length === SOLVED, JSON.stringify(start.best));
  check('a returning player sees no tutorial', start.ghost?.step === 'done' && !start.ghost.visible, JSON.stringify(start.ghost));

  check('the daily streak survives the reload', start.streak === 1, JSON.stringify(start));
  check(
    'settings survive the reload',
    start.settings.slowMotion === true && start.settings.offset.up === OFFSET.up && start.settings.offset.near === OFFSET.near,
    JSON.stringify(start.settings),
  );

  await loadIndex(app, 0);
  const plaque = await app.evaluate(() => window.__threadbound.hud()?.model);
  check('the plaque shows earned stars on a solved level', plaque?.stars?.every(Boolean), JSON.stringify(plaque));
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'settings', patch: { slowMotion: false, offset: { up: 0, near: 0 } } }));
  return results;
}
