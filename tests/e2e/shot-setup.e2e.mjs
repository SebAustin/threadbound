// Visual-gate helper: load LEVEL, optionally apply its solution and drop, then wait WAIT_MS.
import { loadIndex, sleep } from './lib.mjs';

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  await loadIndex(app, Number(process.env.LEVEL));
  if (process.env.SOLVE === '1') {
    await app.evaluate(() => {
      window.__threadbound.solve();
      window.__threadbound.dispatch({ type: 'drop' });
    });
  }
  await sleep(Number(process.env.WAIT_MS ?? 300));
  return 'ok';
}
