import type { Settings } from './settings';
import type { RefusalReason } from './threadRules';
import { toCm } from './units';

export interface HudInput {
  /** Campaign levels in play order (no dailies); only `world` matters here. */
  readonly levels: readonly { readonly world: number }[];
  readonly levelIndex: number;
  readonly title: string;
  readonly threadsUsed: number;
  readonly maxThreads: number;
  readonly par: number;
  /** Best stars ever earned on this level (0 if never solved). */
  readonly bestStars: number;
  readonly solved: boolean;
  /** Onboarding guidance; empty when the player needs none. */
  readonly hint: string;
  /** World 4: meters of spool spent and available. */
  readonly spool?: { readonly used: number; readonly total: number };
  /** Set when playing the daily puzzle. */
  readonly daily?: { readonly streak: number };
  /** The player's last attempt was refused, and why (cleared by their next success). */
  readonly refusal?: RefusalReason | null;
  /** One line teaching the mechanic this level introduces (shown until it is solved). */
  readonly levelHint?: string;
  /** The last campaign level is solved. */
  readonly campaignComplete?: boolean;
}

export interface HudModel {
  readonly title: string;
  readonly worldLabel: string;
  readonly threadsLabel: string;
  readonly stars: readonly [boolean, boolean, boolean];
  readonly status: 'playing' | 'solved';
  readonly hint: string;
  /** "Spool left/total cm", empty for levels without a spool. */
  readonly spoolLabel: string;
}

/** Short enough to share the details row with the thread budget. */
const dailyLabel = (streak: number) => (streak > 0 ? `Daily - streak ${streak}` : 'Daily puzzle');

const wholeCm = (meters: number) => Math.round(toCm(meters));

function spoolLabel(used: number, total: number): string {
  return `Spool ${Math.max(0, wholeCm(total) - wholeCm(used))}/${wholeCm(total)} cm`;
}

/** Same-peg is how a player cancels a thread, so it needs no explanation. */
const REFUSAL_HINTS: Readonly<Record<RefusalReason, string>> = {
  'same-peg': '',
  duplicate: 'Those pegs are already joined',
  limit: 'No threads left - snip one first',
  spool: 'Not enough spool for that thread',
};

const DAILY_HINT = 'Poke the sun to return';

const endingHint = (campaignLength: number) => `All ${campaignLength} solved - poke the sun for a daily`;

/**
 * One hint line, most urgent first: why something was refused, onboarding, the
 * mechanic this level introduces, the campaign's ending, how to leave a daily.
 */
function hintFor(input: HudInput): string {
  const refusal = input.refusal ? REFUSAL_HINTS[input.refusal] : '';
  const ending = input.campaignComplete ? endingHint(input.levels.length) : '';
  return refusal || input.hint || input.levelHint || ending || (input.daily ? DAILY_HINT : '');
}

/** Plaque copy: plain ASCII, because the panel font has no typographic glyphs. */
export function hudModel(input: HudInput): HudModel {
  const world = input.levels[input.levelIndex]?.world ?? 1;
  const inWorld = input.levels.filter((l) => l.world === world).length;
  const position = input.levels.slice(0, input.levelIndex + 1).filter((l) => l.world === world).length;
  const lit = (star: 1 | 2 | 3) => input.bestStars >= star;
  return {
    title: input.title,
    worldLabel: input.daily ? dailyLabel(input.daily.streak) : `World ${world} - ${position}/${inWorld}`,
    threadsLabel: `Threads ${input.threadsUsed}/${input.maxThreads} - par ${input.par}`,
    stars: [lit(1), lit(2), lit(3)],
    status: input.solved ? 'solved' : 'playing',
    hint: hintFor(input),
    spoolLabel: input.spool ? spoolLabel(input.spool.used, input.spool.total) : '',
  };
}

export interface SettingsModel {
  readonly slowLabel: string;
  readonly offsetLabel: string;
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

/** Settings-face copy: every control says what it is set to (ASCII). */
export function settingsModel(settings: Settings): SettingsModel {
  return {
    slowLabel: `Slow-mo: ${settings.slowMotion ? 'On' : 'Off'}`,
    offsetLabel: `Height ${signed(settings.offset.up)}   Distance ${signed(settings.offset.near)}`,
  };
}
