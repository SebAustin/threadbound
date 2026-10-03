/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { installTestHook } from './features/debug/testHook.js';
import { ControlsSystem } from './features/controls/ControlsSystem.js';
import { EnvironmentSystem } from './features/environment/EnvironmentSystem.js';
import { MarbleSystem } from './features/marbles/MarbleSystem.js';
import { PlacementSystem } from './features/placement/PlacementSystem.js';
import { PuzzleSystem } from './features/puzzle/PuzzleSystem.js';
import { SliderSystem } from './features/sliders/SliderSystem.js';
import { ThreadSystem } from './features/threads/ThreadSystem.js';
import { ThreadVibrationSystem } from './features/threads/ThreadVibrationSystem.js';
import { OnboardingSystem } from './features/onboarding/OnboardingSystem.js';
import { HudSystem } from './features/hud/HudSystem.js';
import { PauseSystem } from './features/pause/PauseSystem.js';
import { PanelSystem } from './panel.js';

World.create(
  document.getElementById('scene-container') as HTMLDivElement,
  projectOptions,
).then((world) => {
  world.registerSystem(EnvironmentSystem);
  world.registerSystem(PuzzleSystem);
  world.registerSystem(ThreadSystem);
  world.registerSystem(ThreadVibrationSystem);
  world.registerSystem(MarbleSystem);
  world.registerSystem(ControlsSystem);
  world.registerSystem(SliderSystem);
  world.registerSystem(PlacementSystem);
  world.registerSystem(PanelSystem);
  world.registerSystem(HudSystem);
  world.registerSystem(OnboardingSystem);
  // Last: it pauses systems registered above.
  world.registerSystem(PauseSystem);
  installTestHook(world);
});
