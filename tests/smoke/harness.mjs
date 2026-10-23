// Shared production harness: plain Node + Playwright, with no dev server and no `npx @iwsdk/cli`.
// Every E2E under tests/e2e/ reads the DEV-only test hook (src/index.ts:49-57), so none of them can
// run against dist/. This module is the only copy of the production setup; tests/smoke/prod-smoke.mjs
// (the CI gate) and week 8 ticket 02's tests/e2e/prod-xr.mjs both compose it.
//
//   serve()   the target URL: SMOKE_URL when set (nothing is served), else a Vite preview of dist/
//             under /threadbound/, as GitHub Pages serves it.
//   inject()  headless Chromium at 1280x720 with IWER (the WebXR emulator) installed before any page
//             script, its device kept on window[DEVICE_GLOBAL] so each caller sets its own input mode
//             and head pose.
//   record()  everything the verdict (tests/smoke/verdict.mjs) needs, collected on the browser context
//             so worker requests count too, plus named screenshots and a console log in .tmp/<script>/.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleName, crossOriginUrls } from './verdict.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = join(ROOT, 'dist');
/** The path GitHub Pages serves the game under (https://sebaustin.github.io/threadbound/). */
export const BASE_PATH = '/threadbound/';
const PREVIEW_HOST = '127.0.0.1';
const PREVIEW_PORT = 4173;

/** Fixed so callers can measure canvas points once (ticket 02 measures Enter XR at this size). */
export const VIEWPORT = { width: 1280, height: 720 };
/** The emulated device lives at window[DEVICE_GLOBAL]. */
export const DEVICE_GLOBAL = 'iwerDevice';
/** IWER's UMD build: it defines window.IWER, so it can run as an init script before the app. */
const IWER_UMD = join(ROOT, 'node_modules', 'iwer', 'build', 'iwer.min.js');
/**
 * A runner with no GPU needs SwiftShader for WebGL, and recent Chrome no longer falls back to it on
 * its own. Used everywhere, so a local run renders the way CI does.
 */
export const CHROMIUM_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

