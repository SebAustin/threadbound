// Helper: put settings back to defaults after an XR test or a video take changed them.

/** DEFAULT_SETTINGS in src/lib/settings.ts (a Playwright script can't import the app's TypeScript). */
export const DEFAULT_SETTINGS = { slowMotion: false, highContrast: false, offset: { up: 0, near: 0 } };

/** True when the app's settings match DEFAULT_SETTINGS on every key the defaults name. */
export function settingsAtDefaults(app) {
  return app.evaluate((defaults) => {
    const same = (a, b) => (b !== null && typeof b === 'object' ? Object.keys(b).every((k) => same(a?.[k], b[k])) : a === b);
    return same(window.__threadbound.state().settings, defaults);
  }, DEFAULT_SETTINGS);
}

/** Dispatches the defaults only when something differs: a new offset object rebuilds the diorama. */
export async function resetSettings(app) {
  if (await settingsAtDefaults(app)) return false;
  await app.evaluate((patch) => window.__threadbound.dispatch({ type: 'settings', patch }), DEFAULT_SETTINGS);
  return true;
}

export default async function run({ page, frame }) {
  await resetSettings(frame ?? page.mainFrame());
  return 'ok';
}
