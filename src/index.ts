/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { AmbienceSystem } from './features/audio/AmbienceSystem.js';
import { AudioUnlockSystem } from './features/audio/AudioUnlockSystem.js';
import { CaptionSystem } from './features/captions/CaptionSystem.js';
import { ControlsSystem } from './features/controls/ControlsSystem.js';
import { SunPulseSystem } from './features/controls/SunPulseSystem.js';
import { TouchFeedbackSystem } from './features/input/TouchFeedbackSystem.js';
import { EnvironmentSystem } from './features/environment/EnvironmentSystem.js';
import { MarbleSystem } from './features/marbles/MarbleSystem.js';
import { PlacementSystem } from './features/placement/PlacementSystem.js';
import { RevealSystem } from './features/placement/RevealSystem.js';
import { PuzzleSystem } from './features/puzzle/PuzzleSystem.js';
import { ContrastSystem } from './features/settings/ContrastSystem.js';
import { SettingsSystem } from './features/settings/SettingsSystem.js';
import { SimulationClockSystem } from './features/simulation/SimulationClockSystem.js';
import { SliderSystem } from './features/sliders/SliderSystem.js';
import { ThreadSystem } from './features/threads/ThreadSystem.js';
import { ThreadVibrationSystem } from './features/threads/ThreadVibrationSystem.js';
import { OnboardingSystem } from './features/onboarding/OnboardingSystem.js';
import { HudSystem } from './features/hud/HudSystem.js';
import { PauseSystem } from './features/pause/PauseSystem.js';
import { PanelSystem } from './panel.js';
import { bootScreen } from './features/entry/bootScreen.js';

World.create(
  document.getElementById('scene-container') as HTMLDivElement,
  projectOptions,
).then(async (world) => {
  world.registerSystem(EnvironmentSystem);
  // Settings first: the first level's marbles read them.
  world.registerSystem(SettingsSystem);
  // Right after the settings load: paints the diorama's shared materials for high contrast.
  world.registerSystem(ContrastSystem);
  world.registerSystem(SimulationClockSystem);
  world.registerSystem(PuzzleSystem);
  world.registerSystem(ThreadSystem);
  world.registerSystem(ThreadVibrationSystem);
  world.registerSystem(MarbleSystem);
  world.registerSystem(ControlsSystem);
  // The sun pulses while today's daily is unsolved; it finds the sun among the ledge buttons each frame.
  world.registerSystem(SunPulseSystem);
  // Lights and moves whatever a ray, gaze or fingertip touches: buttons, chutes, tabs, pegs, threads.
  world.registerSystem(TouchFeedbackSystem);
  world.registerSystem(SliderSystem);
  world.registerSystem(PlacementSystem);
  // After placement: a placement's rebuild starts its fade, which waits while the diorama is hidden.
  world.registerSystem(RevealSystem);
  world.registerSystem(PanelSystem);
  world.registerSystem(HudSystem);
  // After the plaque: always-on visual captions (a wrong cup blinks, a replayed note pulses a star).
  world.registerSystem(CaptionSystem);
  world.registerSystem(OnboardingSystem);
  world.registerSystem(AudioUnlockSystem);
  world.registerSystem(AmbienceSystem);
  // Last: it pauses systems registered above.
  world.registerSystem(PauseSystem);
  // The game is up: remove the loading cover so it can never sit over mouse play.
  bootScreen.ready();
  if (import.meta.env.DEV) {
    // Dev-only tooling, imported dynamically so none of it reaches the production bundle.
    const [{ PerfProbeSystem }, { installTestHook }] = await Promise.all([
      import('./features/debug/PerfProbeSystem.js'),
      import('./features/debug/testHook.js'),
    ]);
    world.registerSystem(PerfProbeSystem);
    installTestHook(world);
  }
}).catch((error: unknown) => {
  // A rejected World.create, or an error while registering systems: say so on screen, not only here.
  console.error('[Threadbound] the game failed to start', error);
  bootScreen.fail(error);
});
