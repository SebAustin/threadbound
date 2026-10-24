// E2E (real input): the ledge's settings button opens the plaque's settings face;
// the slow motion toggle there makes marbles fall measurably slower and is
// remembered. Both faces are measured as rendered, against the sizes the
// field-of-view unit test assumes (tests/unit/viewExtent.test.ts).
import { canvasMapper, checks, click, clickCanvas, loadIndex, plaqueElementAt, sleep, waitFor } from './lib.mjs';

/** HUD.maxWidth, HUD.levelFaceMaxHeight and HUD.settingsFaceMaxHeight in src/config/constants.ts. */
const FACE_LIMITS = { width: 0.44, level: 0.07, settings: 0.1 };
/** Meta's hands guidelines: 22 mm hit targets, 12 mm between neighbouring interactables. */
const MIN_HEIGHT = 0.022;
const MIN_GAP = 0.012;
/** Layout rounding (0.01 mm), so a control laid out at exactly the minimum passes. */
const SLACK = 1e-5;
/** Every control on the settings face, hidden placeholders included (they keep their place). */
const CONTROLS = [
  'set-slow', 'set-contrast', 'set-reset',
  'set-prev', 'set-next', 'set-skip', 'set-play-all',
  'set-up', 'set-down', 'set-near', 'set-far',
];
/** The settings face's text that isn't a control: its title and readouts. */
const READOUTS = ['settings-title', 'set-level', 'set-stars', 'set-offset'];

/** Page function: each control's centre on the plaque's face (u right, v up) and its size, in meters. */
const controlRects = (ids) => {
  const hook = window.__threadbound;
  const { yaw } = hook.frame();
  return ids.map((id) => {
    const e = hook.plaqueElement(id);
    if (!e) return { id, missing: true };
    return { id, u: e.world.x * Math.cos(yaw) - e.world.z * Math.sin(yaw), v: e.world.y, w: e.width, h: e.height };
  });
};

/** Edge-to-edge distance between two rectangles on the face (0 if they touch or overlap). */
function edgeGap(a, b) {
  const dx = Math.max(0, Math.abs(a.u - b.u) - (a.w + b.w) / 2);
  const dy = Math.max(0, Math.abs(a.v - b.v) - (a.h + b.h) / 2);
  return Math.hypot(dx, dy);
}

/** The closest pair of controls: neighbours in a row and between rows alike. */
function closestPair(rects) {
  let closest = { gap: Infinity, pair: '' };
  rects.forEach((a, i) => rects.slice(i + 1).forEach((b) => {
    const gap = edgeGap(a, b);
    if (gap < closest.gap) closest = { gap, pair: `${a.id} / ${b.id}` };
  }));
  return closest;
}

/** The plaque's rendered size once it holds still (a face just shown lays out over a frame or two). */
async function steadyPlaqueSize(app) {
  let last = null;
  for (let i = 0; i < 30; i++) {
    const now = await app.evaluate(() => {
      const e = window.__threadbound.plaqueElement('plaque');
      return e && { w: e.width, h: e.height, y: e.world.y };
    });
    if (now && last && ['w', 'h', 'y'].every((k) => Math.abs(now[k] - last[k]) < 1e-6)) return now;
    last = now;
    await sleep(100);
  }
  return last;
}

/** The open settings face: control sizes and spacing, and the face's own size. */
async function measureSettingsFace(app, check) {
  await plaqueElementAt(app, 'set-far');
  const rects = await app.evaluate(controlRects, CONTROLS);
  const missing = rects.filter((r) => r.missing).map((r) => r.id);
  check('every settings control is laid out, hidden placeholders included', missing.length === 0, missing.join(', '));
  if (missing.length) return;
  const closest = closestPair(rects);
  check('neighbouring settings controls are at least 12 mm apart, edge to edge',
    closest.gap >= MIN_GAP - SLACK, `${(closest.gap * 1000).toFixed(2)} mm (${closest.pair})`);
  const short = rects.filter((r) => r.h < MIN_HEIGHT - SLACK).map((r) => `${r.id} ${(r.h * 100).toFixed(2)} cm`);
  check('every settings control is at least 2.2 cm tall', short.length === 0, short.join(', ') || `lowest ${(Math.min(...rects.map((r) => r.h)) * 100).toFixed(2)} cm`);
  const face = await steadyPlaqueSize(app);
  check('the settings face stays within HUD.maxWidth x HUD.settingsFaceMaxHeight (44 x 10 cm)',
    face.w <= FACE_LIMITS.width + SLACK && face.h <= FACE_LIMITS.settings + SLACK, JSON.stringify(face));
  // Every row's items, readouts included, lie inside the face: a row that overflowed would spill past its edge.
  const [plaque, ...items] = await app.evaluate(controlRects, ['plaque', ...CONTROLS, ...READOUTS]);
  const spill = items.filter((r) => Math.abs(r.u - plaque.u) + r.w / 2 > plaque.w / 2 + SLACK).map((r) => r.id);
  check('every row of the settings face fits inside it', spill.length === 0, spill.join(', '));
}

