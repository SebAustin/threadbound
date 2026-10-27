// E2E (a seeded save, then an in-frame reload): a returning player is told that today's daily is
// waiting. Levels 1-3 solved, a streak of 2 ending yesterday and yesterday's daily solved: the game
// opens on level 4 with "Today's daily is ready - streak 2" and a pulsing sun, and the line is gone once
// the player drops. A save whose daily was solved today shows neither.
import { canvasMapper, checks, click, freshSave, sleep, waitFor } from './lib.mjs';

const KEY = 'threadbound.progress.v1';
const READY_2 = "Today's daily is ready - streak 2";

/** Page function: local day keys for today and yesterday (the game's own format, lib/daily localDayKey). */
const days = () => {
  const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const now = new Date();
  return { today: key(now), yesterday: key(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)) };
};

/** A save with w1-01 to w1-03 solved and the given streak and daily stars. */
const seeded = (streak, dailyBest) => ({
  unlocked: 3,
  best: { 'w1-01': 3, 'w1-02': 3, 'w1-03': 2 },
  streak,
  dailyBest,
  melodies: {},
  skipped: [],
});

/** Page function: the level opened, the ledge's hint and the sun. */
const opened = () => {
  const hook = window.__threadbound;
  const s = hook.state();
  return { level: s.level.id, daily: s.daily, hint: hook.ledge()?.text.hint ?? '', pulsing: hook.button('daily')?.pulsing ?? null };
};

/** Page function: the reloaded page's game is up (the old page carries a marker). */
const upAgain = () => !window.__beforeNavigation && Boolean(window.__threadbound?.state().level);

/**
 * Polls `upAgain` across the reload. A poll that lands while the page navigates throws "Execution
 * context was destroyed" (lib.mjs's waitFor would stop the script: .scratch/week9/spec.md item 13),
 * so here any failed poll counts as "not yet".
 */
async function untilUpAgain(app, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await app.evaluate(upAgain).catch(() => false)) return true;
    await sleep(150);
  }
  return false;
}

/** Writes `save` and reloads the app frame in place, as a player coming back would load it. */
async function reloadWith(app, save) {
  await app
    .evaluate(([key, value]) => {
      localStorage.setItem(key, JSON.stringify(value));
      window.__beforeNavigation = true;
      location.reload();
    }, [KEY, save])
    .catch(() => {});
  return untilUpAgain(app, 15000);
}

async function dailyWaiting(page, app, check, { today, yesterday }) {
  const up = await reloadWith(app, seeded({ lastDay: yesterday, count: 2 }, { day: yesterday, stars: 3 }));
  await waitFor(app, () => window.__threadbound.button('daily')?.pulsing === true, 2000);
  const back = await app.evaluate(opened);
  check(`a returning player opens on level 4 with "${READY_2}"`, up && back.level === 'w1-04' && back.daily === null && back.hint === READY_2, JSON.stringify(back));
  check('and a pulsing sun', back.pulsing === true, JSON.stringify(back));
  const at = await canvasMapper(app);
  await click(page, at(await app.evaluate(() => window.__threadbound.chute())));
  const dropped = await waitFor(app, () => window.__threadbound.state().status !== 'idle', 2000);
  const during = await app.evaluate(opened);
  await waitFor(app, () => window.__threadbound.state().status === 'idle', 20000);
  const after = await app.evaluate(opened);
  check('after a drop the line is gone, and stays gone once the drop is over', dropped && during.hint !== READY_2 && after.hint !== READY_2 && !after.hint.includes('daily is ready'), JSON.stringify({ during: during.hint, after: after.hint, today }));
}

async function solvedToday(app, check, { today }) {
  const up = await reloadWith(app, seeded({ lastDay: today, count: 3 }, { day: today, stars: 2 }));
  await waitFor(app, () => window.__threadbound.button('daily')?.pulsing === false, 2000);
  const back = await app.evaluate(opened);
  check("a save whose daily was solved today shows neither the line nor a pulsing sun", up && back.level === 'w1-04' && !back.hint.includes('daily is ready') && back.pulsing === false, JSON.stringify(back));
}

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  const when = await app.evaluate(days);
  try {
    await dailyWaiting(page, app, check, when);
    await solvedToday(app, check, when);
  } finally {
    // Never reset into a page still loading: the hook arrives with the game.
    await untilUpAgain(app, 15000);
    await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
    check('progress is reset for the scripts after this one', await waitFor(app, freshSave, 3000));
  }
  return results;
}
