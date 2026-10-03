import { describe, expect, test } from 'vitest';
import { shouldPause } from '../../src/lib/pausePolicy';

describe('shouldPause: the puzzle freezes whenever the player cannot see it', () => {
  test('keeps running in the browser and in a focused XR session', () => {
    expect(shouldPause({ xrVisibility: 'non-immersive', documentHidden: false })).toBe(false);
    expect(shouldPause({ xrVisibility: 'visible', documentHidden: false })).toBe(false);
  });

  test('pauses while the system menu covers the session', () => {
    expect(shouldPause({ xrVisibility: 'visible-blurred', documentHidden: false })).toBe(true);
  });

  test('pauses when the session is hidden (headset off, app switched)', () => {
    expect(shouldPause({ xrVisibility: 'hidden', documentHidden: false })).toBe(true);
  });

  test('pauses when the browser tab is hidden', () => {
    expect(shouldPause({ xrVisibility: 'non-immersive', documentHidden: true })).toBe(true);
  });
});