/** Parses SMOKE_URL, failing fast on anything that isn't an absolute http(s) URL. */
function smokeUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`SMOKE_URL is not a URL: ${raw}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error(`SMOKE_URL must be http(s): ${raw}`);
  return url.href;
}

/**
 * The URL under test. With SMOKE_URL set it returns that and serves nothing; otherwise it previews
 * dist/ with `configFile: false`, so vite.config.ts and the IWSDK dev plugin never load.
 * @returns {Promise<{ url: string, previewed: boolean, close: () => Promise<void> }>}
 */
export async function serve() {
  if (process.env.SMOKE_URL) {
    return { url: smokeUrl(process.env.SMOKE_URL), previewed: false, close: async () => {} };
  }
  if (!existsSync(join(DIST, 'index.html'))) {
    throw new Error('dist/index.html is missing: run `NODE_ENV=production npm run build` first');
  }
  const { preview } = await import('vite');
  const server = await preview({
    configFile: false,
    root: ROOT,
    base: BASE_PATH,
    // No SPA fallback: like Pages, a missing file is a 404, not index.html served with status 200.
    appType: 'mpa',
    logLevel: 'warn',
    build: { outDir: DIST },
    preview: { host: PREVIEW_HOST, port: PREVIEW_PORT, strictPort: false, open: false },
  });
  const url = server.resolvedUrls?.local[0];
  if (!url) {
    await server.close();
    throw new Error('vite preview started but reported no local URL');
  }
  return { url, previewed: true, close: () => server.close() };
}

/** Runs in the page before any app script: the emulated Quest 3 replaces Chromium's own navigator.xr. */
function installDevice(globalName) {
  const device = new window.IWER.XRDevice(window.IWER.metaQuest3);
  // Chromium already exposes navigator.xr; without forceInstall IWER installs nothing.
  device.installRuntime({ forceInstall: true });
  window[globalName] = device;
}

/**
 * Headless Chromium with IWER injected. Close `browser` when done.
 * @returns {Promise<{ browser: import('playwright').Browser, context: import('playwright').BrowserContext, page: import('playwright').Page }>}
 */
export async function inject() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true, args: CHROMIUM_ARGS });
  try {
    const context = await browser.newContext({ viewport: VIEWPORT });
    await context.addInitScript({ path: IWER_UMD });
    await context.addInitScript(installDevice, DEVICE_GLOBAL);
    const page = await context.newPage();
    return { browser, context, page };
  } catch (err) {
    await browser.close();
    throw err;
  }
}

/**
 * Subscribes to the context (pages and their workers) and the page's workers. The returned log only
 * ever grows; `record()` hands out copies of it.
 */
function listen(context, page) {
  const log = {
    console: [],
    pageErrors: [],
    failedRequests: [],
    responses: [],
    requestUrls: [],
    workers: new Set(),
  };
  context.on('console', (msg) => log.console.push({ type: msg.type(), text: msg.text(), source: msg.worker()?.url() ?? '' }));
  context.on('weberror', (webError) => {
    const err = webError.error();
    log.pageErrors.push({ message: String(err), stack: err.stack ?? String(err) });
  });
  context.on('request', (req) => log.requestUrls.push(req.url()));
  context.on('requestfailed', (req) => log.failedRequests.push({ url: req.url(), error: req.failure()?.errorText ?? 'failed' }));
  context.on('response', (res) =>
    log.responses.push({ url: res.url(), status: res.status(), contentType: res.headers()['content-type'] ?? '' }),
  );
  page.on('worker', (worker) => {
    log.workers.add(worker);
    worker.on('close', () => log.workers.delete(worker));
  });
  return log;
}

/** The text of .tmp/<script>/console.log: every console message, page error and failed request. */
function consoleLogText(log, script, url) {
  const lines = [
    `# ${script} against ${url}`,
    ...log.console.map((m) => `[${m.type}]${m.source ? ` (worker ${m.source})` : ''} ${m.text}`),
    ...log.pageErrors.map((e) => `[pageerror] ${e.stack}`),
    ...log.failedRequests.map((r) => `[requestfailed] ${r.url} ${r.error}`),
    ...log.responses.filter((r) => r.status >= 400).map((r) => `[status ${r.status}] ${r.url}`),
  ];
  return `${lines.join('\n')}\n`;
}

/**
 * Starts collecting what the verdict needs. Call before `page.goto`.
 * @param {import('playwright').BrowserContext} context
 * @param {import('playwright').Page} page
 * @param {{ script: string, url: string }} options  `script` names the output folder .tmp/<script>/.
 * @returns {{
 *   outDir: string,
 *   result: () => import('./verdict.mjs').SmokeRecord,
 *   save: () => string,
 *   shot: (name: string) => Promise<string>,
 * }}
 */
export function record(context, page, { script, url }) {
  const outDir = join(ROOT, '.tmp', script);
  mkdirSync(outDir, { recursive: true });
  const log = listen(context, page);

  /** A plain snapshot for `verdict()`: copies, so later events don't change it. Take it before closing the browser. */
  const result = () => ({
    url,
    console: log.console.map(({ type, text }) => ({ type, text })),
    pageErrors: log.pageErrors.map((e) => e.message),
    failedRequests: log.failedRequests.map((r) => ({ ...r })),
    responses: log.responses.map((r) => ({ ...r })),
    workers: [...log.workers].map((w) => w.url()),
    bundle: bundleName(log.responses),
    crossOrigin: crossOriginUrls(log.requestUrls, url),
  });

  /** Writes .tmp/<script>/console.log and returns its path. */
  const save = () => {
    const path = join(outDir, 'console.log');
    writeFileSync(path, consoleLogText(log, script, url));
    return path;
  };

  /** Saves a full-page screenshot as .tmp/<script>/<name>.png and returns its path. */
  const shot = async (name) => {
    const path = join(outDir, `${name}.png`);
    await page.screenshot({ path });
    return path;
  };

  return { outDir, result, save, shot };
}
