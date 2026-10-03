/** Dev-only diagnostics (E2E scripts collect `[Threadbound]` lines); stripped from production builds. */
export function devLog(message: string): void {
  if (import.meta.env.DEV) console.info(`[Threadbound] ${message}`);
}
