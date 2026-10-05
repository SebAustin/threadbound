// E2E (Stage 1 bar): everything a player touches stays within a seated 2 ft
// (0.61 m) of the head, on every level, at the default distance and at the
// farthest the Farther button allows. Height offsets are excluded on purpose:
// they exist so each player fits the diorama to their own posture.
import { checks, waitFor } from './lib.mjs';

/** A seated player's head at the default XR origin (meters). */
const SEATED_HEAD = { x: 0, y: 1.15, z: 0 };
const TWO_FEET = 0.61;
/** Mirrors OFFSET_LIMITS.near[0] in src/lib/settings.ts: the farthest setting. */
const FARTHEST = -2;

const measure = (head) => {
  const hook = window.__threadbound;
  const d = (p) => Math.hypot(p.x - head.x, p.y - head.y, p.z - head.z);
  const s = hook.state();
  const points = [
    ...s.level.pegs.map((p) => [`peg ${p.id}`, hook.worldOf(p.x, p.y, 0.029)]),
    ...s.level.chutes.map((c, i) => [`chute ${i}`, hook.worldOf(c.x, c.y + 0.02, 0)]),
    ...['restart', 'settings', 'daily', 'next'].map((b) => [`button ${b}`, hook.button(b)?.world]),
    ['stars', hook.plaqueElement('hud-stars')?.world],
  ].filter(([, p]) => p);
  return points.map(([name, p]) => [name, d(p)]).sort((a, b) => b[1] - a[1])[0];
};

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const { results, check } = checks();
  const count = await app.evaluate(() => window.__threadbound.levels().length);
  for (const near of [0, FARTHEST]) {
    await app.evaluate((n) => window.__threadbound.dispatch({ type: 'settings', patch: { offset: { up: 0, near: n } } }), near);
    let worst = ['', 0, ''];
    for (let i = 0; i < count; i++) {
      await app.evaluate((index) => window.__threadbound.dispatch({ type: 'load', index }), i);
      await waitFor(app, (index) => window.__threadbound.state().levelIndex === index, 2000, i);
      const [name, distance] = await app.evaluate(measure, SEATED_HEAD);
      if (distance > worst[1]) worst = [name, distance, await app.evaluate(() => window.__threadbound.state().level.id)];
    }
    const label = near === 0 ? 'the default distance' : 'the farthest setting';
    check(`every touchable element is within 2 ft at ${label}`, worst[1] <= TWO_FEET, `${worst[2]} ${worst[0]} at ${worst[1].toFixed(3)} m`);
  }
  await app.evaluate(() => window.__threadbound.dispatch({ type: 'settings', patch: { offset: { up: 0, near: 0 } } }));
  return results;
}
