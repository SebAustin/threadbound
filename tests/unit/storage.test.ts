import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { isGuestPlay, type StorageLike } from '../../src/lib/storage';

const KEY = 'threadbound.progress.v1';
const SAVE = '{"unlocked":3,"best":{"w1-01":3,"w1-02":2,"w1-03":1}}';

describe('isGuestPlay: ?fresh=1 opens the game without the saved progress', () => {
  test.each(['?fresh=1', '?x=2&fresh=1'])('%s is guest play', (search) => {
    expect(isGuestPlay(search)).toBe(true);
  });

  test.each(['', '?fresh=0', '?fresh', '?refresh=1'])('%s is not guest play', (search) => {
    expect(isGuestPlay(search)).toBe(false);
  });
});

/** A localStorage holding a save, which records every key written to it. */
function savedLocalStorage(): StorageLike & { writes: string[] } {
  const map = new Map([[KEY, SAVE]]);
  return {
    writes: [],
    getItem: (key) => map.get(key) ?? null,
    setItem(key, value) {
      this.writes.push(key);
      map.set(key, value);
    },
  };
}

/** A fresh copy of the module, so its one guest store starts unmade in every test. */
async function freshModule() {
  vi.resetModules();
  return import('../../src/lib/storage');
}

describe('browserStorage: guest play reads and keeps nothing', () => {
  let stub: ReturnType<typeof savedLocalStorage>;

  beforeEach(() => {
    stub = savedLocalStorage();
    vi.stubGlobal('localStorage', stub);
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('the save is never read, and guest writes never reach localStorage', async () => {
    const { browserStorage } = await freshModule();
    const guest = browserStorage('?fresh=1');
    expect(guest.getItem(KEY)).toBeNull();
    guest.setItem(KEY, '{"unlocked":0,"best":{}}');
    expect(guest.getItem(KEY)).toBe('{"unlocked":0,"best":{}}');
    expect(stub.writes).toEqual([]);
    expect(stub.getItem(KEY)).toBe(SAVE);
  });

  test('every guest call shares one store for the page load, announced once', async () => {
    const { browserStorage } = await freshModule();
    const first = browserStorage('?fresh=1');
    const second = browserStorage('?x=2&fresh=1');
    expect(second).toBe(first);
    expect(console.info).toHaveBeenCalledTimes(1);
    expect(vi.mocked(console.info).mock.calls[0][0]).toMatch(/progress is neither read nor saved/);
  });

  test('without ?fresh=1 it is the browser localStorage', async () => {
    const { browserStorage } = await freshModule();
    expect(browserStorage('')).toBe(stub);
    expect(browserStorage('?fresh=0')).toBe(stub);
    expect(console.info).not.toHaveBeenCalled();
  });
});
