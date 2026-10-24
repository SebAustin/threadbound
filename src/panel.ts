/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createSystem, SessionMode, type UIKit, type UIKitMLAsset, VisibilityState } from '@iwsdk/core';
import { bootScreen } from './features/entry/bootScreen.js';
import { onTap } from './features/input/onTap.js';
import { entryView, resolveSessionMode, type EntryMode } from './lib/xrMode.js';

async function isSupported(mode: SessionMode): Promise<boolean> {
  try {
    return (await navigator.xr?.isSessionSupported(mode)) ?? false;
  } catch (error) {
    console.warn(`[Threadbound] could not query ${mode} support`, error);
    return false;
  }
}

/**
 * The welcome card in the browser view, and the way into XR. The session mode is resolved
 * once up front (and again when the XR device changes), so a tap launches synchronously,
 * while the press's user activation is still fresh. Enter XR acts on release (onTap), so a
 * press of any length enters, even one that drifts within the button. The card and the DOM
 * fallback (bootScreen) both render from entryView.
 */
export class PanelSystem extends createSystem({}) {
  private panel: UIKitMLAsset | undefined;
  private mode: EntryMode = 'checking';
  private launchFailed = false;
  /** A launch was requested and its outcome isn't known yet. */
  private launching = false;
  /** Bumped per resolution, so an older answer can't overwrite a newer one. */
  private resolution = 0;

  init(): void {
    this.panel = this.world.getSceneObject<UIKitMLAsset>('welcome-panel');
    const onDeviceChange = () => void this.resolveMode();
    navigator.xr?.addEventListener('devicechange', onDeviceChange);
    this.cleanupFuncs.push(
      () => navigator.xr?.removeEventListener('devicechange', onDeviceChange),
      onTap(this.panel?.getElementById('xr-button'), this.launch),
      bootScreen.onEnter(this.launch),
      this.world.visibilityState.subscribe(() => this.render()),
    );
    if (this.world.xrEnabled) void this.resolveMode();
    else this.mode = null;
    this.render();
  }

  /** A launch that ended without a session (IWSDK only logs a rejected requestSession) asks for a retry. */
  update(): void {
    if (!this.launching || this.world.sessionRequestPending) return;
    this.launching = false;
    this.launchFailed = this.world.session == null;
    this.render();
  }

  /** Mixed reality when the runtime has passthrough, otherwise the VR study (Safari on visionOS only offers immersive-vr). */
  private async resolveMode(): Promise<void> {
    const run = ++this.resolution;
    const ar = await isSupported(SessionMode.ImmersiveAR);
    const vr = await isSupported(SessionMode.ImmersiveVR);
    if (run !== this.resolution) return;
    this.mode = resolveSessionMode({ ar, vr });
    this.render();
  }

  private readonly launch = (): void => {
    const mode = this.mode;
    if (mode === null || mode === 'checking') return;
    if (this.world.session != null || this.world.sessionRequestPending) return;
    this.launching = true;
    this.launchFailed = false;
    this.world.launchXR({ sessionMode: mode === 'immersive-ar' ? SessionMode.ImmersiveAR : SessionMode.ImmersiveVR });
    this.render();
  };

  private render(): void {
    const view = entryView({ mode: this.mode, launchFailed: this.launchFailed });
    const is2D = this.world.visibilityState.peek() === VisibilityState.NonImmersive;
    bootScreen.showEntry(view, !is2D);
    const panel = this.panel;
    if (!panel) return;
    panel.userData.entry = view;
    // In XR the plaque on the diorama carries the game state; no floating card.
    panel.visible = is2D;
    // Invisible objects still intersect rays; take it out of pointer hit-testing too.
    (panel as typeof panel & { pointerEvents?: string }).pointerEvents = is2D ? 'auto' : 'none';
    panel.getElementById('xr-button')?.setProperties({ display: view.button && is2D ? 'flex' : 'none' });
    // Never blank the note's text: a span emptied once may not lay out its next text.
    const note = view.note ? { text: view.note, display: 'flex' as const } : { display: 'none' as const };
    panel.getElementById<UIKit.Text>('xr-note')?.setProperties(note);
  }
}
