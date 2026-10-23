// Video kit preflight, run by shot.sh once a shot is staged: hides the emulator's
// chrome and reports what a recording would show. IWER draws its chrome in shadow
// roots in the app document. In XR, its overlay host sits beside the canvases
// (node_modules/iwer/lib/device/XRDevice.js, devUIContainer) and holds the "Remote
// Control Active" pill, the blue edge glow, and the manual emulator controls IWER
// swaps in 30 s after the last remote command. Hiding the host, not the pill, covers
// all of them; the devui canvas beside it (the emulated hands) stays. A host on
// <body> holds the "Enter XR" pill, hidden in browser-view shots.
import { sleep } from './lib.mjs';
import noOverlay from './no-overlay.e2e.mjs';
import { settingsAtDefaults } from './reset-settings.e2e.mjs';

/** IWER's "Enter XR" pill slides away within ~1.2 s of a session starting (1 s poll, 0.2 s slide). */
const CHROME_WAIT_MS = 3000;
const POLL_MS = 200;

/** Page function: hides the emulator chrome a shot must not show; returns what it hid. */
const hideChrome = () => {
  const inSession = window.__threadbound.room().blendMode !== null;
  const besideCanvas = (el) => [...(el.parentElement?.children ?? [])].some((c) => c.tagName === 'CANVAS');
  const hid = [];
  for (const host of document.querySelectorAll('div')) {
    if (!host.shadowRoot || host.style.display === 'none') continue;
    const pill = !inSession && host.shadowRoot.textContent.includes('Enter XR');
    const label = besideCanvas(host) ? 'emulator overlay' : pill ? 'Enter XR pill' : null;
    if (!label) continue;
    host.style.display = 'none';
    hid.push(label);
  }
  return hid;
};

/**
 * Page function: emulator chrome still on screen. Looks for the pill texts in every
 * shadow root (pierced as clickCanvas does, lib.mjs), for a visible overlay host (the
 * edge glow has no text), and for ticket 08's DOM Enter XR button.
 */
const visibleChrome = () => {
  const TEXTS = ['Remote Control Active', 'Enter XR'];
  const onScreen = (el) => {
    if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
  };
  const found = [];
  const scan = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = TEXTS.find((t) => node.textContent.includes(t));
      if (text && node.parentElement && onScreen(node.parentElement)) found.push(text);
    }
    for (const el of root.querySelectorAll('*')) if (el.shadowRoot) scan(el.shadowRoot);
  };
  for (const el of document.querySelectorAll('*')) {
    if (!el.shadowRoot) continue;
    scan(el.shadowRoot);
    const besideCanvas = [...(el.parentElement?.children ?? [])].some((c) => c.tagName === 'CANVAS');
    if (besideCanvas && onScreen(el)) found.push('emulator overlay');
  }
  const enterXr = document.getElementById('enter-xr');
  if (enterXr && onScreen(enterXr)) found.push('#enter-xr');
  return found;
};

/**
 * Page function: the app canvas's size. In XR, IWER moves it beside its own canvases and
 * sizes it in CSS pixels (XRDevice.js, Z_INDEX_APP_CANVAS = 2), so a 1920x1080 frame
 * needs a 1920x1080 CSS-pixel window: dpr shows whether the display is scaled.
 */
const canvasSize = () => {
  const canvases = [...document.querySelectorAll('canvas')];
  const canvas = document.querySelector('#scene-container canvas') ?? canvases.find((c) => c.style.zIndex === '2');
  if (!canvas) return null;
  const box = canvas.getBoundingClientRect();
  return { width: canvas.width, height: canvas.height, cssWidth: Math.round(box.width), cssHeight: Math.round(box.height), dpr: devicePixelRatio };
};

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const hid = await app.evaluate(hideChrome);
  let chrome = await app.evaluate(visibleChrome);
  for (let waited = 0; chrome.length > 0 && waited < CHROME_WAIT_MS; waited += POLL_MS) {
    await sleep(POLL_MS);
    chrome = await app.evaluate(visibleChrome);
  }
  return {
    hid,
    chrome,
    audio: await app.evaluate(() => window.__threadbound.audio()),
    canvas: await app.evaluate(canvasSize),
    viteOverlay: !(await noOverlay({ page, frame })),
    defaultSettings: await settingsAtDefaults(app),
  };
}
