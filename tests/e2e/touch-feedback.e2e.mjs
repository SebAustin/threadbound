// E2E (real mouse): every control shows it's being touched (week 8 ticket 11).
// Restart and the chute light under the pointer and a held Restart sinks; a held
// Settings sinks and, released, comes back up on the same button (Restart rebuilds
// every ledge button, so only a button that survives its press proves that); the
// invisible hit areas around a thread and a tab take a pointer that misses the part
// itself; a pull released on a preset-only peg's knob lands on its neighbour; the peg
// a pull would attach to reads 'target'; a release that jumps off a held peg keeps
// the peg, while a hold on the pull's own knob (off its centre, where a hand ray
// keeps sending moves) is the pinch itself and a flick after it lands where it went;
// and threads and the plaque take a pinch only (no poke).
// Every step moves the mouse with a lead-in first: the screen pointer only re-targets on pointermove.
import { canvasMapper, checks, drag, frames, loadLevel, sleep, waitFor } from './lib.mjs';

const MM = 0.001;
/** AIM_PLANE_Z (src/config/constants.ts): the knobs' and tabs' plane, where the mouse aims. */
const KNOB_Z = 0.029;
/** Bare back panel on w1-01, clear of every peg's snap radius (frame meters). */
const BARE = [0.25, 0.3];

/** Page functions: one part's touch state, and whether it reads `state`. */
const touchOf = (name) => window.__threadbound.touch()[name] ?? null;
const reads = ([name, state]) => window.__threadbound.touch()[name]?.state === state;
const playerThreads = () => window.__threadbound.state().threads.filter((t) => !t.preset);

async function lead(page, [x, y]) {
  await page.mouse.move(x - 3, y - 3);
  await page.mouse.move(x, y);
}

/** Moves the mouse (button up or down) to `to` in `steps` frames. */
async function sweep(page, from, to, steps = 8) {
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps);
    await sleep(16);
  }
}

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  const at = await canvasMapper(app);
  /** Screen point of a frame-local point on the knobs' plane (z defaults to it). */
  const local = async (x, y, z = KNOB_Z) => at(await app.evaluate(([px, py, pz]) => window.__threadbound.project(px, py, pz), [x, y, z]));
  const ctx = { page, app, check, at, local };
  await restartAndChute(ctx);
  await settingsRelease(ctx);
  await threadHitArea(ctx);
  await tabHitArea(ctx);
  await overlaps(ctx);
  await snapTarget(ctx);
  await stableRelease(ctx);
  await heldPinchThenFlick(ctx);
  await pinchOnly(ctx);
  return results;
}

/** Restart: hover, then held (press, sunk 4-7 mm), rebuilt by its release (the new one hovers, travel 0), off (rest). The chute hovers too. */
async function restartAndChute({ page, app, check, at, local }) {
  await loadLevel(app, 'w1-01');
  const restart = at(await app.evaluate(() => window.__threadbound.button('restart')));
  const bare = await local(...BARE);
  const readsNow = async (name, state) => [await waitFor(app, reads, 2000, [name, state]), JSON.stringify(await app.evaluate(touchOf, name))];
  await lead(page, restart);
  check('over Restart it reads hover', ...(await readsNow('button-restart', 'hover')));
  await page.mouse.down();
  await waitFor(app, reads, 2000, ['button-restart', 'press']);
  const held = await app.evaluate(touchOf, 'button-restart');
  check('held, Restart reads press with 4-7 mm of travel', held?.state === 'press' && held.travel >= 4 * MM && held.travel <= 7 * MM, JSON.stringify(held));
  await page.mouse.up();
  // Restart rebuilds the level (a frame after the release): the new button lights once the pointer moves again.
  await frames(app, 3);
  await lead(page, restart);
  await waitFor(app, reads, 2000, ['button-restart', 'hover']);
  const released = await app.evaluate(touchOf, 'button-restart');
  check('after the release rebuilds it, the new Restart reads hover with travel 0', released?.state === 'hover' && released.travel === 0, JSON.stringify(released));
  await lead(page, bare);
  check('moving off reads rest', ...(await readsNow('button-restart', 'rest')));
  await lead(page, at(await app.evaluate(() => window.__threadbound.chute())));
  check('over the chute it reads hover', ...(await readsNow('chute', 'hover')));
  await lead(page, bare);
  check('moving off the chute reads rest', ...(await readsNow('chute', 'rest')));
}

