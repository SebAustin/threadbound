// CI smoke for the production build (week 8 ticket 03). Runs after `NODE_ENV=production npm run build`
// in the deploy workflow, before the Pages upload, and locally as `npm run test:smoke`.
//
// It composes tests/smoke/harness.mjs and adds two checks of its own:
//   flat  from load to network idle, the canvas isn't blank;
//   XR    `offer: "always"` (iwsdk.config.json) makes IWSDK call navigator.xr.offerSession at startup.
//         The script grants that offer, switches IWER to hands, and asserts an alpha-blend
//         (immersive-ar) session that is still active 5 s later. It never clicks Enter XR: that click
//         and the level-1 solve belong to ticket 02's tests/e2e/prod-xr.mjs.
//
// Output: PASS/FAIL/NOTE lines (tests/smoke/verdict.mjs), exit code 1 on any FAIL, and the console
// log plus flat.png and xr.png in .tmp/prod-smoke/.

import { DEVICE_GLOBAL, inject, record, serve } from './harness.mjs';
import { verdict } from './verdict.mjs';

const SCRIPT = 'prod-smoke';
const LOAD_TIMEOUT_MS = 60_000;
/** How long the flat canvas may take to show more than one colour after network idle. */
const CANVAS_TIMEOUT_MS = 10_000;
const OFFER_TIMEOUT_MS = 20_000;
const SESSION_START_TIMEOUT_MS = 5_000;
/** The session must survive this long after it starts. */
const SESSION_HOLD_MS = 5_000;
const POLL_MS = 100;
/** Every 97th pixel (a prime stride, so rows don't alias) is plenty to tell a blank canvas apart. */
const PIXEL_STRIDE = 97;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const firstLine = (err) => String(err?.message ?? err).split('\n')[0];
const seconds = (ms) => `${ms / 1000} s`;

/** Polls `read` until `done(value)` or the timeout; returns the last value read. */
async function pollUntil(read, done, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let value = await read();
  while (!done(value) && Date.now() < deadline) {
    await sleep(POLL_MS);
    value = await read();
  }
  return value;
}

/** Counts the distinct colours in a screenshot of the app canvas, decoded in the page (no image library). */
async function canvasColours(page) {
  const png = await page.locator('canvas').first().screenshot({ timeout: CANVAS_TIMEOUT_MS });
  return page.evaluate(
    async ({ b64, stride }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const scratch = document.createElement('canvas');
      scratch.width = img.width;
      scratch.height = img.height;
      const ctx = scratch.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, img.width, img.height);
      const colours = new Set();
      for (let i = 0; i < data.length; i += 4 * stride) colours.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
      const [first] = colours;
      const only = first === undefined ? 'none' : `#${first.toString(16).padStart(6, '0')}`;
      return { colours: colours.size, size: `${img.width}x${img.height}`, only };
    },
    { b64: png.toString('base64'), stride: PIXEL_STRIDE },
  );
}

/** The WebGL renderer string, so a log shows whether SwiftShader or a GPU drew the frames. */
function webglRenderer(page) {
  return page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return 'no WebGL2 context';
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    return String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  });
}

/** Loads the page to network idle. `loaded` is false when the rest of the run has nothing to test. */
async function loadCheck(page, url) {
  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: LOAD_TIMEOUT_MS });
    const status = response?.status() ?? 0;
    return { check: { name: 'page loads', pass: status === 200, detail: `${url} → ${status}` }, loaded: status === 200 };
  } catch (err) {
    return { check: { name: 'page loads', pass: false, detail: `${url}: ${firstLine(err)}` }, loaded: false };
  }
}

async function flatChecks(page, rec) {
  const seen = await pollUntil(() => canvasColours(page), (c) => c.colours > 1, CANVAS_TIMEOUT_MS);
  await rec.shot('flat');
  return [
    {
      name: 'flat canvas is not blank',
      pass: seen.colours > 1,
      detail: seen.colours > 1 ? `${seen.colours} colours sampled on a ${seen.size} canvas` : `1 colour (${seen.only})`,
    },
    { name: 'WebGL renderer', note: await webglRenderer(page) },
  ];
}

async function offerCheck(page) {
  const offered = await pollUntil(
    () => page.evaluate((g) => Boolean(window[g]?.sessionOffered), DEVICE_GLOBAL),
    Boolean,
    OFFER_TIMEOUT_MS,
  );
  const detail = offered ? 'navigator.xr.offerSession is waiting' : `no offer within ${seconds(OFFER_TIMEOUT_MS)}`;
  return { name: 'IWSDK offered an XR session', pass: offered, detail };
}

