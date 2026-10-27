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
  /** Every campaign level has a real solve in the save (lib/resume's campaignComplete), outside a daily. */
  readonly campaignComplete?: boolean;
  /** Passthrough found no table, so the diorama floats in front of the player. */
  readonly noTable?: boolean;
  /** The last drop ended without a solve, and nothing has changed since (PuzzleState.lastDropMissed). */
  readonly lastDropMissed?: boolean;
  /** A thread is on the diorama (presets count): the one thing a missed drop's line can point at. */
  readonly hasThread?: boolean;
  /** The settings face offers the skip (lib/attempts): a missed drop's line points there instead. */
  readonly skipOffered?: boolean;
  /** A campaign level's first solve, whose tune the melody book holds. */
  readonly firstSolve?: boolean;
  /** A returning player, on a campaign level, while today's daily is unsolved: the streak to show. */
  readonly dailyReady?: { readonly streak: number };
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

/** Short enough to share the plaque's one row with the title and the stars. */
const dailyLabel = (streak: number) => (streak > 0 ? `Daily - streak ${streak}` : 'Daily puzzle');

const wholeCm = (meters: number) => Math.round(toCm(meters));

function spoolLabel(used: number, total: number): string {
  return `Spool ${Math.max(0, wholeCm(total) - wholeCm(used))}/${wholeCm(total)} cm`;
}

/**
 * The longest hint the ledge strip shows in two lines (public/ui/ledge.uikitml):
 * every hint line must fit it (tests/unit/hud.test.ts).
 */
export const LEDGE_HINT_MAX_CHARS = 48;

/** Same-peg is how a player cancels a thread, so it needs no explanation. */
export const REFUSAL_HINTS: Readonly<Record<RefusalReason, string>> = {
  'same-peg': '',
  duplicate: 'Those pegs are already joined',
  // Snipping isn't taught until w1-05, so the limit says how (Q46).
  limit: 'No threads left - pinch one to snip it',
  spool: 'Not enough spool for that thread',
};

/** Ledge buttons are pressed, so the sun is too. */
const DAILY_HINT = 'Press the sun to return';

/** Passthrough found no table: Quest's Space Setup is what lets it find one. */
export const NO_TABLE_HINT = 'No table found - run Space Setup';

/** An unsolved drop with a thread on the diorama: the two ways to try again. */
const MISSED_DROP_HINT = 'Missed - pinch a thread to snip it, or restart';

/** Skip lives only on the flipped settings face: a stuck player who never opens it learns of it here. */
const SKIP_POINTER_HINT = 'Stuck? Skip is on the settings face';

/** The plaque's stars replay the level's tune (the melody book). */
const FIRST_SOLVE_HINT = 'Pinch the stars to hear it again';

const endingHint = (campaignLength: number) => `All ${campaignLength} solved - press the sun for a daily`;

/** ASCII " - " for the spec's middle dot: the panel font has no typographic glyphs. */
const dailyReadyHint = (streak: number) => (streak > 0 ? `Today's daily is ready - streak ${streak}` : "Today's daily is ready");

/** The missed-drop slot: shown while a missed drop left a thread to snip, pointing to the skip once it is offered. */
function missedHint(input: HudInput): string {
  if (!input.lastDropMissed || !input.hasThread) return '';
  return input.skipOffered ? SKIP_POINTER_HINT : MISSED_DROP_HINT;
}

/** The return-visit lines, outside a daily: the first solve's stars, then today's waiting daily. */
function signpostHint(input: HudInput): string {
  if (input.daily) return '';
  if (input.firstSolve) return FIRST_SOLVE_HINT;
  return input.dailyReady ? dailyReadyHint(input.dailyReady.streak) : '';
}

/**
 * One hint line, most urgent first: why something was refused, what to try after a
 * missed drop, onboarding, the mechanic this level introduces, no table found, the
 * campaign's ending, the first solve's stars, today's waiting daily, how to leave a daily.
 */
function hintFor(input: HudInput): string {
  const refusal = input.refusal ? REFUSAL_HINTS[input.refusal] : '';
  const noTable = input.noTable ? NO_TABLE_HINT : '';
  const ending = input.campaignComplete ? endingHint(input.levels.length) : '';
  const leave = input.daily ? DAILY_HINT : '';
  return refusal || missedHint(input) || input.hint || input.levelHint || noTable || ending || signpostHint(input) || leave;
}

/** Plaque and ledge copy: plain ASCII, because the panel font has no typographic glyphs. */
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

/** Seconds between the plaque's stars lighting, one by one, after a fresh solve. */
export const STAR_STAGGER_SECONDS = 0.25;

/**
 * How many of the best stars the plaque shows `sinceSolve` seconds after a fresh
 * solve: none at first, then one more every stagger step, up to the best. With no
 * fresh solve (null) it shows the best at once.
 */
export function starsShown(best: number, sinceSolve: number | null): number {
  if (sinceSolve === null) return best;
  return Math.min(best, Math.floor(sinceSolve / STAR_STAGGER_SECONDS));
}

/** The settings face's star total (ASCII), e.g. "Stars 14/72". */
export function starsLabel(earned: number, possible: number): string {
  return `Stars ${earned}/${possible}`;
}

/** The settings face's skip offer, shown only while it is offered (CONTEXT.md Skip). */
export const SKIP_LABEL = 'Skip level';

/**
 * The melody book's play-all: "Play all (N)" with N tunes in the book, or "Stop" while it plays.
 * Ticket 12 sized the face for "Play all (24)"; "Play all melodies (N)" doesn't fit its row.
 */
export function playAllLabel(tunes: number, playing: boolean): string {
  return playing ? 'Stop' : `Play all (${tunes})`;
}

export interface SettingsModel {
  readonly slowLabel: string;
  readonly contrastLabel: string;
  readonly offsetLabel: string;
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

/** Settings-face copy: every control says what it is set to (ASCII). */
export function settingsModel(settings: Settings): SettingsModel {
  return {
    slowLabel: `Slow-mo: ${settings.slowMotion ? 'On' : 'Off'}`,
    contrastLabel: `High contrast: ${settings.highContrast ? 'On' : 'Off'}`,
    offsetLabel: `Height ${signed(settings.offset.up)}   Distance ${signed(settings.offset.near)}`,
  };
}
