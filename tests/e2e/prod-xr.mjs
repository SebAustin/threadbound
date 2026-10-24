// The production bundle in an emulated XR session (week 8 ticket 02): plain Node + Playwright, no dev
// server and no test hook (the hook is DEV-only, src/index.ts:49-57). Run after
// `NODE_ENV=production npm run build` as `npm run test:e2e:prod-xr`, or against a deployed build with
// SMOKE_URL=<url>. It composes ticket 03's harness (serve/inject/record) and verdict, and adds only:
//   1. Enter XR as a judge would: a real mouse click on the page's DOM Enter XR (#enter-xr, week 8
//      ticket 08), once it shows, which must start an immersive-ar session within 5 s. It needs no
//      canvas coordinates; the welcome card's own Enter XR stays proven on the dev server by
//      tests/e2e/enter-xr.sh. On a FAIL it enters through grantOfferedSession() instead, so the rest
//      of the run still produces evidence.
//   2. Level 1 by hand pinch only: pinch-pull knob a to knob b, then pinch the chute. Ports pinch_pull
//      and pinch_at (tests/e2e/xr-lib.sh) to direct IWER calls, aimed at the world points in
//      tests/e2e/fixtures/prod-xr-w1-01.json (tests/unit/prodXrTargets.test.ts keeps them current).
//   3. The solve, read from the save (localStorage), since the bundle has no hook.
//   4. A NOTE with the AudioContext state after the first pinch (headless autoplay differs from Quest's).
//   5. Screenshots entered.png, thread.png and solved.png in .tmp/prod-xr/.
// Output: PASS/FAIL/NOTE lines (tests/smoke/verdict.mjs), exit code 1 on any FAIL.

import { readFileSync } from 'node:fs';
// The look rotation the CLI's `xr look-at` applies (iwer/lib/remote/RemoteControlInterface.js executeLookAt).
import { directionTo, lookRotation } from 'iwer/lib/utils/control-math.js';
import { DEVICE_GLOBAL, inject, record, serve } from '../smoke/harness.mjs';
import { verdict } from '../smoke/verdict.mjs';
import { sleep } from './lib.mjs';

const SCRIPT = 'prod-xr';
const FIXTURE = JSON.parse(readFileSync(new URL('./fixtures/prod-xr-w1-01.json', import.meta.url), 'utf8'));
/** src/lib/progress.ts:5 */
const SAVE_KEY = 'threadbound.progress.v1';
const LOAD_TIMEOUT_MS = 60_000;
/** IWSDK offers a session once the world and its first level are up: the app is ready for a click. */
const READY_TIMEOUT_MS = 20_000;
const SESSION_START_TIMEOUT_MS = 5_000;
/** The game offers #enter-xr once it has resolved the session mode, right after it is up. */
const ENTER_XR_TIMEOUT_MS = 10_000;
/**
 * With no planes, the table search floats the diorama after 3 s of visible time (SEARCH.floatAfter,
 * src/lib/placementSearch.ts), hidden until then, then fades it in over 0.3 s (REVEAL_SECONDS); plus
 * two evaluations' slack. A hidden diorama takes no pinch, so the first pinch waits for all of it.
 */
const PLACEMENT_WAIT_MS = 3_000 + 300 + 500;
/** A level-1 drop takes a few seconds of physics; the save is written when it completes. */
const SOLVE_TIMEOUT_MS = 20_000;
const POLL_MS = 100;

/** Gesture timing from tests/e2e/xr-lib.sh: how long a hand aims and holds, not waits for state. */
const GESTURE = { aimMs: 800, pressMs: 400, sweepStepMs: 300, releaseMs: 500, tapHoldMs: 300, tapReleaseMs: 800 };
/** pinch_pull: the hand rests below and in front of the pegs' midpoint (xr-lib.sh:45). */
const PULL_HAND_OFFSET = { x: 0.1, y: -0.25, z: 0.3 };
/** rest_hand_for: a seated player's right hand, below and in front of the target (xr-lib.sh:40). */
const TAP_HAND_OFFSET = { x: 0.1, y: -0.3, z: 0.35 };
const SWEEP = [0.25, 0.5, 0.75, 1];

const firstLine = (err) => String(err?.message ?? err).split('\n')[0];
const add = (p, d) => ({ x: p.x + d.x, y: p.y + d.y, z: p.z + d.z });
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
const midpoint = (a, b) => lerp(a, b, 0.5);

async function pollUntil(read, done, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let value = await read();
  while (!done(value) && Date.now() < deadline) {
    await sleep(POLL_MS);
    value = await read();
  }
  return value;
}

// ---- page functions: they run in the page, so each is self-contained -------------------------------

