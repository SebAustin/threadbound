// Helper for gaze-pinch.sh: does the running XR session expose a gaze input source?
export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  return app.evaluate(() => window.__threadbound.gazeAvailable());
}
