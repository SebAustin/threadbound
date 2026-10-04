import { createSystem } from '@iwsdk/core';
import { applySettingsPatch, loadSettings, saveSettings } from '../../lib/settings';
import { browserStorage } from '../../lib/storage';
import { puzzleStore } from '../puzzle/puzzleStore';

/** Loads player settings at startup and persists every change made through the bus. */
export class SettingsSystem extends createSystem({}) {
  private storage = browserStorage();

  init(): void {
    puzzleStore.update({ settings: loadSettings(this.storage) });
    this.cleanupFuncs.push(
      puzzleStore.onCommand((command) => {
        if (command.type !== 'settings') return;
        const current = puzzleStore.get().settings;
        const settings = applySettingsPatch(current, command.patch);
        if (settings === current) return;
        saveSettings(this.storage, settings);
        puzzleStore.update({ settings });
      }),
    );
  }
}
