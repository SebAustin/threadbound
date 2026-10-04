// E2E (real input): the melody book. A solve saves the tune its drop played;
// poking the plaque's stars replays it, note for note. Unsolved levels stay quiet.
import { canvasMapper, checks, clickCanvas, freshSave, isComplete, loadLevel, plaqueElementAt, waitFor } from './lib.mjs';

/** Page-side helpers: count melody notes across polls (draining the cue log). */
const installCounter = () => {
  window.__melodyNotes = () => {
    window.__notes = (window.__notes ?? 0) + window.__threadbound.cues().filter((c) => c === 'melody').length;
    return window.__notes;
  };
};
const melodyNotes = () => window.__melodyNotes();
const resetNotes = () => {
  window.__threadbound.cues();
  window.__notes = 0;
};
/** Replay runs at 0.22 s per note, up to 16 notes. */
const REPLAY_MS = 6000;

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  const at = await canvasMapper(app);
  await app.evaluate(installCounter);
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'resetProgress' }));
  await waitFor(app, freshSave, 3000);

  await app.evaluate(() => {
    window.__threadbound.solve();
    window.__threadbound.dispatch({ type: 'drop' });
  });
  await waitFor(app, isComplete, 15000);
  const saved = await app.evaluate(() => window.__threadbound.state().progress.melodies['w1-01'] ?? []);
  check('a solve saves the melody its drop played', saved.length > 0 && saved.length <= 16, JSON.stringify(saved));
  const stored = await app.evaluate(() => localStorage.getItem('threadbound.progress.v1'));
  check('the melody book is saved with progress', (stored ?? '').includes('"melodies":{"w1-01":['), stored);

  // Let the solve's own replay finish, then poke the stars.
  await waitFor(app, (n) => window.__melodyNotes() >= n, REPLAY_MS, saved.length);
  await app.evaluate(resetNotes);
  await clickCanvas(page, app, at, await plaqueElementAt(app, 'hud-stars'));
  const replayed = await waitFor(app, (n) => window.__melodyNotes() >= n, REPLAY_MS, saved.length);
  check('poking the stars replays the tune, note for note', replayed && (await app.evaluate(melodyNotes)) === saved.length, `${await app.evaluate(melodyNotes)}/${saved.length}`);

  await loadLevel(app, 'w1-02');
  await app.evaluate(resetNotes);
  await clickCanvas(page, app, at, await plaqueElementAt(app, 'hud-stars'));
  check('an unsolved level has no tune to replay', !(await waitFor(app, () => window.__melodyNotes() > 0, 1500)));
  return results;
}
