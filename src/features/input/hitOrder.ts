import type { Mesh, Object3D } from '@iwsdk/core';

/**
 * Ranks every mesh under `root` for rays: pmndrs sorts hits by pointerEventsOrder
 * before distance, so a higher order wins wherever parts overlap (HIT_ORDER in
 * lib/touchFeedback: a knob always beats the hit areas around it).
 */
export function setHitOrder(root: Object3D, order: number): void {
  root.traverse((child) => {
    if ((child as Mesh).isMesh) (child as Object3D & { pointerEventsOrder?: number }).pointerEventsOrder = order;
  });
}
