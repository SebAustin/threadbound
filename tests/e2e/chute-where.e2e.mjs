// Failure diagnostics for xr-controls.sh: where the first chute's mouth is now,
// the diorama frame it was placed in, and the puzzle status. Printed next to the
// point a chute pinch aimed at, so a miss shows whether the diorama moved.
export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  return app.evaluate(() => {
    const hook = window.__threadbound;
    const s = hook.state();
    return { chute: hook.chute()?.world ?? null, frame: hook.frame(), status: s.status, levelId: s.level?.id };
  });
}
