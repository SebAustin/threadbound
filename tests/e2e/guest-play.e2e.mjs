// E2E (real navigation, real input): guest play. Opened with ?fresh=1 the game starts on level 1
// with the ghost hand and default settings, whatever the save says. Playing level 1 and turning slow
// motion on there leave both saved values byte-identical, and a reload stays a guest. Back on the
// plain URL the save resumes at level 4. The plain URL is restored in a `finally`: run.sh's
// fresh_page keeps the query, so a guest page left behind would break every later persistence check.
import { canvasMapper, checks, click, clickCanvas, drag, freshSave, isComplete, navigateApp, plaqueElementAt, waitFor } from './lib.mjs';

export const GUEST = '?fresh=1';
/** src/lib/progress.ts and src/lib/settings.ts */
export const KEYS = ['threadbound.progress.v1', 'threadbound.settings.v1'];
/** Exact saved values: levels 1-3 solved, a streak and a melody; slow motion on (also xr-guest.sh's seed). */
export const SEED = [
  JSON.stringify({
    unlocked: 3,
    best: { 'w1-01': 3, 'w1-02': 2, 'w1-03': 1 },
    streak: { lastDay: '2026-10-20', count: 2 },
    dailyBest: { day: null, stars: 0 },
    melodies: { 'w1-01': { notes: [261.63, 329.63, 392], times: [0, 0.35, 0.8] } },
  }),
  JSON.stringify({ slowMotion: true, offset: { up: 0, near: 0 } }),
];
/** The save resumes at the first unsolved level: level 4. */
const RESUME_INDEX = 3;

/** Page function: both saved values as stored, byte for byte. */
const saved = (keys) => keys.map((key) => localStorage.getItem(key));
const sameAsSeed = (values) => values.length === SEED.length && values.every((v, i) => v === SEED[i]);

/** Page function: what a guest sees on arrival. */
const arrival = () => {
  const hook = window.__threadbound;
  const s = hook.state();
  return {
    levelIndex: s.levelIndex,
    best: s.progress.best,
    stars: hook.hud()?.model?.stars,
    settings: s.settings,
    ghost: hook.ghost(),
  };
};

const startsFresh = (a) =>
  a.levelIndex === 0 && Object.keys(a.best).length === 0 && a.ghost?.step === 'pinch-pull' && a.ghost.visible === true;
const defaultSettings = (a) => a.settings.slowMotion === false && a.settings.offset.up === 0 && a.settings.offset.near === 0;

async function arriveAsGuest(app, check) {
  await app.evaluate(([keys, values]) => keys.forEach((key, i) => localStorage.setItem(key, values[i])), [KEYS, SEED]);
  const search = await navigateApp(app, GUEST);
  check('the page opens with ?fresh=1', search === GUEST, String(search));
  await waitFor(app, () => window.__threadbound.ghost()?.visible === true, 3000);
  const a = await app.evaluate(arrival);
  check('a guest starts on level 1 with the pinch-pull demo, whatever the save says', startsFresh(a), JSON.stringify(a));
  check('no stars: level 1 shows none on the plaque', a.levelIndex === 0 && Array.isArray(a.stars) && a.stars.every((lit) => !lit), JSON.stringify(a.stars));
  check('settings start at their defaults (the saved slow motion is not read)', defaultSettings(a), JSON.stringify(a.settings));
}

/** Level 1 by a real drag and a real chute click (as onboarding.e2e.mjs), then slow motion by a real poke. */
async function playAsGuest(page, app, check) {
  const at = await canvasMapper(app);
  const [from, to] = await app.evaluate(() => {
    const { solution } = window.__threadbound.state().level;
    const pegs = window.__threadbound.pegs();
    return [pegs.find((p) => p.id === solution[0].from), pegs.find((p) => p.id === solution[0].to)];
  });
  await drag(page, at(from), at(to), 8);
  await waitFor(app, () => window.__threadbound.ghost()?.step === 'drop', 2000);
  await page.mouse.click(...at(await app.evaluate(() => window.__threadbound.chute())));
  check('a guest solves level 1', await waitFor(app, isComplete, 15000));
  await click(page, at(await app.evaluate(() => window.__threadbound.button('settings'))));
  await waitFor(app, () => window.__threadbound.plaque()?.face === 'settings', 2000);
  await clickCanvas(page, app, at, await plaqueElementAt(app, 'set-slow'));
  check('a guest can turn slow motion on', await waitFor(app, () => window.__threadbound.state().settings.slowMotion, 2000));
  const values = await app.evaluate(saved, KEYS);
  check('the saved progress and settings stay byte-identical', sameAsSeed(values), JSON.stringify(values));
}

async function reloadAsGuest(app, check) {
  const search = await navigateApp(app);
  await waitFor(app, () => window.__threadbound.ghost()?.visible === true, 3000);
  const a = await app.evaluate(arrival);
  check('a reload keeps ?fresh=1: level 1 and the ghost again, nothing kept', search === GUEST && startsFresh(a) && defaultSettings(a), JSON.stringify({ search, ...a }));
}

/** The plain URL: the save resumes untouched. Then leave a fresh save and default settings for later scripts. */
async function backToPlain(app, check) {
  const search = await navigateApp(app, '');
  const s = await app.evaluate(() => {
    const { levelIndex, progress, settings } = window.__threadbound.state();
    return { levelIndex, solved: Object.keys(progress.best).length, slowMotion: settings.slowMotion };
  });
  check('on the plain URL the save resumes at level 4, its settings intact', s.levelIndex === RESUME_INDEX && s.solved === 3 && s.slowMotion, JSON.stringify(s));
  await app.evaluate(() => {
    window.__threadbound.dispatch({ type: 'settings', patch: { slowMotion: false } });
    window.__threadbound.dispatch({ type: 'resetProgress' });
  });
  await waitFor(app, freshSave, 3000);
  check('the page is back on the plain URL', search === '' && (await app.evaluate(() => location.search)) === '', String(search));
}

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  try {
    await arriveAsGuest(app, check);
    await playAsGuest(page, app, check);
    await reloadAsGuest(app, check);
  } finally {
    await backToPlain(app, check);
  }
  return results;
}
