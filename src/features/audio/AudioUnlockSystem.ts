import { createSystem } from '@iwsdk/core';
import { stringSynth } from './stringSynth';

/** XR input events that count as a user gesture (transient activation) in WebXR. */
const XR_GESTURES = ['selectstart', 'squeezestart'] as const;

/**
 * Browsers only start audio from a user gesture. Game handlers run in the frame
 * loop, not inside one, and an XR session can begin from the browser's own UI,
 * so unlock on the first DOM pointer gesture (e.g. the Enter XR button) and on
 * every XR select/squeeze, even one aimed at nothing.
 */
export class AudioUnlockSystem extends createSystem({}) {
  private session: XRSession | null = null;
  private readonly unlock = (): void => stringSynth.unlock();

  init(): void {
    document.addEventListener('pointerdown', this.unlock, { passive: true });
    this.cleanupFuncs.push(
      () => document.removeEventListener('pointerdown', this.unlock),
      this.world.visibilityState.subscribe(() => this.watchSession()),
      () => this.unwatch(),
    );
  }

  /**
   * Follow the active session: listen on a new one, stop listening on an ended one. The head is
   * tracked only inside a session, so only there are positional cues panned.
   */
  private watchSession(): void {
    const session = this.world.session ?? null;
    if (session === this.session) return;
    this.unwatch();
    this.session = session;
    stringSynth.setImmersive(session !== null);
    for (const type of XR_GESTURES) session?.addEventListener(type, this.unlock);
  }

  private unwatch(): void {
    for (const type of XR_GESTURES) this.session?.removeEventListener(type, this.unlock);
    this.session = null;
  }
}
