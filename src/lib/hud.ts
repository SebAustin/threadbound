export interface HudInput {
  /** Every level in play order; only `world` matters here. */
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
}

export interface HudModel {
  readonly title: string;
  readonly worldLabel: string;
  readonly threadsLabel: string;
  readonly stars: readonly [boolean, boolean, boolean];
  readonly status: 'playing' | 'solved';
  readonly hint: string;
}


/** Plaque copy: plain ASCII, because the panel font has no typographic glyphs. */
export function hudModel(input: HudInput): HudModel {
  const world = input.levels[input.levelIndex]?.world ?? 1;
  const inWorld = input.levels.filter((l) => l.world === world).length;
  const position = input.levels.slice(0, input.levelIndex + 1).filter((l) => l.world === world).length;
  const lit = (star: 1 | 2 | 3) => input.bestStars >= star;
  return {
    title: input.title,
    worldLabel: `World ${world} - ${position}/${inWorld}`,
    threadsLabel: `Threads ${input.threadsUsed}/${input.maxThreads} - par ${input.par}`,
    stars: [lit(1), lit(2), lit(3)],
    status: input.solved ? 'solved' : 'playing',
    hint: input.hint,
  };
}

export interface SettingsModel {
  readonly slowLabel: string;
}

/** Settings-face copy: every toggle says what it is set to. */
export function settingsModel(settings: { readonly slowMotion: boolean }): SettingsModel {
  return { slowLabel: `Slow motion: ${settings.slowMotion ? 'On' : 'Off'}` };
}
