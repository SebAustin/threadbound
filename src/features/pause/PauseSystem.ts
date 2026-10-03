import { createSystem, PhysicsSystem } from '@iwsdk/core';
import { shouldPause, type XrVisibility } from '../../lib/pausePolicy';
import { MarbleSystem } from '../marbles/MarbleSystem';
import { OnboardingSystem } from '../onboarding/OnboardingSystem';
import { puzzleStore } from '../puzzle/puzzleStore';
import { ThreadVibrationSystem } from '../threads/ThreadVibrationSystem';

interface Pausable {
  stop(): void;
  play(): void;
}

/**
 * Freezes the simulation while the player can't see it (system menu over the
 * session, headset off, hidden tab) and resumes exactly where it stopped.
 * Physics caps its catch-up steps, so a long pause never fast-forwards.
 */
export class PauseSystem extends createSystem({}) {
  init(): void {
    const apply = () => this.setPaused(
      shouldPause({
        xrVisibility: this.world.visibilityState.peek() as XrVisibility,
        documentHidden: document.hidden,
      }),
    );
    document.addEventListener('visibilitychange', apply);
    this.cleanupFuncs.push(
      () => document.removeEventListener('visibilitychange', apply),
      this.world.visibilityState.subscribe(apply),
    );
    apply(); // a page can load already hidden
  }

  /** Everything that moves on its own; input-driven systems simply see no input. */
  private simulation(): Pausable[] {
    const systems: Array<Pausable | undefined> = [
      this.world.getSystem(PhysicsSystem),
      this.world.getSystem(MarbleSystem),
      this.world.getSystem(ThreadVibrationSystem),
      this.world.getSystem(OnboardingSystem),
    ];
    return systems.filter((s): s is Pausable => s !== undefined);
  }

  private setPaused(paused: boolean): void {
    if (puzzleStore.get().paused === paused) return;
    for (const system of this.simulation()) {
      if (paused) system.stop();
      else system.play();
    }
    puzzleStore.update({ paused });
  }
}
