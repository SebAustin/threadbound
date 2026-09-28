import { parseLevel, type Level } from '../lib/levelSchema';
import firstThread from './world1/01-first-thread.json';
import switchback from './world1/02-switchback.json';
import trampoline from './world1/03-trampoline.json';
import relay from './world1/04-relay.json';
import snip from './world1/05-snip.json';
import encore from './world1/06-encore.json';

const RAW_LEVELS: readonly unknown[] = [firstThread, switchback, trampoline, relay, snip, encore];

/** All levels, validated at startup: a broken level file fails fast and loudly. */
export const LEVELS: readonly Level[] = RAW_LEVELS.map((raw, index) => {
  const parsed = parseLevel(raw);
  if (!parsed.ok) throw new Error(`Level #${index + 1} is invalid: ${parsed.error}`);
  return parsed.level;
});
