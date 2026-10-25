import { HIT_AREA, SLIDER, THREAD_TUNING } from '../config/constants';

/** The size (meters) that subtends `degrees` at `distance`: 2 d tan(deg / 2). */
export function minTargetSize(distance: number, degrees: number): number {
  return 2 * distance * Math.tan((degrees * Math.PI) / 360);
}

/**
 * A part's hit size: its visual size, or the size that subtends HIT_AREA.minDegrees
 * at `distance` if that is larger.
 */
export function hitAreaSize(visual: number, distance: number): number {
  return Math.max(visual, minTargetSize(distance, HIT_AREA.minDegrees));
}

/** Diameter of the invisible cylinder around every thread (its visible radius is 6 mm). */
export const THREAD_HIT_DIAMETER = hitAreaSize(THREAD_TUNING.radius * 2, HIT_AREA.worstDistance);

/** The invisible box around a tab: wider and taller than the tab, as deep. */
export const TAB_HIT_SIZE: readonly [number, number, number] = [
  hitAreaSize(SLIDER.handleSize[0], HIT_AREA.worstDistance),
  hitAreaSize(SLIDER.handleSize[1], HIT_AREA.worstDistance),
  SLIDER.handleSize[2],
];
