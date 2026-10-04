/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { defineComponents } from '@iwsdk/core';
import { Chute, ControlButton, Marble, Peg, SliderHandle, TapReleased, Thread } from './features/puzzle/components.js';

export default defineComponents([Peg, Thread, Marble, Chute, ControlButton, SliderHandle, TapReleased]);
