import { describe, expect, test } from 'vitest';
import { resolveSessionMode, shouldShowVirtualRoom } from '../../src/lib/xrMode';

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
