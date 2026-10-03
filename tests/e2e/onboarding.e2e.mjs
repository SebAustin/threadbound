// E2E (real input): a first-time player is walked through thread -> drop -> melody
// by the ghost hand and plaque hints, and is never shown it again after solving.
import { canvasMapper, checks, drag, isComplete, sleep, waitFor } from './lib.mjs';

const ghost = () => window.__threadbound.ghost();

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
  await sleep(300);

  const first = await app.evaluate(() => ({
    ghost: window.__threadbound.ghost(),
    hint: window.__threadbound.hud()?.model?.hint,
    level: window.__threadbound.state().levelIndex,
  }));
  check('a fresh save starts on level 1 with the pinch-pull demo', first.level === 0 && first.ghost?.step === 'pinch-pull' && first.ghost.visible, JSON.stringify(first));
  check('the plaque spells out the gesture', /pinch/i.test(first.hint ?? ''), first.hint);

  const at = await canvasMapper(app);
  const [from, to] = await app.evaluate(() => {
    const { solution } = window.__threadbound.state().level;
    const pegs = window.__threadbound.pegs();
    return [pegs.find((p) => p.id === solution[0].from), pegs.find((p) => p.id === solution[0].to)];
  });
  await drag(page, at(from), at(to), 8);
  check('after the first thread the ghost points at the chute', await waitFor(app, () => window.__threadbound.ghost()?.step === 'drop', 2000));

  const chute = await app.evaluate(() => window.__threadbound.chute());
  await page.mouse.click(...at(chute));
  check('dropping hides the demo so the player watches', await waitFor(app, () => {
    const g = window.__threadbound.ghost();
    return g?.step === 'watch' && !g.visible;
  }, 2000));
  check('the first melody plays', await waitFor(app, isComplete, 15000));
  const after = await app.evaluate(ghost);
  check('onboarding is over after the first solve', after?.step === 'done' && !after.visible, JSON.stringify(after));

  await app.evaluate(() => window.__threadbound.dispatch({ type: 'load', index: 0 }));
  await sleep(250);
  const again = await app.evaluate(ghost);
  check('replaying level 1 does not show the demo again', again?.step === 'done' && !again.visible, JSON.stringify(again));
  return results;
}
