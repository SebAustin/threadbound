import { BufferAttribute, BufferGeometry, Matrix4, Vector3 } from '@iwsdk/core';

export interface GeometryPart {
  readonly geometry: BufferGeometry;
  /** Where the part sits inside the merged geometry. */
  readonly at?: readonly [number, number, number];
}

const ATTRIBUTES = [
  ['position', 3],
  ['normal', 3],
  ['uv', 2],
] as const;

/**
 * Several indexed geometries sharing one material, merged into a single
 * geometry: one draw call instead of one per part. (Three's mergeGeometries
 * lives in the addons, which @iwsdk/core does not re-export.)
 */
export function mergeParts(parts: readonly GeometryPart[]): BufferGeometry {
  const placed = parts.map(({ geometry, at }) => {
    const copy = geometry.clone();
    if (at) copy.applyMatrix4(new Matrix4().setPosition(new Vector3(...at)));
    if (!copy.index) throw new Error('mergeParts: every part must be an indexed geometry');
    return copy;
  });
  const merged = new BufferGeometry();
  for (const [name, size] of ATTRIBUTES) {
    const total = placed.reduce((n, g) => n + g.getAttribute(name).count * size, 0);
    const data = new Float32Array(total);
    let offset = 0;
    for (const g of placed) {
      const source = g.getAttribute(name).array as ArrayLike<number>;
      data.set(source, offset);
      offset += source.length;
    }
    merged.setAttribute(name, new BufferAttribute(data, size));
  }
  const indices: number[] = [];
  let base = 0;
  for (const g of placed) {
    for (const i of g.index!.array) indices.push(i + base);
    base += g.getAttribute('position').count;
  }
  merged.setIndex(indices);
  merged.computeBoundingSphere();
  for (const g of placed) g.dispose();
  return merged;
}
