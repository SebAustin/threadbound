// E2E (real input): melodies climb (ADR 0004). Each level's stored solution is hung,
// then dropped twice by real chute clicks. Both drops play the same notes, at least
// three of them distinct, and each solve closes on exactly one cadence (three cues),
// counted until its replay has ended. Notes are captured once per rendered frame, so
// this compares two drops at the same frame rate and never expects an exact count.
import { canvasMapper, checks, click, loadLevel, waitFor } from './lib.mjs';

const LEVELS = ['w1-01', 'w1-03'];
const SOLVE_MS = 15000;
/** A replay of up to 16 notes with real gaps, after the cadence. */
const REPLAY_MS = 12000;

/** Page side: a cue trace kept across polls (every poll drains the shared log). */
const installTrace = () => {
  window.__trace = [];
  window.__collect = () => {
    window.__trace.push(...window.__threadbound.cueTrace());
    return window.__trace;
  };
};
const solved = () => {
  window.__collect();
  return window.__threadbound.state().status === 'complete';
};
const replayOver = () => {
  window.__collect();
  return !window.__threadbound.celebration().replaying;
};

/** One drop by a real click on the chute, followed until its celebration has finished. */
async function dropAndListen({ page, app, at }) {
  await app.evaluate(() => {
    window.__threadbound.cueTrace();
    window.__trace = [];
  });
  await click(page, at(await app.evaluate(() => window.__threadbound.chute())));
  const complete = await waitFor(app, solved, SOLVE_MS);
  const ended = complete && (await waitFor(app, replayOver, REPLAY_MS));
  return app.evaluate(
    ({ complete: c, ended: e }) => {
      const trace = window.__collect();
      return {
        complete: c,
        ended: e,
        notes: window.__threadbound.state().melody.notes,
        cadence: trace.filter((r) => r.name === 'cadence').length,
      };
    },
    { complete, ended },
  );
}

async function climbTwice(ctx, id) {
  const { app, check } = ctx;
  await loadLevel(app, id);
  await app.evaluate(() => window.__threadbound.solve());
  const first = await dropAndListen(ctx);
  const second = await dropAndListen(ctx);
  const detail = JSON.stringify({ first, second });
  check(`${id}: both real chute drops solve`, first.complete && second.complete, detail);
  check(`${id}: both drops play identical notes`, first.notes.length > 0 && JSON.stringify(first.notes) === JSON.stringify(second.notes), detail);
  check(`${id}: at least 3 distinct notes`, new Set(first.notes).size >= 3, JSON.stringify(first.notes));
  check(`${id}: each solve logs exactly 3 cadence cues by the end of its replay`, first.ended && second.ended && first.cadence === 3 && second.cadence === 3, `${first.cadence}, ${second.cadence}`);
}

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  const ctx = { page, app, check, at: await canvasMapper(app) };
  await app.evaluate(installTrace);
  for (const id of LEVELS) await climbTwice(ctx, id);
  return results;
}
