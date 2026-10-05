import type { Entity, Mesh } from '@iwsdk/core';
import { SHARED_GEOMETRIES } from './palette';

/**
 * Frees an entity's own geometries but never the shared palette materials or
 * geometries, so restarting a level does not force shader recompiles.
 */
export function disposeLevelEntity(entity: Entity): void {
  entity.object3D?.traverse((child) => {
    const geometry = (child as Mesh).geometry;
    if (geometry && !SHARED_GEOMETRIES.has(geometry)) geometry.dispose();
  });
  entity.dispose({ disposeResources: false });
}
