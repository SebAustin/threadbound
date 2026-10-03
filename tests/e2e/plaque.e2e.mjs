// E2E: the diorama plaque tracks the level, the thread budget and the solve.
import { checks, isComplete, loadLevel, waitFor } from './lib.mjs';

const hud = () => window.__threadbound.hud();

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();

  await loadLevel(app, 'w2-02');
  const start = await app.evaluate(hud);
  check('plaque names the level and its place in the world',
    start?.model?.title === 'Over and Under' && start.model.worldLabel === 'World 2 - 2/4', JSON.stringify(start?.model));
  const size = await app.evaluate(() => window.__threadbound.state().level.size);
  check('plaque stands centred above the diorama',
    Math.abs(start.local.x - size[0] / 2) < 0.005 && start.local.y > size[1] && start.local.y < size[1] + 0.12, JSON.stringify(start.local));

  await app.evaluate(() => {
    const [first] = window.__threadbound.state().level.solution;
    window.__threadbound.dispatch({ type: 'addThread', from: first.from, to: first.to });
  });
  const afterThread = await app.evaluate(hud);
  check('thread budget counts player threads', afterThread.model.threadsLabel.startsWith('Threads 1/'), afterThread.model.threadsLabel);

  await loadLevel(app, 'w1-01');
  await app.evaluate(() => {
    window.__threadbound.solve();
    window.__threadbound.dispatch({ type: 'drop' });
  });
  await waitFor(app, isComplete, 15000);
  await waitFor(app, () => window.__threadbound.hud()?.model?.status === 'solved', 2000);
  const solved = await app.evaluate(hud);
  check('solving lights the header and the earned stars',
    solved.model.status === 'solved' && solved.model.stars.every(Boolean), JSON.stringify(solved.model));
  // Mixed reality: the diorama moves to the player's table; the plaque must follow.
  const placed = { origin: [0.2, 0.7, -0.5], yaw: 0.6 };
  await app.evaluate((p) => window.__threadbound.dispatch({ type: 'place', ...p }), placed);
  await waitFor(app, (yaw) => Math.abs((window.__threadbound.frame()?.yaw ?? 0) - yaw) < 1e-3, 3000, placed.yaw);
  const onTable = await app.evaluate(hud);
  const tableSize = await app.evaluate(() => window.__threadbound.state().level.size);
  check('plaque follows the diorama onto the table',
    Math.abs(onTable.local.x - tableSize[0] / 2) < 0.005 && onTable.local.y > tableSize[1] && Math.abs(onTable.local.z) < 0.05, JSON.stringify(onTable.local));
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetPlacement' }));
  return results;
}
