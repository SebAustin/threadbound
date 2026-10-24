// Helper for the XR shell tests: a deterministic wait instead of fixed sleeps.
// Resolves once the game hook is up, the diorama has stopped moving and its fade-in is
// over (`placement().reveal` is 1, so it is placed and shown), and, with WANT=session,
// an immersive session is running (AR places the diorama again on entry, hidden until then).
const TIMEOUT_MS = 20000;
const POLL_MS = 100;
/** The frame must hold still this long to count as placed. */
const STILL_MS = 1000;

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const wantSession = process.env.WANT === 'session';
  return app.evaluate(
    async ({ wantSession, timeout, poll, still }) => {
      const start = performance.now();
      let last = '';
      let stillSince = performance.now();
      while (performance.now() - start < timeout) {
        const hook = window.__threadbound;
        const shown = hook?.placement().reveal === 1;
        const ready = Boolean(hook?.state().level) && shown && (!wantSession || hook.room().blendMode !== null);
        const origin = JSON.stringify(hook?.frame()?.origin ?? null);
        if (origin !== last) {
          last = origin;
          stillSince = performance.now();
        }
        if (ready && performance.now() - stillSince >= still) return { ok: true, waitedMs: Math.round(performance.now() - start) };
        await new Promise((r) => setTimeout(r, poll));
      }
      return { ok: false, waitedMs: timeout };
    },
    { wantSession, timeout: TIMEOUT_MS, poll: POLL_MS, still: STILL_MS },
  );
}
