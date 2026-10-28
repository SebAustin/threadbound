// Helper for the XR shell tests: world positions of everything a hand can pinch,
// plus puzzle state. Optional SETUP env names one of SETUP_MODES: 'load0' (level 1,
// fresh), 'load1' (level 2, which has no onboarding or level hint), 'fresh' (reset
// progress, so level 1 teaches again), 'thread' (add a->b), 'busiest' (Three Cups
// with every marble in flight), 'solve' (solve and drop the current level, then wait
// until its cadence and replay have played), 'recenter' (the emulated headset
// recenters: its reference space fires 'reset' on the next frame), 'hide' / 'show'
// (the page reports itself hidden / shown, waiting until the puzzle pauses / resumes),
// 'float' (a 'floating' place where the diorama is) or 'settle' (wait while a drop is
// still falling, so a missed drop has ended before anything is read). An empty SETUP runs no setup;
// an unknown one throws with its name.
// To add a mode or a field, add a table entry and leave run() alone. Page functions
// run inside the app frame, so each must be self-contained (see tests/e2e/lib.mjs:2).
import { sleep } from './lib.mjs';

/** Lets the setup's last command reach the scene before anything is read. */
const SETTLE_MS = 300;

/** One page function per SETUP mode. */
const SETUP_MODES = {
  load0: () => window.__threadbound.dispatch({ type: 'load', index: 0 }),
  load1: () => window.__threadbound.dispatch({ type: 'load', index: 1 }),
  // Progress reset, waiting until it lands (tests/e2e/lib.mjs's freshSave): earlier hand
  // scripts solved level 1, so without this its onboarding would read 'done'.
  fresh: async () => {
    const hook = window.__threadbound;
    hook.dispatch({ type: 'resetProgress' });
    const landed = () => {
      const s = hook.state();
      return s.levelIndex === 0 && Object.keys(s.progress.best).length === 0 && s.threads.length === 0;
    };
    for (let t = 0; t < 3000 && !landed(); t += 100) await new Promise((r) => setTimeout(r, 100));
  },
  thread: () => window.__threadbound.dispatch({ type: 'addThread', from: 'a', to: 'b' }),
  recenter: () => window.__threadbound.recenter(),
  // pause.e2e.mjs's setHidden, written inline, then a wait until the puzzle has paused.
  hide: async () => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    for (let t = 0; t < 2000 && !window.__threadbound.state().paused; t += 50) await new Promise((r) => setTimeout(r, 50));
  },
  show: async () => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
    for (let t = 0; t < 2000 && window.__threadbound.state().paused; t += 50) await new Promise((r) => setTimeout(r, 50));
  },
  float: () => {
    const hook = window.__threadbound;
    const f = hook.frame();
    hook.dispatch({ type: 'place', origin: f.origin, yaw: f.yaw, surface: 'floating' });
  },
  // A missed drop takes up to ~15 s to settle (tests/e2e/missed-drop.e2e.mjs).
  settle: async () => {
    const hook = window.__threadbound;
    for (let t = 0; t < 20000 && hook.state().status === 'dropping'; t += 200) await new Promise((r) => setTimeout(r, 200));
  },
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
  // Solve the current level and let its celebration finish, so the melody book has a tune.
  // The replay keeps the drop's real gaps, which can exceed any quiet window: wait on `replaying`.
  solve: async () => {
    const hook = window.__threadbound;
    const poll = () => new Promise((r) => setTimeout(r, 200));
    hook.solve();
    hook.dispatch({ type: 'drop' });
    for (let t = 0; t < 15000 && hook.state().status !== 'complete'; t += 200) await poll();
    for (let t = 0; t < 15000 && hook.celebration().replaying; t += 200) await poll();
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
  // The diorama's yaw: hands rest in its frame (REST_YAW, xr-lib.sh's rest_hand_for).
  ['yaw', () => window.__threadbound.frame()?.yaw ?? 0],
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
  // A bare world point 1.1 cm off thread a-b's axis at its midpoint: outside the thread's
  // 6 mm radius, inside its invisible hit area (src/lib/hitArea.ts).
  ['threadEdge', () => {
    const hook = window.__threadbound;
    const { a, b } = hook.state().pegPositions;
    if (!a || !b) return null;
    const off = 0.011;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    return hook.worldOf((a.x + b.x) / 2 - ((b.y - a.y) / len) * off, (a.y + b.y) / 2 + ((b.x - a.x) / len) * off);
  }],
  // Every touchable part by name: its kind, what it shows (rest, hover, target, press), its
  // travel and whether it is pokeable; plus 'hud-plaque' (pokeable or not).
  ['touch', () => window.__threadbound.touch()],
  ['threads', () => window.__threadbound.state().threads],
  // The notes the last solve played (empty until a solve).
  ['melodyNotes', () => window.__threadbound.state().melody.notes],
  // Each cup's centre at half its wall height, as world points.
  ['cups', () => {
    const hook = window.__threadbound;
    const halfWall = 0.0175; // GOAL.wallHeight / 2 (src/config/constants.ts): a page function can't import it.
    return hook.state().level.goals.map((g) => hook.worldOf(g.x, halfWall));
  }],
  ['status', () => window.__threadbound.state().status],
  // Marbles in the scene. An unsolved drop leaves its marbles until the next drop or level build, so
  // this still shows a drop happened after its status has gone back to 'idle'.
  ['marbleCount', () => window.__threadbound.marbles().length],
  ['levelId', () => window.__threadbound.state().level.id],
  // The loaded level's place in play order (past the campaign's end: a daily).
  ['levelIndex', () => window.__threadbound.state().levelIndex],
  // The ghost hand: its onboarding step and whether it is drawn.
  ['ghost', () => window.__threadbound.ghost()],
  // The saved progress and settings exactly as stored (guest play must leave them byte-identical).
  ['savedProgress', () => localStorage.getItem('threadbound.progress.v1')],
  ['savedSettings', () => localStorage.getItem('threadbound.settings.v1')],
  ['face', () => window.__threadbound.plaque()?.face],
  ['slowToggle', () => window.__threadbound.plaqueElement('set-slow')?.world],
  ['slowMotion', () => window.__threadbound.state().settings.slowMotion],
  // The settings face's high-contrast toggle, the setting, and the look it applied (appearance()).
  ['contrastToggle', () => window.__threadbound.plaqueElement('set-contrast')?.world],
  ['highContrast', () => window.__threadbound.state().settings.highContrast],
  ['appearance', () => window.__threadbound.appearance?.() ?? null],
  ['raiseToggle', () => window.__threadbound.plaqueElement('set-up')?.world],
  ['nearToggle', () => window.__threadbound.plaqueElement('set-near')?.world],
  // The settings face's Skip (laid out even while hidden), whether it is offered, and the saved skips.
  ['skipToggle', () => window.__threadbound.plaqueElement('set-skip')?.world],
  ['skipOffered', () => window.__threadbound.plaque()?.skipOffered],
  ['skipped', () => window.__threadbound.state().progress.skipped],
  ['offset', () => window.__threadbound.state().settings.offset],
  // The settings face's melody-book play-all (ticket 14): where to aim, its label, whether it is
  // shown (hidden while the book is empty), and whether a replay (the stars' or the book's) still plays.
  ['playAll', () => {
    const hook = window.__threadbound;
    const plaque = hook.plaque();
    return {
      world: hook.plaqueElement('set-play-all')?.world ?? null,
      label: plaque?.playAllLabel ?? null,
      shown: plaque?.playAllShown ?? null,
      replaying: hook.celebration().replaying,
    };
  }],
  // The plaque's details row: the world and place, or the daily and its streak.
  ['worldLabel', () => window.__threadbound.hud()?.model?.worldLabel],
  ['stars', () => window.__threadbound.plaqueElement('hud-stars')?.world],
  // The ledge strip: its pose on the ledge, what it shows (hint, threads, spool) and whether it is drawn.
  ['ledge', () => window.__threadbound.ledge()],
  ['placement', () => window.__threadbound.placement()],
  // Whether the contact shadow under the base is drawn (hidden while the diorama floats).
  ['shadow', () => (window.__threadbound.meshBreakdown()['contact-shadow'] ?? 0) > 0],
  // The hint line the hud model carries (the ledge strip shows it: `ledge.text.hint`).
  ['hint', () => window.__threadbound.hud()?.model?.hint ?? null],
  ['audio', () => window.__threadbound.audio()],
  // Where the synth's audio listener is (null while sound is locked) and where the headset is, as world points.
  ['listener', () => window.__threadbound.listener?.() ?? null],
  // The synth's spatial notes still ringing, and notes ever started on a suspended audio context.
  ['voices', () => window.__threadbound.voices?.() ?? null],
  ['frame', () => window.__threadbound.frameStats()],
];