/** Grants the offer, switches IWER to hands and starts watching the session for its end event. */
async function grantCheck(page) {
  await page.evaluate((g) => {
    const device = window[g];
    device.grantOfferedSession();
    device.primaryInputMode = 'hand';
  }, DEVICE_GLOBAL);
  const watchSession = (g) => {
    const session = window[g].activeSession;
    if (!session) return false;
    if (!window.__smokeSession) {
      window.__smokeSession = { session, startedAt: performance.now(), endedAt: null };
      session.addEventListener('end', () => (window.__smokeSession.endedAt = performance.now()));
    }
    return true;
  };
  const started = await pollUntil(() => page.evaluate(watchSession, DEVICE_GLOBAL), Boolean, SESSION_START_TIMEOUT_MS);
  const detail = started
    ? 'grantOfferedSession() started an immersive session'
    : `no active session ${seconds(SESSION_START_TIMEOUT_MS)} after grantOfferedSession()`;
  return { name: 'offered session granted', pass: started, detail };
}

async function blendCheck(page) {
  const blend = await page.evaluate(() => window.__smokeSession.session.environmentBlendMode);
  return { name: 'blend mode is alpha-blend (immersive-ar)', pass: blend === 'alpha-blend', detail: String(blend) };
}

/** After the hold: the same session is still running, on tracked hands. */
async function holdChecks(page) {
  const after = await page.evaluate((g) => {
    const { session, startedAt, endedAt } = window.__smokeSession;
    return {
      active: window[g].activeSession === session && endedAt === null,
      endedAfter: endedAt === null ? null : ((endedAt - startedAt) / 1000).toFixed(1),
      inputMode: window[g].primaryInputMode,
      hands: [...session.inputSources].filter((s) => s.hand).map((s) => s.handedness),
      inputs: session.inputSources.length,
    };
  }, DEVICE_GLOBAL);
  return [
    {
      name: `session still active after ${seconds(SESSION_HOLD_MS)}`,
      pass: after.active,
      detail: after.active ? 'no end event' : `session ended after ${after.endedAfter ?? '?'} s`,
    },
    {
      name: 'input is tracked hands',
      pass: after.inputMode === 'hand' && after.hands.length > 0 && after.hands.length === after.inputs,
      detail: `mode ${after.inputMode}; hand input sources: ${after.hands.join(', ') || 'none'} of ${after.inputs}`,
    },
  ];
}

/** Enters XR through the offer path, as `offer: "always"` lets a headset do, and holds the session. */
async function xrChecks(page, rec) {
  const offer = await offerCheck(page);
  if (!offer.pass) return [offer];
  const grant = await grantCheck(page);
  if (!grant.pass) return [offer, grant];
  const blend = await blendCheck(page);
  await sleep(SESSION_HOLD_MS);
  const held = await holdChecks(page);
  await rec.shot('xr');
  return [offer, grant, blend, ...held];
}

/** The page, flat and XR checks, in order; XR runs only on a page that loaded. */
async function runChecks(page, rec, url) {
  const load = await loadCheck(page, url);
  if (!load.loaded) return [load.check];
  return [load.check, ...(await flatChecks(page, rec)), ...(await xrChecks(page, rec))];
}

/** What the verdict gets when the browser never started: every built-in check then fails. */
const emptyRecord = (url) => ({
  url,
  console: [],
  pageErrors: [],
  failedRequests: [],
  responses: [],
  workers: [],
  bundle: null,
  crossOrigin: [],
});

async function main() {
  const startedAt = performance.now();
  const target = await serve();
  const where = target.previewed ? `vite preview of dist/ at ${target.url}` : `SMOKE_URL ${target.url} (no preview started)`;
  const checks = [{ name: 'target', note: where }];
  let browser;
  let rec;
  let result = emptyRecord(target.url);
  try {
    const injected = await inject();
    browser = injected.browser;
    rec = record(injected.context, injected.page, { script: SCRIPT, url: target.url });
    checks.push(...(await runChecks(injected.page, rec, target.url)));
  } catch (err) {
    checks.push({ name: 'smoke ran to the end', pass: false, detail: firstLine(err) });
  } finally {
    // Snapshot before closing: closing the browser ends every worker.
    if (rec) result = rec.result();
    await browser?.close();
    await target.close();
  }

  const { lines, exitCode, counts } = verdict(result, checks);
  for (const line of lines) console.log(line);
  const logPath = rec?.save();
  const elapsed = ((performance.now() - startedAt) / 1000).toFixed(1);
  console.log(`${SCRIPT}: ${counts.pass} PASS, ${counts.fail} FAIL, ${counts.note} NOTE in ${elapsed} s${logPath ? `; log ${logPath}` : ''}`);
  process.exitCode = exitCode;
}

main().catch((err) => {
  console.log(`FAIL smoke could not start — ${firstLine(err)}`);
  process.exitCode = 1;
});
