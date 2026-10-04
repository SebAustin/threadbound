/** What one rendered frame of a level costs. */
export interface FrameStats {
  readonly drawCalls: number;
  readonly triangles: number;
  readonly physicsBodies: number;
}

export interface PerfBudget {
  readonly maxDrawCalls: number;
  readonly maxTriangles: number;
  readonly maxPhysicsBodies: number;
}

/** Human-readable list of every metric over its limit; empty when the frame fits. */
export function budgetBreaches(stats: FrameStats, budget: PerfBudget): string[] {
  const checks: ReadonlyArray<readonly [string, number, number]> = [
    ['draw calls', stats.drawCalls, budget.maxDrawCalls],
    ['triangles', stats.triangles, budget.maxTriangles],
    ['physics bodies', stats.physicsBodies, budget.maxPhysicsBodies],
  ];
  return checks.filter(([, value, max]) => value > max).map(([name, value, max]) => `${name} ${value} > ${max}`);
}
