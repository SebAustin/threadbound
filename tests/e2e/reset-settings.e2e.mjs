// Helper: put settings back to defaults after an XR test changed them.
export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'settings', patch: { slowMotion: false, offset: { up: 0, near: 0 } } }));
  return 'ok';
}
