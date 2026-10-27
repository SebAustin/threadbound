// E2E (real input): the melody book. A solve saves the tune its drop played, with when
// each note sounded; poking the plaque's stars replays it note for note with that timing,
// then closes on the cadence. An entry saved before timing replays at the old fixed step.
// Unsolved levels stay quiet. Ticket 15's visual caption: each replayed note pulses one of
// the stars, in step with the sound (never more than one pulse ahead of the melody cues).
// Ticket 14: the settings face plays the whole book, each tune as its stars replay it, 0.8 s apart; a
// second pinch stops it, and with the book empty the control hides.
import { canvasMapper, checks, click, clickCanvas, freshSave, hookReady, isComplete, loadLevel, plaqueElementAt, sleep, waitFor } from './lib.mjs';

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
/** Mirrors BOOK_REST_SECONDS in src/lib/melodyBook.ts: the rest after one tune's cadence before the next. */
const BOOK_REST_S = 0.8;
/** Mirrors CADENCE_HZ in src/lib/melody.ts (C5 E5 G5), rounded to 0.1 Hz. */
const CADENCE = [523.3, 659.3, 784.0];

/**
 * Page side: a cue trace kept across polls (every poll drains the shared log), and at
 * each poll the star pulses since the reset against the melody cues heard so far.
 */
const installTrace = () => {
  window.__trace = [];
  window.__pulsePolls = [];
  window.__pulsesAtReset = window.__threadbound.captions().starPulses;
  window.__collect = () => {
    window.__trace.push(...window.__threadbound.cueTrace());
    const pulses = window.__threadbound.captions().starPulses - window.__pulsesAtReset;
    window.__pulsePolls.push({ pulses, melody: window.__trace.filter((r) => r.name === 'melody').length });
    return window.__trace;
  };
};
const resetTrace = () => {
  window.__threadbound.cueTrace();
  window.__trace = [];
  window.__pulsePolls = [];
  window.__pulsesAtReset = window.__threadbound.captions().starPulses;
};
const pulseReport = () => ({ polls: window.__pulsePolls, total: window.__threadbound.captions().starPulses - window.__pulsesAtReset });
const replayOver = () => {
  window.__collect();
  return !window.__threadbound.celebration().replaying;
};

/** How long a stars replay of `entry` lasts (lead-in, its notes, the beat and the strum), plus slack. */
function replayMs({ notes, times }) {
  const span = times.length === notes.length && notes.length > 0 ? times[times.length - 1] - times[0] : STEP_S * notes.length;
  return Math.round((STEP_S + span + STEP_S + 2 * STRUM_S) * 1000) + REPLAY_SLACK_MS;
}

