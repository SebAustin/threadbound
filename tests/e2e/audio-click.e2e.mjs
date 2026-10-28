// Helper for xr-spatial-audio.sh: one real click on a bare spot of the canvas, then a wait until
// sound runs again. IWSDK's AudioSystem suspends the audio context the synth shares with it when a
// session ends; the click's pointerdown resumes it (AudioUnlockSystem -> stringSynth.unlock).
// Returns the sound state before and after the click.
import { canvasMapper, click, waitFor } from './lib.mjs';

/** How long a resumed context may take to report 'running'. */
const RESUME_MS = 3000;

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const before = await app.evaluate(() => window.__threadbound.audio());
  const at = await canvasMapper(app);
  const box = await app.locator('canvas').first().boundingBox();
  // The canvas's left edge, halfway down: bare study, clear of the diorama, the ledge and IWER's Enter XR pill.
  await click(page, at({ x: 12, y: box.height / 2 }));
  await waitFor(app, () => window.__threadbound.audio() === 'running', RESUME_MS);
  return { before, after: await app.evaluate(() => window.__threadbound.audio()) };
}
