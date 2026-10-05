// E2E (real input): one-handed Raise / Farther buttons on the settings face move
// the diorama one step each, keep the player's threads, and the level still plays.
// Moving never undoes a solve, and a move made mid-drop waits for the drop to end.
import { canvasMapper, checks, click, clickCanvas, isComplete, loadIndex, plaqueElementAt, waitFor } from './lib.mjs';

const STEP_UP = 0.025;
const STEP_NEAR = 0.04;
const origin = () => window.__threadbound.frame()?.origin;

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  const at = await canvasMapper(app);
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'settings', patch: { offset: { up: 0, near: 0 } } }));
  await loadIndex(app, 0);
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' }));
  const start = await app.evaluate(origin);

  await click(page, at(await app.evaluate(() => window.__threadbound.button('settings'))));
  await waitFor(app, () => window.__threadbound.plaque()?.face === 'settings', 2000);
  await clickCanvas(page, app, at, await plaqueElementAt(app, 'set-up'));
  const raised = await waitFor(app, ([y]) => Math.abs(window.__threadbound.frame().origin[1] - y) < 1e-3, 3000, [start[1] + STEP_UP]);
  check('Raise lifts the diorama one step', raised, JSON.stringify(await app.evaluate(origin)));
  check('the player\'s thread survives the move', (await app.evaluate(() => window.__threadbound.state().threads.length)) === 1);
  check('the settings face stays open', (await app.evaluate(() => window.__threadbound.plaque()?.face)) === 'settings');

  await clickCanvas(page, app, at, await plaqueElementAt(app, 'set-far'));
  const farther = await waitFor(app, ([z]) => Math.abs(window.__threadbound.frame().origin[2] - z) < 1e-3, 3000, [start[2] - STEP_NEAR]);
  check('Farther moves it one step away', farther, JSON.stringify(await app.evaluate(origin)));
  const saved = await app.evaluate(() => localStorage.getItem('threadbound.settings.v1'));
  check('the adjustment is remembered', /"offset":\{"up":1,"near":-1\}/.test(saved ?? ''), saved);

  await app.evaluate(() => window.__threadbound.dispatch({ type: 'drop' }));
  check('the moved level still solves', await waitFor(app, isComplete, 15000));
  const solved = await app.evaluate(() => window.__threadbound.state().stars);

  await clickCanvas(page, app, at, await plaqueElementAt(app, 'set-down'));
  await waitFor(app, ([y]) => Math.abs(window.__threadbound.frame().origin[1] - y) < 1e-3, 3000, [start[1]]);
  const kept = await app.evaluate(() => ({
    status: window.__threadbound.state().status,
    stars: window.__threadbound.state().stars,
    next: window.__threadbound.button('next')?.visible,
  }));
  check('moving a solved level keeps it solved, stars and Next included', kept.status === 'complete' && kept.stars === solved && kept.next === true, JSON.stringify(kept));

  await app.evaluate(() => {
    window.__threadbound.dispatch({ type: 'restart' });
    window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' });
    window.__threadbound.dispatch({ type: 'drop' });
  });
  const before = await app.evaluate(origin);
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'settings', patch: { offset: { up: 2, near: -1 } } }));
  const mid = await app.evaluate(() => ({ status: window.__threadbound.state().status, origin: window.__threadbound.frame().origin }));
  check('a move during a drop waits: the marbles keep falling where they are', mid.status === 'dropping' && mid.origin[1] === before[1], JSON.stringify(mid));
  check('that drop still solves', await waitFor(app, isComplete, 15000));
  const moved = await waitFor(app, ([y]) => Math.abs(window.__threadbound.frame().origin[1] - y) < 1e-3, 3000, [start[1] + 2 * STEP_UP]);
  check('then the diorama moves, still solved', moved && (await app.evaluate(isComplete)), JSON.stringify(await app.evaluate(origin)));

  // Entering mixed reality places the diorama on the real table: same rebuild, same promise.
  await app.evaluate(() => {
    window.__threadbound.dispatch({ type: 'restart' });
    window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' });
    window.__threadbound.dispatch({ type: 'place', origin: [0.1, 0.7, -0.5], yaw: 0.2 });
  });
  const placed = await app.evaluate(() => ({ threads: window.__threadbound.state().threads.length, yaw: window.__threadbound.frame()?.yaw }));
  check('placing the diorama on a table keeps the player\'s threads', placed.threads === 1 && Math.abs(placed.yaw - 0.2) < 1e-6, JSON.stringify(placed));
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetPlacement' }));

  // Entering passthrough mid-drop must not end the drop: placement waits for it, like Raise/Lower.
  await app.evaluate(() => {
    window.__threadbound.dispatch({ type: 'drop' });
    window.__threadbound.dispatch({ type: 'place', origin: [0.1, 0.7, -0.5], yaw: 0.3 });
  });
  const during = await app.evaluate(() => ({ status: window.__threadbound.state().status, yaw: window.__threadbound.frame()?.yaw }));
  check('placing mid-drop lets the marbles finish first', during.status === 'dropping' && Math.abs(during.yaw - 0.3) > 1e-6, JSON.stringify(during));
  await waitFor(app, isComplete, 15000);
  const after = await waitFor(app, () => Math.abs(window.__threadbound.frame().yaw - 0.3) < 1e-6 && window.__threadbound.state().status === 'complete', 3000);
  check('then the diorama moves to the table, still solved', after, JSON.stringify(await app.evaluate(() => ({ status: window.__threadbound.state().status, yaw: window.__threadbound.frame()?.yaw }))));
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetPlacement' }));

  await app.evaluate(() => window.__threadbound.dispatch({ type: 'settings', patch: { offset: { up: 0, near: 0 } } }));
  return results;
}
