import { createSystem, type Material } from '@iwsdk/core';
import { revealOpacity } from '../../lib/placementSearch';
import { DIORAMA_MATERIALS } from '../diorama/palette';
import { puzzleStore, type PuzzleCommand, type PuzzleState } from '../puzzle/puzzleStore';

/**
 * The game's one fade: every build (Next, Restart, level select, a Near or Raise step, a
 * placement) fades the diorama in from nothing over about 0.3 s, and while placement keeps
 * it hidden it holds at nothing. It only scales the shared materials' opacity, so the
 * store, the colliders and the command bus are live from the build frame on.
 *
 * The materials are shared by every build: the fade restores each one's `opacity` and
 * `transparent` exactly. Turning `transparent` on compiles a second program the first time,
 * so the boot build's fade warms those programs up before the player's first Next.
 */
export class RevealSystem extends createSystem({}) {
  private readonly materials: readonly Material[] = DIORAMA_MATERIALS;
  private readonly baseOpacity = this.materials.map((m) => m.opacity);
  private readonly baseTransparent = this.materials.map((m) => m.transparent);
  /** Seconds the current fade has run (it only runs while the diorama isn't hidden). */
  private elapsed = 0;
  private fading = false;
  private hidden = false;

  /**
   * The fade's progress, 0 to 1: 1 only once every material's opacity and transparency
   * are back to their own, and 0 while the diorama is hidden.
   */
  get progress(): number {
    if (this.fading) return revealOpacity(this.elapsed);
    return this.atBase() ? 1 : 0;
  }

  init(): void {
    this.cleanupFuncs.push(
      puzzleStore.onCommand((command: PuzzleCommand) => {
        if (command.type === 'levelBuilt') this.restart();
      }),
      puzzleStore.subscribe((state: PuzzleState) => this.onState(state)),
    );
    this.hidden = puzzleStore.get().dioramaHidden;
    // The first level was built before this system registered: fade it in too (the warm-up).
    if (puzzleStore.diorama) this.restart();
  }

  /** A newly hidden diorama starts again from nothing; it fades in once shown. */
  private onState(state: PuzzleState): void {
    if (state.dioramaHidden === this.hidden) return;
    this.hidden = state.dioramaHidden;
    if (this.hidden) this.restart();
  }

  private restart(): void {
    this.elapsed = 0;
    this.fading = true;
    this.apply(0);
  }

  /** Allocation-free: one pass over the shared materials per frame of a fade. */
  update(delta: number): void {
    if (!this.fading || this.hidden) return;
    this.elapsed += delta;
    const opacity = revealOpacity(this.elapsed);
    if (opacity < 1) {
      this.apply(opacity);
      return;
    }
    this.restore();
    this.fading = false;
  }

  /** Every material at `fraction` of its own opacity, drawn as transparent. */
  private apply(fraction: number): void {
    for (let i = 0; i < this.materials.length; i++) {
      const material = this.materials[i];
      material.opacity = this.baseOpacity[i] * fraction;
      if (!material.transparent) {
        material.transparent = true;
        material.needsUpdate = true;
      }
    }
  }

  /** Every material exactly as it was: its own opacity, and transparent only if it was. */
  private restore(): void {
    for (let i = 0; i < this.materials.length; i++) {
      const material = this.materials[i];
      material.opacity = this.baseOpacity[i];
      if (material.transparent !== this.baseTransparent[i]) {
        material.transparent = this.baseTransparent[i];
        material.needsUpdate = true;
      }
    }
  }

  private atBase(): boolean {
    return this.materials.every((m, i) => m.opacity === this.baseOpacity[i] && m.transparent === this.baseTransparent[i]);
  }
}