/**
 * Settings survives its own press (it only flips the plaque's face), so its release shows the
 * press undone on the same entity: hover, held (press, sunk 4-7 mm), released (hover, travel 0,
 * same root object), off (rest). A second press puts the level face back.
 */
async function settingsRelease({ page, app, check, at, local }) {
  await loadLevel(app, 'w1-01');
  const face = () => window.__threadbound.plaque()?.face;
  const isFace = ([f]) => window.__threadbound.plaque()?.face === f;
  const startFace = await app.evaluate(face);
  const otherFace = startFace === 'settings' ? 'level' : 'settings';
  const settings = at(await app.evaluate(() => window.__threadbound.button('settings')));
  const readsNow = async (state) => [await waitFor(app, reads, 2000, ['button-settings', state]), JSON.stringify(await app.evaluate(touchOf, 'button-settings'))];
  await lead(page, settings);
  check('over Settings it reads hover', ...(await readsNow('hover')));
  const before = await app.evaluate(touchOf, 'button-settings');
  await page.mouse.down();
  await waitFor(app, reads, 2000, ['button-settings', 'press']);
  const held = await app.evaluate(touchOf, 'button-settings');
  check('held, Settings reads press with 4-7 mm of travel', held?.state === 'press' && held.travel >= 4 * MM && held.travel <= 7 * MM, JSON.stringify(held));
  // No move after the release: the same button, still under the pointer, must come back up by itself.
  await page.mouse.up();
  const flipped = await waitFor(app, isFace, 2000, [otherFace]);
  await waitFor(app, reads, 2000, ['button-settings', 'hover']);
  const released = await app.evaluate(touchOf, 'button-settings');
  const same = released?.objectId === before?.objectId;
  check('released, the same Settings button reads hover with travel 0', same && released?.state === 'hover' && released.travel === 0, JSON.stringify({ before, released }));
  check('the release acted: the plaque flipped its face', flipped, `${startFace} -> ${await app.evaluate(face)}`);
  await lead(page, await local(...BARE));
  check('moving off Settings reads rest', ...(await readsNow('rest')));
  await lead(page, settings);
  await page.mouse.down();
  await page.mouse.up();
  check('a second press puts the first face back', await waitFor(app, isFace, 2000, [startFace]), String(await app.evaluate(face)));
  await lead(page, await local(...BARE));
}

/** Page function: frame point 1.1 cm off thread a-b's axis at its midpoint, on the up side. */
const threadEdge = () => {
  const { a, b } = window.__threadbound.state().pegPositions;
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const off = 0.011;
  return [(a.x + b.x) / 2 - ((b.y - a.y) / len) * off, (a.y + b.y) / 2 + ((b.x - a.x) / len) * off];
};

/** 1.1 cm off thread a-b's axis (its visible radius is 6 mm) the thread hovers, and a click there snips it. */
async function threadHitArea({ page, app, check, local }) {
  await loadLevel(app, 'w1-01');
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' }));
  const [x, y] = await app.evaluate(threadEdge);
  const edge = await local(x, y, 0);
  await lead(page, edge);
  const hovered = await waitFor(app, reads, 2000, ['thread-a-b', 'hover']);
  check('1.1 cm off thread a-b, outside its 6 mm radius, the thread hovers', hovered, JSON.stringify(await app.evaluate(touchOf, 'thread-a-b')));
  await page.mouse.click(...edge);
  check('a click there snips it', await waitFor(app, () => window.__threadbound.state().threads.length === 0, 2000));
}

/** On w3-01, 1.2 cm above the tab's centre (its half-height is 8 mm) the tab hovers, and a drag from there slides peg a. */
async function tabHitArea({ page, app, check, local }) {
  await loadLevel(app, 'w3-01');
  // Peg a's rail runs along x; its tab hangs 3 cm below it (lib/rail handleOffset).
  const a = await app.evaluate(() => window.__threadbound.state().pegPositions.a);
  const above = await local(a.x, a.y - 0.03 + 0.012);
  await lead(page, above);
  const hovered = await waitFor(app, reads, 2000, ['handle-a', 'hover']);
  check('1.2 cm above the tab, outside its 8 mm half-height, the tab hovers', hovered, JSON.stringify(await app.evaluate(touchOf, 'handle-a')));
  const TARGET_X = 0.05;
  await drag(page, above, await local(TARGET_X, a.y - 0.03 + 0.012));
  await waitFor(app, (x) => Math.abs(window.__threadbound.state().pegPositions.a.x - x) < 0.02, 3000, TARGET_X);
  const pos = await app.evaluate(() => window.__threadbound.state().pegPositions.a);
  check('a drag from there slides peg a along its rail', Math.abs(pos.x - TARGET_X) < 0.02 && Math.abs(pos.y - a.y) < 1e-6, JSON.stringify(pos));
}

