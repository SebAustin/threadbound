// Helper for tests/e2e/xr-guest.sh: moves the app frame between guest play and the plain URL.
// SEED=1 first writes guest-play.e2e.mjs's exact save (levels 1-3 solved, slow motion on, the diorama
// one step up). Then the frame navigates to SEARCH ('?fresh=1', or '' for the plain URL) with
// lib.mjs's navigateApp. CLEAN=1, on the new page, resets progress, slow motion and the offset for the
// scripts after this one (guest-play's cleanUp). Returns the new page's `location.search` (null if it
// never came up), whether that cleanup landed (`cleaned`), and both saved values as stored before it.
import { navigateApp, waitFor } from './lib.mjs';
import { KEYS, SEED, cleanUp, cleanedUp } from './guest-play.e2e.mjs';

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  if (process.env.SEED === '1') {
    await app.evaluate(([keys, values]) => keys.forEach((key, i) => localStorage.setItem(key, values[i])), [KEYS, SEED]);
  }
  const search = await navigateApp(app, process.env.SEARCH ?? '');
  const [savedProgress, savedSettings] = await app.evaluate((keys) => keys.map((key) => localStorage.getItem(key)), KEYS);
  let cleaned = false;
  if (search !== null && process.env.CLEAN === '1') {
    await app.evaluate(cleanUp);
    cleaned = await waitFor(app, cleanedUp, 3000);
  }
  return { search, cleaned, savedProgress, savedSettings };
}
