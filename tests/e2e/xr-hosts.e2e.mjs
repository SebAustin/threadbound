// Helper for xr-hosts.sh: records every cross-origin URL the app frame requests.
// HOSTS=observe installs a resource PerformanceObserver (call it before `xr enter`).
// HOSTS=list waits until both generic-hand models have loaded, then returns what it recorded.
// An observer, not performance.getEntriesByType afterwards: in dev, Vite's modules fill
// the 250-entry resource-timing buffer before XR entry, and later entries never reach it.
// list also reports what the buffer alone holds, to show that gap on every run.
// Only the generic-hand models: IWER connects Touch Plus controllers before `set-input-mode hand`,
// and their .glb files under the same jsDelivr path must not stand in for the hands.
const HAND_MODEL = /\/profiles\/generic-hand\/(left|right)\.glb$/;
const HANDS = 2;
const TIMEOUT_MS = 15000;
const POLL_MS = 100;
/** After both hand models, let any trailing request of the session start land. */
const TRAILING_MS = 1500;

const MODES = {
  observe: (app) =>
    app.evaluate(() => {
      const seen = new Set();
      const record = (entries) => {
        for (const e of entries) {
          const url = new URL(e.name, location.href);
          if (url.protocol.startsWith('http') && url.origin !== location.origin) seen.add(url.href);
        }
      };
      const observer = new PerformanceObserver((list) => record(list.getEntries()));
      observer.observe({ type: 'resource', buffered: true });
      window.__xrHosts = { seen, observer };
      return { observing: true, origin: location.origin, bufferedAtInstall: performance.getEntriesByType('resource').length };
    }),
  list: (app) =>
    app.evaluate(
      async ({ handModel, hands, timeout, poll, trailing }) => {
        const hosts = window.__xrHosts;
        if (!hosts) return { observing: false };
        const isHand = (u) => new RegExp(handModel).test(u);
        const start = performance.now();
        while ([...hosts.seen].filter(isHand).length < hands && performance.now() - start < timeout) {
          await new Promise((r) => setTimeout(r, poll));
        }
        await new Promise((r) => setTimeout(r, trailing));
        const buffer = performance.getEntriesByType('resource').map((e) => e.name);
        return {
          observing: true,
          urls: [...hosts.seen].sort(),
          handModels: [...hosts.seen].filter(isHand).length,
          waitedMs: Math.round(performance.now() - start),
          bufferSize: buffer.length,
          bufferHandModels: buffer.filter(isHand).length,
        };
      },
      { handModel: HAND_MODEL.source, hands: HANDS, timeout: TIMEOUT_MS, poll: POLL_MS, trailing: TRAILING_MS },
    ),
};

export default async function run({ page, frame }) {
  const app = frame ?? page.mainFrame();
  const mode = MODES[process.env.HOSTS];
  if (!mode) throw new Error(`HOSTS must be one of ${Object.keys(MODES).join(', ')}, got ${process.env.HOSTS}`);
  return mode(app);
}
