import { z } from 'zod';
import { MARBLE_COLORS, SORTING_COLORS } from './marbleColors';
import { segmentDistanceSq2d } from './segment2d';
import { positionAlong } from './rail';
import { sameThread, spoolUsed } from './threadRules';

const point = { x: z.number(), y: z.number() };
const link = z.object({ from: z.string().min(1), to: z.string().min(1) });
const color = z.enum(MARBLE_COLORS);
const rail = z.object({ axis: z.enum(['x', 'y']), min: z.number(), max: z.number() });

const LevelObject = z.object({
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
  /** World 4: total length (meters) of thread the player may spend. */
  spool: z.number().positive().optional(),
  par: z.number().int().min(1),
  /** A peg with a `rail` can be slid along one axis between min and max. */
  pegs: z.array(z.object({ id: z.string().min(1), ...point, rail: rail.optional() })).min(2),
  /**
   * Goal cups sit on the base; x is the cup's center, width its inner width.
   * A cup with a color only accepts marbles of that color.
   */
  goals: z
    .array(z.object({ x: z.number(), width: z.number().positive(), color: z.enum(SORTING_COLORS).optional() }))
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
  });

type RawLevel = z.output<typeof LevelObject>;
type Issue = (message: string) => void;

/** Max marbles one drop may release (performance budget: physics bodies ≤ 40). */
const MAX_MARBLES = 8;
/** A rail must stay this far from other pegs, or a slide could collapse a thread. */
const RAIL_CLEARANCE = 0.03;

const insideOf = (level: RawLevel) => (x: number, y: number) =>
  x >= 0 && x <= level.size[0] && y >= 0 && y <= level.size[1];

function checkPegs(level: RawLevel, issue: Issue): void {
  const inside = insideOf(level);
  const seen = new Set<string>();
  for (const peg of level.pegs) {
    if (seen.has(peg.id)) issue(`Duplicate peg id "${peg.id}"`);
    seen.add(peg.id);
    if (!inside(peg.x, peg.y)) issue(`Peg "${peg.id}" is outside the diorama`);
  }
}

function checkChutes(level: RawLevel, issue: Issue): void {
  const inside = insideOf(level);
  for (const chute of level.chutes) {
    if (!inside(chute.x, chute.y)) issue(`Chute at x=${chute.x} is outside the diorama`);
    const hasCup = level.goals.some((g) => g.color === undefined || g.color === chute.color);
    if (!hasCup) issue(`No goal accepts ${chute.color} marbles`);
  }
  const marbles = level.chutes.reduce((sum, c) => sum + c.count, 0);
  if (marbles > MAX_MARBLES) issue(`A level may release at most ${MAX_MARBLES} marbles`);
}

function checkRails(level: RawLevel, issue: Issue): void {
  for (const peg of level.pegs) {
    const rail = peg.rail;
    if (!rail) continue;
    const along = rail.axis === 'x' ? peg.x : peg.y;
    if (along < rail.min || along > rail.max) issue(`Peg "${peg.id}" starts off its rail`);
    const limit = rail.axis === 'x' ? level.size[0] : level.size[1];
    if (rail.min < 0 || rail.max > limit || rail.min >= rail.max) {
      issue(`Peg "${peg.id}" has an invalid rail range`);
    }
    for (const other of level.pegs) {
      if (other.id === peg.id) continue;
      const a = rail.axis === 'x' ? [rail.min, peg.y] : [peg.x, rail.min];
      const b = rail.axis === 'x' ? [rail.max, peg.y] : [peg.x, rail.max];
      if (segmentDistanceSq2d(other.x, other.y, a[0], a[1], b[0], b[1]) < RAIL_CLEARANCE ** 2) {
        issue(`The rail of "${peg.id}" runs through peg "${other.id}"`);
      }
    }
  }
  const pegById = new Map(level.pegs.map((p) => [p.id, p]));
  for (const slide of level.slides) {
    const rail = pegById.get(slide.peg)?.rail;
    if (!rail) issue(`Slide references peg "${slide.peg}" without a rail`);
    else if (slide.to < rail.min || slide.to > rail.max) issue(`Slide of "${slide.peg}" is beyond its rail`);
  }
}

function checkGoalsAndWalls(level: RawLevel, issue: Issue): void {
  const inside = insideOf(level);
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
}

function checkThreads(level: RawLevel, issue: Issue): void {
  const pegIds = new Set(level.pegs.map((p) => p.id));
  for (const t of [...level.presetThreads, ...level.solution]) {
    for (const id of [t.from, t.to]) {
      if (!pegIds.has(id)) issue(`Thread references unknown peg "${id}"`);
    }
  }
  if (level.par > level.maxThreads) issue('Par cannot exceed maxThreads');
  const playerThreads = level.solution.filter((t) => !level.presetThreads.some((p) => sameThread(p, t)));
  if (playerThreads.length > level.maxThreads) issue('Solution uses more threads than maxThreads');
  if (level.spool !== undefined) {
    const needed = spoolUsed(playerThreads, solvedPegPositions(level));
    if (needed > level.spool) {
      issue(`Solution needs ${cm(needed)} of spool but the level has ${cm(level.spool)}`);
    }
  }
}

const cm = (meters: number) => `${(meters * 100).toFixed(1)} cm`;

/** Peg positions once the solution's rail slides are applied. */
function solvedPegPositions(level: RawLevel): Record<string, { x: number; y: number }> {
  const positions = Object.fromEntries(level.pegs.map((p) => [p.id, { x: p.x, y: p.y }]));
  for (const slide of level.slides) {
    const peg = level.pegs.find((p) => p.id === slide.peg);
    if (!peg?.rail) continue;
    positions[peg.id] = positionAlong(peg, peg.rail, slide.to);
  }
  return positions;
}

const LEVEL_CHECKS: ReadonlyArray<(level: RawLevel, issue: Issue) => void> = [
  checkPegs,
  checkChutes,
  checkRails,
  checkGoalsAndWalls,
  checkThreads,
];

const LevelSchema = LevelObject
  .superRefine((level, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
    for (const check of LEVEL_CHECKS) check(level, issue);
  })
  .transform((level) => ({
    ...level,
    /** Total marbles released per drop (sum of chute counts). */
    marbles: level.chutes.reduce((sum, c) => sum + c.count, 0),
  }));

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
