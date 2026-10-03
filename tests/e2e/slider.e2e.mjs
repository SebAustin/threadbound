// E2E (real input): drag a rail peg's brass tab with the mouse, then the
// re-hung preset thread solves "Slide".
import { canvasMapper, checks, drag, isComplete, loadLevel, waitFor } from './lib.mjs';

const PEG = 'a';
const TARGET_X = 0.05;

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  const at = await canvasMapper(app);
  await loadLevel(app, 'w3-01');

  const tab = await app.evaluate((id) => window.__threadbound.handle(id), PEG);
  check('rail peg has a pinchable tab', Boolean(tab));
  if (!tab) return results;
  const target = await app.evaluate(([id, x]) => window.__threadbound.handleAt(id, x), [PEG, TARGET_X]);
  const startY = await app.evaluate((id) => window.__threadbound.state().pegPositions[id].y, PEG);

  await drag(page, at(tab), at(target));
  await waitFor(app, ([id, x]) => Math.abs(window.__threadbound.state().pegPositions[id].x - x) < 0.02, 3000, [PEG, TARGET_X]);

  const pos = await app.evaluate((id) => window.__threadbound.state().pegPositions[id], PEG);
  check(
    'peg slid along its rail to the drag target',
    Math.abs(pos.x - TARGET_X) < 0.02 && Math.abs(pos.y - startY) < 1e-6,
    JSON.stringify(pos),
  );
  const threads = await app.evaluate(() => window.__threadbound.state().threads.length);
  check('attached thread was rebuilt, not lost', threads === 1, `threads=${threads}`);

  await app.evaluate(() => window.__threadbound.dispatch({ type: 'drop' }));
  check('re-hung thread solves the level', await waitFor(app, isComplete, 15000));
  return results;
}
