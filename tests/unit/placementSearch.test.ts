import { describe, expect, test, vi } from 'vitest';
import {
  createSearch,
  requestRestart,
  REVEAL_SECONDS,
  revealOpacity,
  SEARCH,
  startSearch,
  stepSearch,
  type PlacementSearch,
  type SearchFrame,
} from '../../src/lib/placementSearch';

const TABLE = { on: 'the table' } as const;
const STEP = SEARCH.evaluateEvery;

const frame = (over: Partial<SearchFrame> = {}): SearchFrame => ({
  delta: STEP,
  paused: false,
  status: 'idle',
  playerThreads: 0,
  drags: 0,
  ...over,
});

const started = (): PlacementSearch => {
  const search = createSearch();
  startSearch(search);
  return search;
};

const noTable = () => null;

/** Steps the search for `seconds` of frames; returns every placement it asked for, in order. */
function run(search: PlacementSearch, seconds: number, over: Partial<SearchFrame> = {}, findTable: () => typeof TABLE | null = noTable) {
  const placed: string[] = [];
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i++) {
    const place = stepSearch(search, frame(over), findTable);
    if (place) placed.push(place.surface);
  }
  return placed;
}

describe('stepSearch: the table search only runs while the player can see it', () => {
  test('while paused, the step neither advances nor evaluates, so nothing is placed, even with a table in view', () => {
    const search = started();
    const findTable = vi.fn(() => TABLE);
    expect(run(search, 20, { paused: true }, findTable)).toEqual([]);
    expect(findTable).not.toHaveBeenCalled();
    expect(search.elapsed).toBe(0);
    expect(search.hidden).toBe(true);
    expect(search.phase).toBe('searching');
  });

  test('the first look comes one evaluation period in, not on the first frame (plane reports may still be arriving)', () => {
    const search = started();
    const findTable = vi.fn(() => TABLE);
    expect(stepSearch(search, frame({ delta: SEARCH.evaluateEvery / 2 }), findTable)).toBeNull();
    expect(findTable).not.toHaveBeenCalled();
    expect(search.hidden).toBe(true);
    expect(stepSearch(search, frame({ delta: SEARCH.evaluateEvery / 2 }), findTable)).toEqual({ surface: 'table', placement: TABLE });
  });

  test('a new search keeps the diorama hidden', () => {
    expect(started().hidden).toBe(true);
    expect(createSearch().hidden).toBe(false);
  });

  test.each([
    ['a drop', { status: 'dropping' as const }],
    ['a drag', { drags: 1 }],
  ])('a search started during %s places nothing, and stays hidden, until it ends', (_name, busy) => {
    const search = started();
    const findTable = vi.fn(() => TABLE);
    expect(run(search, SEARCH.floatAfter + 2, busy, findTable)).toEqual([]);
    expect(findTable).not.toHaveBeenCalled();
    expect(search.hidden).toBe(true);
    expect(search.phase).toBe('searching');
    // Over: the search runs as if it started now, so its first look takes the table.
    expect(run(search, STEP, {}, findTable)).toEqual(['table']);
    expect(search.hidden).toBe(false);
  });

  test('with no table, a search held by a drop floats a full 3 s of visible time after the drop ends', () => {
    const search = started();
    expect(run(search, SEARCH.floatAfter + 2, { status: 'dropping' })).toEqual([]);
    expect(run(search, SEARCH.floatAfter - STEP)).toEqual([]);
    expect(search.hidden).toBe(true);
    expect(run(search, STEP)).toEqual(['floating']);
  });

  test('a table found at any point places the diorama on it, shows it and ends the search', () => {
    const search = started();
    const place = stepSearch(search, frame(), () => TABLE);
    expect(place).toEqual({ surface: 'table', placement: TABLE });
    expect(search.hidden).toBe(false);
    expect(search.phase).toBe('done');
  });
});

