// Helper for xr-spatial-audio.sh: after leaving XR, idle until the virtual study's hum has been asked
// for, then one real click on a bare spot of the canvas and a wait until sound runs again. IWSDK's
// AudioSystem suspends the audio context the synth shares with it when a session ends; the click's
// pointerdown resumes it (AudioUnlockSystem -> stringSynth.unlock). A cue asked for while nobody is
// resuming must start no note: on a suspended context it would wait, and every waiting note would
// sound at once on the click. Returns the cues asked for while idle, the notes started on the
// suspended context meanwhile, and the sound state before and after the click.
import { canvasMapper, click, waitFor } from './lib.mjs';

/** How long a resumed context may take to report 'running'. */
const RESUME_MS = 3000;
/** One ambience interval (AMBIENCE_INTERVAL_SECONDS, 6 s, src/lib/soundCues.ts) plus slack. */
const IDLE_MS = 8000;

/** Collects cue names page-side across polls (each read drains the log), true once the hum is among them. */
const hummed = () => {
  window.__idleCues = [...(window.__idleCues ?? []), ...window.__threadbound.cueTrace().map((record) => record.name)];
  return window.__idleCues.includes('ambience');
};

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const startedBefore = await app.evaluate(() => {
    window.__idleCues = [];
    window.__threadbound.cueTrace();
    return window.__threadbound.voices().startedSuspended;
  });
  await waitFor(app, hummed, IDLE_MS);
  const idle = await app.evaluate(() => ({
    asked: window.__idleCues,
    started: window.__threadbound.voices().startedSuspended,
    sound: window.__threadbound.audio(),
  }));
  const at = await canvasMapper(app);
  const box = await app.locator('canvas').first().boundingBox();
  // The canvas's left edge, halfway down: bare study, clear of the diorama, the ledge and IWER's Enter XR pill.
  await click(page, at({ x: 12, y: box.height / 2 }));
  await waitFor(app, () => window.__threadbound.audio() === 'running', RESUME_MS);
  return {
    asked: idle.asked,
    startedSuspended: idle.started - startedBefore,
    before: idle.sound,
    after: await app.evaluate(() => window.__threadbound.audio()),
  };
}
