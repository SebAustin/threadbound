// E2E (seam 2): a marble resting in a cup of another color must NOT score.
// "Duet" with the tight A→B trampoline throws amber into azure's corner cup.
import { checks, loadLevel, sleep } from './lib.mjs';

const AZURE_CUP = { minX: 0.4, maxX: 0.49 };

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();

  await loadLevel(app, 'w2-03');
  await app.evaluate(() => {
    window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' });
    window.__threadbound.dispatch({ type: 'drop' });
  });
  await sleep(6000);
  const marbles = await app.evaluate(() => window.__threadbound.marbles());
  const state = await app.evaluate(() => {
    const s = window.__threadbound.state();
    return { scored: s.scored, status: s.status };
  });
  const amberInAzureCup = marbles.filter(
    (m) => m.color === 'amber' && m.x > AZURE_CUP.minX && m.x < AZURE_CUP.maxX && m.y < 0.05,
  );
  check('amber marbles came to rest inside the azure cup', amberInAzureCup.length > 0, JSON.stringify(marbles));
  check('wrong-color marbles do not score', state.scored === 2, JSON.stringify(state));
  check('level is not complete while colors are mis-sorted', state.status !== 'complete', state.status);
  return results;
}
