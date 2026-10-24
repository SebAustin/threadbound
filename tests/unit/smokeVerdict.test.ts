import { describe, expect, test } from 'vitest';
import { bundleName, crossOriginUrls, verdict } from '../smoke/verdict.mjs';

const BASE = 'http://127.0.0.1:4173/threadbound/';
const WASM = `${BASE}assets/HavokPhysics-Qr5tUv.wasm`;
const WORKER = `${BASE}assets/physics-worker-Xy9Zab.js`;
const SCENE = `${BASE}scenes/main.iwsdk.scene.json`;
const WELCOME = `${BASE}ui/welcome.uikitml`;
const HUD = `${BASE}ui/hud.uikitml`;
const LEDGE = `${BASE}ui/ledge.uikitml`;
const HAND = 'https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/generic-hand/left.glb';

const ok = (url: string, contentType: string) => ({ url, status: 200, contentType });

/** What `record()` returns for a production run with nothing wrong. */
function cleanRecord() {
  return {
    url: BASE,
    console: [
      { type: 'log', text: '[Threadbound] ready' },
      { type: 'warning', text: 'a warning is not an error' },
    ],
    pageErrors: [] as string[],
    failedRequests: [] as { url: string; error: string }[],
    responses: [
      ok(BASE, 'text/html'),
      ok(`${BASE}assets/index-AbC123.js`, 'text/javascript'),
      ok(SCENE, 'application/json'),
      ok(WELCOME, 'application/octet-stream'),
      ok(HUD, 'application/octet-stream'),
      ok(LEDGE, 'application/octet-stream'),
      ok(WORKER, 'text/javascript'),
      ok(WASM, 'application/wasm'),
    ],
    workers: [WORKER],
    bundle: 'assets/index-AbC123.js',
    crossOrigin: [] as string[],
  };
}

const fails = (lines: string[]) => lines.filter((l) => l.startsWith('FAIL '));
const notes = (lines: string[]) => lines.filter((l) => l.startsWith('NOTE '));

