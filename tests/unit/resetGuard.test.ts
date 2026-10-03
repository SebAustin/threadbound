import { describe, expect, test } from 'vitest';
import { RESET_WINDOW_SECONDS, resetLabel, resetPoke } from '../../src/lib/resetGuard';

describe('resetPoke: wiping progress needs two pokes close together', () => {
  test('a first poke only arms the reset', () => {
    expect(resetPoke({ armedAt: null }, 10)).toEqual({ guard: { armedAt: 10 }, reset: false });
  });

  test('a second poke within the window resets and disarms', () => {
    expect(resetPoke({ armedAt: 10 }, 10 + RESET_WINDOW_SECONDS - 0.1)).toEqual({ guard: { armedAt: null }, reset: true });
  });

  test('a late second poke just arms it again', () => {
    expect(resetPoke({ armedAt: 10 }, 10 + RESET_WINDOW_SECONDS + 0.1)).toEqual({
      guard: { armedAt: 10 + RESET_WINDOW_SECONDS + 0.1 },
      reset: false,
    });
  });
});

describe('resetLabel: what the control says', () => {
  test('asks for confirmation only while armed', () => {
    expect(resetLabel({ armedAt: null }, 0)).toBe('Reset progress');
    expect(resetLabel({ armedAt: 10 }, 11)).toBe('Poke again to reset');
    expect(resetLabel({ armedAt: 10 }, 10 + RESET_WINDOW_SECONDS + 1)).toBe('Reset progress');
  });
});
