import type { UIKit, UIKitMLAsset } from '@iwsdk/core';
import { settingsModel } from '../../lib/hud';
import { DISARMED, RESET_WINDOW_SECONDS, resetLabel, resetPoke, type ResetGuard } from '../../lib/resetGuard';
import type { DioramaOffset } from '../../lib/placement';
import { stepOffset, type Settings } from '../../lib/settings';
import { stringSynth } from '../audio/stringSynth';
import { onTap } from '../input/onTap';
import { puzzleStore } from '../puzzle/puzzleStore';

const now = () => performance.now() / 1000;

/** Repaint just after the reset window closes, so the label is never caught mid-expiry. */
const DISARM_REPAINT_MS = RESET_WINDOW_SECONDS * 1000 + 50;

/** The plaque's settings face: each control dispatches a settings change on the bus. */
export class SettingsFace {
  private shown: Settings | null = null;
  private resetGuard: ResetGuard = DISARMED;
  private disarmTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly panel: UIKitMLAsset) {}

  /** Wires the controls; returns the teardown. */
  bind(): () => void {
    // Every plaque control clicks like a ledge button.
    const control = (id: string, action: () => void) =>
      onTap(this.panel.getElementById(id), () => {
        stringSynth.unlock();
        stringSynth.play('button');
        action();
      });
    const unbind = [
      control('set-slow', () => {
        const { slowMotion } = puzzleStore.get().settings;
        puzzleStore.dispatch({ type: 'settings', patch: { slowMotion: !slowMotion } });
      }),
      control('set-reset', () => this.pokeReset()),
      ...(
        [
          ['set-up', 'up', 1],
          ['set-down', 'up', -1],
          ['set-near', 'near', 1],
          ['set-far', 'near', -1],
        ] as const
      ).map(([id, axis, direction]) => control(id, () => this.move(axis, direction))),
    ];
    return () => {
      for (const off of unbind) off();
      clearTimeout(this.disarmTimer);
    };
  }

  /** One-handed diorama adjustment: each poke is one clamped step. */
  private move(axis: keyof DioramaOffset, direction: 1 | -1): void {
    const offset = stepOffset(puzzleStore.get().settings.offset, axis, direction);
    puzzleStore.dispatch({ type: 'settings', patch: { offset } });
  }

  /** First poke arms, a second within the window wipes progress (and brings the tutorial back). */
  private pokeReset(): void {
    const { guard, reset } = resetPoke(this.resetGuard, now());
    this.resetGuard = guard;
    if (reset) puzzleStore.dispatch({ type: 'resetProgress' });
    this.showResetLabel();
    clearTimeout(this.disarmTimer);
    if (!reset) this.disarmTimer = setTimeout(() => this.showResetLabel(), DISARM_REPAINT_MS);
  }

  private showResetLabel(): void {
    const label = resetLabel(this.resetGuard, now());
    this.panel.userData.resetLabel = label;
    this.panel.getElementById<UIKit.Text>('set-reset')?.setProperties({ text: label });
  }

  render(settings: Settings): void {
    if (settings === this.shown) return;
    this.shown = settings;
    const model = settingsModel(settings);
    this.panel.getElementById<UIKit.Text>('set-slow')?.setProperties({ text: model.slowLabel });
    this.panel.getElementById<UIKit.Text>('set-offset')?.setProperties({ text: model.offsetLabel });
  }
}
