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
  return results;
}