/** A pull released on a preset-only peg's knob lands on the knob beside it. */
async function overlaps({ page, app, check, at }) {
  const pullOnto = async (levelId, from, onto) => {
    await loadLevel(app, levelId);
    const pegs = await app.evaluate(() => window.__threadbound.pegs());
    const knob = (id) => at(pegs.find((p) => p.id === id));
    await lead(page, knob(from));
    await drag(page, knob(from), knob(onto));
    await waitFor(app, () => window.__threadbound.state().threads.some((t) => !t.preset), 2000);
    return app.evaluate(playerThreads);
  };
  const w1 = await pullOnto('w1-06', 'b', 'h');
  check("on w1-06 a pull from b released on h's knob makes b-a, never b-h", w1.length === 1 && w1[0].from === 'b' && w1[0].to === 'a', JSON.stringify(w1));
  const w4 = await pullOnto('w4-06', 'r', 'u');
  check("on w4-06 a pull from r released on u's knob makes r-s", w4.length === 1 && w4[0].from === 'r' && w4[0].to === 's', JSON.stringify(w4));
}

/** Pulling from a to 2 cm short of b marks b as target; bare panel clears it, and a release there makes nothing. */
async function snapTarget({ page, app, check, local }) {
  await loadLevel(app, 'w1-01');
  const { a, b } = await app.evaluate(() => window.__threadbound.state().pegPositions);
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const short = await local(b.x - ((b.x - a.x) / len) * 0.02, b.y - ((b.y - a.y) / len) * 0.02);
  const from = await local(a.x, a.y);
  const bare = await local(...BARE);
  await lead(page, from);
  await page.mouse.down();
  await sweep(page, from, short);
  check('pulling from a to 2 cm short of b marks b as target', await waitFor(app, reads, 2000, ['peg-b', 'target']), JSON.stringify(await app.evaluate(touchOf, 'peg-b')));
  await sweep(page, short, bare);
  const cleared = await waitFor(app, (name) => window.__threadbound.touch()[name]?.state !== 'target', 2000, 'peg-b');
  check('moving on to bare panel clears it', cleared, JSON.stringify(await app.evaluate(touchOf, 'peg-b')));
  await page.mouse.up();
  await sleep(300);
  const threads = await app.evaluate(() => window.__threadbound.state().threads);
  const targets = await app.evaluate(() => Object.entries(window.__threadbound.touch()).filter(([, t]) => t.state === 'target'));
  check('releasing there makes no thread and leaves no target', threads.length === 0 && targets.length === 0, JSON.stringify({ threads, targets }));
}

/** A 200 ms hold on b, then a 4 cm move with the release in the same tick, still makes a-b. */
async function stableRelease({ page, app, check, local }) {
  await loadLevel(app, 'w1-01');
  const { a, b } = await app.evaluate(() => window.__threadbound.state().pegPositions);
  const from = await local(a.x, a.y);
  const onB = await local(b.x, b.y);
  await lead(page, from);
  await page.mouse.down();
  await sweep(page, from, onB);
  await sleep(200);
  await page.mouse.move(...(await local(b.x, b.y - 0.04)));
  await page.mouse.up();
  await waitFor(app, () => window.__threadbound.state().threads.length > 0, 2000);
  const threads = await app.evaluate(() => window.__threadbound.state().threads);
  check('a 200 ms hold on b, then a 4 cm jump on release, still makes a-b', threads.length === 1 && threads[0].from === 'a' && threads[0].to === 'b', JSON.stringify(threads));
  await pauseShortThenLand({ page, app, check, local, a, b, from, onB });
}

