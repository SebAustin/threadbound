import { createSystem, PhysicsSystem } from '@iwsdk/core';
import { timeScale } from '../../lib/settings';
import { puzzleStore } from '../puzzle/puzzleStore';

/**
 * Owns the physics clock. The world no longer ticks PhysicsSystem itself; this
 * system steps it with the frame delta times the settings' time scale, so slow
 * motion replays the identical fixed-step simulation, only slower. Pausing this
 * system pauses physics.
 */
export class SimulationClockSystem extends createSystem({}) {
  private physics: PhysicsSystem | undefined;
  private scale = 1;

  init(): void {
    this.physics = this.world.getSystem(PhysicsSystem);
    this.physics?.stop();
    this.scale = timeScale(puzzleStore.get().settings.slowMotion);
    this.cleanupFuncs.push(
      () => this.physics?.play(),
      puzzleStore.subscribe((state) => {
        this.scale = timeScale(state.settings.slowMotion);
      }),
    );
  }

  /** Simulation seconds for `delta` real seconds (shorter in slow motion). */
  simDelta(delta: number): number {
    return delta * this.scale;
  }

  update(delta: number): void {
    this.physics?.update(this.simDelta(delta));
  }
}
