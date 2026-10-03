import { describe, expect, test } from 'vitest';
import { ghostPose, GHOST_LOOP_SECONDS, onboardingHint, onboardingStep } from '../../src/lib/onboarding';

const fresh = { hasSolvedAny: false, levelIndex: 0, playerThreads: 0, status: 'idle' as const };

describe('onboardingStep: what the first-time player is shown next', () => {
  test('a brand-new player is taught pinch-pull first', () => {
    expect(onboardingStep(fresh)).toBe('pinch-pull');
  });

  test('after the first thread, the chute', () => {
    expect(onboardingStep({ ...fresh, playerThreads: 1 })).toBe('drop');
  });

  test('while marbles fall, the ghost steps back so the player watches', () => {
    expect(onboardingStep({ ...fresh, playerThreads: 1, status: 'dropping' })).toBe('watch');
  });

  test('a solve, any earlier solve, or another level ends onboarding', () => {
    expect(onboardingStep({ ...fresh, playerThreads: 1, status: 'complete' })).toBe('done');
    expect(onboardingStep({ ...fresh, hasSolvedAny: true })).toBe('done');
    expect(onboardingStep({ ...fresh, levelIndex: 1 })).toBe('done');
  });

  test('every teaching step has a short ASCII hint; done has none', () => {
    expect(onboardingHint('pinch-pull')).toMatch(/^[\x20-\x7e]+$/);
    expect(onboardingHint('drop')).toMatch(/chute/i);
    expect(onboardingHint('done')).toBe('');
  });
});

describe('ghostPose: the looping pinch-pull demonstration', () => {
  test('starts open over the first peg', () => {
    expect(ghostPose(0)).toMatchObject({ along: 0, pinch: 0, thread: false });
  });

  test('pinches before moving, so the gesture reads as grab-then-pull', () => {
    const pinched = ghostPose(0.9);
    expect(pinched.pinch).toBe(1);
    expect(pinched.along).toBe(0);
  });

  test('pulls a thread to the second peg while pinched', () => {
    const mid = ghostPose(1.55);
    expect(mid.pinch).toBe(1);
    expect(mid.thread).toBe(true);
    expect(mid.along).toBeGreaterThan(0.3);
    expect(mid.along).toBeLessThan(0.7);
  });

  test('releases on the second peg', () => {
    expect(ghostPose(2.5)).toMatchObject({ along: 1, pinch: 0 });
  });

  test('loops', () => {
    expect(ghostPose(GHOST_LOOP_SECONDS + 1.55)).toEqual(ghostPose(1.55));
  });

  test('fades in and out at the loop seam instead of popping', () => {
    expect(ghostPose(0).opacity).toBeLessThan(0.2);
    expect(ghostPose(1.55).opacity).toBe(1);
    expect(ghostPose(GHOST_LOOP_SECONDS - 0.01).opacity).toBeLessThan(0.2);
  });
});