describe('verdict: a production run becomes PASS, FAIL and NOTE lines', () => {
  test('a clean record passes every built-in check with exit code 0', () => {
    const { lines, exitCode } = verdict(cleanRecord());
    expect(fails(lines)).toEqual([]);
    expect(exitCode).toBe(0);
    for (const name of [
      'no console errors',
      'no page errors',
      'no failed same-origin requests',
      'a worker is running',
      '200 for scenes/main.iwsdk.scene.json',
      '200 for ui/welcome.uikitml',
      '200 for ui/hud.uikitml',
      '200 for ui/ledge.uikitml',
      '200 for the physics worker (physics-worker-*.js)',
      '200 for HavokPhysics-*.wasm',
      'wasm served as application/wasm',
    ]) {
      expect(lines.some((l) => l.startsWith(`PASS ${name}`)), name).toBe(true);
    }
  });

  test('the bundle name is a NOTE, not a FAIL', () => {
    const { lines, exitCode } = verdict(cleanRecord());
    expect(notes(lines)).toContain('NOTE bundle — assets/index-AbC123.js');
    expect(exitCode).toBe(0);
  });

  test('a cross-origin request is a NOTE naming its URL, not a FAIL', () => {
    const rec = { ...cleanRecord(), crossOrigin: [HAND] };
    const { lines, exitCode } = verdict(rec);
    expect(notes(lines)).toContain(`NOTE cross-origin request — ${HAND}`);
    expect(fails(lines)).toEqual([]);
    expect(exitCode).toBe(0);
  });

  test('a failed cross-origin request stays a NOTE but says it failed', () => {
    const rec = { ...cleanRecord(), crossOrigin: [HAND], failedRequests: [{ url: HAND, error: 'net::ERR_TIMED_OUT' }] };
    const { lines, exitCode } = verdict(rec);
    expect(notes(lines)).toContain(`NOTE cross-origin request — ${HAND} (failed: net::ERR_TIMED_OUT)`);
    expect(exitCode).toBe(0);
  });

  test("a caller's { name, note } check prints a NOTE line and leaves the exit code at 0", () => {
    const { lines, exitCode } = verdict(cleanRecord(), [{ name: 'WebGL renderer', note: 'SwiftShader' }]);
    expect(notes(lines)).toContain('NOTE WebGL renderer — SwiftShader');
    expect(exitCode).toBe(0);
  });

  test("a caller's passing check prints PASS with its detail", () => {
    const { lines, exitCode } = verdict(cleanRecord(), [{ name: 'flat canvas is not blank', pass: true, detail: '214 colours' }]);
    expect(lines).toContain('PASS flat canvas is not blank — 214 colours');
    expect(exitCode).toBe(0);
  });

  test('the counts add up to the lines printed', () => {
    const { lines, counts } = verdict(cleanRecord(), [
      { name: 'x', pass: false, detail: 'y' },
      { name: 'n', note: 'm' },
    ]);
    expect(counts.pass + counts.fail + counts.note).toBe(lines.length);
    expect(counts.fail).toBe(1);
  });

  test('a caller check with neither pass nor note fails loudly', () => {
    const { lines, exitCode } = verdict(cleanRecord(), [{ name: 'half-written check' } as never]);
    expect(fails(lines)).toEqual(['FAIL half-written check — malformed check: it needs a boolean pass or a note']);
    expect(exitCode).toBe(1);
  });

  test('a multi-line error stays on its one line', () => {
    const rec = { ...cleanRecord(), pageErrors: ['Error: Failed to parse UIKitML hud-plaque:\nUnclosed <style> block. at 5:0'] };
    const { lines } = verdict(rec);
    expect(lines.every((l) => !l.includes('\n'))).toBe(true);
    expect(fails(lines)).toEqual(['FAIL no page errors — 1 error(s): Error: Failed to parse UIKitML hud-plaque: / Unclosed <style> block. at 5:0']);
  });

  test('a fault seen twice (a retried fetch) is listed once', () => {
    const rec = { ...cleanRecord(), responses: [...cleanRecord().responses, ok(WASM, 'application/wasm')].map((r) => (r.url === WASM ? { ...r, status: 404 } : r)) };
    const { lines } = verdict(rec);
    expect(fails(lines)).toContain(`FAIL 200 for HavokPhysics-*.wasm — ${WASM} → 404`);
  });

  test('the record it is given is not changed', () => {
    const rec = cleanRecord();
    const before = JSON.stringify(rec);
    verdict(rec, [{ name: 'n', note: 'm' }]);
    expect(JSON.stringify(rec)).toBe(before);
  });
});

