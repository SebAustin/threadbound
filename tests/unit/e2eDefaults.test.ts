import { describe, expect, test } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/lib/settings';
import { DEFAULT_SETTINGS as E2E_DEFAULT_SETTINGS } from '../e2e/reset-settings.e2e.mjs';

// A Playwright script can't import the app's TypeScript, so tests/e2e/reset-settings.e2e.mjs keeps
// its own copy of DEFAULT_SETTINGS. The video kit's reset before every shot and the preflight's
// "default settings" check compare only the keys that copy names: a setting missing from it would
// pass unnoticed.
describe('the E2E copy of DEFAULT_SETTINGS', () => {
  test('matches src/lib/settings.ts exactly', () => {
    expect(E2E_DEFAULT_SETTINGS).toEqual(DEFAULT_SETTINGS);
  });
});
