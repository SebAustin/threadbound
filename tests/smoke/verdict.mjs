// Pure verdict for the production smoke scripts: a `record()` result (tests/smoke/harness.mjs)
// plus the caller's own checks become PASS, FAIL and NOTE lines in the tests/e2e/run.sh style.
// No I/O here, so tests/unit/smokeVerdict.test.ts covers every rule.
//
// There is deliberately no ignore list. An entry added later needs a stated reason and a ticket.

/**
 * @typedef {{ url: string, status: number, contentType: string }} ResponseRecord
 * @typedef {{
 *   url: string,
 *   console: { type: string, text: string }[],
 *   pageErrors: string[],
 *   failedRequests: { url: string, error: string }[],
 *   responses: ResponseRecord[],
 *   workers: string[],
 *   bundle: string | null,
 *   crossOrigin: string[],
 * }} SmokeRecord
 * @typedef {{ name: string, pass: boolean, detail?: string } | { name: string, note: string }} CallerCheck
 * @typedef {{ kind: 'PASS' | 'FAIL' | 'NOTE', name: string, detail: string }} Line
 */

/** Files the production build must serve with status 200, matched on the URL path. */
export const REQUIRED_FILES = [
  { label: 'scenes/main.iwsdk.scene.json', pattern: /\/scenes\/main\.iwsdk\.scene\.json$/ },
  { label: 'ui/welcome.uikitml', pattern: /\/ui\/welcome\.uikitml$/ },
  { label: 'ui/hud.uikitml', pattern: /\/ui\/hud\.uikitml$/ },
  { label: 'ui/ledge.uikitml', pattern: /\/ui\/ledge\.uikitml$/ },
  // Created at node_modules/@iwsdk/core/dist/physics/physics-transport.js:105.
  { label: 'the physics worker (physics-worker-*.js)', pattern: /\/physics-worker-[^/]+\.js$/ },
  { label: 'HavokPhysics-*.wasm', pattern: /\/HavokPhysics-[^/]+\.wasm$/ },
];

const WASM_TYPE = 'application/wasm';
/** Longest single item (message or URL) quoted in a detail. */
const MAX_ITEM_CHARS = 240;
const BUNDLE_PATTERN = /\/(assets\/index-[^/]+\.js)$/;

/** One item of a detail: on a single line (run.sh prints one line per check) and capped in length. */
const clip = (text) => {
  const flat = String(text).replace(/\s*\n\s*/g, ' / ');
  return flat.length > MAX_ITEM_CHARS ? `${flat.slice(0, MAX_ITEM_CHARS)}…` : flat;
};
/** Joins detail items, each listed once: a retried fetch fails the same way twice. */
const list = (items) => [...new Set(items)].join(' | ');
const pathOf = (url) => {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
};
const mediaType = (contentType) => (contentType ?? '').split(';')[0].trim().toLowerCase();

/** True for an http(s) URL on another origin than `pageUrl`. blob: and data: URLs stay local. */
export function isCrossOrigin(url, pageUrl) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  return parsed.origin !== new URL(pageUrl).origin;
}

/** Unique cross-origin request URLs, in first-seen order. */
export function crossOriginUrls(urls, pageUrl) {
  return [...new Set(urls.filter((url) => isCrossOrigin(url, pageUrl)))];
}

/** The served `assets/index-*.js`, relative to the base path, or null. */
export function bundleName(responses) {
  for (const { url } of responses) {
    const match = BUNDLE_PATTERN.exec(pathOf(url));
    if (match) return match[1];
  }
  return null;
}

/** @returns {Line} */
const line = (kind, name, detail = '') => ({ kind, name, detail });
const passFail = (name, pass, passDetail, failDetail) =>
  pass ? line('PASS', name, passDetail) : line('FAIL', name, failDetail);

function consoleErrors(rec) {
  const errors = rec.console.filter((m) => m.type === 'error').map((m) => clip(m.text));
  return passFail('no console errors', errors.length === 0, '', `${errors.length} error(s): ${list(errors)}`);
}

function pageErrors(rec) {
  const errors = rec.pageErrors.map(clip);
  return passFail('no page errors', errors.length === 0, '', `${errors.length} error(s): ${list(errors)}`);
}

function failedSameOrigin(rec) {
  const failed = [
    ...rec.failedRequests.filter((r) => !isCrossOrigin(r.url, rec.url)).map((r) => `${clip(r.url)} (${r.error})`),
    ...rec.responses.filter((r) => r.status >= 400 && !isCrossOrigin(r.url, rec.url)).map((r) => `${clip(r.url)} (${r.status})`),
  ];
  return passFail('no failed same-origin requests', failed.length === 0, '', list(failed));
}

function runningWorker(rec) {
  return passFail('a worker is running', rec.workers.length > 0, list(rec.workers.map(clip)), 'no worker running');
}

function requiredFile(rec, { label, pattern }) {
  const name = `200 for ${label}`;
  const hits = rec.responses.filter((r) => pattern.test(pathOf(r.url)));
  if (hits.length === 0) return line('FAIL', name, 'never requested');
  const bad = hits.filter((r) => r.status !== 200);
  return passFail(name, bad.length === 0, clip(hits[0].url), list(bad.map((r) => `${clip(r.url)} → ${r.status}`)));
}

function wasmType(rec) {
  const name = `wasm served as ${WASM_TYPE}`;
  const wasm = rec.responses.filter((r) => pathOf(r.url).endsWith('.wasm'));
  if (wasm.length === 0) return line('FAIL', name, 'no .wasm response seen');
  const bad = wasm.filter((r) => mediaType(r.contentType) !== WASM_TYPE);
  return passFail(
    name,
    bad.length === 0,
    list(wasm.map((r) => clip(r.url))),
    list(bad.map((r) => `${clip(r.url)} served as ${mediaType(r.contentType) || 'no content type'}`)),
  );
}

function callerLine(check) {
  if (typeof check.note === 'string') return line('NOTE', check.name, clip(check.note));
  if (typeof check.pass === 'boolean') return line(check.pass ? 'PASS' : 'FAIL', check.name, clip(check.detail ?? ''));
  return line('FAIL', check.name, 'malformed check: it needs a boolean pass or a note');
}

function notes(rec) {
  const failures = new Map(rec.failedRequests.map((r) => [r.url, r.error]));
  const crossOrigin = rec.crossOrigin.length
    ? rec.crossOrigin.map((url) =>
        line('NOTE', 'cross-origin request', failures.has(url) ? `${url} (failed: ${failures.get(url)})` : url),
      )
    : [line('NOTE', 'cross-origin requests', 'none')];
  return [line('NOTE', 'bundle', rec.bundle ?? 'no assets/index-*.js served'), ...crossOrigin];
}

const format = ({ kind, name, detail }) => `${kind} ${name}${detail ? ` — ${detail}` : ''}`;

/**
 * Turns a record plus the caller's checks into printable lines and an exit code (1 on any FAIL).
 * @param {SmokeRecord} rec
 * @param {CallerCheck[]} [checks]
 */
export function verdict(rec, checks = []) {
  const all = [
    consoleErrors(rec),
    pageErrors(rec),
    failedSameOrigin(rec),
    runningWorker(rec),
    ...REQUIRED_FILES.map((file) => requiredFile(rec, file)),
    wasmType(rec),
    ...checks.map(callerLine),
    ...notes(rec),
  ];
  const count = (kind) => all.filter((l) => l.kind === kind).length;
  const counts = { pass: count('PASS'), fail: count('FAIL'), note: count('NOTE') };
  return { lines: all.map(format), exitCode: counts.fail > 0 ? 1 : 0, counts };
}
