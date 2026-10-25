// Helper for xr-seated-solve.sh: opens a campaign level by id (LEVEL) or a daily by pool
// index (DAILY) through the command bus, and reports what opened.
import { hookReady, loadLevel, waitFor } from './lib.mjs';

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  await waitFor(app, hookReady, 15000);
  if (process.env.DAILY !== undefined) {
    await app.evaluate((i) => window.__threadbound.dispatch({ type: 'daily', index: i }), Number(process.env.DAILY));
    await waitFor(app, () => window.__threadbound.state().level.id.startsWith('daily-'), 3000);
  } else {
    await loadLevel(app, process.env.LEVEL);
  }
  return app.evaluate(() => ({ levelId: window.__threadbound.state().level.id }));
}
