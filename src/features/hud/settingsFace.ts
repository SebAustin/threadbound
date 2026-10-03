import type { UIKit, UIKitMLAsset } from '@iwsdk/core';
import { settingsModel } from '../../lib/hud';
import { DISARMED, RESET_WINDOW_SECONDS, resetLabel, resetPoke, type ResetGuard } from '../../lib/resetGuard';
import type { DioramaOffset } from '../../lib/placement';
import { stepOffset, type Settings } from '../../lib/settings';
import { puzzleStore } from '../puzzle/puzzleStore';

/** The plaque's settings face: each control dispatches a settings change on the bus. */
const now = () => performance.now() / 1000;

export class SettingsFace {
  private shown: Settings | null = null;
  private resetGuard: ResetGuard = DISARMED;
  private disarmTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly panel: UIKitMLAsset) {}

  /** Wires the controls; returns the teardown. */
  bind(): () => void {
    const slow = this.panel.getElementById('set-slow');
    const toggleSlow = () => {
      const { slowMotion } = puzzleStore.get().settings;
      puzzleStore.dispatch({ type: 'settings', patch: { slowMotion: !slowMotion } });
    };
    const reset = this.panel.getElementById('set-reset');
    const pokeReset = () => this.pokeReset();
    slow?.addEventListener('click', toggleSlow);
    reset?.addEventListener('click', pokeReset);
    const unbindMoves = (
      [
        ['set-up', 'up', 1],
        ['set-down', 'up', -1],
        ['set-near', 'near', 1],
        ['set-far', 'near', -1],
      ] as const
    ).map(([id, axis, direction]) => this.bindMove(id, axis, direction));
    return () => {
      slow?.removeEventListener('click', toggleSlow);
      reset?.removeEventListener('click', pokeReset);
      for (const unbind of unbindMoves) unbind();
      clearTimeout(this.disarmTimer);
    };
  }

  /** One-handed diorama adjustment: each poke is one clamped step. */
  private bindMove(id: string, axis: keyof DioramaOffset, direction: 1 | -1): () => void {
    const button = this.panel.getElementById(id);
    const move = () => {
      const offset = stepOffset(puzzleStore.get().settings.offset, axis, direction);
      puzzleStore.dispatch({ type: 'settings', patch: { offset } });
    };
    button?.addEventListener('click', move);
    return () => button?.removeEventListener('click', move);
  }

  /** First poke arms, a second within the window wipes progress (and brings the tutorial back). */
  private pokeReset(): void {
    const { guard, reset } = resetPoke(this.resetGuard, now());
    this.resetGuard = guard;
    if (reset) puzzleStore.dispatch({ type: 'resetProgress' });
    this.showResetLabel();
    clearTimeout(this.disarmTimer);
    if (!reset) this.disarmTimer = setTimeout(() => this.showResetLabel(), RESET_WINDOW_SECONDS * 1000 + 50);
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
