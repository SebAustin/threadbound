import { createSystem, type Mesh, type UIKitMLAsset } from '@iwsdk/core';
import { cupFlash, starForNote, starPulseScale, STAR_PULSE_SECONDS, type FlashPhase } from '../../lib/captions';
import { MATERIALS } from '../diorama/palette';
import { STAR_IDS } from '../hud/paintPlaque';
import { puzzleStore, type PuzzleCommand } from '../puzzle/puzzleStore';

/** The cup-wall material a blink phase shows; null puts the wall material back. */
const blinkMaterial = (phase: FlashPhase | null) =>
  phase === 'bright' ? MATERIALS.wallBlinkBright : phase === 'dark' ? MATERIALS.wallBlinkDark : MATERIALS.wall;

/** What each cup's left wall mirrors in `userData.caption`, for the test hook. */
export interface CupCaption {
  /** Blinks started on this cup since its walls were built. */
  flashes: number;
  flashing: boolean;
}

/** A cup's mirror, on its left wall (created with the walls' first use). */
function captionOf(walls: readonly [Mesh, Mesh]): CupCaption {
  return (walls[0].userData.caption ??= { flashes: 0, flashing: false } satisfies CupCaption);
}

/**
 * Visual captions for sound-only events, always on: a cup that rejects a marble blinks its
 * two walls bright and dark (the floor keeps its filled glow), and each replayed melody note
 * swells one of the plaque's stars. A drop or a rebuild ends a blink. Allocation-free per frame.
 */
export class CaptionSystem extends createSystem({}) {
  private plaque: UIKitMLAsset | undefined;
  /** Seconds into each star's pulse; at or past STAR_PULSE_SECONDS once settled. */
  private readonly starAge = STAR_IDS.map(() => STAR_PULSE_SECONDS);
  /** Reused for every star scale write: update() must not allocate. */
  private readonly starScale = { transformScaleX: 1, transformScaleY: 1 };
  private starPulses = 0;
  /** Seconds into each cup's blink, and the phase its walls show (null: at rest). */
  private flashAge: number[] = [];
  private flashPhase: (FlashPhase | null)[] = [];

  init(): void {
    this.plaque = this.world.getSceneObject<UIKitMLAsset>('hud-plaque');
    this.cleanupFuncs.push(puzzleStore.onCommand((command) => this.onCommand(command)));
    this.resetCups();
  }

  private onCommand(command: PuzzleCommand): void {
    if (command.type === 'melodyNote') this.pulseStar(starForNote(command.index));
    if (command.type === 'cupRejected') this.startFlash(command.cup);
    // A new drop settles every blink; a rebuild's walls are new (the old ones are disposed).
    if (command.type === 'drop') this.endFlashes();
    if (command.type === 'levelBuilt') this.resetCups();
  }

  /** Starts a star's pulse, and counts it on the plaque's userData (one per replayed saved note). */
  private pulseStar(star: number): void {
    this.starAge[star] = 0;
    this.starPulses += 1;
    if (this.plaque) this.plaque.userData.starPulses = this.starPulses;
  }

  private startFlash(cup: number): void {
    const walls = puzzleStore.diorama?.cupWalls[cup];
    if (!walls) return;
    this.flashAge[cup] = 0;
    captionOf(walls).flashes += 1;
    this.showFlash(cup, cupFlash(0));
  }

  /** Every cup of a new build at rest, its walls mirrored with no blinks yet. */
  private resetCups(): void {
    const walls = puzzleStore.diorama?.cupWalls ?? [];
    this.flashAge = walls.map(() => Infinity);
    this.flashPhase = walls.map(() => null);
    for (const cup of walls) captionOf(cup);
  }

  private endFlashes(): void {
    for (let cup = 0; cup < this.flashPhase.length; cup++) {
      this.flashAge[cup] = Infinity;
      this.showFlash(cup, null);
    }
  }

  /** Puts `phase` on the cup's walls (only when it changes) and mirrors it. */
  private showFlash(cup: number, phase: FlashPhase | null): void {
    const walls = puzzleStore.diorama?.cupWalls[cup];
    if (!walls || this.flashPhase[cup] === phase) return;
    this.flashPhase[cup] = phase;
    const material = blinkMaterial(phase);
    for (const wall of walls) wall.material = material;
    captionOf(walls).flashing = phase !== null;
  }

  update(delta: number): void {
    for (let cup = 0; cup < this.flashAge.length; cup++) {
      if (this.flashPhase[cup] === null) continue;
      this.flashAge[cup] += delta;
      this.showFlash(cup, cupFlash(this.flashAge[cup]));
    }
    for (let star = 0; star < this.starAge.length; star++) {
      if (this.starAge[star] >= STAR_PULSE_SECONDS) continue;
      this.starAge[star] += delta;
      this.scaleStar(star, starPulseScale(this.starAge[star]));
    }
  }

  private scaleStar(star: number, scale: number): void {
    this.starScale.transformScaleX = scale;
    this.starScale.transformScaleY = scale;
    this.plaque?.getElementById(STAR_IDS[star])?.setProperties(this.starScale);
  }
}
