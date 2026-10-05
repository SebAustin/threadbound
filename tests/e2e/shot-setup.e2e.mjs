// Video kit: stage a named shot in the running app (see docs/video/shot-list.md).
// Usage: zsh tests/e2e/shot.sh <shot>   (wraps this script; XR shots also enter passthrough)
// Legacy: LEVEL=<index> [SOLVE=1] [WAIT_MS=300] stages a level by index.
import { isComplete, loadIndex, loadLevel, sleep, waitFor } from './lib.mjs';

/**
 * Each shot: a level (by id), what to prepare, and whether the developer records it
 * in XR. Threads are added through the command bus so the board is ready the moment
 * recording starts; the gesture on camera is performed live by the developer.
 */
export const SHOTS = {
  // 0:00 cold open: a solved Trampoline, ready to drop on a real table.
  'cold-open': { level: 'w1-03', solve: true, xr: true },
  // First five minutes: a fresh save, ghost hand demonstrating the pinch-pull.
  onboarding: { level: 'w1-01', fresh: true, xr: true },
  // Color sorting finale, solution hung, ready to drop.
  'three-cups': { level: 'w2-06', solve: true, xr: true },
  // Rails: Hinge before the slide (the player slides it live on camera).
  hinge: { level: 'w3-05', xr: true },
  // Tension: the spool readout with a thread already spent.
  spool: { level: 'w4-05', threads: [['a', 'b']], xr: true },
  // Melody book: a solved level with its stars lit, ready to poke.
  'melody-book': { level: 'w1-04', solveAndDrop: true, xr: true },
  // The daily puzzle and its streak on the plaque.
  daily: { daily: true, xr: true },
  // Settings face open, for slow motion and Raise/Lower.
  settings: { level: 'w1-02', face: 'settings', xr: true },
  // The VR study fallback (browser view, no passthrough).
  study: { level: 'w2-02', solve: true, xr: false },
};

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const name = process.env.SHOT;
  if (!name) {
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
  const shot = SHOTS[name];
  if (!shot) throw new Error(`unknown shot "${name}"; known: ${Object.keys(SHOTS).join(', ')}`);
  if (shot.fresh) await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
  if (shot.daily) await app.evaluate(() => window.__threadbound.dispatch({ type: 'daily' }));
  if (shot.level) await loadLevel(app, shot.level);
  await app.evaluate((s) => {
    const hook = window.__threadbound;
    if (s.solve || s.solveAndDrop) hook.solve();
    for (const [from, to] of s.threads ?? []) hook.dispatch({ type: 'addThread', from, to });
    if (s.solveAndDrop) hook.dispatch({ type: 'drop' });
    if (s.face === 'settings' && hook.plaque()?.face !== 'settings') hook.dispatch({ type: 'toggleSettings' });
  }, shot);
  // A solved shot must finish its drop before passthrough re-places the diorama.
  if (shot.solveAndDrop) await waitFor(app, isComplete, 15000);
  return { shot: name, xr: shot.xr };
}
