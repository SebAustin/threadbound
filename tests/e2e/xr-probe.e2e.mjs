// Helper for the XR shell tests: world positions of everything a hand can pinch,
// plus puzzle state. Optional SETUP env: 'load0' (level 1, fresh), 'thread' (add a->b),
// or 'solve' (solve and drop the current level, then wait out its melody).
export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const setup = process.env.SETUP ?? '';
  return app.evaluate(async (mode) => {
    const hook = window.__threadbound;
    if (mode === 'load0') hook.dispatch({ type: 'load', index: 0 });
    if (mode === 'thread') hook.dispatch({ type: 'addThread', from: 'a', to: 'b' });
    if (mode === 'busiest') {
      // The heaviest frame in the campaign: Three Cups, solution hung, every marble in flight.
      hook.dispatch({ type: 'load', index: hook.levels().findIndex((l) => l.id === 'w2-06') });
      await new Promise((r) => setTimeout(r, 300));
      hook.solve();
      hook.dispatch({ type: 'drop' });
      for (let t = 0; t < 8000 && hook.marbles().length < hook.state().level.marbles && hook.state().status !== 'complete'; t += 100) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    if (mode === 'solve') {
      // Solve the current level and let its replay finish, so the melody book has a tune.
      hook.solve();
      hook.dispatch({ type: 'drop' });
      const poll = () => new Promise((r) => setTimeout(r, 200));
      for (let t = 0; t < 15000 && hook.state().status !== 'complete'; t += 200) await poll();
      // The replay is over once no melody note has sounded for a full second.
      for (let quiet = 0, t = 0; quiet < 1000 && t < 10000; t += 200) {
        quiet = hook.cues().includes('melody') ? 0 : quiet + 200;
        await poll();
      }
    }
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
          const b = hook.button(id)?.world;
          return [id, b && { ...b, y: b.y + 0.012 }];
        }),
      ),
      threadMid: a && b ? hook.worldOf((a.x + b.x) / 2, (a.y + b.y) / 2) : null,
      threads: s.threads,
      status: s.status,
      levelId: s.level.id,
      face: hook.plaque()?.face,
      slowToggle: hook.plaqueElement('set-slow')?.world,
      slowMotion: s.settings.slowMotion,
      stars: hook.plaqueElement('hud-stars')?.world,
      placement: hook.placement(),
      frame: await hook.frameStats(),
      // Side effect: drains the cue log, so this counts melody notes since the last probe.
      melodyNotesDrained: hook.cues().filter((c) => c === 'melody').length,
    };
  }, setup);
}
