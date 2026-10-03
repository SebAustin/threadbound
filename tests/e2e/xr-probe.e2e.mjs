// Helper for the XR shell tests: world positions of everything a hand can pinch,
// plus puzzle state. Optional SETUP env: 'load0' (level 1, fresh) or 'thread' (add a->b).
export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const setup = process.env.SETUP ?? '';
  return app.evaluate(async (mode) => {
    const hook = window.__threadbound;
    if (mode === 'load0') hook.dispatch({ type: 'load', index: 0 });
    if (mode === 'thread') hook.dispatch({ type: 'addThread', from: 'a', to: 'b' });
    await new Promise((r) => setTimeout(r, 300));
    const s = hook.state();
    const knobZ = 0.029;
    const knobs = Object.fromEntries(s.level.pegs.map((p) => [p.id, hook.worldOf(s.pegPositions[p.id].x, s.pegPositions[p.id].y, knobZ)]));
    const chute = s.level.chutes[0];
    const a = s.pegPositions.a;
    const b = s.pegPositions.b;
    return {
      knobs,
      chute: hook.worldOf(chute.x, chute.y + 0.02),
      // Aim at the top of each button's cap (1.2 cm above its base on the ledge).
      buttons: Object.fromEntries(
        ['restart', 'next', 'settings', 'daily'].map((id) => {
          const b = hook.buttonWorld(id);
          return [id, b && { ...b, y: b.y + 0.012 }];
        }),
      ),
      threadMid: a && b ? hook.worldOf((a.x + b.x) / 2, (a.y + b.y) / 2) : null,
      threads: s.threads,
      status: s.status,
      levelId: s.level.id,
      face: hook.plaque()?.face,
      slowToggle: hook.plaqueElementWorld('set-slow'),
      slowMotion: s.settings.slowMotion,
    };
  }, setup);
}