/**
 * Drains the cue log, once and last, as `cueTrace()` records (name, hz, at, source, spatial).
 * Draining `cues()` or `cueTrace()` empties both, so no other entry may drain.
 */
const cueDrain = () => window.__threadbound.cueTrace();

/** Cues heard from a place on the diorama in an XR session (src/lib/soundCues.ts, `positional`). */
const POSITIONAL = ['bounce', 'thread', 'cupCorrect', 'cupWrong', 'cadence'];

/** One [name, Node function] per field derived from the drained cue records. */
const CUE_FIELDS = [
  // Melody notes since the last probe (the drain resets the count).
  ['melodyNotesDrained', (records) => records.filter((c) => c.name === 'melody').length],
  // Presses on a ledge button or plaque control since the last probe: one per press that
  // landed, even when it changes nothing (Nearer at its stop).
  ['buttonCuesDrained', (records) => records.filter((c) => c.name === 'button').length],
  // Cadence notes since the last probe: a solve strums exactly 3.
  ['cadenceDrained', (records) => records.filter((c) => c.name === 'cadence').length],
  // Pulls released away from every peg they could attach to, since the last probe.
  ['dragMissDrained', (records) => records.filter((c) => c.name === 'dragMiss').length],
  // Plucks and cup chimes since the last probe: where each was heard from (world metres, null for
  // none) and whether it went through a panner.
  ['positionalDrained', (records) =>
    records.filter((c) => POSITIONAL.includes(c.name)).map(({ name, source, spatial }) => ({ name, source, spatial }))],
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
