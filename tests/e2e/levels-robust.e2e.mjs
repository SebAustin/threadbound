// E2E (ticket 20): one drop of a level's stored solution in each pose, at one speed: the study
// pose, then the passthrough table turned 0 and 90 degrees (ticket 18's poses). tests/e2e/levels-robust.sh
// runs it RUNS times per level and speed, one level per browser lease, because a level must solve
// every time, not just once: game events fall on frame boundaries, which shift with frame timing.
// Before the first drop it runs the same steps as levels.e2e.mjs: the level dropped untouched, then
// reopened. Without them w4-03 Budget's old layout passed here while levels.e2e.mjs failed it.
// LEVEL=campaign:<campaign index> | daily:<pool index>; SLOW=1 drops in slow motion.
import {
  hookReady,
  leaveTable,
  loadDaily,
  loadIndex,
  placeOnTable,
  reopenDaily,
  reopenLevel,
  setSlowMotion,
  solveAndDrop,
  solvesUntouched,
  TABLE_YAWS,
  waitFor,
} from './lib.mjs';

/** How to open the level fresh at the study pose, and the page function that reopens it on the table. */
function levelOpener(which) {
  const [kind, raw] = which.split(':');
  const index = Number(raw);
  if (!Number.isInteger(index) || (kind !== 'campaign' && kind !== 'daily')) throw new Error(`bad LEVEL ${which}`);
  if (kind === 'daily') return { index, open: (app) => loadDaily(app, index), reopen: reopenDaily };
  return { index, open: (app) => loadIndex(app, index), reopen: reopenLevel };
}

/** Drops the open level's stored solution; the marbles' resting places when it fails. */
async function drop(app, timeoutMs) {
  const start = Date.now();
  const solved = await solveAndDrop(app, timeoutMs);
  const marbles = solved ? undefined : await app.evaluate(() => window.__threadbound.marbles());
  return { solved, seconds: Math.round((Date.now() - start) / 100) / 10, ...(marbles ? { marbles } : {}) };
}

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const which = process.env.LEVEL ?? 'campaign:0';
  const slow = process.env.SLOW === '1';
  const timeoutMs = slow ? 25000 : 15000;
  const { index, open, reopen } = levelOpener(which);
  await waitFor(app, hookReady, 15000);
  await setSlowMotion(app, slow);
  try {
    const selfSolved = await solvesUntouched(app, open);
    await open(app);
    const level = await app.evaluate(() => window.__threadbound.state().level.id);
    const poses = { study: await drop(app, timeoutMs) };
    for (const yaw of TABLE_YAWS) {
      await placeOnTable(app, yaw, reopen, index);
      poses[`table ${Math.round((yaw * 180) / Math.PI)}`] = await drop(app, timeoutMs);
    }
    await leaveTable(app);
    return { which, level, slow, selfSolved, poses };
  } finally {
    await setSlowMotion(app, false);
  }
}
