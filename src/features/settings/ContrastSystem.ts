import { createSystem } from '@iwsdk/core';
import { applyPalette } from '../diorama/palette';
import { puzzleStore } from '../puzzle/puzzleStore';

/**
 * High contrast on the diorama: repaints the shared materials (palette.ts applyPalette)
 * whenever the loaded or changed setting differs from the mode last applied. The plaque
 * and the ledge strip repaint themselves (HudSystem).
 */
export class ContrastSystem extends createSystem({}) {
  /** The mode the shared materials are painted in: they are built in the default one. */
  private applied = false;

  /** The mode the diorama is painted in now. */
  get highContrast(): boolean {
    return this.applied;
  }

  init(): void {
    this.cleanupFuncs.push(puzzleStore.subscribe((state) => this.sync(state.settings.highContrast)));
    this.sync(puzzleStore.get().settings.highContrast);
  }

  private sync(highContrast: boolean): void {
    if (highContrast === this.applied) return;
    this.applied = highContrast;
    applyPalette(highContrast);
  }
}
