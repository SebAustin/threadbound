import { createSystem } from '@iwsdk/core';
import { THREAD_TUNING } from '../../config/constants';
import { Thread } from '../puzzle/components';

/**
 * Plucked strings shimmer: a thread's thickness oscillates while the energy a
 * marble gave it decays. Allocation-free; idle threads cost one read per frame.
 */
export class ThreadVibrationSystem extends createSystem({
  threads: { required: [Thread] },
}) {
  update(delta: number, time: number): void {
    const { vibrationDecay, vibrationRate, vibrationGain, radius } = THREAD_TUNING;
    for (const thread of this.queries.threads.entities) {
      const energy = thread.getValue(Thread, 'energy') ?? 0;
      if (energy <= 0) continue;
      const next = Math.max(0, energy - vibrationDecay * delta);
      thread.setValue(Thread, 'energy', next);
      const mesh = thread.object3D?.children[0];
      if (!mesh) continue;
      const r = radius * (1 + vibrationGain * next * Math.abs(Math.sin(time * vibrationRate)));
      mesh.scale.x = r;
      mesh.scale.z = r;
    }
  }
}
