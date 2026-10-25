import { describe, expect, test } from 'vitest';
import { RESET_WINDOW_SECONDS, resetLabel, resetPinch } from '../../src/lib/resetGuard';

describe('resetPinch: wiping progress needs two pinches close together', () => {
  test('a first pinch only arms the reset', () => {
    expect(resetPinch({ armedAt: null }, 10)).toEqual({ guard: { armedAt: 10 }, reset: false });
  });

  test('a second pinch within the window resets and disarms', () => {
    expect(resetPinch({ armedAt: 10 }, 10 + RESET_WINDOW_SECONDS - 0.1)).toEqual({ guard: { armedAt: null }, reset: true });
  });

  test('a late second pinch just arms it again', () => {
    expect(resetPinch({ armedAt: 10 }, 10 + RESET_WINDOW_SECONDS + 0.1)).toEqual({
      guard: { armedAt: 10 + RESET_WINDOW_SECONDS + 0.1 },
      reset: false,
    });
  });
});

describe('resetLabel: what the control says', () => {
  test('asks for confirmation only while armed', () => {
    expect(resetLabel({ armedAt: null }, 0)).toBe('Reset progress');
    expect(resetLabel({ armedAt: 10 }, 11)).toBe('Confirm reset');
    expect(resetLabel({ armedAt: 10 }, 10 + RESET_WINDOW_SECONDS + 1)).toBe('Reset progress');
  });
});
