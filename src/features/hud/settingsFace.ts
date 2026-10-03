import type { UIKit, UIKitMLAsset } from '@iwsdk/core';
import { settingsModel } from '../../lib/hud';
import type { Settings } from '../../lib/settings';
import { puzzleStore } from '../puzzle/puzzleStore';

/** The plaque's settings face: each control dispatches a settings change on the bus. */
export class SettingsFace {
  private shown: Settings | null = null;

  constructor(private readonly panel: UIKitMLAsset) {}

  /** Wires the controls; returns the teardown. */
  bind(): () => void {
    const slow = this.panel.getElementById('set-slow');
    const toggleSlow = () => {
      const { slowMotion } = puzzleStore.get().settings;
      puzzleStore.dispatch({ type: 'settings', patch: { slowMotion: !slowMotion } });
    };
    slow?.addEventListener('click', toggleSlow);
    return () => slow?.removeEventListener('click', toggleSlow);
  }

  render(settings: Settings): void {
    if (settings === this.shown) return;
    this.shown = settings;
    const model = settingsModel(settings);
    this.panel.getElementById<UIKit.Text>('set-slow')?.setProperties({ text: model.slowLabel });
  }
}
