import { z } from 'zod';

const point = { x: z.number(), y: z.number() };

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
  })
  .superRefine((level, ctx) => {
    const [w, h] = level.size;
    const inside = (x: number, y: number) => x >= 0 && x <= w && y >= 0 && y <= h;
    const seen = new Set<string>();
    for (const peg of level.pegs) {
      if (seen.has(peg.id)) {
        ctx.addIssue({ code: 'custom', message: `Duplicate peg id "${peg.id}"` });
      }
      seen.add(peg.id);
      if (!inside(peg.x, peg.y)) {
        ctx.addIssue({ code: 'custom', message: `Peg "${peg.id}" is outside the diorama` });
      }
    }
    if (!inside(level.chute.x, level.chute.y)) {
      ctx.addIssue({ code: 'custom', message: 'Chute is outside the diorama' });
    }
    if (level.par > level.maxThreads) {
      ctx.addIssue({ code: 'custom', message: 'Par cannot exceed maxThreads' });
    }
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
