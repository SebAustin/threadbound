// Diagnostic: stage the plaque's longest copy (a daily with no streak) on FACE ('level' | 'settings').
export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  return app.evaluate(async (face) => {
    const hook = window.__threadbound;
    hook.dispatch({ type: 'resetProgress' });
    hook.dispatch({ type: 'daily', index: 3 });
    await new Promise((r) => setTimeout(r, 300));
    if (face === 'settings' && hook.plaque()?.face !== 'settings') hook.dispatch({ type: 'toggleSettings' });
    await new Promise((r) => setTimeout(r, 400));
    return { title: hook.state().level.name, face: hook.plaque()?.face, model: hook.hud()?.model };
  }, process.env.FACE ?? 'level');
}
