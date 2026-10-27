import { describe, expect, test } from 'vitest';
import { SUN_PULSE_SECONDS, sunPulseScale, sunPulses } from '../../src/lib/signposts';

const campaign = { inDaily: false, hasSolvedAny: true, solvedToday: false };

describe("sunPulses: the sun signals today's unsolved daily", () => {
  test('off before any campaign solve, so it never competes with the ghost hand', () => {
    expect(sunPulses({ ...campaign, hasSolvedAny: false })).toBe(false);
  });

  test('on from the first campaign solve while today is unsolved', () => {
    expect(sunPulses(campaign)).toBe(true);
  });

  test('off inside a daily (there the sun is the way back)', () => {
    expect(sunPulses({ ...campaign, inDaily: true })).toBe(false);
  });

  test("off once today's daily has stars", () => {
    expect(sunPulses({ ...campaign, solvedToday: true })).toBe(false);
  });
});

describe('sunPulseScale: a gentle, repeating swell of the sun icon', () => {
  const samples = Array.from({ length: 200 }, (_, i) => (i / 200) * SUN_PULSE_SECONDS * 3);

  test('stays within [1, 1.15]', () => {
    for (const t of samples) {
      const s = sunPulseScale(t);
      expect(s, `t=${t}`).toBeGreaterThanOrEqual(1);
      expect(s, `t=${t}`).toBeLessThanOrEqual(1.15);
    }
  });

  test('swells visibly (to near 1.15) and settles back to 1', () => {
    const scales = samples.map(sunPulseScale);
    expect(Math.max(...scales)).toBeGreaterThan(1.14);
    expect(Math.min(...scales)).toBeLessThan(1.01);
    expect(sunPulseScale(0)).toBe(1);
  });

  test('repeats every SUN_PULSE_SECONDS (about a breath, 1 to 3 s)', () => {
    expect(SUN_PULSE_SECONDS).toBeGreaterThanOrEqual(1);
    expect(SUN_PULSE_SECONDS).toBeLessThanOrEqual(3);
    for (const t of samples) expect(sunPulseScale(t + SUN_PULSE_SECONDS)).toBeCloseTo(sunPulseScale(t), 9);
  });
});
