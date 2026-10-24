import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { onTap } from '../../src/features/input/onTap';

type Listener = (event: { pointerId: number }) => void;

/** A stand-in for a UIKit element: it records listeners and lets the test fire pointer events. */
function fakeTarget() {
  const listeners = new Map<string, Set<Listener>>();
  return {
    listeners,
    addEventListener(type: string, listener: Listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(listener);
    },
    removeEventListener(type: string, listener: Listener) {
      listeners.get(type)?.delete(listener);
    },
    fire(type: 'pointerdown' | 'pointerup', pointerId: number) {
      for (const listener of listeners.get(type) ?? []) listener({ pointerId });
    },
    count: () => [...listeners.values()].reduce((n, set) => n + set.size, 0),
  };
}

describe('onTap', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test.each([0, 299, 800, 6000])('a press released %i ms later fires once', (holdMs) => {
    const target = fakeTarget();
    const action = vi.fn();
    onTap(target, action);
    target.fire('pointerdown', 1);
    vi.advanceTimersByTime(holdMs);
    target.fire('pointerup', 1);
    expect(action).toHaveBeenCalledTimes(1);
  });

  test('a release from another pointer does not fire', () => {
    const target = fakeTarget();
    const action = vi.fn();
    onTap(target, action);
    target.fire('pointerdown', 1);
    target.fire('pointerup', 2);
    expect(action).not.toHaveBeenCalled();
  });

  test('a release with no press before it does not fire', () => {
    const target = fakeTarget();
    const action = vi.fn();
    onTap(target, action);
    target.fire('pointerup', 1);
    expect(action).not.toHaveBeenCalled();
  });

  test('the teardown removes both listeners', () => {
    const target = fakeTarget();
    const action = vi.fn();
    const off = onTap(target, action);
    expect(target.count()).toBe(2);
    off();
    expect(target.count()).toBe(0);
    target.fire('pointerdown', 1);
    target.fire('pointerup', 1);
    expect(action).not.toHaveBeenCalled();
  });

  test('a target without listeners gets a no-op teardown', () => {
    expect(() => onTap(undefined, () => {})()).not.toThrow();
  });
});
