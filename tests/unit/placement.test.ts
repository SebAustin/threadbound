import { describe, expect, test } from 'vitest';
import {
  choosePlacement,
  facingYaw,
  FOOTPRINT_HALF_DEPTH,
  headRelativePlacement,
  OFFSET_STEP,
  offsetOrigin,
  originFromCenter,
  type PlaneCandidate,
} from '../../src/lib/placement';

const head = [0, 1.2, 0] as const;
const forward = [0, 0, -1] as const;

const table: PlaneCandidate = {
  orientation: 'horizontal',
  label: 'table',
  min: [-0.5, 0.74, -0.9],
  max: [0.5, 0.76, -0.3],
};

describe('facingYaw', () => {
  test('diorama front (+z) points at a viewer straight ahead', () => {
    // Diorama at -z, viewer at origin → front must point +z → yaw 0.
    expect(facingYaw([0, 0, -1], [0, 0, 0])).toBeCloseTo(0);
  });
  test('viewer to the right rotates the diorama toward +x', () => {
    expect(facingYaw([0, 0, 0], [1, 0, 0])).toBeCloseTo(Math.PI / 2);
  });
});

describe('choosePlacement', () => {
  test('puts the diorama on the table edge nearest the player, facing them', () => {
    const p = choosePlacement([table], head, 0.5)!;
    expect(p).not.toBeNull();
    expect(p.center[1]).toBeCloseTo(0.76);
    // Inset from the near edge (z=-0.3) so the base fully rests on the table.
    expect(p.center[2]).toBeLessThan(-0.3);
    expect(p.center[2]).toBeGreaterThan(-0.9);
    expect(p.yaw).toBeCloseTo(0);
  });

  test('ignores walls, floors, ceilings and tiny surfaces', () => {
    const wall: PlaneCandidate = { orientation: 'vertical', min: [-1, 0, -2], max: [1, 2, -2] };
    const floor: PlaneCandidate = { orientation: 'horizontal', label: 'floor', min: [-2, 0, -2], max: [2, 0, 2] };
    const coaster: PlaneCandidate = { orientation: 'horizontal', min: [0, 0.75, -0.5], max: [0.1, 0.75, -0.4] };
    expect(choosePlacement([wall, floor, coaster], head, 0.5)).toBeNull();
  });

  test('prefers a labelled table over an unlabelled shelf at similar height', () => {
    const shelf: PlaneCandidate = { orientation: 'horizontal', min: [-0.4, 0.9, -0.6], max: [0.4, 0.92, -0.2] };
    const p = choosePlacement([shelf, table], head, 0.5)!;
    expect(p.center[1]).toBeCloseTo(0.76);
  });

  test('passes over a table whose near edge is beyond a seated arm (it would put the pegs out of reach)', () => {
    const across: PlaneCandidate = { ...table, min: [-0.5, 0.74, -1.4], max: [0.5, 0.76, -0.7] };
    expect(choosePlacement([across], head, 0.5)).toBeNull();
  });

  test('on an accepted table the diorama centre stays within a seated 2 ft horizontally', () => {
    const p = choosePlacement([table], head, 0.5)!;
    expect(Math.hypot(p.center[0] - head[0], p.center[2] - head[2])).toBeLessThanOrEqual(0.61);
  });

  test('rejects surfaces out of seated reach', () => {
    const far: PlaneCandidate = { ...table, min: [-0.5, 0.74, -3], max: [0.5, 0.76, -2.4] };
    expect(choosePlacement([far], head, 0.5)).toBeNull();
  });
});

describe('headRelativePlacement', () => {
  test('lands in front of and below the eyes, facing the player', () => {
    const p = headRelativePlacement(head, forward);
    expect(p.center[2]).toBeLessThan(-0.3);
    expect(p.center[1]).toBeLessThan(head[1] - 0.25);
    expect(p.yaw).toBeCloseTo(0);
  });

  test('ignores head pitch (looking down still places ahead, not below)', () => {
    const p = headRelativePlacement(head, [0, -0.9, -0.43]);
    expect(p.center[2]).toBeLessThan(-0.3);
  });
});

describe('originFromCenter', () => {
  test('converts a centered placement to the bottom-left frame origin', () => {
    expect(originFromCenter([0, 0.76, -0.5], 0, 0.5)).toEqual([-0.25, 0.76, -0.5]);
    const o = originFromCenter([0, 0, 0], Math.PI / 2, 0.5);
    expect(o[0]).toBeCloseTo(0);
    expect(o[2]).toBeCloseTo(0.25);
  });
});

describe('choosePlacement facing preference', () => {
  // Both within seated reach (near edges 0.35 m and 0.4 m), so only facing decides.
  const side: PlaneCandidate = { orientation: 'horizontal', label: 'table', min: [0.35, 0.74, -0.3], max: [0.95, 0.76, 0.3] };
  const ahead: PlaneCandidate = { orientation: 'horizontal', label: 'table', min: [-0.3, 0.74, -1.0], max: [0.3, 0.76, -0.4] };
  const behind: PlaneCandidate = { orientation: 'horizontal', label: 'table', min: [-0.3, 0.74, 0.3], max: [0.3, 0.76, 0.9] };

  test('prefers the surface in front over one at the side at similar distance', () => {
    const p = choosePlacement([side, ahead], head, 0.5, forward)!;
    expect(p.center[2]).toBeLessThan(-0.4);
  });

  test('never places behind the player', () => {
    expect(choosePlacement([behind], head, 0.5, forward)).toBeNull();
  });

  test('without a forward vector, behaves as before (distance only)', () => {
    expect(choosePlacement([behind], head, 0.5)).not.toBeNull();
  });
});

