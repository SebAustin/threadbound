import type { Object3D, Vector3 } from '@iwsdk/core';

/**
 * The slice of @pmndrs/pointer-events we rely on. IWSDK routes hand pinch rays,
 * gaze+pinch (VR Glasses), controllers and the desktop mouse through the same
 * events, dispatched directly on Object3Ds registered via RayInteractable.
 */
export interface SpatialPointerEvent {
  readonly pointerId: number;
  /** Pointer origin: the camera for the desktop mouse, the ray pose for hands/controllers. */
  readonly pointerPosition: Vector3;
  /**
   * World hit point. Stays live while captured (on the capture plane), unlike
   * `event.ray`, which reports the camera forward axis for the mouse.
   */
  readonly point: Vector3;
  stopPropagation(): void;
}

type PointerType = 'pointerdown' | 'pointermove' | 'pointerup' | 'click';

interface PointerTarget {
  addEventListener(type: PointerType, listener: (e: SpatialPointerEvent) => void): void;
  removeEventListener(type: PointerType, listener: (e: SpatialPointerEvent) => void): void;
  setPointerCapture?(pointerId: number): void;
  releasePointerCapture?(pointerId: number): void;
}

/** Subscribes to a pointer event on an Object3D; returns the unsubscribe function. */
export function onPointer(
  object: Object3D,
  type: PointerType,
  listener: (e: SpatialPointerEvent) => void,
): () => void {
  const target = object as unknown as PointerTarget;
  target.addEventListener(type, listener);
  return () => target.removeEventListener(type, listener);
}

export function capturePointer(object: Object3D, pointerId: number): void {
  (object as unknown as PointerTarget).setPointerCapture?.(pointerId);
}

export function releasePointer(object: Object3D, pointerId: number): void {
  (object as unknown as PointerTarget).releasePointerCapture?.(pointerId);
}
