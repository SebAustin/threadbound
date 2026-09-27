/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createSystem, SessionMode, UIKitMLAsset, VisibilityState } from '@iwsdk/core';
import { resolveSessionMode } from './lib/xrMode.js';

async function isSupported(mode: SessionMode): Promise<boolean> {
  try {
    return (await navigator.xr?.isSessionSupported(mode)) ?? false;
  } catch (error) {
    console.warn(`[Threadbound] could not query ${mode} support`, error);
    return false;
  }
}

export class PanelSystem extends createSystem({}) {
  init(): void {
    const panel = this.world.getSceneObject<UIKitMLAsset>('welcome-panel');
    const xrButton = panel?.getElementById('xr-button');
    const exitButton = panel?.getElementById('exit-button');
    if (xrButton == null || exitButton == null) {
      return;
    }
    if (!this.world.xrEnabled) {
      xrButton.setProperties({ display: 'none' });
      exitButton.setProperties({ display: 'none' });
      return;
    }

    // Mixed reality when the runtime has passthrough, otherwise the VR study
    // (Safari on visionOS only offers immersive-vr).
    const launchXR = async () => {
      const mode = resolveSessionMode({
        ar: await isSupported(SessionMode.ImmersiveAR),
        vr: await isSupported(SessionMode.ImmersiveVR),
      });
      if (!mode) {
        console.warn('[Threadbound] no immersive session mode is supported here');
        return;
      }
      this.world.launchXR({
        sessionMode: mode === 'immersive-ar' ? SessionMode.ImmersiveAR : SessionMode.ImmersiveVR,
      });
    };
    const exitXR = () => this.world.exitXR();
    xrButton.addEventListener('click', launchXR);
    exitButton.addEventListener('click', exitXR);
    this.cleanupFuncs.push(
      () => xrButton.removeEventListener('click', launchXR),
      () => exitButton.removeEventListener('click', exitXR),
      this.world.visibilityState.subscribe((visibilityState) => {
        const is2D = visibilityState === VisibilityState.NonImmersive;
        xrButton.setProperties({ display: is2D ? 'flex' : 'none' });
        exitButton.setProperties({ display: is2D ? 'none' : 'flex' });
      }),
    );
  }
}
