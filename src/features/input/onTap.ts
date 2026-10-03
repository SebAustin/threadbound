/** The part of a UIKit element (or Object3D) that receives pointer events. */
interface PointerTarget {
  addEventListener(type: 'pointerdown' | 'pointerup', listener: (event: { pointerId: number }) => void): void;
  removeEventListener(type: 'pointerdown' | 'pointerup', listener: (event: { pointerId: number }) => void): void;
}

/**
 * Runs `action` when a pointer presses and releases on `target`: a tap. Unlike
 * DOM-style 'click', which only mouse pointers deliver here, down/up arrive from
 * every input (mouse, hand ray, poke, gaze + pinch). Returns the teardown.
 */
export function onTap(target: unknown, action: () => void): () => void {
  const el = target as PointerTarget | undefined;
  if (!el) return () => {};
  let pressedBy: number | null = null;
  const down = (event: { pointerId: number }) => {
    pressedBy = event.pointerId;
  };
  const up = (event: { pointerId: number }) => {
    if (pressedBy === event.pointerId) action();
    pressedBy = null;
  };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointerup', up);
  };
}
