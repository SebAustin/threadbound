// E2E (week 8 ticket 08): a browser without XR gets a clear line instead of a dead button, mouse
// play still works, and a launch that fails says so. The checks stub IWER's navigator.xr in the
// page (an own property shadows the method; deleting it restores IWER's) and dispatch
// `devicechange`, which the game answers by resolving the session mode again.
import {
  canvasMapper,
  checks,
  clearOverCanvas,
  drag,
  entryState,
  loadLevel,
  longPress,
  sleep,
  waitFor,
  welcomeElementAt,
} from './lib.mjs';
import { LAUNCH_FAILED_NOTE, NO_XR_NOTE } from './entry-notes.mjs';

/** Long enough for a launch to start a session if it were going to. */
const NO_SESSION_WAIT_MS = 1500;
const VIEW_TIMEOUT_MS = 3000;

/** Page function: this browser reports no immersive mode at all. */
const stubNoXR = () => {
  navigator.xr.isSessionSupported = async () => false;
  navigator.xr.dispatchEvent(new Event('devicechange'));
};
/** Page function: every session request is turned down, as a denied permission would be. */
const stubRefusal = () => {
  navigator.xr.requestSession = () => Promise.reject(new DOMException('turned down by no-xr.e2e.mjs', 'NotAllowedError'));
};
const unstub = () => {
  delete navigator.xr.isSessionSupported;
  delete navigator.xr.requestSession;
  navigator.xr.dispatchEvent(new Event('devicechange'));
};
const cardNote = (note) => window.__threadbound.welcome()?.entry?.note === note;
const cardOffers = () => window.__threadbound.welcome()?.entry?.button === true;

/** Console errors and page errors while `action` runs. */
async function errorsDuring(page, action) {
  const errors = [];
  const onConsole = (m) => m.type() === 'error' && errors.push(m.text());
  const onError = (e) => errors.push(String(e));
  page.on('console', onConsole);
  page.on('pageerror', onError);
  try {
    await action();
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onError);
  }
  return errors;
}

async function pressAt(page, app, point) {
  await clearOverCanvas(app, point);
  await longPress(page, (await canvasMapper(app))(point));
}

/** Without XR: the Quest Browser line, no button, a press that does nothing, mouse play intact. */
async function noXrChecks(page, app, check, buttonAt) {
  await app.evaluate(stubNoXR);
  await waitFor(app, cardNote, VIEW_TIMEOUT_MS, NO_XR_NOTE);
  const s = await app.evaluate(entryState);
  check('without XR the card shows the Quest Browser line and no Enter XR', s.card?.note === NO_XR_NOTE && s.card.button === false, JSON.stringify(s.card));
  check('without XR #boot shows the same line', s.boot === NO_XR_NOTE, String(s.boot));
  check('without XR #enter-xr is hidden', s.domButton === false, String(s.domButton));

  const errors = await errorsDuring(page, async () => {
    await pressAt(page, app, buttonAt);
    await sleep(NO_SESSION_WAIT_MS);
  });
  const session = await app.evaluate(() => window.__threadbound.room().blendMode);
  check('a press where Enter XR was starts no session and logs no console error', session === null && errors.length === 0, `session ${session}; errors: ${errors.join(' | ') || 'none'}`);

  const at = await canvasMapper(app);
  const [a, b] = await app.evaluate(() => window.__threadbound.pegs());
  await drag(page, at(a), at(b));
  const made = await waitFor(app, () => window.__threadbound.state().threads.length === 1, VIEW_TIMEOUT_MS);
  check('a real mouse drag from a to b on level 1 still makes the thread', made, `pegs a (${Math.round(a.x)}, ${Math.round(a.y)}) and b (${Math.round(b.x)}, ${Math.round(b.y)})`);

  await app.evaluate(unstub);
  const back = await waitFor(app, cardOffers, VIEW_TIMEOUT_MS);
  const after = await app.evaluate(entryState);
  check('removing the stub brings Enter XR back on the card and as #enter-xr', back && after.domButton && after.card?.note === '', JSON.stringify(after));
}

/** A launch that the browser turns down: the retry line, the button stays, no session. */
async function refusalChecks(page, app, check) {
  await app.evaluate(stubRefusal);
  try {
    const point = await welcomeElementAt(app, 'xr-button');
    if (point) await pressAt(page, app, point);
    const noted = await waitFor(app, cardNote, VIEW_TIMEOUT_MS, LAUNCH_FAILED_NOTE);
    const s = await app.evaluate(entryState);
    check(
      'a turned-down launch shows the retry line, keeps Enter XR and starts no session',
      Boolean(point) && noted && s.session === null && s.card?.button === true && s.domButton && s.boot === LAUNCH_FAILED_NOTE,
      JSON.stringify(s),
    );
  } finally {
    await app.evaluate(unstub);
  }
}

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  await loadLevel(app, 'w1-01');
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'restart' }));
  const offered = await waitFor(app, cardOffers, VIEW_TIMEOUT_MS);
  const buttonAt = await welcomeElementAt(app, 'xr-button');
  check('the card offers Enter XR before the stub', offered && Boolean(buttonAt), JSON.stringify(buttonAt));
  if (!buttonAt) return results;
  await noXrChecks(page, app, check, buttonAt);
  await refusalChecks(page, app, check);
  // Leave level 1 as it was found: no threads.
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'restart' }));
  return results;
}