describe('verdict: each fault fails with exit code 1 and names the URL or message', () => {
  const withStatus = (url: string, status: number) => (r: { url: string }) =>
    r.url === url ? { ...r, status, contentType: 'text/html' } : r;

  const cases: [string, (rec: ReturnType<typeof cleanRecord>) => object, string, string][] = [
    [
      'a console error',
      (rec) => ({ ...rec, console: [...rec.console, { type: 'error', text: 'Failed to parse ui/hud.uikitml: unexpected end' }] }),
      'no console errors',
      'Failed to parse ui/hud.uikitml: unexpected end',
    ],
    [
      'a page error',
      (rec) => ({ ...rec, pageErrors: ['TypeError: Cannot read properties of undefined (reading "plaque")'] }),
      'no page errors',
      'TypeError: Cannot read properties of undefined (reading "plaque")',
    ],
    [
      'a failed same-origin request',
      (rec) => ({ ...rec, failedRequests: [{ url: `${BASE}assets/chunk-9.js`, error: 'net::ERR_ABORTED' }] }),
      'no failed same-origin requests',
      `${BASE}assets/chunk-9.js (net::ERR_ABORTED)`,
    ],
    [
      'a same-origin response with an error status',
      (rec) => ({ ...rec, responses: [...rec.responses, { url: `${BASE}missing.png`, status: 404, contentType: 'text/plain' }] }),
      'no failed same-origin requests',
      `${BASE}missing.png (404)`,
    ],
    ['a 404 for the wasm', (rec) => ({ ...rec, responses: rec.responses.map(withStatus(WASM, 404)) }), '200 for HavokPhysics-*.wasm', `${WASM} → 404`],
    [
      'a 404 for the scene JSON',
      (rec) => ({ ...rec, responses: rec.responses.map(withStatus(SCENE, 404)) }),
      '200 for scenes/main.iwsdk.scene.json',
      `${SCENE} → 404`,
    ],
    ['a 404 for welcome.uikitml', (rec) => ({ ...rec, responses: rec.responses.map(withStatus(WELCOME, 404)) }), '200 for ui/welcome.uikitml', `${WELCOME} → 404`],
    ['a 404 for hud.uikitml', (rec) => ({ ...rec, responses: rec.responses.map(withStatus(HUD, 404)) }), '200 for ui/hud.uikitml', `${HUD} → 404`],
    ['a 404 for ledge.uikitml', (rec) => ({ ...rec, responses: rec.responses.map(withStatus(LEDGE, 404)) }), '200 for ui/ledge.uikitml', `${LEDGE} → 404`],
    [
      'a 500 for the physics worker',
      (rec) => ({ ...rec, responses: rec.responses.map(withStatus(WORKER, 500)) }),
      '200 for the physics worker (physics-worker-*.js)',
      `${WORKER} → 500`,
    ],
    [
      'a required file never requested',
      (rec) => ({ ...rec, responses: rec.responses.filter((r) => r.url !== HUD) }),
      '200 for ui/hud.uikitml',
      'never requested',
    ],
    [
      'a wasm served as anything but application/wasm',
      (rec) => ({ ...rec, responses: rec.responses.map((r) => (r.url === WASM ? { ...r, contentType: 'text/html; charset=utf-8' } : r)) }),
      'wasm served as application/wasm',
      `${WASM} served as text/html`,
    ],
    ['no worker', (rec) => ({ ...rec, workers: [] }), 'a worker is running', 'no worker running'],
  ];

  test.each(cases)('%s', (_label, mutate, checkName, needle) => {
    const { lines, exitCode } = verdict(mutate(cleanRecord()) as never);
    const failed = fails(lines).find((l) => l.startsWith(`FAIL ${checkName} — `));
    expect(failed, lines.join('\n')).toBeDefined();
    expect(failed).toContain(needle);
    expect(exitCode).toBe(1);
  });

  test.each([
    ['a one-colour canvas', { name: 'flat canvas is not blank', pass: false, detail: '1 colour (#000000)' }],
    ['no session', { name: 'offered session granted', pass: false, detail: 'no active session 5 s after grantOfferedSession()' }],
    ['the wrong blend mode', { name: 'blend mode is alpha-blend', pass: false, detail: 'opaque' }],
    ['a session that ended', { name: 'session still active after 5 s', pass: false, detail: 'session ended after 2.1 s' }],
  ])('a failed caller check: %s', (_label, check) => {
    const { lines, exitCode } = verdict(cleanRecord(), [check]);
    expect(fails(lines)).toEqual([`FAIL ${check.name} — ${check.detail}`]);
    expect(exitCode).toBe(1);
  });
});

describe('bundleName: which assets/index-*.js the page served', () => {
  test('names the bundle relative to the base path', () => {
    expect(bundleName(cleanRecord().responses)).toBe('assets/index-AbC123.js');
  });

  test('is null when no bundle was served', () => {
    expect(bundleName([ok(BASE, 'text/html')])).toBeNull();
  });
});

describe('crossOriginUrls: requests that left the page origin', () => {
  test('keeps unique http(s) URLs on other origins, in first-seen order', () => {
    expect(crossOriginUrls([BASE, HAND, `${BASE}assets/x.js`, HAND, 'https://example.com/a'], BASE)).toEqual([HAND, 'https://example.com/a']);
  });

  test('blob: and data: URLs are not cross-origin requests', () => {
    expect(crossOriginUrls([`blob:${BASE.slice(0, -1)}/1234-abcd`, 'data:application/wasm;base64,AGFzbQ=='], BASE)).toEqual([]);
  });
});
