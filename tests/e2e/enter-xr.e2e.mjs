// Helper for tests/e2e/enter-xr.sh: one step of entering XR as a player would, chosen by STEP.
//   press  a real mouse press on the card's Enter XR, held 800 ms and drifting 3 px inside the button
//          (pmndrs only sends `click` for a release within 300 ms, so a long press used to do nothing)
//   key    focus the DOM #enter-xr and press Enter: the path that needs no canvas at all
//   state  where the player can enter XR now (lib.mjs entryState), polled until WANT=back holds
// Each step returns { ok, ... } for the shell script to read.
import { canvasMapper, clearOverCanvas, entryState, longPress, sleep, waitFor, welcomeElementAt } from './lib.mjs';

const OFFERED_TIMEOUT_MS = 5000;
const BACK_TIMEOUT_MS = 5000;
const POLL_MS = 150;

/** The card offers Enter XR in the browser view (its entryView has the button). */
const cardOffers = () => {
  const welcome = window.__threadbound.welcome();
  return Boolean(welcome?.visible && welcome.entry?.button);
};

async function press({ page, app }) {
  const offered = await waitFor(app, cardOffers, OFFERED_TIMEOUT_MS);
  const point = await welcomeElementAt(app, 'xr-button');
  if (!point) return { ok: false, offered, detail: 'no xr-button on the card' };
  await clearOverCanvas(app, point);
  const at = await canvasMapper(app);
  await longPress(page, at(point), { holdMs: 800, driftPx: 3 });
  return { ok: true, offered, at: [Math.round(point.x), Math.round(point.y)] };
}

async function key({ page, app }) {
  const button = app.locator('#enter-xr');
  try {
    await button.waitFor({ state: 'visible', timeout: OFFERED_TIMEOUT_MS });
  } catch {
    return { ok: false, detail: '#enter-xr never showed' };
  }
  await button.focus();
  const focused = await app.evaluate(() => document.activeElement?.id ?? null);
  await page.keyboard.press('Enter');
  return { ok: focused === 'enter-xr', focused };
}

/** Polls until the card and #enter-xr both offer Enter XR again outside a session. */
async function back({ app }) {
  const start = Date.now();
  let state = await app.evaluate(entryState);
  const isBack = (s) => s.session === null && s.card?.visible && s.card.button && s.domButton;
  while (!isBack(state) && Date.now() - start < BACK_TIMEOUT_MS) {
    await sleep(POLL_MS);
    state = await app.evaluate(entryState);
  }
  return { ok: Boolean(isBack(state)), state };
}

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const step = process.env.STEP;
  if (step === 'press') return press({ page, app });
  if (step === 'key') return key({ page, app });
  if (step === 'state') return back({ app });
  return { ok: false, detail: `unknown STEP ${step}` };
}
