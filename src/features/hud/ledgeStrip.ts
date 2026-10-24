import { Quaternion, Vector3, type UIKit, type UIKitMLAsset } from '@iwsdk/core';
import { LEDGE_STRIP } from '../../config/constants';
import type { HudModel } from '../../lib/hud';
import { ledgeStripPose } from '../../lib/ledge';
import type { DioramaFrame } from '../diorama/dioramaFrame';

/** What the strip shows: the hint line, the thread count and the spool readout ('' when hidden). */
export interface LedgeText {
  readonly hint: string;
  readonly threads: string;
  readonly spool: string;
}

/** Panels face +Z: turned this far about x, the face lies on the ledge, raised LEDGE_STRIP.lean toward the player. */
const LIE_ON_LEDGE = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), LEDGE_STRIP.lean - Math.PI / 2);
const CM_PER_M = 100;

/**
 * The strip on the ledge, between Daily and Next: the hint line and the thread
 * count, within reach and below the playfield. It reads the same HudModel the
 * plaque does, so the model's fields (and the hook's readers) stay as they are.
 */
export class LedgeStrip {
  private shown: LedgeText | null = null;
  private width = 0;

  constructor(private readonly panel: UIKitMLAsset) {
    // The panel's origin is the middle of its bottom edge, which lies along the ledge front.
    panel.getElementById('ledge')?.setProperties({ anchorY: 'bottom' });
  }

  /** Lies on the ledge of the diorama in `frame`, 12 mm from the Daily and Next caps. */
  place(frame: DioramaFrame, levelWidth: number): void {
    const pose = ledgeStripPose(levelWidth);
    frame.localToWorld(pose.bottom[0], pose.bottom[1], pose.bottom[2], this.panel.position);
    frame.worldQuaternion(LIE_ON_LEDGE, this.panel.quaternion);
    const width = (pose.x1 - pose.x0) * CM_PER_M;
    if (width === this.width) return;
    this.width = width;
    this.panel.getElementById('ledge')?.setProperties({ width });
  }

  /** Drawn or not (it hides with the diorama while placement searches). */
  show(visible: boolean): void {
    this.panel.visible = visible;
  }

  render(hud: HudModel): void {
    const shown = this.shown;
    if (shown && shown.hint === hud.hint && shown.threads === hud.threadsLabel && shown.spool === hud.spoolLabel) return;
    const text: LedgeText = { hint: hud.hint, threads: hud.threadsLabel, spool: hud.spoolLabel };
    this.shown = text;
    this.panel.userData.ledge = text;
    this.line('ledge-hint', text.hint);
    this.line('ledge-threads', text.threads);
    this.line('ledge-spool', text.spool);
  }

  /** Shows `value` in the span, or hides the span when there is nothing to say (never empties it). */
  private line(id: string, value: string): void {
    const span = this.panel.getElementById<UIKit.Text>(id);
    if (value) span?.setProperties({ text: value, display: 'flex' });
    else span?.setProperties({ display: 'none' });
  }
}
