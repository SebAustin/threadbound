// E2E (part 2 of resume): after a real page reload the game resumes at the
// furthest unlocked level with stars intact and no tutorial.
import { checks, hookReady, loadIndex, waitFor } from './lib.mjs';
import { SOLVED } from './resume-setup.e2e.mjs';

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  await waitFor(app, hookReady, 15000);
  const start = await app.evaluate(() => {
    const s = window.__threadbound.state();
    return { index: s.levelIndex, best: s.progress.best, ghost: window.__threadbound.ghost() };
  });
  check('reload resumes at the furthest unlocked level', start.index === SOLVED, JSON.stringify(start));
  check('best stars survive the reload', Object.values(start.best).filter((n) => n === 3).length === SOLVED, JSON.stringify(start.best));
  check('a returning player sees no tutorial', start.ghost?.step === 'done' && !start.ghost.visible, JSON.stringify(start.ghost));

  await loadIndex(app, 0);
  const plaque = await app.evaluate(() => window.__threadbound.hud()?.model);
  check('the plaque shows earned stars on a solved level', plaque?.stars?.every(Boolean), JSON.stringify(plaque));
  return results;
}
