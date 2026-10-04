// Guard for screenshot scripts: true when no Vite error overlay covers the app
// (a stale overlay outlives the error that caused it and hides the canvas).
export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  return app.evaluate(() => document.querySelector('vite-error-overlay') === null);
}
