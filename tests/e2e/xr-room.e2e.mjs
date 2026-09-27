// E2E: the virtual study hides over passthrough (AR) and shows in the browser.
// Enter/exit XR is driven via the IWSDK CLI around this script; this reports state.
export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  return app.evaluate(() => window.__threadbound.room());
}