/** Records every AudioContext the app creates, so the NOTE can read its state. Runs before app scripts. */
function watchAudioContexts() {
  const Original = window.AudioContext;
  if (!Original) return;
  window.__prodXrAudio = [];
  window.AudioContext = new Proxy(Original, {
    construct(target, args, newTarget) {
      const ctx = Reflect.construct(target, args, newTarget);
      window.__prodXrAudio.push(ctx);
      return ctx;
    },
  });
}

function seatPlayer({ g, head }) {
  const device = window[g];
  device.primaryInputMode = 'hand';
  device.position.set(head.position.x, head.position.y, head.position.z);
  const q = head.orientation;
  device.quaternion.set(q.x, q.y, q.z, q.w);
}

async function sessionStatus(g) {
  const device = window[g];
  const status = await device.remote.dispatch('get_session_status');
  return {
    active: Boolean(device.activeSession),
    mode: status.sessionMode,
    blend: device.activeSession?.environmentBlendMode ?? null,
    offerPending: device.sessionOffered,
  };
}

/** XR-origin points to IWER global space, as `xr look-at` converts its target. */
function toGlobal({ g, points }) {
  const remote = window[g].remote;
  return Object.fromEntries(Object.entries(points).map(([key, p]) => [key, remote.transformXROriginToGlobal(p)]));
}

function poseRightHand({ g, position, orientation }) {
  const hand = window[g].hands.right;
  hand.position.set(position.x, position.y, position.z);
  hand.quaternion.set(orientation.x, orientation.y, orientation.z, orientation.w);
}

function pinchRightHand({ g, value }) {
  window[g].hands.right.updatePinchValue(value);
}

const twoFrames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
const audioStates = () => (window.__prodXrAudio ?? []).map((ctx) => ctx.state);
const readSave = (key) => localStorage.getItem(key);

// ---- steps --------------------------------------------------------------------------------------------

async function loadCheck(page, url) {
  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: LOAD_TIMEOUT_MS });
    const status = response?.status() ?? 0;
    return { name: 'page loads', pass: status === 200, detail: `${url} → ${status}` };
  } catch (err) {
    return { name: 'page loads', pass: false, detail: `${url}: ${firstLine(err)}` };
  }
}

async function readyCheck(page) {
  const offered = await pollUntil(
    () => page.evaluate((g) => Boolean(window[g]?.sessionOffered), DEVICE_GLOBAL),
    Boolean,
    READY_TIMEOUT_MS,
  );
  const detail = offered ? 'IWSDK offered an XR session' : `no session offer within ${READY_TIMEOUT_MS / 1000} s`;
  return { name: 'the app is up', pass: offered, detail };
}

const waitForSession = (page) =>
  pollUntil(() => page.evaluate(sessionStatus, DEVICE_GLOBAL), (s) => s.active, SESSION_START_TIMEOUT_MS);

/** A real mouse click on #enter-xr once it shows; false when it never does. */
async function clickEnterXr(page) {
  const button = page.locator('#enter-xr');
  try {
    await button.waitFor({ state: 'visible', timeout: ENTER_XR_TIMEOUT_MS });
  } catch {
    return false;
  }
  await button.click();
  return true;
}

/** The Enter XR click, then the fallback when it starts no immersive-ar session. */
async function enterChecks(page) {
  await page.evaluate(seatPlayer, { g: DEVICE_GLOBAL, head: FIXTURE.head });
  await page.evaluate(twoFrames);
  const shown = await clickEnterXr(page);
  const s = shown ? await waitForSession(page) : await page.evaluate(sessionStatus, DEVICE_GLOBAL);
  const entered = shown && s.active && s.mode === 'immersive-ar';
  const where = shown ? '#enter-xr' : `#enter-xr never showed within ${ENTER_XR_TIMEOUT_MS / 1000} s`;
  const clickCheck = {
    name: 'the Enter XR click starts an immersive-ar session',
    pass: entered,
    detail: s.active
      ? `${where}: mode ${s.mode}, blend ${s.blend}, offer still pending: ${s.offerPending}`
      : `${where}: no session within ${SESSION_START_TIMEOUT_MS / 1000} s`,
  };
  // A session in the wrong mode still FAILs above, but the run goes on in it for evidence.
  if (s.active) return { checks: [clickCheck], inSession: true };
  await page.evaluate((g) => window[g].grantOfferedSession(), DEVICE_GLOBAL);
  const granted = await waitForSession(page);
  const fallback = granted.active
    ? { name: 'fallback', note: `entered through grantOfferedSession(): mode ${granted.mode}, blend ${granted.blend}` }
    : { name: 'fallback grantOfferedSession() starts a session', pass: false, detail: 'no session' };
  return { checks: [clickCheck, fallback], inSession: granted.active };
}

