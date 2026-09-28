// Helper for the hand-pinch E2E: prints knob world positions and puzzle state.
import { DIORAMA, PEG } from './constants.mjs';
export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  return app.evaluate(({ knobZ }) => {
    const hook = window.__threadbound;
    if (hook.state().levelIndex !== 0) hook.dispatch({ type: 'load', index: 0 });
    const level = hook.state().level;
    return {
      knobs: Object.fromEntries(level.pegs.map((p) => [p.id, hook.worldOf(p.x, p.y, knobZ)])),
      threads: hook.state().threads,
    };
  }, { knobZ: DIORAMA.channelHalfDepth + PEG.radius });
}
