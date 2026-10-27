import { dailyVariant } from '../lib/dailyVariant';
import { parseLevel, type Level } from '../lib/levelSchema';
import firstThread from './world1/01-first-thread.json';
import switchback from './world1/02-switchback.json';
import trampoline from './world1/03-trampoline.json';
import relay from './world1/04-relay.json';
import snip from './world1/05-snip.json';
import encore from './world1/06-encore.json';
import fork from './world2/01-fork.json';
import overAndUnder from './world2/02-over-and-under.json';
import duet from './world2/03-duet.json';
import mixedUp from './world2/04-mixed-up.json';
import untangle from './world2/05-untangle.json';
import threeCups from './world2/06-three-cups.json';
import slide from './world3/01-slide.json';
import lift from './world3/02-lift.json';
import twoRails from './world3/03-two-rails.json';
import crossfade from './world3/04-crossfade.json';
import hinge from './world3/05-hinge.json';
import railYard from './world3/06-rail-yard.json';
import shortSpool from './world4/01-short-spool.json';
import springboard from './world4/02-springboard.json';
import thrift from './world4/03-thrift.json';
import slideToFit from './world4/04-slide-to-fit.json';
import splitSpool from './world4/05-split-spool.json';
import lastThread from './world4/06-last-thread.json';

const RAW_LEVELS: readonly unknown[] = [
  firstThread,
  switchback,
  trampoline,
  relay,
  snip,
  encore,
  fork,
  overAndUnder,
  duet,
  mixedUp,
  untangle,
  threeCups,
  slide,
  lift,
  twoRails,
  crossfade,
  hinge,
  railYard,
  shortSpool,
  springboard,
  thrift,
  slideToFit,
  splitSpool,
  lastThread,
];

/** All levels, validated at startup: a broken level file fails fast and loudly. */
export const LEVELS: readonly Level[] = RAW_LEVELS.map((raw, index) => {
  const parsed = parseLevel(raw);
  if (!parsed.ok) throw new Error(`Level #${index + 1} is invalid: ${parsed.error}`);
  return parsed.level;
});

/**
 * Campaign boards the daily puzzle replays on a tight spool, a week's rotation, each
 * under a name of its own: plain ASCII, at most 14 characters (one plaque line), never
 * a campaign name and never "challenge" (tests/unit/dailyVariant.test.ts). Renaming one
 * only changes this data: ids stay `daily-<base>`.
 */
const DAILY_BASES = [
  { base: 'w1-02', name: 'Hairpin Turn' },
  { base: 'w1-04', name: 'Pass It On' },
  { base: 'w1-06', name: 'Curtain Call' },
  { base: 'w2-02', name: 'Crossed Wires' },
  { base: 'w2-04', name: 'Odd Socks' },
  { base: 'w3-02', name: 'Going Up' },
  { base: 'w3-04', name: 'Key Change' },
] as const;

/** Daily puzzles, validated like any level (the spool must fit the solution). */
export const DAILY_LEVELS: readonly Level[] = DAILY_BASES.map(({ base: id, name }) => {
  const base = LEVELS.find((l) => l.id === id);
  if (!base) throw new Error(`Daily base level ${id} does not exist`);
  const parsed = parseLevel(dailyVariant(base, name));
  if (!parsed.ok) throw new Error(`Daily variant of ${id} is invalid: ${parsed.error}`);
  return parsed.level;
});

/** Everything loadable: the campaign, then the daily puzzles. */
export const PLAYABLE: readonly Level[] = [...LEVELS, ...DAILY_LEVELS];

export const isDailyIndex = (index: number): boolean => index >= LEVELS.length;
