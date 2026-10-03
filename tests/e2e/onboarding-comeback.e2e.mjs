// E2E: a first-time player who snips their only thread is shown pinch-pull again.
import { checks, sleep, waitFor } from './lib.mjs';

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
  await sleep(300);

  const link = await app.evaluate(() => {
    const [first] = window.__threadbound.state().level.solution;
    window.__threadbound.dispatch({ type: 'addThread', from: first.from, to: first.to });
    return first;
  });
  check('a thread moves the ghost to the chute', await waitFor(app, () => window.__threadbound.ghost()?.step === 'drop', 2000));

  await app.evaluate((l) => window.__threadbound.dispatch({ type: 'snip', from: l.to, to: l.from }), link);
  const back = await waitFor(app, () => window.__threadbound.ghost()?.step === 'pinch-pull', 2000);
  const state = await app.evaluate(() => ({ ghost: window.__threadbound.ghost(), hint: window.__threadbound.hud()?.model?.hint }));
  check('snipping the only thread brings the pinch-pull demo back', back && state.ghost.visible, JSON.stringify(state.ghost));
  check('the plaque hint follows', /pinch a glowing peg/i.test(state.hint ?? ''), state.hint);
  return results;
}