/** A held point on no peg doesn't win: a pull that pauses 100 ms on bare panel 4.5 cm short of b, then lands on b, makes a-b. */
async function pauseShortThenLand({ page, app, check, local, a, b, from, onB }) {
  await loadLevel(app, 'w1-01');
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const short = await local(b.x - ((b.x - a.x) / len) * 0.045, b.y - ((b.y - a.y) / len) * 0.045);
  await lead(page, from);
  await page.mouse.down();
  await sweep(page, from, short);
  await sleep(100);
  await page.mouse.move(...onB);
  await page.mouse.up();
  await waitFor(app, () => window.__threadbound.state().threads.length > 0, 2000);
  const threads = await app.evaluate(() => window.__threadbound.state().threads);
  check('a 100 ms pause on bare panel short of b, then a landing on b, makes a-b', threads.length === 1 && threads[0].to === 'b', JSON.stringify(threads));
}

/** Wiggles the held mouse a pixel each frame for about `ms`: a hand ray never holds still, so it keeps sending moves. */
async function jitterHold(page, [x, y], ms) {
  for (let t = 0, i = 1; t < ms; t += 16, i++) {
    await page.mouse.move(x + (i % 2), y);
    await sleep(16);
  }
}

/**
 * A pinch that lands 1.2 cm off a knob's centre (still on its 33 mm knob) and holds there, sending
 * moves, is the pinch itself, not an aim: a flick right after lands where it went, never on the
 * knob's neighbour, and a flick onto bare panel misses audibly. The flick releases in the same tick.
 */
async function heldPinchThenFlick({ page, app, check, local }) {
  const offCentre = async (peg, toward) => {
    const len = Math.hypot(toward.x - peg.x, toward.y - peg.y);
    return local(peg.x + ((toward.x - peg.x) / len) * 0.012, peg.y + ((toward.y - peg.y) / len) * 0.012);
  };
  const flick = async (from, to) => {
    await lead(page, from);
    await page.mouse.down();
    await jitterHold(page, from, 120);
    await page.mouse.move(...to);
    await page.mouse.up();
  };
  // w2-04: c is 4.5 cm from a, the closest pair in the campaign; the held point is 3.3 cm from c, inside its snap radius.
  await loadLevel(app, 'w2-04');
  const { a, b, c } = await app.evaluate(() => window.__threadbound.state().pegPositions);
  await flick(await offCentre(a, c), await local(b.x, b.y));
  await waitFor(app, () => window.__threadbound.state().threads.some((t) => !t.preset), 2000);
  const made = await app.evaluate(playerThreads);
  check("a held pinch 1.2 cm off a's centre toward c, then a flick onto b, makes a-b, never a-c", made.length === 1 && made[0].from === 'a' && made[0].to === 'b', JSON.stringify(made));
  await loadLevel(app, 'w1-01');
  const pegs = await app.evaluate(() => window.__threadbound.state().pegPositions);
  await app.evaluate(() => window.__threadbound.cues());
  await flick(await offCentre(pegs.a, pegs.b), await local(...BARE));
  await frames(app, 2);
  const heard = await app.evaluate(() => window.__threadbound.cues());
  const threads = await app.evaluate(() => window.__threadbound.state().threads.length);
  const misses = heard.filter((cue) => cue === 'dragMiss').length;
  check('the same held pinch, then a flick onto bare panel, makes no thread and logs one dragMiss', misses === 1 && threads === 0, JSON.stringify({ heard, threads }));
}

/** Threads (preset and player) and the plaque take a pinch only; the ledge buttons alone are pokeable. */
async function pinchOnly({ app, check }) {
  await loadLevel(app, 'w1-06');
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' }));
  const touch = await app.evaluate(() => window.__threadbound.touch());
  const threads = Object.entries(touch).filter(([name]) => name.startsWith('thread-'));
  check('no thread is pokeable (a preset and a player thread)', threads.length === 2 && threads.every(([, t]) => !t.pokeInteractable), JSON.stringify(threads));
  check('the plaque is not pokeable', touch['hud-plaque']?.pokeInteractable === false, JSON.stringify(touch['hud-plaque']));
  const pokeable = Object.entries(touch).filter(([, t]) => t.pokeInteractable).map(([name]) => name).sort();
  check('only the four ledge buttons are pokeable', JSON.stringify(pokeable) === JSON.stringify(['button-daily', 'button-next', 'button-restart', 'button-settings']), JSON.stringify(pokeable));
}
