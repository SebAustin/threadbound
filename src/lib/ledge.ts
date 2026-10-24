import { CONTROLS, DIORAMA, LEDGE_STRIP } from '../config/constants';
import type { Vec3 } from './vec';

/** The diorama's front lip: its buttons, and the strip between Daily and Next. Frame meters. */
export type LedgeButton = 'restart' | 'settings' | 'daily' | 'next';

export const LEDGE_BUTTONS: readonly LedgeButton[] = ['restart', 'settings', 'daily', 'next'];

/** Frame z of the ledge's front edge. */
export const LEDGE_FRONT_Z = DIORAMA.channelHalfDepth + DIORAMA.slab + CONTROLS.ledgeDepth;
/** Frame z of the buttons' centres, halfway across the ledge. */
export const LEDGE_BUTTON_Z = LEDGE_FRONT_Z - CONTROLS.ledgeDepth / 2;

/** How many spacings each left-hand button sits from the first; Next keeps to the right side. */
const FROM_LEFT: Readonly<Record<Exclude<LedgeButton, 'next'>, number>> = { restart: 0, settings: 1, daily: 2 };

/** A button's centre along x on a level `levelWidth` wide. */
export function ledgeButtonX(button: LedgeButton, levelWidth: number): number {
  const { buttonInset: inset, buttonSpacing: spacing } = CONTROLS;
  return button === 'next' ? levelWidth - inset : inset + FROM_LEFT[button] * spacing;
}

export interface LedgeStripPose {
  /** Left and right edges along x, each LEDGE_STRIP.gap from the Daily and Next caps. */
  readonly x0: number;
  readonly x1: number;
  /** Centre of the bottom edge, which lies along the ledge front: where the panel's origin goes. */
  readonly bottom: Vec3;
  /** Corners: front left, front right, back right, back left. */
  readonly corners: readonly [Vec3, Vec3, Vec3, Vec3];
}

/** Where the strip lies on the ledge, raised LEDGE_STRIP.lean toward the player. */
export function ledgeStripPose(levelWidth: number): LedgeStripPose {
  const r = CONTROLS.buttonRadius;
  const x0 = ledgeButtonX('daily', levelWidth) + r + LEDGE_STRIP.gap;
  const x1 = ledgeButtonX('next', levelWidth) - r - LEDGE_STRIP.gap;
  const y = LEDGE_STRIP.lift;
  const z = LEDGE_FRONT_Z;
  const backY = y + LEDGE_STRIP.height * Math.sin(LEDGE_STRIP.lean);
  const backZ = z - LEDGE_STRIP.height * Math.cos(LEDGE_STRIP.lean);
  return {
    x0,
    x1,
    bottom: [(x0 + x1) / 2, y, z],
    corners: [
      [x0, y, z],
      [x1, y, z],
      [x1, backY, backZ],
      [x0, backY, backZ],
    ],
  };
}
