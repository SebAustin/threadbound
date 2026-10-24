// E2E: the diorama plaque tracks the level and the solve; the ledge strip carries
// the hint line and the threads placed against the thread limit.
import { checks, isComplete, loadLevel, waitFor } from './lib.mjs';

const hud = () => window.__threadbound.hud();
const ledge = () => window.__threadbound.ledge();

/** Meta's minimum gap between neighbouring interactables, edge to edge (LEDGE_STRIP.gap). */
const GAP = 0.012;
/** CONTROLS.buttonRadius in src/config/constants.ts: a page function can't import it. */
const BUTTON_RADIUS = 0.017;

/**
 * Page function: the strip's place on the ledge in diorama-local meters, and its
 * edge-to-edge gaps to the Daily and Next caps beside it.
 */
const stripOnLedge = (radius) => {
  const hook = window.__threadbound;
  const strip = hook.ledge();
  const { origin, yaw } = hook.frame();
  const localX = (p) => (p.x - origin[0]) * Math.cos(yaw) - (p.z - origin[2]) * Math.sin(yaw);
  const left = strip.local.x - strip.width / 2;
  const right = strip.local.x + strip.width / 2;
  return {
    local: strip.local,
    lean: strip.lean,
    visible: strip.visible,
    daily: left - (localX(hook.button('daily').world) + radius),
    next: localX(hook.button('next').world) - radius - right,
  };
};

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();

  await plaqueNamesLevel(app, check);
  await countMovedToLedge(app, check);
  await stripSitsOnLedge(app, check);
  await solveLightsPlaque(app, check);
  await plaqueFollowsTable(app, check);
  await finalesReadNofN(app, check);
  return results;
}

/** The plaque names the level and its world, centred above the diorama. */
async function plaqueNamesLevel(app, check) {
  await loadLevel(app, 'w2-02');
  const start = await app.evaluate(hud);
  check('plaque names the level and its place in the world',
    start?.model?.title === 'Over and Under' && start.model.worldLabel === 'World 2 - 2/6', JSON.stringify(start?.model));
  const size = await app.evaluate(() => window.__threadbound.state().level.size);
  check('plaque stands centred above the diorama',
    Math.abs(start.local.x - size[0] / 2) < 0.005 && start.local.y > size[1] && start.local.y < size[1] + 0.12, JSON.stringify(start.local));
}

/** The plaque no longer carries the count, the spool or the hint: the ledge strip does (on w2-02, still loaded). */
async function countMovedToLedge(app, check) {
  const gone = await app.evaluate(() => ['hud-threads', 'hud-spool', 'hud-hint'].filter((id) => window.__threadbound.plaqueElement(id)));
  check('the plaque has no threads, spool or hint element', gone.length === 0, JSON.stringify(gone));
  await app.evaluate(() => {
    const [first] = window.__threadbound.state().level.solution;
    window.__threadbound.dispatch({ type: 'addThread', from: first.from, to: first.to });
  });
  const counted = await waitFor(app, () => window.__threadbound.ledge()?.text.threads.startsWith('Threads 1/'), 2000);
  check('the ledge strip reads Threads 1/N after a thread', counted, JSON.stringify((await app.evaluate(ledge))?.text));
}

/** The strip lies on the ledge between Daily and Next, 12 mm from each, raised toward the player. */
async function stripSitsOnLedge(app, check) {
  const at = await app.evaluate(stripOnLedge, BUTTON_RADIUS);
  const near = (value, want, within) => Math.abs(value - want) <= within;
  check('the strip sits 12 mm from Daily and from Next',
    near(at.daily, GAP, 0.001) && near(at.next, GAP, 0.001), JSON.stringify(at));
  // Its bottom edge lies along the ledge front (frame z 0.08), just above the ledge top, leaning about 20 degrees.
  check('the strip lies on the ledge, its bottom edge at the front, raised about 20 degrees',
    at.visible && near(at.local.y, 0.001, 0.002) && near(at.local.z, 0.08, 0.002) && near(at.lean, 0.35, 0.02), JSON.stringify(at));
}

/** A solve lights the header and every earned star. */
async function solveLightsPlaque(app, check) {
  await loadLevel(app, 'w1-01');
  await app.evaluate(() => {
    window.__threadbound.solve();
    window.__threadbound.dispatch({ type: 'drop' });
  });
  await waitFor(app, isComplete, 15000);
  await waitFor(app, () => window.__threadbound.hud()?.model?.status === 'solved', 2000);
  const solved = await app.evaluate(hud);
  check('solving lights the header and the earned stars',
    solved.model.status === 'solved' && solved.model.stars.every(Boolean), JSON.stringify(solved.model));
}

/** Mixed reality: the diorama moves to the player's table; the plaque and the strip must follow. */
async function plaqueFollowsTable(app, check) {
  const before = await app.evaluate(stripOnLedge, BUTTON_RADIUS);
  const placed = { origin: [0.2, 0.7, -0.5], yaw: 0.6 };
  await app.evaluate((p) => window.__threadbound.dispatch({ type: 'place', ...p }), placed);
  await waitFor(app, (yaw) => Math.abs((window.__threadbound.frame()?.yaw ?? 0) - yaw) < 1e-3, 3000, placed.yaw);
  const onTable = await app.evaluate(hud);
  const tableSize = await app.evaluate(() => window.__threadbound.state().level.size);
  check('plaque follows the diorama onto the table',
    Math.abs(onTable.local.x - tableSize[0] / 2) < 0.005 && onTable.local.y > tableSize[1] && Math.abs(onTable.local.z) < 0.05, JSON.stringify(onTable.local));
  const after = await app.evaluate(stripOnLedge, BUTTON_RADIUS);
  const same = ['x', 'y', 'z'].every((k) => Math.abs(after.local[k] - before.local[k]) < 0.002) && Math.abs(after.lean - before.lean) < 0.01;
  check('the ledge strip follows the diorama onto the table', same && after.visible, JSON.stringify({ before, after }));
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetPlacement' }));
}

/** Each world's finale reads N/N: the count covers the whole world, campaign levels only. */
async function finalesReadNofN(app, check) {
  for (const [id, label] of [
    ['w1-06', 'World 1 - 6/6'],
    ['w2-06', 'World 2 - 6/6'],
    ['w3-06', 'World 3 - 6/6'],
    ['w4-06', 'World 4 - 6/6'],
  ]) {
    await loadLevel(app, id);
    const shown = await waitFor(app, (want) => window.__threadbound.hud()?.model?.worldLabel === want, 2000, label);
    check(`${id} is the last of its world on the plaque`, shown, await app.evaluate(() => window.__threadbound.hud()?.model?.worldLabel));
  }
}
