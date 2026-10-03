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
import slide from './world3/01-slide.json';
import lift from './world3/02-lift.json';
import twoRails from './world3/03-two-rails.json';
import crossfade from './world3/04-crossfade.json';
import shortSpool from './world4/01-short-spool.json';
import springboard from './world4/02-springboard.json';
import budget from './world4/03-budget.json';
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
  slide,
  lift,
  twoRails,
  crossfade,
  shortSpool,
  springboard,
  budget,
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
