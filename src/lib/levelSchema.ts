import { z } from 'zod';

const point = { x: z.number(), y: z.number() };
const link = z.object({ from: z.string().min(1), to: z.string().min(1) });
const color = z.enum(['teal', 'amber', 'azure']);
const rail = z.object({ axis: z.enum(['x', 'y']), min: z.number(), max: z.number() });

/** Legacy levels had one `chute` plus `marbles`; normalize to a single teal chute. */
function migrateLegacyChute(input: unknown): unknown {
  if (typeof input !== 'object' || input === null) return input;
  const raw = input as Record<string, unknown>;
  if (raw.chutes !== undefined || raw.chute === undefined) return input;
  const { chute, marbles, ...rest } = raw;
  const c = chute as { x: number; y: number };
  return { ...rest, chutes: [{ x: c?.x, y: c?.y, color: 'teal', count: marbles }] };
}

const LevelSchema = z.preprocess(migrateLegacyChute, z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    world: z.number().int().min(1).max(4),
    /** Diorama interior [width, height] in meters. */
    size: z.tuple([z.number().positive(), z.number().positive()]),
    /** Each chute releases `count` marbles of its color. */
    chutes: z
      .array(z.object({ ...point, color: color.default('teal'), count: z.number().int().min(1).max(6) }))
      .min(1),
    maxThreads: z.number().int().min(1).max(8),
    par: z.number().int().min(1),
    /** A peg with a `rail` can be slid along one axis between min and max. */
    pegs: z.array(z.object({ id: z.string().min(1), ...point, rail: rail.optional() })).min(2),
    /**
     * Goal cups sit on the base; x is the cup's center, width its inner width.
     * A cup with a color only accepts marbles of that color.
     */
    goals: z
      .array(z.object({ x: z.number(), width: z.number().positive(), color: color.optional() }))
      .min(1),
    /** Static blocks (x,y = bottom-left, w,h = size) that shape the marble path. */
    walls: z
      .array(z.object({ ...point, w: z.number().positive(), h: z.number().positive() }))
      .default([]),
    /** Threads the level starts with; the player may snip them. */
    presetThreads: z.array(link).default([]),
    /**
     * Threads that must exist in a known-good solution (presets not listed get
     * snipped). Replayed by the E2E suite to prove every level is solvable.
     */
    solution: z.array(link).min(1),
    /** Rail positions the solution needs (applied before its threads). */
    slides: z.array(z.object({ peg: z.string().min(1), to: z.number() })).default([]),
  })
  .superRefine((level, ctx) => {
    const [w, h] = level.size;
    const inside = (x: number, y: number) => x >= 0 && x <= w && y >= 0 && y <= h;
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });

    const pegIds = new Set<string>();
    for (const peg of level.pegs) {
      if (pegIds.has(peg.id)) issue(`Duplicate peg id "${peg.id}"`);
      pegIds.add(peg.id);
      if (!inside(peg.x, peg.y)) issue(`Peg "${peg.id}" is outside the diorama`);
    }
    for (const chute of level.chutes) {
      if (!inside(chute.x, chute.y)) issue(`Chute at x=${chute.x} is outside the diorama`);
      const hasCup = level.goals.some((g) => g.color === undefined || g.color === chute.color);
      if (!hasCup) issue(`No goal accepts ${chute.color} marbles`);
    }
    const marbles = level.chutes.reduce((sum, c) => sum + c.count, 0);
    if (marbles > 8) issue('A level may release at most 8 marbles');
    const pegById = new Map(level.pegs.map((p) => [p.id, p]));
    for (const peg of level.pegs) {
      if (!peg.rail) continue;
      const along = peg.rail.axis === 'x' ? peg.x : peg.y;
      if (along < peg.rail.min || along > peg.rail.max) issue(`Peg "${peg.id}" starts off its rail`);
      const [lo, hi] = peg.rail.axis === 'x' ? [peg.rail.min, peg.rail.max] : [peg.rail.min, peg.rail.max];
      const limit = peg.rail.axis === 'x' ? w : h;
      if (lo < 0 || hi > limit || lo >= hi) issue(`Peg "${peg.id}" has an invalid rail range`);
    }
    for (const slide of level.slides) {
      const peg = pegById.get(slide.peg);
      if (!peg?.rail) issue(`Slide references peg "${slide.peg}" without a rail`);
      else if (slide.to < peg.rail.min || slide.to > peg.rail.max) issue(`Slide of "${slide.peg}" is beyond its rail`);
    }
    for (const goal of level.goals) {
      if (!inside(goal.x - goal.width / 2, 0) || !inside(goal.x + goal.width / 2, 0)) {
        issue(`Goal at x=${goal.x} is outside the diorama`);
      }
    }
    for (const wall of level.walls) {
      if (!inside(wall.x, wall.y) || !inside(wall.x + wall.w, wall.y + wall.h)) {
        issue(`Wall at (${wall.x}, ${wall.y}) is outside the diorama`);
      }
    }
    for (const t of [...level.presetThreads, ...level.solution]) {
      for (const id of [t.from, t.to]) {
        if (!pegIds.has(id)) issue(`Thread references unknown peg "${id}"`);
      }
    }
    if (level.par > level.maxThreads) issue('Par cannot exceed maxThreads');
    const samePair = (a: { from: string; to: string }, b: { from: string; to: string }) =>
      (a.from === b.from && a.to === b.to) || (a.from === b.to && a.to === b.from);
    const playerThreads = level.solution.filter(
      (t) => !level.presetThreads.some((p) => samePair(p, t)),
    );
    if (playerThreads.length > level.maxThreads) issue('Solution uses more threads than maxThreads');
  })
  .transform((level) => ({
    ...level,
    /** Total marbles released per drop (sum of chute counts). */
    marbles: level.chutes.reduce((sum, c) => sum + c.count, 0),
  })));

export type Level = z.output<typeof LevelSchema>;
export type Chute = Level['chutes'][number];

export type LevelParseResult =
  | { readonly ok: true; readonly level: Level }
  | { readonly ok: false; readonly error: string };

export function parseLevel(input: unknown): LevelParseResult {
  const result = LevelSchema.safeParse(input);
  if (result.success) return { ok: true, level: result.data };
  const error = result.error.issues
    .map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
    .join('; ');
  return { ok: false, error };
}
