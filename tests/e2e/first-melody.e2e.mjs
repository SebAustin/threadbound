// E2E (Stage 1 bar, "first five minutes"): from a cold start on a fresh save, the
// onboarding gets a player to their first melody in well under 60 s, with real
// pointer input. Automation acts faster than a person, so the game's own share
// (pinching the chute to hearing the first melody note) is recorded separately.
import { canvasMapper, checks, click, drag, freshSave, waitFor } from './lib.mjs';

const FIRST_MELODY_BUDGET_MS = 60000;
/** The part a player can't speed up: the drop and the solve. Leaves 45 s for reading and pinching. */
const GAME_SHARE_BUDGET_MS = 15000;

const heardMelody = () => {
  window.__heard = [...(window.__heard ?? []), ...window.__threadbound.cues()];
  return window.__heard.includes('melody');
};

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
  await waitFor(app, freshSave, 3000);
  // Cold start: reload the app frame; a marker tells the old page from the new one.
  await app.evaluate(() => {
    window.__beforeReload = true;
    location.reload();
  }).catch(() => {});
  const start = Date.now();
  await waitFor(app, () => !window.__beforeReload && Boolean(window.__threadbound?.state().level), 15000);
  const at = await canvasMapper(app);

  const hint = await app.evaluate(() => window.__threadbound.hud()?.model?.hint);
  check('the plaque teaches the first gesture without a wall of text', typeof hint === 'string' && hint.length > 0 && hint.length <= 60, hint);
  const [a, b] = (await app.evaluate(() => window.__threadbound.pegs())).map((p) => at(p));
  await drag(page, a, b);
  await waitFor(app, () => window.__threadbound.state().threads.length === 1, 3000);
  await app.evaluate(() => {
    window.__threadbound.cues();
    window.__heard = [];
  });
  const dropAt = Date.now();
  await click(page, at(await app.evaluate(() => window.__threadbound.chute())));
  const heard = await waitFor(app, heardMelody, GAME_SHARE_BUDGET_MS);
  const total = Date.now() - start;
  const gameShare = Date.now() - dropAt;
  check('the first melody plays within a minute of a cold start', heard && total < FIRST_MELODY_BUDGET_MS, `${(total / 1000).toFixed(1)} s`);
  check("the game's own share (drop to melody) leaves time to learn", heard && gameShare < GAME_SHARE_BUDGET_MS, `${(gameShare / 1000).toFixed(1)} s`);
  return results;
}
