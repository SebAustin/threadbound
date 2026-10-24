import { describe, expect, test } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/lib/settings';
import { bootErrorMessage, entryView } from '../../src/lib/xrMode';
import { DEFAULT_SETTINGS as E2E_DEFAULT_SETTINGS } from '../e2e/reset-settings.e2e.mjs';
import { BOOT_ERROR_START, LAUNCH_FAILED_NOTE, NO_XR_NOTE } from '../e2e/entry-notes.mjs';

// A Playwright script can't import the app's TypeScript, so tests/e2e/reset-settings.e2e.mjs keeps
// its own copy of DEFAULT_SETTINGS. The video kit's reset before every shot and the preflight's
// "default settings" check compare only the keys that copy names: a setting missing from it would
// pass unnoticed.
describe('the E2E copy of DEFAULT_SETTINGS', () => {
  test('matches src/lib/settings.ts exactly', () => {
    expect(E2E_DEFAULT_SETTINGS).toEqual(DEFAULT_SETTINGS);
  });
});

describe('the E2E copy of the entry lines', () => {
  test('matches the notes entryView shows', () => {
    expect(entryView({ mode: null, launchFailed: false }).note).toBe(NO_XR_NOTE);
    expect(entryView({ mode: 'immersive-ar', launchFailed: true }).note).toBe(LAUNCH_FAILED_NOTE);
  });

  test('matches how bootErrorMessage starts, for an Error and for anything else', () => {
    expect(bootErrorMessage(new Error('reason')).startsWith(BOOT_ERROR_START)).toBe(true);
    expect(bootErrorMessage(undefined).startsWith(BOOT_ERROR_START)).toBe(true);
  });
});
