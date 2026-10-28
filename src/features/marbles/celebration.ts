import { Vector3 } from '@iwsdk/core';
import { CADENCE_HZ, CADENCE_STRUM_SECONDS, type ScheduledNote } from '../../lib/melody';
import type { CuePoint } from '../audio/cueLog';
import { stringSynth } from '../audio/stringSynth';
import { goalMaterial } from '../diorama/palette';
import { melodyNote, puzzleStore } from '../puzzle/puzzleStore';

/** Seconds the lit cups swell and settle while the cadence rings. */
const CUP_PULSE_SECONDS = 0.6;
/** At the pulse's peak, a lit cup floor is this much wider, and this many times thicker (it rises from the base). */
const CUP_PULSE_WIDEN = 0.05;
const CUP_PULSE_RISE = 2.5;

/**
 * What a solve sounds and looks like after its state is published, and the
 * melody-book replays: the cadence strummed from the cups while the lit cups
 * pulse, then a replay walked note by note on real time (it pauses with the
 * system that drives it). Allocation-free per frame.
 */
export class Celebration {
  /** Cadence notes strummed so far (all of them: no strum), and seconds since the strum began. */
  private strummed = CADENCE_HZ.length;
  private strumClock = 0;
  /** Where the strum is heard from (world, the mean of the cup centres), copied at `strum`; unset: no place. */
  private readonly strumAt = new Vector3();
  private strumPlaced = false;
  /** Seconds left in the lit cups' pulse. */
  private pulseLeft = 0;
  private replay: readonly ScheduledNote[] = [];
  private replayNext = 0;
  /** Seconds since the replay began; it starts negative to hold the first note back. */
  private replayClock = 0;

  /** True while the cadence is still to strum or a replay still has notes to play. */
  get playing(): boolean {
    return this.strummed < CADENCE_HZ.length || this.replayNext < this.replay.length;
  }

  /** A live solve: strum the cadence now, from `source` (copied) while the lit cups pulse. */
  strum(source?: CuePoint): void {
    this.strumPlaced = source !== undefined;
    if (source) this.strumAt.copy(source);
    this.strummed = 0;
    this.strumClock = 0;
    this.pulseLeft = CUP_PULSE_SECONDS;
  }

  /** Play `schedule` (lib/melody's replaySchedule), its clock starting `delaySeconds` before zero. */
  play(schedule: readonly ScheduledNote[], delaySeconds = 0): void {
    this.replay = schedule;
    this.replayNext = 0;
    this.replayClock = -delaySeconds;
  }

  /** A drop or a new build silences it and settles the cups. */
  stop(): void {
    this.strummed = CADENCE_HZ.length;
    this.replay = [];
    this.replayNext = 0;
    if (this.pulseLeft > 0) {
      this.pulseLeft = 0;
      this.shapeLitCups(0);
    }
  }

  update(delta: number): void {
    this.strumDue(delta);
    this.pulseDue(delta);
    this.replayDue(delta);
  }

  private strumDue(delta: number): void {
    if (this.strummed >= CADENCE_HZ.length) return;
    this.strumClock += delta;
    while (this.strummed < CADENCE_HZ.length && this.strumClock >= this.strummed * CADENCE_STRUM_SECONDS) {
      stringSynth.play('cadence', CADENCE_HZ[this.strummed], 1, this.strumPlaced ? this.strumAt : undefined);
      this.strummed += 1;
    }
  }

  private pulseDue(delta: number): void {
    if (this.pulseLeft <= 0) return;
    this.pulseLeft = Math.max(0, this.pulseLeft - delta);
    this.shapeLitCups(this.pulseLeft > 0 ? Math.sin(Math.PI * (1 - this.pulseLeft / CUP_PULSE_SECONDS)) : 0);
  }

  /**
   * Swells every lit cup floor by `swell` (0 = at rest, 1 = the peak); unlit floors stay at rest, so
   * a cup unlit mid-pulse (a new drop) settles too. Scale only: the cup materials are shared.
   */
  private shapeLitCups(swell: number): void {
    const diorama = puzzleStore.diorama;
    if (!diorama) return;
    for (let i = 0; i < diorama.goalMeshes.length; i++) {
      const mesh = diorama.goalMeshes[i];
      const s = mesh.material === goalMaterial(diorama.goals[i]?.color, true) ? swell : 0;
      mesh.scale.set(1 + CUP_PULSE_WIDEN * s, 1 + CUP_PULSE_RISE * s, 1);
    }
  }

  private replayDue(delta: number): void {
    if (this.replayNext >= this.replay.length) return;
    this.replayClock += delta;
    // Absolute offsets: a late frame never pushes the notes after it back.
    while (this.replayNext < this.replay.length && this.replay[this.replayNext].at <= this.replayClock) {
      const item = this.replay[this.replayNext];
      stringSynth.play(item.cue, item.hz);
      // A saved note's visual caption (a star pulse); a replay's closing cadence has none.
      if (item.cue === 'melody') puzzleStore.dispatch(melodyNote(item.note));
      this.replayNext += 1;
    }
  }
}
