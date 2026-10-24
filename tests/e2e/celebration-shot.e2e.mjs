// Helper for tests/e2e/xr-full-level.sh: waits in-page for the current drop to solve,
// then at once captures the app's canvas mid-celebration (the cadence strum, the cups'
// pulse, the stars lighting one by one, the replay) to SHOT (a path), and reports what
// was playing at that moment. It drains no cues, so the next xr-probe still counts them.
import { resolve } from 'node:path';
import { waitFor } from './lib.mjs';

const SOLVE_MS = 12000;

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const solved = await waitFor(app, () => window.__threadbound.state().status === 'complete', SOLVE_MS);
  if (!solved) return { solved, status: await app.evaluate(() => window.__threadbound.state().status) };
  const path = resolve(process.env.SHOT ?? '.tmp/celebration.jpg');
  await app.locator('canvas').first().screenshot({ path, type: 'jpeg', quality: 85 });
  const celebration = await app.evaluate(() => {
    const c = window.__threadbound.celebration();
    return { starsShown: c.starsShown, replaying: c.replaying };
  });
  return { solved, status: 'complete', path, celebration };
}
