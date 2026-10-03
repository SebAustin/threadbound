import { createSystem } from '@iwsdk/core';
import { loadSettings, saveSettings } from '../../lib/settings';
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
        const settings = { ...puzzleStore.get().settings, ...command.patch };
        saveSettings(this.storage, settings);
        puzzleStore.update({ settings });
      }),
    );
  }
}
