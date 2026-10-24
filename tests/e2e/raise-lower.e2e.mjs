// E2E (real input): one-handed Raise / Farther buttons on the settings face move
// the diorama one step each, keep the player's threads, and the level still plays.
// Moving never undoes a solve, and a move made mid-drop waits for the drop to end.
// Nearer stops at +2.
import { canvasMapper, checks, click, clickCanvas, isComplete, loadIndex, plaqueElementAt, waitFor } from './lib.mjs';

const STEP_UP = 0.025;
const STEP_NEAR = 0.04;
const origin = () => window.__threadbound.frame()?.origin;

const atHeight = ([y]) => Math.abs(window.__threadbound.frame().origin[1] - y) < 1e-3;
const restartWithThread = () => {
  window.__threadbound.dispatch({ type: 'restart' });
  window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' });
};

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  const at = await canvasMapper(app);
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'settings', patch: { offset: { up: 0, near: 0 } } }));
  await loadIndex(app, 0);
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' }));
  const ctx = { page, app, at, check, start: await app.evaluate(origin) };

  await buttonsMoveOneStep(ctx);
  await movingKeepsSolve(ctx);
  await moveWaitsForDrop(ctx);
  await placementKeepsThreads(ctx);
  await placementWaitsForDrop(ctx);
  await nearerStopsAtTwo(ctx);

  await app.evaluate(() => window.__threadbound.dispatch({ type: 'settings', patch: { offset: { up: 0, near: 0 } } }));
  return results;
}

/** Raise and Farther each move the diorama one step, keep threads, and persist. */
async function buttonsMoveOneStep({ page, app, at, check, start }) {
  await click(page, at(await app.evaluate(() => window.__threadbound.button('settings'))));
  await waitFor(app, () => window.__threadbound.plaque()?.face === 'settings', 2000);
  await clickCanvas(page, app, at, await plaqueElementAt(app, 'set-up'));
  const raised = await waitFor(app, atHeight, 3000, [start[1] + STEP_UP]);
  check('Raise lifts the diorama one step', raised, JSON.stringify(await app.evaluate(origin)));
  check('the player\'s thread survives the move', (await app.evaluate(() => window.__threadbound.state().threads.length)) === 1);
  check('the settings face stays open', (await app.evaluate(() => window.__threadbound.plaque()?.face)) === 'settings');

  await clickCanvas(page, app, at, await plaqueElementAt(app, 'set-far'));
  const farther = await waitFor(app, ([z]) => Math.abs(window.__threadbound.frame().origin[2] - z) < 1e-3, 3000, [start[2] - STEP_NEAR]);
  check('Farther moves it one step away', farther, JSON.stringify(await app.evaluate(origin)));
  const saved = await app.evaluate(() => localStorage.getItem('threadbound.settings.v1'));
  check('the adjustment is remembered', /"offset":\{"up":1,"near":-1\}/.test(saved ?? ''), saved);
}

/** The moved level still plays, and lowering it afterwards never undoes the solve. */
async function movingKeepsSolve({ page, app, at, check, start }) {
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'drop' }));
  check('the moved level still solves', await waitFor(app, isComplete, 15000));
  const solved = await app.evaluate(() => window.__threadbound.state().stars);

  await clickCanvas(page, app, at, await plaqueElementAt(app, 'set-down'));
  await waitFor(app, atHeight, 3000, [start[1]]);
  const kept = await app.evaluate(() => ({
    status: window.__threadbound.state().status,
    stars: window.__threadbound.state().stars,
    next: window.__threadbound.button('next')?.visible,
  }));
  check('moving a solved level keeps it solved, stars and Next included', kept.status === 'complete' && kept.stars === solved && kept.next === true, JSON.stringify(kept));
}