/** The level face, once flipped back: within its own limits. */
async function measureLevelFace(app, check) {
  const face = await steadyPlaqueSize(app);
  check('the level face stays within HUD.maxWidth x HUD.levelFaceMaxHeight (44 x 7 cm)',
    face.w <= FACE_LIMITS.width + SLACK && face.h <= FACE_LIMITS.level + SLACK, JSON.stringify(face));
}

/**
 * Drops the first level's marbles untouched and reports how far (m) the first
 * marble has fallen 200 ms after it appears. Distance grows with time squared,
 * so slow motion (2/3 speed) should fall about 0.44x as far; frame-pacing lag
 * affects both runs alike, unlike a stopwatch on the whole fall.
 */
const fallenAfter200ms = () =>
  new Promise((resolve) => {
    const deadline = performance.now() + 8000;
    let spawned = null;
    window.__threadbound.dispatch({ type: 'drop' });
    const tick = () => {
      const now = performance.now();
      const [first] = window.__threadbound.marbles();
      if (first && spawned === null) spawned = { at: now, y: first.y };
      if (spawned && now - spawned.at >= 200) resolve(spawned.y - first.y);
      else if (now > deadline) resolve(-1);
      else requestAnimationFrame(tick);
    };
    tick();
  });

/**
 * Where the open settings face sits in the flat (non-XR) view, in canvas pixels.
 * The plaque grows up from its bottom edge (the panel's origin), so its top edge
 * is as far above its centre as the bottom edge is below. The ledge buttons are
 * the lowest controls: a framing that shows the face must keep them in view too.
 */
const settingsFaceInView = () => {
  const hook = window.__threadbound;
  const { width, height } = document.querySelector('canvas').getBoundingClientRect();
  const inView = (p) => Boolean(p) && p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height;
  const bottom = hook.hud().local;
  const centreY = hook.plaqueElement('plaque').world.y - hook.frame().origin[1];
  const top = hook.project(bottom.x, 2 * centreY - bottom.y, bottom.z);
  const topRow = ['set-slow', 'set-reset'].map((id) => hook.plaqueElement(id));
  const ledge = ['restart', 'settings', 'daily', 'next'].map((id) => hook.button(id));
  const round = (p) => p && [Math.round(p.x), Math.round(p.y)];
  return {
    faceTop: top.y >= 0,
    topRow: topRow.every(inView),
    ledge: ledge.every(inView),
    detail: { canvas: [width, height], top: Math.round(top.y), topRow: topRow.map(round), ledge: ledge.map(round) },
  };
};

/** Median of three drops, each on a freshly loaded level. */
async function typicalFall(app) {
  const falls = [];
  for (let i = 0; i < 3; i++) {
    await loadIndex(app, 0);
    falls.push(await app.evaluate(fallenAfter200ms));
  }
  return falls.sort((x, y) => x - y)[1];
}

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  const at = await canvasMapper(app);
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'settings', patch: { slowMotion: false } }));
  const normal = await typicalFall(app);

  await loadIndex(app, 0);
  await click(page, at(await app.evaluate(() => window.__threadbound.button('settings'))));
  check('the settings button opens the settings face', await waitFor(app, () => window.__threadbound.plaque()?.face === 'settings', 2000));
  await measureSettingsFace(app, check);

  const toggle = await plaqueElementAt(app, 'set-slow');
  check('the slow motion toggle is on the plaque', Boolean(toggle), JSON.stringify(toggle));
  const view = await app.evaluate(settingsFaceInView);
  check('the whole settings face is in the flat view, top edge included', view.faceTop, JSON.stringify(view.detail));
  check('its top row (Slow-mo, Reset progress) is on screen', view.topRow, JSON.stringify(view.detail));
  check('the ledge buttons stay on screen below it', view.ledge, JSON.stringify(view.detail));
  if (!toggle) return results;
  await clickCanvas(page, app, at, toggle);
  check('poking it turns slow motion on', await waitFor(app, () => window.__threadbound.state().settings.slowMotion, 2000));
  const saved = await app.evaluate(() => localStorage.getItem('threadbound.settings.v1'));
  check('the setting is remembered', /"slowMotion":true/.test(saved ?? ''), saved);

  await click(page, at(await app.evaluate(() => window.__threadbound.button('settings'))));
  check('the settings button flips back to the level face', await waitFor(app, () => window.__threadbound.plaque()?.face === 'level', 2000));
  await measureLevelFace(app, check);
  const slow = await typicalFall(app);
  check('marbles fall visibly slower', normal > 0 && slow > 0 && slow < 0.7 * normal, `fell in 200 ms: normal=${normal.toFixed(3)} m, slow=${slow.toFixed(3)} m`);

  // Leave the browser as other tests expect it.
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'settings', patch: { slowMotion: false } }));
  return results;
}
