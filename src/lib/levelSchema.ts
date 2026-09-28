import { z } from 'zod';

const point = { x: z.number(), y: z.number() };
const link = z.object({ from: z.string().min(1), to: z.string().min(1) });

const LevelSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    world: z.number().int().min(1).max(4),
    /** Diorama interior [width, height] in meters. */
    size: z.tuple([z.number().positive(), z.number().positive()]),
    chute: z.object(point),
    marbles: z.number().int().min(1).max(8),
    maxThreads: z.number().int().min(1).max(8),
    par: z.number().int().min(1),
    pegs: z.array(z.object({ id: z.string().min(1), ...point })).min(2),
    /** Goal cups sit on the base; x is the cup's center, width its inner width. */
    goals: z.array(z.object({ x: z.number(), width: z.number().positive() })).min(1),
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
    if (!inside(level.chute.x, level.chute.y)) issue('Chute is outside the diorama');
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
  });

export type Level = z.infer<typeof LevelSchema>;

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