/** A move made mid-drop waits for the marbles, then happens, and the solve keeps its tune. */
async function moveWaitsForDrop({ app, check, start }) {
  await app.evaluate(restartWithThread);
  await app.evaluate(() => {
    window.__threadbound.cueTrace();
    window.__threadbound.dispatch({ type: 'drop' });
  });
  const before = await app.evaluate(origin);
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'settings', patch: { offset: { up: 2, near: -1 } } }));
  const mid = await app.evaluate(() => ({ status: window.__threadbound.state().status, origin: window.__threadbound.frame().origin }));
  check('a move during a drop waits: the marbles keep falling where they are', mid.status === 'dropping' && mid.origin[1] === before[1], JSON.stringify(mid));
  check('that drop still solves', await waitFor(app, isComplete, 15000));
  const moved = await waitFor(app, atHeight, 3000, [start[1] + 2 * STEP_UP]);
  check('then the diorama moves, still solved', moved && (await app.evaluate(isComplete)), JSON.stringify(await app.evaluate(origin)));
  await tuneSurvivesWaitingMove({ app, check });
}

/**
 * The solve that waited for the move still holds its tune, notes and times alike, and its replay
 * plays every note. Read from the live state: w1-01's book entry is already there from the solve
 * before, and a silent solve would leave that entry in place.
 */
async function tuneSurvivesWaitingMove({ app, check }) {
  const tune = await app.evaluate(() => window.__threadbound.state().melody);
  check('the solve whose move waited keeps its tune: notes, with a time each', tune.notes.length > 0 && tune.times.length === tune.notes.length, JSON.stringify(tune));
  await waitFor(app, () => !window.__threadbound.celebration().replaying, 12000);
  const played = (await app.evaluate(() => window.__threadbound.cueTrace())).filter((r) => r.name === 'melody').length;
  check('and its replay plays every note', played === tune.notes.length && played > 0, `${played}/${tune.notes.length}`);
}

/** Entering mixed reality places the diorama on the real table: same rebuild, same promise. */
async function placementKeepsThreads({ app, check }) {
  await app.evaluate(restartWithThread);
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'place', origin: [0.1, 0.7, -0.5], yaw: 0.2 }));
  const placed = await app.evaluate(() => ({ threads: window.__threadbound.state().threads.length, yaw: window.__threadbound.frame()?.yaw }));
  check('placing the diorama on a table keeps the player\'s threads', placed.threads === 1 && Math.abs(placed.yaw - 0.2) < 1e-6, JSON.stringify(placed));
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetPlacement' }));
}

/** Entering passthrough mid-drop must not end the drop: placement waits for it, like Raise/Lower. */
async function placementWaitsForDrop({ app, check }) {
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
}

/** Three Nearer clicks from 0: two steps toward the player, then the third does nothing. */
async function nearerStopsAtTwo({ page, app, at, check, start }) {
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'settings', patch: { offset: { up: 0, near: 0 } } }));
  await waitFor(app, ([z]) => Math.abs(window.__threadbound.frame().origin[2] - z) < 1e-3, 3000, [start[2]]);
  if ((await app.evaluate(() => window.__threadbound.plaque()?.face)) !== 'settings') {
    await click(page, at(await app.evaluate(() => window.__threadbound.button('settings'))));
    await waitFor(app, () => window.__threadbound.plaque()?.face === 'settings', 2000);
  }
  const near = () => window.__threadbound.state().settings.offset.near;
  const steps = [];
  for (const want of [1, 2]) {
    await clickCanvas(page, app, at, await plaqueElementAt(app, 'set-near'));
    steps.push((await waitFor(app, (w) => window.__threadbound.state().settings.offset.near === w, 3000, want)) ? want : await app.evaluate(near));
  }
  await clickCanvas(page, app, at, await plaqueElementAt(app, 'set-near'));
  const third = await waitFor(app, () => window.__threadbound.state().settings.offset.near > 2, 1200);
  const z = (await app.evaluate(origin))[2];
  check('three Nearer clicks from 0 stop at +2', steps.join() === '1,2' && !third && (await app.evaluate(near)) === 2 && Math.abs(z - (start[2] + 2 * STEP_NEAR)) < 1e-3,
    JSON.stringify({ steps, near: await app.evaluate(near), z }));
}
