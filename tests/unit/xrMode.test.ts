import { describe, expect, test } from 'vitest';
import { bootErrorMessage, entryView, resolveSessionMode, shouldShowVirtualRoom } from '../../src/lib/xrMode';

describe('resolveSessionMode', () => {
  test('prefers mixed reality (passthrough) when available', () => {
    expect(resolveSessionMode({ ar: true, vr: true })).toBe('immersive-ar');
  });

  test('falls back to VR when AR is unsupported (e.g. Safari on visionOS)', () => {
    expect(resolveSessionMode({ ar: false, vr: true })).toBe('immersive-vr');
  });

  test('returns null when no immersive mode is supported', () => {
    expect(resolveSessionMode({ ar: false, vr: false })).toBeNull();
  });
});

describe('shouldShowVirtualRoom', () => {
  test('shows the room in the flat browser view', () => {
    expect(shouldShowVirtualRoom(false, undefined)).toBe(true);
  });

  test('shows the room in an opaque (VR) session', () => {
    expect(shouldShowVirtualRoom(true, 'opaque')).toBe(true);
  });

  test('hides the room over passthrough so the real table shows', () => {
    expect(shouldShowVirtualRoom(true, 'alpha-blend')).toBe(false);
    expect(shouldShowVirtualRoom(true, 'additive')).toBe(false);
  });

  test('keeps the room when an immersive blend mode is unknown', () => {
    expect(shouldShowVirtualRoom(true, undefined)).toBe(true);
  });
});

describe('entryView', () => {
  test.each(['immersive-ar', 'immersive-vr'] as const)('offers the button with no note for %s', (mode) => {
    expect(entryView({ mode, launchFailed: false })).toEqual({ button: true, note: '' });
  });

  test('offers no button and points to Quest Browser when no immersive mode is supported', () => {
    expect(entryView({ mode: null, launchFailed: false })).toEqual({
      button: false,
      note: 'Open in Quest Browser to play in mixed reality',
    });
  });

  test('shows nothing while support is still being checked', () => {
    expect(entryView({ mode: 'checking', launchFailed: false })).toEqual({ button: false, note: '' });
  });

  test('keeps the button and asks for a retry after a failed launch', () => {
    expect(entryView({ mode: 'immersive-ar', launchFailed: true })).toEqual({
      button: true,
      note: "Couldn't start XR - try Enter XR again",
    });
  });

  test('a failed launch never brings the button back where XR is unsupported', () => {
    expect(entryView({ mode: null, launchFailed: true }).button).toBe(false);
  });
});

describe('bootErrorMessage', () => {
  const GENERIC = "Threadbound couldn't start. Reload the page to try again.";

  test('names the reason of an Error in one short, plain line', () => {
    const message = bootErrorMessage(new Error('Failed to fetch scene'));
    expect(message).toBe("Threadbound couldn't start: Failed to fetch scene. Reload the page to try again.");
  });

  test('never includes a stack, even when the message spans lines', () => {
    const error = new Error('first line\n    at World.create (world.js:1:1)');
    const message = bootErrorMessage(error);
    expect(message).toContain('first line');
    expect(message).not.toContain('\n');
    expect(message).not.toContain('world.js');
    for (const frame of (error.stack ?? '').split('\n').slice(1)) expect(message).not.toContain(frame.trim());
  });

  test('keeps a long reason short', () => {
    expect(bootErrorMessage(new Error('x'.repeat(500))).length).toBeLessThanOrEqual(160);
  });

  test.each([
    ['a string', 'boom'],
    ['undefined', undefined],
    ['an object', { code: 42 }],
    ['an Error with no message', new Error('')],
  ])('gives the generic line for %s', (_label, error) => {
    expect(bootErrorMessage(error)).toBe(GENERIC);
  });
});
