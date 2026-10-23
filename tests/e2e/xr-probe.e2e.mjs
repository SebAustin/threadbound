// Helper for the XR shell tests: world positions of everything a hand can pinch,
// plus puzzle state. Optional SETUP env names one of SETUP_MODES: 'load0' (level 1,
// fresh), 'thread' (add a->b), 'busiest' (Three Cups with every marble in flight) or
// 'solve' (solve and drop the current level, then wait out its melody). An empty
// SETUP runs no setup; an unknown one throws with its name.
// To add a mode or a field, add a table entry and leave run() alone. Page functions
// run inside the app frame, so each must be self-contained (see tests/e2e/lib.mjs:2).
import { sleep } from './lib.mjs';

/** Lets the setup's last command reach the scene before anything is read. */
const SETTLE_MS = 300;

/** One page function per SETUP mode. */
const SETUP_MODES = {
  load0: () => window.__threadbound.dispatch({ type: 'load', index: 0 }),
  thread: () => window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' }),
  // The heaviest frame in the campaign: Three Cups, solution hung, every marble in flight.
  busiest: async () => {
    const hook = window.__threadbound;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    hook.dispatch({ type: 'load', index: hook.levels().findIndex((l) => l.id === 'w2-06') });
    await wait(300);
    hook.solve();
    hook.dispatch({ type: 'drop' });
    for (let t = 0; t < 8000 && hook.marbles().length < hook.state().level.marbles && hook.state().status !== 'complete'; t += 100) {
      await wait(100);
    }
  },
  // Solve the current level and let its replay finish, so the melody book has a tune.
  solve: async () => {
    const hook = window.__threadbound;
    const poll = () => new Promise((r) => setTimeout(r, 200));
    hook.solve();
    hook.dispatch({ type: 'drop' });
    for (let t = 0; t < 15000 && hook.state().status !== 'complete'; t += 200) await poll();
    // The replay is over once no melody note has sounded for a full second.
    for (let quiet = 0, t = 0; quiet < 1000 && t < 10000; t += 200) {
      quiet = hook.cues().includes('melody') ? 0 : quiet + 200;
      await poll();
    }
  },
};

/** One [name, page function] per returned field, read in this order. Each reads the hook itself. */
const PROBE_FIELDS = [
  ['knobs', () => {
    const hook = window.__threadbound;
    const s = hook.state();
    const knobZ = 0.029; // AIM_PLANE_Z (src/config/constants.ts): a page function can't import it.
    return Object.fromEntries(s.level.pegs.map((p) => [p.id, hook.worldOf(s.pegPositions[p.id].x, s.pegPositions[p.id].y, knobZ)]));
  }],
  ['chute', () => window.__threadbound.chute()?.world ?? null],
  // Aim at the top of each button's cap (1.2 cm above its base on the ledge).
  ['buttons', () => Object.fromEntries(
    ['restart', 'next', 'settings', 'daily'].map((id) => {
      const b = window.__threadbound.button(id)?.world;
      return [id, b && { ...b, y: b.y + 0.012 }];
    }),
  )],
  ['threadMid', () => {
    const hook = window.__threadbound;
    const { a, b } = hook.state().pegPositions;
    return a && b ? hook.worldOf((a.x + b.x) / 2, (a.y + b.y) / 2) : null;
  }],
  ['threads', () => window.__threadbound.state().threads],
  ['status', () => window.__threadbound.state().status],
  // Marbles in the scene. An unsolved drop leaves its marbles until the next drop or level build, so
  // this still shows a drop happened after its status has gone back to 'idle'.
  ['marbleCount', () => window.__threadbound.marbles().length],
  ['levelId', () => window.__threadbound.state().level.id],
  ['face', () => window.__threadbound.plaque()?.face],
  ['slowToggle', () => window.__threadbound.plaqueElement('set-slow')?.world],
  ['slowMotion', () => window.__threadbound.state().settings.slowMotion],
  ['stars', () => window.__threadbound.plaqueElement('hud-stars')?.world],
  ['placement', () => window.__threadbound.placement()],
  ['audio', () => window.__threadbound.audio()],
  ['frame', () => window.__threadbound.frameStats()],
];

/**
 * Drains the cue log, once and last, as records. Draining `cues()` (or ticket 10's
 * `cueTrace()`) empties both, so no other entry may drain.
 */
const cueDrain = () => window.__threadbound.cues().map((name) => ({ name }));

/** One [name, Node function] per field derived from the drained cue records. */
const CUE_FIELDS = [
  // Melody notes since the last probe (the drain resets the count).
  ['melodyNotesDrained', (records) => records.filter((c) => c.name === 'melody').length],
];

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const mode = process.env.SETUP ?? '';
  if (mode && !Object.hasOwn(SETUP_MODES, mode)) throw new Error(`xr-probe: unknown SETUP mode '${mode}'`);
  if (mode) await app.evaluate(SETUP_MODES[mode]);
  await sleep(SETTLE_MS);
  const probe = {};
  for (const [name, read] of PROBE_FIELDS) probe[name] = await app.evaluate(read);
  const records = await app.evaluate(cueDrain);
  for (const [name, derive] of CUE_FIELDS) probe[name] = derive(records);
  return probe;
}
