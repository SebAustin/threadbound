import { Vector3 } from '@iwsdk/core';
import { intersectRayWithPlaneZ } from '../../lib/rayPlane';
import type { DioramaFrame } from '../diorama/dioramaFrame';
import type { SpatialPointerEvent } from './pointerEvents';

const origin = new Vector3();
const direction = new Vector3();

/**
 * Where a pointer (hand ray, gaze, controller or mouse) points on the diorama's
 * back plane (local z = 0), in diorama-local meters. The ray runs from the
 * pointer origin through its live capture-plane hit; when that ray is level
 * with the diorama (e.g. a hand held beside the glass) the hit itself is used.
 */
export function pointerToDiorama(
  e: SpatialPointerEvent,
  frame: DioramaFrame,
  out: { x: number; y: number },
): { x: number; y: number } {
  frame.worldToLocal(e.pointerPosition, origin);
  direction.subVectors(e.point, e.pointerPosition);
  frame.directionToLocal(direction, direction);
  const hit = intersectRayWithPlaneZ(
    [origin.x, origin.y, origin.z],
    [direction.x, direction.y, direction.z],
    0,
  );
  if (hit) {
    out.x = hit[0];
    out.y = hit[1];
    return out;
  }
  frame.worldToLocal(e.point, origin);
  out.x = origin.x;
  out.y = origin.y;
  return out;
}
