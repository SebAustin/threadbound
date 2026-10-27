import { describe, expect, test } from 'vitest';
import { CADENCE_HZ, MELODY_STEP_SECONDS, replaySchedule, type ScheduledNote } from '../../src/lib/melody';
import { BOOK_REST_SECONDS, bookPlaylist, bookTunes, hasTune } from '../../src/lib/melodyBook';

const levels = [{ id: 'w1-01' }, { id: 'w1-02' }, { id: 'w1-03' }, { id: 'w1-04' }];
const TIMED = { notes: [261.63, 329.63, 392.0], times: [0.4, 0.75, 1.3] };
/** An entry saved before timing: no times, so it replays at the fixed step. */
const BARE = { notes: [440.0, 523.25, 587.33, 659.25], times: [] };

/** Splits a playlist into tunes: each ends on its cadence's last note. */
function tunes(playlist: readonly ScheduledNote[]): ScheduledNote[][] {
  const out: ScheduledNote[][] = [[]];
  playlist.forEach((item, i) => {
    out[out.length - 1].push(item);
    const closes = item.cue === 'cadence' && playlist[i + 1]?.cue !== 'cadence';
    if (closes && i < playlist.length - 1) out.push([]);
  });
  return out;
}

describe('bookPlaylist: the whole melody book, every tune as its stars replay it', () => {
  // w1-04 is listed first: the playlist still follows campaign order.
  const book = { 'w1-04': BARE, 'w1-01': TIMED };
  const playlist = bookPlaylist(levels, book, BOOK_REST_SECONDS);

  test('the rest between tunes is 0.8 s', () => {
    expect(BOOK_REST_SECONDS).toBe(0.8);
  });

  test("equals each entry's replaySchedule in campaign order, cue and note included, offset so each tune starts 0.8 s after the previous cadence", () => {
    const first = replaySchedule(TIMED, true);
    const start = first[first.length - 1].at + BOOK_REST_SECONDS;
    const second = replaySchedule(BARE, true).map((item) => ({ ...item, at: start + item.at }));
    expect(playlist).toEqual([...first, ...second]);
  });

  test('each tune ends on its cadence (C5 E5 G5), which marks where it ends', () => {
    const split = tunes(playlist);
    expect(split).toHaveLength(2);
    for (const tune of split) {
      expect(tune.slice(-3).map((n) => n.cue)).toEqual(['cadence', 'cadence', 'cadence']);
      expect(tune.slice(-3).map((n) => n.hz)).toEqual([...CADENCE_HZ]);
      expect(tune.slice(-3).map((n) => n.note)).toEqual([-1, -1, -1]);
    }
  });

  test('levels with no entry are skipped', () => {
    const melodies = playlist.filter((n) => n.cue === 'melody').map((n) => n.hz);
    expect(melodies).toEqual([...TIMED.notes, ...BARE.notes]);
  });

  test('timed entries keep their real offsets; a bare-array entry keeps the 0.22 s step', () => {
    const [first, second] = tunes(playlist).map((t) => t.filter((n) => n.cue === 'melody'));
    const gaps = (tune: ScheduledNote[]) => tune.slice(1).map((n, i) => n.at - tune[i].at);
    expect(gaps(first)).toEqual([expect.closeTo(0.35, 9), expect.closeTo(0.55, 9)]);
    for (const gap of gaps(second)) expect(gap).toBeCloseTo(MELODY_STEP_SECONDS, 9);
    // Each tune's own note indices, for the stars' visual caption.
    expect(first.map((n) => n.note)).toEqual([0, 1, 2]);
    expect(second.map((n) => n.note)).toEqual([0, 1, 2, 3]);
  });

  test('the next tune starts 0.8 s after the previous cadence, then keeps its own lead-in', () => {
    const [first, second] = tunes(playlist);
    const cadenceEnd = first[first.length - 1].at;
    expect(second[0].at - cadenceEnd).toBeCloseTo(BOOK_REST_SECONDS + MELODY_STEP_SECONDS, 9);
  });

  test('an empty book gives an empty playlist; an entry with no notes is no tune', () => {
    expect(bookPlaylist(levels, {}, BOOK_REST_SECONDS)).toEqual([]);
    expect(bookPlaylist(levels, { 'w1-02': { notes: [], times: [] } }, BOOK_REST_SECONDS)).toEqual([]);
  });

  test('ids that are not campaign levels (a stale save) are ignored', () => {
    expect(bookPlaylist(levels, { 'w9-09': TIMED }, BOOK_REST_SECONDS)).toEqual([]);
  });
});

describe('bookTunes: how many tunes the book holds (the play-all count)', () => {
  test('counts campaign levels with a tune', () => {
    expect(bookTunes(levels, { 'w1-04': BARE, 'w1-01': TIMED, 'w1-02': { notes: [], times: [] }, stale: TIMED })).toBe(2);
    expect(bookTunes(levels, {})).toBe(0);
  });

  test('hasTune: an entry with at least one note', () => {
    expect(hasTune(TIMED)).toBe(true);
    expect(hasTune({ notes: [], times: [] })).toBe(false);
    expect(hasTune(undefined)).toBe(false);
  });
});
