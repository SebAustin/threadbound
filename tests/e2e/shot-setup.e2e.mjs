// Video kit: stage a named shot in the running app (see docs/video/shot-list.md).
// Usage: zsh tests/e2e/shot.sh <shot>   (wraps this script; XR shots also enter passthrough)
// SEED=1 runs only the shot's seed pass: it writes the save, and shot.sh reloads before staging.
// Legacy: LEVEL=<index> [SOLVE=1] [WAIT_MS=300] stages a level by index.
import { canvasMapper, click, frames, isComplete, loadIndex, loadLevel, sleep, waitFor } from './lib.mjs';
import { resetSettings } from './reset-settings.e2e.mjs';

/**
 * Each shot: a level (by id), what to prepare, and whether the developer records it
 * in XR. Threads are added through the command bus so the board is ready the moment
 * recording starts; the gesture on camera is the take (tests/e2e/take.sh), or live.
 * Every shot starts from DEFAULT_SETTINGS: slow motion and the offset persist between takes.
 */
export const SHOTS = {
  // 0:00 cold open (record after ticket 10): Encore, whose two solution threads ring different
  // roots. The solution hangs except c-d (`leave`), which the take pinch-pulls live before the chute.
  'cold-open': { level: 'w1-06', solve: true, leave: [['c', 'd']], xr: true },
  // First five minutes: a fresh save, ghost hand demonstrating the pinch-pull.
  onboarding: { level: 'w1-01', fresh: true, xr: true },
  // Color sorting finale, solution hung, ready to drop.
  'three-cups': { level: 'w2-06', solve: true, xr: true },
  // Rails: Hinge before the slide (the player slides it live on camera).
  hinge: { level: 'w3-05', xr: true },
  // Tension: the spool readout with a thread already spent.
  spool: { level: 'w4-05', threads: [['a', 'b']], xr: true },
  // Melody book: a solved level with its stars lit, ready to pinch.
  'melody-book': { level: 'w1-04', solveAndDrop: true, xr: true },
  // A daily on a 6-day streak that ended yesterday, solution hung: the chute pinch makes it 7.
  // A fixed board (pool index 4, src/levels/index.ts DAILY_BASES), so every take is the same:
  // pool 1 (Relay), 3 and 6 don't solve on the emulator's table at yaw 90° (week 8 ticket 05 Comments).
  daily: { daily: { index: 4, id: 'daily-w2-04' }, streak: 6, solve: true, xr: true },
  // Settings face open over a hung solution: Slow motion on, a slower drop, then Raise.
  settings: { level: 'w1-02', solve: true, face: 'settings', xr: true },
  // The VR study fallback (browser view, no passthrough).
  study: { level: 'w2-02', solve: true, xr: false },
};

/**
 * Seed pass (page function): the daily's streak `count`, ending yesterday, in the save
 * (`threadbound.progress.v1`, src/lib/progress.ts). The daily's stars are cleared so
 * every take starts unsolved; the rest of the save is kept.
 */
const seedStreak = (count) => {
  const key = 'threadbound.progress.v1';
  const day = new Date();
  day.setDate(day.getDate() - 1);
  const pad = (n) => String(n).padStart(2, '0');
  const lastDay = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
  const save = JSON.parse(localStorage.getItem(key) ?? 'null') ?? { unlocked: 0, best: {} };
  localStorage.setItem(key, JSON.stringify({ ...save, streak: { lastDay, count }, dailyBest: { day: null, stars: 0 } }));
};

/**
 * Pixels in from the canvas's bottom-right corner: the study's bare table, clear of the
 * diorama and its ledge, the card (top left), IWER's pill (top centre) and the managed
 * window's Runtime/Editor buttons, which overlay the top right of the app frame.
 */
const UNLOCK_INSET = 12;

/**
 * One real click on an empty canvas corner: the document pointerdown that unlocks audio
 * (AudioUnlockSystem). IWER's scripted pinches may not count as a user gesture.
 * `click` moves in first, so the pointer re-targets the corner instead of the last hovered peg.
 */
async function unlockAudio(page, app) {
  const at = await canvasMapper(app);
  const box = await app.locator('canvas').first().boundingBox();
  const [x, y] = at({ x: box.width - UNLOCK_INSET, y: box.height - UNLOCK_INSET });
  // Never click the managed window's own buttons: the point must land on the app.
  const hit = await page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.tagName, [x, y]);
  if (hit !== 'IFRAME' && hit !== 'CANVAS') throw new Error(`the unlock click at ${x},${y} would hit a ${hit}, not the app`);
  await click(page, [x, y]);
  return waitFor(app, () => window.__threadbound.audio() === 'running', 2000);
}

/** Opens one daily board by pool index and checks it is the board the shot expects. */
async function openDaily(app, { index, id }) {
  await app.evaluate((i) => window.__threadbound.dispatch({ type: 'daily', index: i }), index);
  const opened = await app.evaluate(() => window.__threadbound.state().level?.id);
  if (opened !== id) throw new Error(`daily pool index ${index} opened ${opened}, not ${id}`);
  await frames(app, 4);
}

async function prepare(app, shot) {
  if (shot.fresh) await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
  if (shot.daily) await openDaily(app, shot.daily);
  if (shot.level) await loadLevel(app, shot.level);
  await app.evaluate((s) => {
    const hook = window.__threadbound;
    if (s.solve || s.solveAndDrop) hook.solve();
    for (const [from, to] of s.leave ?? []) hook.dispatch({ type: 'snip', from, to });
    for (const [from, to] of s.threads ?? []) hook.dispatch({ type: 'addThread', from, to });
    if (s.solveAndDrop) hook.dispatch({ type: 'drop' });
    if (s.face === 'settings' && hook.plaque()?.face !== 'settings') hook.dispatch({ type: 'toggleSettings' });
  }, shot);
  // A solved shot must finish its drop before passthrough re-places the diorama.
  if (shot.solveAndDrop) await waitFor(app, isComplete, 15000);
}

async function stageByIndex(app) {
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

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const name = process.env.SHOT;
  if (!name) return stageByIndex(app);
  const shot = SHOTS[name];
  if (!shot) throw new Error(`unknown shot "${name}"; known: ${Object.keys(SHOTS).join(', ')}`);
  if (process.env.SEED === '1') {
    if (shot.streak) await app.evaluate(seedStreak, shot.streak);
    return { shot: name, seeded: Boolean(shot.streak) };
  }
  await resetSettings(app);
  await prepare(app, shot);
  const audio = await unlockAudio(page, app);
  return { shot: name, xr: shot.xr, audioUnlocked: audio };
}
