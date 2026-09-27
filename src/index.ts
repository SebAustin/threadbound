/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { installTestHook } from './features/debug/testHook.js';
import { MarbleSystem } from './features/marbles/MarbleSystem.js';
import { PuzzleSystem } from './features/puzzle/PuzzleSystem.js';
import { ThreadSystem } from './features/threads/ThreadSystem.js';
import { PanelSystem } from './panel.js';

World.create(
  document.getElementById('scene-container') as HTMLDivElement,
  projectOptions,
).then((world) => {
  world.registerSystem(PuzzleSystem);
  world.registerSystem(ThreadSystem);
  world.registerSystem(MarbleSystem);
  world.registerSystem(PanelSystem);
  installTestHook(world);
});