/** Points the right hand from `position` at `target` (global), the way `xr look-at` turns it. */
async function aim(page, position, target) {
  const orientation = lookRotation(directionTo(position, target));
  await page.evaluate(poseRightHand, { g: DEVICE_GLOBAL, position, orientation });
}

const pinch = (page, value) => page.evaluate(pinchRightHand, { g: DEVICE_GLOBAL, value });

/** pinch_pull (xr-lib.sh:42-53): pinch at one knob, sweep the ray to the other, release. */
async function pinchPull(page, from, to, global) {
  const hand = add(midpoint(from, to), PULL_HAND_OFFSET);
  await aim(page, hand, global.from);
  await sleep(GESTURE.aimMs);
  await pinch(page, 1);
  await sleep(GESTURE.pressMs);
  for (const t of SWEEP) {
    await aim(page, hand, lerp(global.from, global.to, t));
    await sleep(GESTURE.sweepStepMs);
  }
  await pinch(page, 0);
  await sleep(GESTURE.releaseMs);
}

/** pinch_at (xr-lib.sh:56-61): aim the right-hand ray at the target, pinch, release. */
async function pinchAt(page, target, globalTarget) {
  await aim(page, add(target, TAP_HAND_OFFSET), globalTarget);
  await sleep(GESTURE.aimMs);
  await pinch(page, 1);
  await sleep(GESTURE.tapHoldMs);
  await pinch(page, 0);
  await sleep(GESTURE.tapReleaseMs);
}

/** What the save says about level 1: solved needs best >= 1 and a non-empty melody (array, or ticket 10's { notes }). */
function solveFromSave(raw, levelId) {
  if (!raw) return { solved: false, detail: 'no save' };
  let save;
  try {
    save = JSON.parse(raw);
  } catch {
    return { solved: false, detail: `unreadable save: ${raw.slice(0, 80)}` };
  }
  const best = save?.best?.[levelId] ?? 0;
  const melody = save?.melodies?.[levelId];
  const notes = Array.isArray(melody) ? melody : Array.isArray(melody?.notes) ? melody.notes : [];
  return { solved: best >= 1 && notes.length > 0, detail: `best['${levelId}'] ${best}, melody ${notes.length} notes` };
}

const saveState = async (page) => solveFromSave(await page.evaluate(readSave, SAVE_KEY), FIXTURE.level);

async function audioNote(page) {
  const states = await page.evaluate(audioStates);
  const note = states.length ? `${states.length} AudioContext(s): ${states.join(', ')}` : 'no AudioContext created yet';
  return { name: 'audio after the first pinch', note: `${note} (headless autoplay rules differ from Quest Browser's)` };
}

/** Level 1 by hand pinch only, then the solve read from the save. */
async function playChecks(page, rec) {
  const before = await saveState(page);
  await sleep(PLACEMENT_WAIT_MS);
  await rec.shot('entered');
  const { a, b } = FIXTURE.knobs;
  const global = await page.evaluate(toGlobal, { g: DEVICE_GLOBAL, points: { a, b, chute: FIXTURE.chute } });
  await pinchPull(page, a, b, { from: global.a, to: global.b });
  const audio = await audioNote(page);
  await rec.shot('thread');
  await pinchAt(page, FIXTURE.chute, global.chute);
  const after = await pollUntil(() => saveState(page), (s) => s.solved, SOLVE_TIMEOUT_MS);
  await rec.shot('solved');
  const solved = {
    name: 'level 1 solved by hand pinch only, read from the save',
    pass: !before.solved && after.solved,
    detail: `before: ${before.detail}; after: ${after.detail}`,
  };
  return [audio, solved, { name: 'screenshots', note: `entered.png, thread.png, solved.png in ${rec.outDir}` }];
}

async function runChecks(page, rec, url) {
  const load = await loadCheck(page, url);
  if (!load.pass) return [load];
  const ready = await readyCheck(page);
  if (!ready.pass) return [load, ready];
  const enter = await enterChecks(page);
  if (!enter.inSession) return [load, ready, ...enter.checks];
  return [load, ready, ...enter.checks, ...(await playChecks(page, rec))];
}

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
    await injected.context.addInitScript(watchAudioContexts);
    rec = record(injected.context, injected.page, { script: SCRIPT, url: target.url });
    checks.push(...(await runChecks(injected.page, rec, target.url)));
  } catch (err) {
    checks.push({ name: 'prod-xr ran to the end', pass: false, detail: firstLine(err) });
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
  console.log(`FAIL prod-xr could not start — ${firstLine(err)}`);
  process.exitCode = 1;
});
