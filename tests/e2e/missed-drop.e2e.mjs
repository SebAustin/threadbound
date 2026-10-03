// E2E: a drop where every marble misses ends by itself, so the player (and the
// ghost hand) can try again without pressing Restart.
import { checks, freshSave, loadIndex, waitFor } from './lib.mjs';

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
  await waitFor(app, freshSave, 3000);

  await app.evaluate(() => window.__threadbound.dispatch({ type: 'drop' }));
  check('the drop starts', await waitFor(app, () => window.__threadbound.state().status === 'dropping', 2000));
  const ended = await waitFor(app, () => window.__threadbound.state().status === 'idle', 15000);
  const state = await app.evaluate(() => ({ status: window.__threadbound.state().status, ghost: window.__threadbound.ghost() }));
  check('a drop where every marble misses ends by itself', ended, JSON.stringify(state));
  check('the ghost hand comes back to teach the pinch-pull', state.ghost?.step === 'pinch-pull' && state.ghost.visible, JSON.stringify(state.ghost));
  return results;
}
