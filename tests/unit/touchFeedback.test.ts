import { describe, expect, test } from 'vitest';
import { HIT_ORDER, PRESS_TRAVEL, touchState, TOUCH_KINDS } from '../../src/lib/touchFeedback';

const MM = 0.001;

describe('touchState: what a touched part shows', () => {
  test('press beats target, target beats hover, hover beats rest', () => {
    expect(touchState({ hovered: true, pressed: true, target: true })).toBe('press');
    expect(touchState({ hovered: false, pressed: true, target: false })).toBe('press');
    expect(touchState({ hovered: true, pressed: false, target: true })).toBe('target');
    expect(touchState({ hovered: false, pressed: false, target: true })).toBe('target');
    expect(touchState({ hovered: true, pressed: false, target: false })).toBe('hover');
    expect(touchState({ hovered: false, pressed: false, target: false })).toBe('rest');
  });
});

describe('PRESS_TRAVEL: how far a pressed part moves', () => {
  test('every kind has a travel of 0 or 4-7 mm', () => {
    for (const kind of TOUCH_KINDS) {
      const travel = PRESS_TRAVEL[kind];
      expect(travel === 0 || (travel >= 4 * MM && travel <= 7 * MM), `${kind}: ${travel}`).toBe(true);
    }
  });

  test('the ledge button sinks; pegs and threads stay put', () => {
    expect(PRESS_TRAVEL.button).toBeGreaterThan(0);
    expect(PRESS_TRAVEL.peg).toBe(0);
    expect(PRESS_TRAVEL.thread).toBe(0);
  });
});

describe('HIT_ORDER: which part a ray takes when several are under it', () => {
  test('a knob beats a tab, which beats a thread', () => {
    expect(HIT_ORDER.knob).toBeGreaterThan(HIT_ORDER.tab);
    expect(HIT_ORDER.tab).toBeGreaterThan(HIT_ORDER.thread);
  });
});
