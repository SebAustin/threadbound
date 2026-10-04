import { createSystem, PhysicsBody } from '@iwsdk/core';

/** Dev-only: counts live physics bodies for the performance budget check (see testHook). */
export class PerfProbeSystem extends createSystem({
  bodies: { required: [PhysicsBody] },
}) {
  get physicsBodies(): number {
    return this.queries.bodies.entities.size;
  }
}
