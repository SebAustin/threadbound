import { createSystem, VisibilityState } from '@iwsdk/core';
import { AMBIENCE_INTERVAL_SECONDS, ambienceHz, ambienceRests } from '../../lib/soundCues';
import { shouldShowVirtualRoom } from '../../lib/xrMode';
import { puzzleStore } from '../puzzle/puzzleStore';
import { stringSynth } from './stringSynth';

/**
 * A slow, quiet phrase while the virtual study is shown. It rests over
 * passthrough, while paused, and during a drop, so it never competes with the
 * puzzle. Inputs are tracked by subscription; update() only counts time.
 */
export class AmbienceSystem extends createSystem({}) {
  private timer = AMBIENCE_INTERVAL_SECONDS;
  private step = 0;
  private context = { roomVisible: true, paused: false, dropping: false };

  init(): void {
    const trackRoom = () => {
      const immersive = this.world.visibilityState.peek() !== VisibilityState.NonImmersive;
      this.context.roomVisible = shouldShowVirtualRoom(immersive, this.world.session?.environmentBlendMode);
    };
    trackRoom();
    this.cleanupFuncs.push(
      this.world.visibilityState.subscribe(trackRoom),
      puzzleStore.subscribe((state) => {
        this.context.paused = state.paused;
        this.context.dropping = state.status === 'dropping';
      }),
    );
  }

  update(delta: number): void {
    if (ambienceRests(this.context)) return;
    this.timer -= delta;
    if (this.timer > 0) return;
    this.timer = AMBIENCE_INTERVAL_SECONDS;
    stringSynth.play('ambience', ambienceHz(this.step));
    this.step += 1;
  }
}
