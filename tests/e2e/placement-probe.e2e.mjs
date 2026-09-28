// Reports diorama frame pose, detected planes, and placement log lines.
export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  return app.evaluate(() => ({ frame: window.__threadbound.frame(), room: window.__threadbound.room() }));
}
