// E2E (week 8 ticket 07): placement that holds up, in the browser view.
// - After Raise twice (real clicks), the study table's top is flush with the base's underside.
// - A 'floating' place hides the contact shadow and a 'table' place shows it; after each place
//   the diorama fades in: `reveal` is below 1 on the first frame and reaches 1 within 0.4 s.
// - With real pointer input, a place sent mid-pull waits for the release: the thread is made,
//   the diorama then moves with it, and the next pinch-pull works.
import { canvasMapper, checks, click, clickCanvas, frames, loadIndex, plaqueElementAt, sleep, waitFor } from './lib.mjs';

/** DIORAMA.slab (src/config/constants.ts): the base's underside is this far below the frame origin. */
const SLAB = 0.012;
const STEP_UP = 0.025;
/** The fade lasts about 0.3 s (REVEAL_SECONDS); it must be over within this. */
const REVEAL_WITHIN_MS = 400;
/** Where the mid-pull place moves the diorama: 4 cm to the right, still in the flat view. */
const SHIFT_X = 0.04;

const origin = () => window.__threadbound.frame()?.origin;
const hasThread = ([from, to]) =>
  window.__threadbound.state().threads.some((t) => (t.from === from && t.to === to) || (t.from === to && t.to === from));

/**
 * Page side: dispatch a place at the current pose, then watch the fade on every rendered frame.
 * Returns `reveal` on the first frame, when it reached 1 (ms after the place, null if not within
 * 1 s), and whether the contact shadow is shown.
 */
const placeAndWatch = async (surface) => {
  const hook = window.__threadbound;
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
  const f = hook.frame();
  const t0 = performance.now();
  hook.dispatch({ type: 'place', origin: f.origin, yaw: f.yaw, surface });
  await nextFrame();
  const first = hook.placement().reveal;
  let reachedAt = null;
  while (reachedAt === null && performance.now() - t0 < 1000) {
    if (hook.placement().reveal === 1) reachedAt = Math.round(performance.now() - t0);
    else await nextFrame();
  }
  return { first, reachedAt, shadow: (hook.meshBreakdown()['contact-shadow'] ?? 0) > 0, surface: hook.state().surface };
};

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  const at = await canvasMapper(app);
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'settings', patch: { offset: { up: 0, near: 0 } } }));
  await loadIndex(app, 0);
  const ctx = { page, app, at, check };

  await studyTableFollowsRaise(ctx);
  await placeFadesAndShadow(ctx);
  await placeWaitsForPull(ctx);

  await app.evaluate(() => window.__threadbound.dispatch({ type: 'settings', patch: { offset: { up: 0, near: 0 } } }));
  return results;
}

/** Raise twice with real clicks: the study table's top rises with the base. */
async function studyTableFollowsRaise({ page, app, at, check }) {
  const start = await app.evaluate(origin);
  await click(page, at(await app.evaluate(() => window.__threadbound.button('settings'))));
  await waitFor(app, () => window.__threadbound.plaque()?.face === 'settings', 2000);
  for (let step = 1; step <= 2; step++) {
    await clickCanvas(page, app, at, await plaqueElementAt(app, 'set-up'));
    await waitFor(app, ([y]) => Math.abs(window.__threadbound.frame().origin[1] - y) < 1e-3, 3000, [start[1] + step * STEP_UP]);
  }
  await frames(app, 2);
  const seen = await app.evaluate(() => ({ origin: window.__threadbound.frame().origin, room: window.__threadbound.room(), offset: window.__threadbound.state().settings.offset }));
  const underside = seen.origin[1] - SLAB;
  check(
    'after Raise twice, the study table top is flush with the base underside',
    seen.offset.up === 2 && typeof seen.room.tableTop === 'number' && Math.abs(seen.room.tableTop - underside) < 1e-3,
    JSON.stringify({ tableTop: seen.room.tableTop, underside, offset: seen.offset }),
  );
  await click(page, at(await app.evaluate(() => window.__threadbound.button('settings'))));
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'settings', patch: { offset: { up: 0, near: 0 } } }));
  await waitFor(app, ([y]) => Math.abs(window.__threadbound.frame().origin[1] - y) < 1e-3, 3000, [start[1]]);
}