describe('stepSearch: floating, and a table that shows up later', () => {
  test('floats after 3 s of visible time with no table, however many paused frames come between', () => {
    const search = started();
    expect(run(search, SEARCH.floatAfter - STEP)).toEqual([]);
    expect(run(search, 30, { paused: true })).toEqual([]);
    expect(search.hidden).toBe(true);
    expect(run(search, STEP)).toEqual(['floating']);
    expect(search.hidden).toBe(false);
    expect(search.phase).toBe('floating');
  });

  test('a table at 10 s moves an untouched idle level', () => {
    const search = started();
    expect(run(search, 10)).toEqual(['floating']);
    expect(run(search, STEP, {}, () => TABLE)).toEqual(['table']);
    expect(search.phase).toBe('done');
  });

  test.each([
    ['a player thread', { playerThreads: 1 }],
    ['a drag', { drags: 1 }],
    ['a drop', { status: 'dropping' as const }],
    ['a solve', { status: 'complete' as const }],
  ])('a table at 10 s leaves a floating level with %s where it is', (_name, touched) => {
    const search = started();
    run(search, 10);
    const findTable = vi.fn(() => TABLE);
    expect(run(search, 2, touched, findTable)).toEqual([]);
    expect(findTable).not.toHaveBeenCalled();
    expect(search.phase).toBe('floating');
  });

  test('no evaluation after 18 s of visible time', () => {
    const search = started();
    run(search, SEARCH.keepLookingUntil);
    const findTable = vi.fn(() => TABLE);
    expect(run(search, 5, {}, findTable)).toEqual([]);
    expect(findTable).not.toHaveBeenCalled();
    expect(search.phase).toBe('done');
  });

  test('no evaluation once on a table', () => {
    const search = started();
    run(search, STEP, {}, () => TABLE);
    const findTable = vi.fn(() => TABLE);
    expect(run(search, 20, {}, findTable)).toEqual([]);
    expect(findTable).not.toHaveBeenCalled();
  });
});

describe('requestRestart: a recenter restarts the search', () => {
  test('restarts hidden and from zero, after a drop and then a drag have ended', () => {
    const search = started();
    run(search, STEP, {}, () => TABLE);
    requestRestart(search);
    expect(run(search, 2, { status: 'dropping' })).toEqual([]);
    expect(run(search, 2, { drags: 1 })).toEqual([]);
    expect(search.hidden).toBe(false);
    expect(search.phase).toBe('done');
    // Both over: the search restarts, hidden, and floats a full 3 s of visible time later.
    expect(run(search, SEARCH.floatAfter - STEP)).toEqual([]);
    expect(search.hidden).toBe(true);
    expect(search.phase).toBe('searching');
    expect(run(search, STEP)).toEqual(['floating']);
  });

  test('a restarted search places on a table it finds straight away', () => {
    const search = started();
    run(search, SEARCH.floatAfter);
    requestRestart(search);
    expect(run(search, STEP, { playerThreads: 1 }, () => TABLE)).toEqual(['table']);
  });

  test('does nothing outside passthrough (no search was ever started)', () => {
    const search = createSearch();
    requestRestart(search);
    const findTable = vi.fn(() => TABLE);
    expect(run(search, 5, {}, findTable)).toEqual([]);
    expect(findTable).not.toHaveBeenCalled();
    expect(search.hidden).toBe(false);
  });
});

describe('revealOpacity: the one fade every build gets', () => {
  test('is 0 at build and 1 from 0.3 s on', () => {
    expect(REVEAL_SECONDS).toBeCloseTo(0.3);
    expect(revealOpacity(0)).toBe(0);
    expect(revealOpacity(REVEAL_SECONDS)).toBe(1);
    expect(revealOpacity(REVEAL_SECONDS + 0.01)).toBe(1);
    expect(revealOpacity(5)).toBe(1);
  });

  test('rises in between, and is clamped to 0..1', () => {
    const samples = Array.from({ length: 31 }, (_, i) => revealOpacity((i / 30) * REVEAL_SECONDS));
    for (let i = 1; i < samples.length; i++) expect(samples[i]).toBeGreaterThan(samples[i - 1]);
    expect(revealOpacity(REVEAL_SECONDS / 2)).toBeGreaterThan(0);
    expect(revealOpacity(REVEAL_SECONDS / 2)).toBeLessThan(1);
    expect(revealOpacity(-1)).toBe(0);
  });
});
