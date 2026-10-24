// The entry lines in src/lib/xrMode.ts, for the E2E scripts (a Playwright script can't import the
// app's TypeScript). tests/unit/e2eDefaults.test.ts keeps this copy equal to the app's.

/** entryView's note where no immersive mode is supported. */
export const NO_XR_NOTE = 'Open in Quest Browser to play in mixed reality';
/** entryView's note after a launch that started no session. */
export const LAUNCH_FAILED_NOTE = "Couldn't start XR - try Enter XR again";
/** How every bootErrorMessage line starts. */
export const BOOT_ERROR_START = "Threadbound couldn't start";