/** Each place rebuilds the diorama and fades it in; floating hides the contact shadow. */
async function placeFadesAndShadow({ app, check }) {
  for (const [surface, shadowWanted] of [['floating', false], ['table', true]]) {
    const seen = await app.evaluate(placeAndWatch, surface);
    check(`a '${surface}' place ${shadowWanted ? 'shows' : 'hides'} the contact shadow`, seen.shadow === shadowWanted && seen.surface === surface, JSON.stringify(seen));
    check(
      `after a '${surface}' place, reveal is below 1 on the first frame and reaches 1 within ${REVEAL_WITHIN_MS / 1000} s`,
      seen.first < 1 && seen.reachedAt !== null && seen.reachedAt <= REVEAL_WITHIN_MS,
      JSON.stringify(seen),
    );
  }
}

/** A place sent mid-pull: nothing moves until the release, the thread is kept, the next pull works. */
async function placeWaitsForPull({ page, app, at, check }) {
  await loadIndex(app, 0);
  const pegAt = (id) => app.evaluate((pegId) => window.__threadbound.pegs().find((p) => p.id === pegId), id);
  const [a, b] = [await pegAt('a'), await pegAt('b')];
  const start = await app.evaluate(origin);
  const moved = [start[0] + SHIFT_X, start[1], start[2]];
  await page.mouse.move(...at(a));
  await sleep(80);
  await page.mouse.down();
  await pullTo(page, at(a), at(b), 0.5);
  await app.evaluate((o) => window.__threadbound.dispatch({ type: 'place', origin: o, yaw: 0, surface: 'table' }), moved);
  await frames(app, 6);
  const mid = await app.evaluate(() => ({ origin: window.__threadbound.frame().origin, drags: window.__threadbound.state().drags, reveal: window.__threadbound.placement().reveal }));
  check('a place sent mid-pull waits: the diorama stays put while the pull goes on', JSON.stringify(mid.origin) === JSON.stringify(start) && mid.drags === 1 && mid.reveal === 1, JSON.stringify(mid));
  await pullTo(page, at(a), at(b), 1, 0.5);
  await page.mouse.up();
  const made = await waitFor(app, hasThread, 2000, ['a', 'b']);
  const there = await waitFor(app, ([x]) => Math.abs(window.__threadbound.frame().origin[0] - x) < 1e-3, 2000, [moved[0]]);
  const after = await app.evaluate(() => ({ origin: window.__threadbound.frame().origin, threads: window.__threadbound.state().threads, drags: window.__threadbound.state().drags }));
  check('on release the thread is made, then the diorama moves with it', made && there && after.drags === 0 && after.threads.length === 1, JSON.stringify(after));

  await frames(app, 4);
  const [b2, c2] = [await pegAt('b'), await pegAt('c')];
  await page.mouse.move(...at(b2));
  await sleep(80);
  await page.mouse.down();
  await pullTo(page, at(b2), at(c2), 1);
  await page.mouse.up();
  check('the next pinch-pull works on the moved diorama', await waitFor(app, hasThread, 2000, ['b', 'c']), JSON.stringify(await app.evaluate(() => window.__threadbound.state().threads)));
}

/** Moves the held mouse from `from` toward `to`, from fraction `t0` of the way to `t1`, in small steps. */
async function pullTo(page, from, to, t1, t0 = 0) {
  const STEPS = 6;
  for (let i = 1; i <= STEPS; i++) {
    const t = t0 + ((t1 - t0) * i) / STEPS;
    await page.mouse.move(from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t);
    await sleep(16);
  }
}
