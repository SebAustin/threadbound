import { createSystem, type Object3D } from '@iwsdk/core';
import { today } from '../../lib/daily';
import { dailyStarsOn, type Progress } from '../../lib/progress';
import { hasCampaignSolve } from '../../lib/resume';
import { sunPulseScale, sunPulses } from '../../lib/signposts';
import { LEVELS } from '../../levels';
import { ControlActions, ControlButton } from '../puzzle/components';
import { puzzleStore, type DailySession, type PuzzleState } from '../puzzle/puzzleStore';

/**
 * The sun pulses while today's daily is unsolved (lib/signposts): outside a daily,
 * from the first campaign solve. Every build replaces the ledge buttons, so the sun
 * is found through its ControlButton query each frame. Only the sun icon's transform
 * changes (its walnut material is shared by every icon), leaving the cap to the hover
 * and press feedback. `pulsing` is mirrored on the button group for the test hook.
 */
export class SunPulseSystem extends createSystem({
  buttons: { required: [ControlButton] },
}) {
  private pulsing = false;
  /** Seconds into the current pulse. */
  private clock = 0;
  /** The progress and daily the pulse was last worked out from (the store fires per pointer move). */
  private fromProgress: Progress | null = null;
  private fromDaily: DailySession | null | undefined = undefined;

  init(): void {
    this.cleanupFuncs.push(puzzleStore.subscribe((state) => this.workOut(state)));
    this.workOut(puzzleStore.get());
  }

  /** Works the pulse out again when the save or the open daily changed. */
  private workOut(state: PuzzleState): void {
    if (state.progress === this.fromProgress && state.daily === this.fromDaily) return;
    this.fromProgress = state.progress;
    this.fromDaily = state.daily;
    const pulsing = sunPulses({
      inDaily: state.daily !== null,
      hasSolvedAny: hasCampaignSolve(LEVELS, state.progress.best),
      solvedToday: dailyStarsOn(state.progress, today()) > 0,
    });
    if (pulsing && !this.pulsing) this.clock = 0;
    this.pulsing = pulsing;
  }

  /** Scales the sun icon to this frame's pulse (1 at rest). Allocation-free. */
  update(delta: number): void {
    this.clock = this.pulsing ? this.clock + delta : 0;
    const scale = this.pulsing ? sunPulseScale(this.clock) : 1;
    for (const entity of this.queries.buttons.entities) {
      if (entity.getValue(ControlButton, 'action') !== ControlActions.Daily) continue;
      const root = entity.object3D;
      if (!root) continue;
      root.userData.pulsing = this.pulsing;
      (root.userData.icon as Object3D | undefined)?.scale.setScalar(scale);
    }
  }
}