/** Pokes the stars and returns the trace of the replay, and its star pulses, once it has finished. */
async function pokeStars({ page, app, at }, timeoutMs) {
  await app.evaluate(resetTrace);
  await clickCanvas(page, app, at, await plaqueElementAt(app, 'hud-stars'));
  await waitFor(app, () => window.__collect().length > 0, 2000);
  const ended = await waitFor(app, replayOver, timeoutMs);
  return { ended, trace: await app.evaluate(() => window.__collect()), pulses: await app.evaluate(pulseReport) };
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
  await playAllBook(ctx, saved);
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

/** Poking the stars replays every saved note with its saved gaps, then the cadence; each note pulses a star. */
async function starsReplayKeepsTiming(ctx, saved) {
  const { ended, trace, pulses } = await pokeStars(ctx, replayMs(saved));
  const wantGaps = saved.times.slice(1).map((t, i) => t - saved.times[i]);
  const report = replayReport(trace, wantGaps);
  const detail = JSON.stringify({ ...report, want: wantGaps.map((g) => g.toFixed(3)).join(' ') });
  ctx.check('poking the stars replays the tune, note for note', ended && report.melody === saved.notes.length, detail);
  ctx.check(`the replayed gaps match the saved times within ${GAP_TOLERANCE_S * 1000} ms`, report.melody > 1 && report.worstGapError <= GAP_TOLERANCE_S, detail);
  ctx.check('the replay closes on 3 cadence cues after its last note', report.cadenceAfter, detail);
  const pulseDetail = JSON.stringify({ saved: saved.notes.length, total: pulses.total, polls: pulses.polls.length });
  ctx.check('the stars pulse exactly once per saved note (the cadence pulses none)', ended && pulses.total === saved.notes.length, pulseDetail);
  const ahead = pulses.polls.filter((p) => p.pulses > p.melody + 1);
  ctx.check('at every poll the pulses are at most one ahead of the melody cues', pulses.polls.length > 1 && ahead.length === 0, ahead.length ? JSON.stringify(ahead.slice(0, 3)) : pulseDetail);
}

async function unsolvedStaysQuiet({ page, app, at, check }) {
  await loadLevel(app, 'w1-02');
  await app.evaluate(resetTrace);
  await clickCanvas(page, app, at, await plaqueElementAt(app, 'hud-stars'));
  check('an unsolved level has no tune to replay', !(await waitFor(app, () => window.__collect().some((r) => r.name === 'melody' || r.name === 'cadence'), 1500)));
  const { total } = await app.evaluate(pulseReport);
  check('and pinching its stars pulses nothing', total === 0, `${total} pulses`);
}

/** Page function: the settings face's play-all as rendered. */
const playAll = () => {
  const p = window.__threadbound.plaque();
  return { label: p?.playAllLabel ?? null, shown: p?.playAllShown ?? null };
};

/** The trace split into tunes: each tune's melody cues, then its cadence cues (C5 E5 G5 closes it). */
function bookTunes(trace) {
  const tunes = [];
  let current = { melody: [], cadence: [] };
  for (const record of trace) {
    if (record.name === 'melody') {
      if (current.cadence.length > 0) {
        tunes.push(current);
        current = { melody: [], cadence: [] };
      }
      current.melody.push(record);
    }
    if (record.name === 'cadence') current.cadence.push(record);
  }
  if (current.melody.length || current.cadence.length) tunes.push(current);
  return tunes;
}

/** Solves w1-02 too, opens the settings face and pinches "Play all (2)": both tunes play, in order, 0.8 s apart. */
async function playWholeBook(ctx, saved) {
  const { page, app, at, check } = ctx;
  await app.evaluate(() => {
    window.__threadbound.solve();
    window.__threadbound.dispatch({ type: 'drop' });
  });
  await waitFor(app, isComplete, 15000);
  const second = await app.evaluate(() => window.__threadbound.state().progress.melodies['w1-02'] ?? { notes: [], times: [] });
  await waitFor(app, replayOver, replayMs(second));
  await click(page, at(await app.evaluate(() => window.__threadbound.button('settings'))));
  await waitFor(app, () => window.__threadbound.plaque()?.face === 'settings', 2000);
  const control = await plaqueElementAt(app, 'set-play-all');
  const slow = await plaqueElementAt(app, 'set-slow');
  const before = await app.evaluate(playAll);
  check('the settings face offers "Play all (2)", on one line like Slow-mo', before.label === 'Play all (2)' && before.shown === true && Math.abs((control?.height ?? 0) - (slow?.height ?? -1)) < 1e-4, JSON.stringify({ before, height: control?.height, slowHeight: slow?.height }));
  await app.evaluate(resetTrace);
  await clickCanvas(page, app, at, control);
  const playing = await waitFor(app, () => window.__threadbound.plaque()?.playAllLabel === 'Stop', 2000);
  const ended = await waitFor(app, replayOver, replayMs(saved) + replayMs(second) + BOOK_REST_S * 1000);
  const trace = await app.evaluate(() => window.__collect());
  return { playing, ended, trace, want: saved.notes.length + second.notes.length, counts: [saved.notes.length, second.notes.length] };
}

/** The book plays both tunes: every saved note, each tune closing on C5 E5 G5, the second 0.8 s after the first's cadence. */
async function playAllBook(ctx, saved) {
  const { page, app, at, check } = ctx;
  const { playing, ended, trace, want, counts } = await playWholeBook(ctx, saved);
  const melody = trace.filter((r) => r.name === 'melody').length;
  check('pinching it plays the book: the melody cues equal both entries\' notes summed', playing && ended && melody === want, JSON.stringify({ melody, want, counts }));
  const tunes = bookTunes(trace);
  const closes = tunes.map((t) => t.cadence.map((r) => Math.round(r.hz * 10) / 10));
  check('each tune ends on its cadence (C5 E5 G5)', tunes.length === 2 && closes.every((c) => JSON.stringify(c) === JSON.stringify(CADENCE)) &&
    tunes.every((t, i) => t.melody.length === counts[i]), JSON.stringify({ closes, melody: tunes.map((t) => t.melody.length) }));
  const rest = tunes.length === 2 ? tunes[1].melody[0].at - tunes[0].cadence[tunes[0].cadence.length - 1].at : -1;
  check('the second tune starts at least 0.8 s after the first one\'s cadence', rest >= BOOK_REST_S, `${rest.toFixed(3)} s`);
  check('the control reads "Play all (2)" again once the book is over', (await app.evaluate(playAll)).label === 'Play all (2)', JSON.stringify(await app.evaluate(playAll)));

  await app.evaluate(resetTrace);
  await clickCanvas(page, app, at, await plaqueElementAt(app, 'set-play-all'));
  await waitFor(app, () => window.__collect().some((r) => r.name === 'melody'), 3000);
  const label = (await app.evaluate(playAll)).label;
  await clickCanvas(page, app, at, await plaqueElementAt(app, 'set-play-all'));
  const stopped = await waitFor(app, () => !window.__threadbound.celebration().replaying, 2000);
  const heard = (await app.evaluate(() => window.__collect())).filter((r) => r.name === 'melody').length;
  // Listen on past where the next note was due: nothing more may sound.
  await sleep(1500);
  const later = (await app.evaluate(() => window.__collect())).filter((r) => r.name === 'melody').length;
  check('while it plays the control reads "Stop", and Stop mid-play ends the notes', label === 'Stop' && stopped && heard > 0 && heard < want && later === heard && (await app.evaluate(playAll)).label === 'Play all (2)', JSON.stringify({ label, heard, later, want }));

  await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
  await waitFor(app, freshSave, 3000);
  const empty = await waitFor(app, () => window.__threadbound.plaque()?.playAllShown === false, 2000);
  check('after resetProgress the book is empty and the toggle is hidden', empty, JSON.stringify(await app.evaluate(playAll)));
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