describe('choosePlacement off-axis rejection', () => {
  test('a table 90° to the side is ignored (fall back to in front)', () => {
    const side: PlaneCandidate = { orientation: 'horizontal', label: 'table', min: [0.5, 0.74, -0.3], max: [1.1, 0.76, 0.3] };
    expect(choosePlacement([side], head, 0.5, forward)).toBeNull();
  });

  test('a table 30° off-axis is still used', () => {
    const angled: PlaneCandidate = { orientation: 'horizontal', label: 'table', min: [0.1, 0.74, -0.8], max: [0.7, 0.76, -0.4] };
    expect(choosePlacement([angled], head, 0.5, forward)).not.toBeNull();
  });
});

describe('offsetOrigin: the player nudges the diorama up/down and toward/away', () => {
  test('up steps raise it; near steps bring it toward a player facing it head-on', () => {
    const o = offsetOrigin([0, 0.78, -0.42], 0, { up: 2, near: 1 });
    expect(o[0]).toBeCloseTo(0);
    expect(o[1]).toBeCloseTo(0.78 + 2 * OFFSET_STEP.up);
    expect(o[2]).toBeCloseTo(-0.42 + OFFSET_STEP.near);
  });

  test("near follows the diorama's facing when it is turned on a table", () => {
    const o = offsetOrigin([0, 0, 0], Math.PI / 2, { up: 0, near: 1 });
    expect(o[0]).toBeCloseTo(OFFSET_STEP.near);
    expect(o[2]).toBeCloseTo(0);
  });

  test('no offset leaves the pose alone', () => {
    expect(offsetOrigin([0.1, 0.7, -0.5], 0.3, { up: 0, near: 0 })).toEqual([0.1, 0.7, -0.5]);
  });
});

describe('choosePlacement on rotated tables (plane pose + local polygon)', () => {
  /** A 0.9 x 0.6 table turned `yawDeg` about Y, its near edge about 0.35 m from the head. */
  const turned = (yawDeg: number): PlaneCandidate => {
    const yaw = (yawDeg * Math.PI) / 180;
    const origin = [0.05, 0.75, -0.7] as const;
    // World AABB of the turned rectangle (what the plane mesh's box would report).
    const corners = [[-0.45, -0.3], [0.45, -0.3], [0.45, 0.3], [-0.45, 0.3]].map(([x, z]) => [
      origin[0] + x * Math.cos(yaw) + z * Math.sin(yaw),
      origin[2] - x * Math.sin(yaw) + z * Math.cos(yaw),
    ]);
    const xs = corners.map((c) => c[0]);
    const zs = corners.map((c) => c[1]);
    return {
      orientation: 'horizontal',
      label: 'table',
      min: [Math.min(...xs), 0.74, Math.min(...zs)],
      max: [Math.max(...xs), 0.75, Math.max(...zs)],
      pose: { origin, yaw, min: [-0.45, -0.3], max: [0.45, 0.3] },
    };
  };

  /** The diorama base's corners (world XZ) for a placement: width x FOOTPRINT depth, facing yaw. */
  const footprint = (p: { center: readonly number[]; yaw: number }, width: number) => {
    const hw = width / 2;
    const hd = FOOTPRINT_HALF_DEPTH;
    return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([x, z]) => [
      p.center[0] + x * Math.cos(p.yaw) + z * Math.sin(p.yaw),
      p.center[2] - x * Math.sin(p.yaw) + z * Math.cos(p.yaw),
    ]);
  };

  /** Whether a world XZ point lies on the turned table (in its local frame). */
  const onTable = (t: PlaneCandidate, [x, z]: number[]) => {
    const { origin, yaw, min, max } = t.pose!;
    const dx = x - origin[0];
    const dz = z - origin[2];
    const lx = dx * Math.cos(yaw) - dz * Math.sin(yaw);
    const lz = dx * Math.sin(yaw) + dz * Math.cos(yaw);
    return lx >= min[0] - 1e-6 && lx <= max[0] + 1e-6 && lz >= min[1] - 1e-6 && lz <= max[1] + 1e-6;
  };

  test.each([0, 25, 40])('on a table turned %i degrees the whole base rests on the table', (deg) => {
    const t = turned(deg);
    const p = choosePlacement([t], head, 0.5, forward)!;
    expect(p).not.toBeNull();
    for (const corner of footprint(p, 0.52)) expect(onTable(t, corner)).toBe(true);
  });

  test('a table too small for the base is not used', () => {
    const small: PlaneCandidate = { ...turned(0), pose: { origin: [0.05, 0.75, -0.55], yaw: 0, min: [-0.2, -0.3], max: [0.2, 0.3] } };
    expect(choosePlacement([small], head, 0.5, forward)).toBeNull();
  });
});
