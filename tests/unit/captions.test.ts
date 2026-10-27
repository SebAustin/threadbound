import { describe, expect, test } from 'vitest';
import { CUP_FLASH_SECONDS, cupFlash, STAR_PULSE_SECONDS, starForNote, starPulseScale } from '../../src/lib/captions';

/** cupFlash sampled every millisecond: the phases in order, each run collapsed to one entry. */
function phases(): (string | null)[] {
  const seen: (string | null)[] = [];
  for (let ms = 0; ms <= CUP_FLASH_SECONDS * 1000 + 50; ms++) {
    const phase = cupFlash(ms / 1000);
    if (seen[seen.length - 1] !== phase) seen.push(phase);
  }
  return seen;
}

describe('cupFlash: a wrong cup blinks bright and dark', () => {
  test('it starts bright and alternates bright and dark at least twice, then returns null', () => {
    const seen = phases();
    expect(seen[0]).toBe('bright');
    expect(seen[seen.length - 1]).toBeNull();
    const blinks = seen.slice(0, -1);
    expect(blinks.filter((p) => p === 'bright').length).toBeGreaterThanOrEqual(2);
    expect(blinks.filter((p) => p === 'dark').length).toBeGreaterThanOrEqual(2);
    blinks.forEach((p, i) => expect(p).toBe(i % 2 === 0 ? 'bright' : 'dark'));
  });

  test('it lasts about half a second', () => {
    expect(CUP_FLASH_SECONDS).toBeGreaterThanOrEqual(0.4);
    expect(CUP_FLASH_SECONDS).toBeLessThanOrEqual(0.6);
    expect(cupFlash(CUP_FLASH_SECONDS)).toBeNull();
    expect(cupFlash(-0.01)).toBeNull();
  });
});

describe('starPulseScale: a replayed note swells a star', () => {
  test('it is 1 at its start and its end, and back to 1 after', () => {
    expect(starPulseScale(0)).toBe(1);
    expect(starPulseScale(STAR_PULSE_SECONDS)).toBe(1);
    expect(starPulseScale(STAR_PULSE_SECONDS + 1)).toBe(1);
  });

  test('it peaks at 1.3 or more, in about 0.2 s', () => {
    let peak = 0;
    for (let ms = 0; ms <= STAR_PULSE_SECONDS * 1000; ms++) peak = Math.max(peak, starPulseScale(ms / 1000));
    expect(peak).toBeGreaterThanOrEqual(1.3);
    expect(STAR_PULSE_SECONDS).toBeGreaterThanOrEqual(0.15);
    expect(STAR_PULSE_SECONDS).toBeLessThanOrEqual(0.25);
  });
});

describe('starForNote: the star a saved note pulses', () => {
  test('notes 0, 1, 2 and 3 pulse stars 0, 1, 2 and 0', () => {
    expect([0, 1, 2, 3].map(starForNote)).toEqual([0, 1, 2, 0]);
  });
});
