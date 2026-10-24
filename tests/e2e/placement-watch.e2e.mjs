// Helper for tests/e2e/xr-placement.sh: records what the player could see of the diorama while
// it is placed, so a shell script can tell "hidden until placed" from "shown, then moved".
// WATCH=start installs a page-side sampler (every 10 ms, by timer: window frames are not
// guaranteed during an XR session); WATCH=read stops it and returns the log. Each entry is a
// change in { hidden, ledge, ghost, placements, reveal } (reveal as 0, 'fading' or 1), with
// its time in ms since the start.
const SAMPLE_MS = 10;

const start = (sampleMs) => {
  const hook = window.__threadbound;
  clearInterval(window.__placementWatch?.timer);
  const log = [];
  const t0 = performance.now();
  let last = '';
  const sample = () => {
    const p = hook.placement();
    const entry = {
      hidden: hook.state().dioramaHidden,
      ledge: hook.ledge()?.visible ?? null,
      ghost: hook.ghost()?.visible ?? null,
      placements: p.placements,
      placedOn: p.placedOn,
      reveal: p.reveal === 0 ? 0 : p.reveal === 1 ? 1 : 'fading',
    };
    const key = JSON.stringify(entry);
    if (key !== last) log.push({ ms: Math.round(performance.now() - t0), ...entry });
    last = key;
  };
  sample();
  window.__placementWatch = { log, timer: setInterval(sample, sampleMs) };
  return { started: true, first: log[0] };
};

const read = () => {
  const watch = window.__placementWatch;
  if (!watch) return { log: null };
  clearInterval(watch.timer);
  return { log: watch.log };
};

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const mode = process.env.WATCH ?? 'read';
  if (mode === 'start') return app.evaluate(start, SAMPLE_MS);
  if (mode === 'read') return app.evaluate(read);
  throw new Error(`placement-watch: unknown WATCH mode '${mode}'`);
}
