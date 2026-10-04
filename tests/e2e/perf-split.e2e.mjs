// Diagnostic (not in the suite): where the busiest level's draw calls come from.
// Usage: npx @iwsdk/cli browser run tests/e2e/perf-split.e2e.mjs   (LEVEL_ID=w4-06 by default)
export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  return app.evaluate(async (id) => {
    const hook = window.__threadbound;
    hook.dispatch({ type: 'load', index: hook.levels().findIndex((l) => l.id === id) });
    await new Promise((r) => setTimeout(r, 400));
    hook.solve();
    hook.dispatch({ type: 'drop' });
    await new Promise((r) => setTimeout(r, 2500));
    const stats = await hook.frameStats();
    const meshes = hook.meshBreakdown();
    const total = Object.values(meshes).reduce((a, b) => a + b, 0);
    return { drawCalls: stats.drawCalls, visibleMeshes: total, meshes: Object.entries(meshes).sort((a, b) => b[1] - a[1]) };
  }, process.env.LEVEL_ID ?? 'w4-06');
}
