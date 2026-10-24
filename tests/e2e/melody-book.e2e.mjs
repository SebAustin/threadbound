// E2E (real input): the melody book. A solve saves the tune its drop played, with when
// each note sounded; poking the plaque's stars replays it note for note with that timing,
// then closes on the cadence. An entry saved before timing replays at the old fixed step.
// Unsolved levels stay quiet.
import { canvasMapper, checks, clickCanvas, freshSave, hookReady, isComplete, loadLevel, plaqueElementAt, waitFor } from './lib.mjs';

/** Mirrors MELODY_NOTES_MAX in src/lib/progress.ts (E2E runs in Node and can't import the TS source). */
const MELODY_NOTES_MAX = 16;
/** Mirrors MELODY_STEP_SECONDS and CADENCE_STRUM_SECONDS in src/lib/melody.ts. */
const STEP_S = 0.22;
const STRUM_S = 0.05;
/** How far a replayed gap may stray from the saved one: notes sound on rendered frames. */
const GAP_TOLERANCE_S = 0.04;
/** Margin on top of a replay's own length. */
const REPLAY_SLACK_MS = 3000;
const KEY = 'threadbound.progress.v1';

/** Page side: a cue trace kept across polls (every poll drains the shared log). */
const installTrace = () => {
  window.__trace = [];
  window.__collect = () => {
    window.__trace.push(...window.__threadbound.cueTrace());
    return window.__trace;
  };
};
const resetTrace = () => {
  window.__threadbound.cueTrace();
  window.__trace = [];
};
const replayOver = () => {
  window.__collect();
  return !window.__threadbound.celebration().replaying;
};

/** How long a stars replay of `entry` lasts (lead-in, its notes, the beat and the strum), plus slack. */
function replayMs({ notes, times }) {
  const span = times.length === notes.length && notes.length > 0 ? times[times.length - 1] - times[0] : STEP_S * notes.length;
  return Math.round((STEP_S + span + STEP_S + 2 * STRUM_S) * 1000) + REPLAY_SLACK_MS;
}

/** Pokes the stars and returns the trace of the replay, once it has finished. */
async function pokeStars({ page, app, at }, timeoutMs) {
  await app.evaluate(resetTrace);
  await clickCanvas(page, app, at, await plaqueElementAt(app, 'hud-stars'));
  await waitFor(app, () => window.__collect().length > 0, 2000);
  const ended = await waitFor(app, replayOver, timeoutMs);
  return { ended, trace: await app.evaluate(() => window.__collect()) };
}

/** The replayed melody gaps against `want` gaps (seconds), and the cadence after the last note. */
function replayReport(trace, wantGaps) {
  const melody = trace.filter((r) => r.name === 'melody');
  const cadence = trace.filter((r) => r.name === 'cadence');
  const gaps = melody.slice(1).map((r, i) => r.at - melody[i].at);
  const off = gaps.map((g, i) => Math.abs(g - wantGaps[i]));
  const lastNote = melody.length ? melody[melody.length - 1].at : -Infinity;
  return {
    melody: melody.length,
    worstGapError: off.length ? Math.max(...off) : 0,
    cadenceAfter: cadence.length === 3 && cadence.every((r) => r.at > lastNote),
    gaps: gaps.map((g) => g.toFixed(3)).join(' '),
  };
}

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  const ctx = { page, app, check, at: await canvasMapper(app) };
  await app.evaluate(installTrace);
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
  await waitFor(app, freshSave, 3000);

  const saved = await solveAndSave(ctx);
  await starsReplayKeepsTiming(ctx, saved);
  await unsolvedStaysQuiet(ctx);
  await oldEntryKeepsStep(ctx);
  return results;
}

/** A real solve saves its notes with a time each, in the save itself. */
async function solveAndSave({ app, check }) {
  await app.evaluate(() => {
    window.__threadbound.solve();
    window.__threadbound.dispatch({ type: 'drop' });
  });
  await waitFor(app, isComplete, 15000);
  const saved = await app.evaluate(() => window.__threadbound.state().progress.melodies['w1-01'] ?? { notes: [], times: [] });
  check('a solve saves the melody its drop played, with a time per note', saved.notes.length > 0 && saved.notes.length <= MELODY_NOTES_MAX && saved.times.length === saved.notes.length, JSON.stringify(saved));
  const stored = await app.evaluate((key) => localStorage.getItem(key), KEY);
  check('the melody book is saved with progress, timing included', (stored ?? '').includes('"melodies":{"w1-01":{"notes":[') && (stored ?? '').includes('"times":['), stored);
  // Let the solve's own cadence and replay finish before poking the stars.
  await waitFor(app, replayOver, replayMs(saved));
  return saved;
}

/** Poking the stars replays every saved note with its saved gaps, then the cadence. */
async function starsReplayKeepsTiming(ctx, saved) {
  const { ended, trace } = await pokeStars(ctx, replayMs(saved));
  const wantGaps = saved.times.slice(1).map((t, i) => t - saved.times[i]);
  const report = replayReport(trace, wantGaps);
  const detail = JSON.stringify({ ...report, want: wantGaps.map((g) => g.toFixed(3)).join(' ') });
  ctx.check('poking the stars replays the tune, note for note', ended && report.melody === saved.notes.length, detail);
  ctx.check(`the replayed gaps match the saved times within ${GAP_TOLERANCE_S * 1000} ms`, report.melody > 1 && report.worstGapError <= GAP_TOLERANCE_S, detail);
  ctx.check('the replay closes on 3 cadence cues after its last note', report.cadenceAfter, detail);
}

async function unsolvedStaysQuiet({ page, app, at, check }) {
  await loadLevel(app, 'w1-02');
  await app.evaluate(resetTrace);
  await clickCanvas(page, app, at, await plaqueElementAt(app, 'hud-stars'));
  check('an unsolved level has no tune to replay', !(await waitFor(app, () => window.__collect().some((r) => r.name === 'melody' || r.name === 'cadence'), 1500)));
}

/** A save from before timing (a bare array of notes) still loads, and replays at the fixed 0.22 s step. */
async function oldEntryKeepsStep(ctx) {
  const { app, check } = ctx;
  const OLD = [261.63, 329.63, 392.0, 523.25];
  await app.evaluate(
    ({ key, notes }) => {
      const save = JSON.parse(localStorage.getItem(key));
      localStorage.setItem(key, JSON.stringify({ ...save, melodies: { 'w1-01': notes } }));
      window.__beforeReload = true;
      location.reload();
    },
    { key: KEY, notes: OLD },
  ).catch(() => {});
  await waitFor(app, () => !window.__beforeReload && Boolean(window.__threadbound?.state().level), 15000);
  await waitFor(app, hookReady, 5000);
  await app.evaluate(installTrace);
  ctx.at = await canvasMapper(app);
  await loadLevel(app, 'w1-01');
  const loaded = await app.evaluate(() => window.__threadbound.state().progress.melodies['w1-01']);
  check('an entry saved before timing loads with its notes and no times', JSON.stringify(loaded) === JSON.stringify({ notes: OLD, times: [] }), JSON.stringify(loaded));
  const { ended, trace } = await pokeStars(ctx, replayMs({ notes: OLD, times: [] }));
  const report = replayReport(trace, OLD.slice(1).map(() => STEP_S));
  check(`it replays at ${STEP_S} s +- ${GAP_TOLERANCE_S * 1000} ms, then the cadence`, ended && report.melody === OLD.length && report.worstGapError <= GAP_TOLERANCE_S && report.cadenceAfter, JSON.stringify(report));
}
