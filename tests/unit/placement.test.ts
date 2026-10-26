import { describe, expect, test } from 'vitest';
import { DIORAMA, DIORAMA_DEFAULT_POSITION } from '../../src/config/constants';
import { LEVELS } from '../../src/levels';
import {
  ACCEPT_REACH,
  choosePlacement,
  facingYaw,
  FOOTPRINT,
  headRelativePlacement,
  OFFSET_STEP,
  offsetOrigin,
  originFromCenter,
  reachAt,
  STUDY_TABLE_TOP,
  studyTableFit,
  type Placement,
  type PlaneCandidate,
  type ReachLevel,
} from '../../src/lib/placement';
import type { Vec3 } from '../../src/lib/vec';

const head = [0, 1.2, 0] as const;
const forward = [0, 0, -1] as const;
/** A seated player's head (tests/unit/viewExtent.test.ts, tests/e2e/reach.e2e.mjs). */
const SEATED: Vec3 = [0, 1.15, 0];
/** Level 1: every campaign level is 0.5 m wide, so its ledge buttons set the same reach. */
const LEVEL = LEVELS[0];

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
    const p = choosePlacement([table], head, LEVEL)!;
    expect(p).not.toBeNull();
    expect(p.center[1]).toBeCloseTo(0.76 + DIORAMA.slab);
    // The ledge's front rests on the near edge (z=-0.3): the channel sits that far behind it.
    expect(p.center[2]).toBeCloseTo(-0.3 - FOOTPRINT.front);
    expect(p.yaw).toBeCloseTo(0);
  });

  test('the frame origin is DIORAMA.slab above the surface, so the base sits on the table, not in it', () => {
    const p = choosePlacement([table], head, LEVEL)!;
    expect(originFromCenter(p.center, p.yaw, LEVEL.size[0])[1]).toBeCloseTo(table.max[1] + DIORAMA.slab, 9);
  });

  test('ignores walls, floors, ceilings and tiny surfaces', () => {
    const wall: PlaneCandidate = { orientation: 'vertical', min: [-1, 0, -2], max: [1, 2, -2] };
    const floor: PlaneCandidate = { orientation: 'horizontal', label: 'floor', min: [-2, 0, -2], max: [2, 0, 2] };
    const coaster: PlaneCandidate = { orientation: 'horizontal', min: [0, 0.75, -0.5], max: [0.1, 0.75, -0.4] };
    expect(choosePlacement([wall, floor, coaster], head, LEVEL)).toBeNull();
  });

  test('prefers a labelled table over an unlabelled shelf at similar height', () => {
    const shelf: PlaneCandidate = { orientation: 'horizontal', min: [-0.4, 0.9, -0.6], max: [0.4, 0.92, -0.2] };
    const p = choosePlacement([shelf, table], head, LEVEL)!;
    expect(p.center[1]).toBeCloseTo(0.76 + DIORAMA.slab);
  });

  test('passes over a table whose near edge is beyond a seated arm (it would put the pegs out of reach)', () => {
    const across: PlaneCandidate = { ...table, min: [-0.5, 0.74, -1.4], max: [0.5, 0.76, -0.7] };
    expect(choosePlacement([across], head, LEVEL)).toBeNull();
  });

  test('on an accepted table everything a player touches is within ACCEPT_REACH', () => {
    const p = choosePlacement([table], head, LEVEL)!;
    expect(reachAt(p, head, LEVEL)).toBeLessThanOrEqual(ACCEPT_REACH);
  });

  test('rejects surfaces out of seated reach', () => {
    const far: PlaneCandidate = { ...table, min: [-0.5, 0.74, -3], max: [0.5, 0.76, -2.4] };
    expect(choosePlacement([far], head, LEVEL)).toBeNull();
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
    const p = choosePlacement([side, ahead], head, LEVEL, forward)!;
    expect(p.center[2]).toBeLessThan(-0.4);
  });

  test('never places behind the player', () => {
    expect(choosePlacement([behind], head, LEVEL, forward)).toBeNull();
  });

  test('without a forward vector, behaves as before (distance only)', () => {
    expect(choosePlacement([behind], head, LEVEL)).not.toBeNull();
  });
});

/** Horizontal angle (degrees) of a world point from the head, clockwise from straight ahead (-z). */
const bearing = (from: readonly number[], x: number, z: number) => (Math.atan2(x - from[0], -(z - from[2])) * 180) / Math.PI;

interface FacingTable {
  /** Bearing of the near edge's closest point, and its horizontal distance from the head. */
  readonly angle: number;
  readonly nearEdge: number;
  readonly top?: number;
  readonly label?: string;
  /** Along the near edge (left, right of the closest point), and back from it. */
  readonly along?: readonly [number, number];
  readonly depth?: number;
}

/**
 * A table whose near edge faces `from` square on, its closest point `nearEdge` m away at
 * bearing `angle`. Plane frame: origin at that closest point, +z toward the head.
 */
function facingTable(from: readonly number[], t: FacingTable): PlaneCandidate {
  const { angle, nearEdge, top = 0.74, label, along = [-0.5, 0.5], depth = 0.6 } = t;
  const a = (angle * Math.PI) / 180;
  const origin: Vec3 = [from[0] + nearEdge * Math.sin(a), top, from[2] - nearEdge * Math.cos(a)];
  const yaw = -a;
  const local: [number, number][] = [[along[0], -depth], [along[1], -depth], [along[1], 0], [along[0], 0]];
  const xs = local.map(([x, z]) => origin[0] + x * Math.cos(yaw) + z * Math.sin(yaw));
  const zs = local.map(([x, z]) => origin[2] - x * Math.sin(yaw) + z * Math.cos(yaw));
  return {
    orientation: 'horizontal',
    label,
    min: [Math.min(...xs), top - 0.01, Math.min(...zs)],
    max: [Math.max(...xs), top, Math.max(...zs)],
    pose: { origin, yaw, min: [along[0], -depth], max: [along[1], 0] },
  };
}

/** A table's middle (world x, z): from its pose when it has one, else from its bounds. */
const middleOf = (t: PlaneCandidate): [number, number] => {
  if (!t.pose) return [(t.min[0] + t.max[0]) / 2, (t.min[2] + t.max[2]) / 2];
  const { origin, yaw, min, max } = t.pose;
  const lx = (min[0] + max[0]) / 2;
  const lz = (min[1] + max[1]) / 2;
  return [origin[0] + lx * Math.cos(yaw) + lz * Math.sin(yaw), origin[2] - lx * Math.sin(yaw) + lz * Math.cos(yaw)];
};

/** Bearing of a table's middle. */
const middleBearing = (from: readonly number[], t: PlaneCandidate) => bearing(from, ...middleOf(t));

/** `t` slid `d` m horizontally toward `from`, along the bearing of its middle: its bounds and pose move with it. */
function slid(t: PlaneCandidate, from: Vec3, d: number): PlaneCandidate {
  const [mx, mz] = middleOf(t);
  const len = Math.hypot(from[0] - mx, from[2] - mz);
  const [dx, dz] = [((from[0] - mx) / len) * d, ((from[2] - mz) / len) * d];
  const pose = t.pose && { ...t.pose, origin: [t.pose.origin[0] + dx, t.pose.origin[1], t.pose.origin[2] + dz] as const };
  return { ...t, min: [t.min[0] + dx, t.min[1], t.min[2] + dz], max: [t.max[0] + dx, t.max[1], t.max[2] + dz], pose };
}

/**
 * How far (m, to 0.1 mm) a table has to slide toward `from` before choosePlacement takes it for
 * level 1: 0 where it stands. Where a ticket 07 fixture that ACCEPT_REACH still refuses goes.
 */
function slideToAccept(t: PlaneCandidate, from: Vec3): number {
  const accepted = (d: number) => choosePlacement([slid(t, from, d)], from, LEVEL, forward) !== null;
  if (accepted(0)) return 0;
  let [lo, hi] = [0, 0.3];
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (accepted(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

describe('choosePlacement off-axis rejection', () => {
  test('a table 90° to the side is ignored (fall back to in front)', () => {
    const side: PlaneCandidate = { orientation: 'horizontal', label: 'table', min: [0.5, 0.74, -0.3], max: [1.1, 0.76, 0.3] };
    expect(choosePlacement([side], head, LEVEL, forward)).toBeNull();
  });

  test('a table 30° off-axis is still used, once slid toward the head to where every control is within ACCEPT_REACH', () => {
    // Where it stands, the base's farthest control is about 0.81 m from the head, past ACCEPT_REACH
    // (ticket 19's Comments); the facing gate is what this case is about.
    const angled: PlaneCandidate = { orientation: 'horizontal', label: 'table', min: [0.1, 0.74, -0.8], max: [0.7, 0.76, -0.4] };
    expect(choosePlacement([angled], head, LEVEL, forward)).toBeNull();
    const p = choosePlacement([slid(angled, head, slideToAccept(angled, head))], head, LEVEL, forward)!;
    expect(p).not.toBeNull();
    expect(bearing(head, p.center[0], p.center[2])).toBeGreaterThan(30);
    expect(reachAt(p, head, LEVEL)).toBeLessThanOrEqual(ACCEPT_REACH);
  });

  test('a wide table centred 50 degrees off, with its near edge 80 degrees off, is rejected', () => {
    // The gate is checked where the diorama would stand (at its near edge), not at the table's middle.
    const wide = facingTable(SEATED, { angle: 80, nearEdge: 0.3, label: 'table', along: [-0.992, 0.3] });
    expect(middleBearing(SEATED, wide)).toBeCloseTo(50, 0);
    expect(choosePlacement([wide], SEATED, LEVEL, forward)).toBeNull();
  });

  test('an unlabelled table straight ahead beats a "desk" 55 degrees off at the same distance', () => {
    const ahead = facingTable(SEATED, { angle: 0, nearEdge: 0.3 });
    const desk = facingTable(SEATED, { angle: 55, nearEdge: 0.3, label: 'desk' });
    const p = choosePlacement([desk, ahead], SEATED, LEVEL, forward)!;
    expect(p).not.toBeNull();
    expect(bearing(SEATED, p.center[0], p.center[2])).toBeCloseTo(0, 1);
  });
});

const DESK_TOP = 0.74;

/** A 0.74 m desk straight ahead, 1.2 m wide and 0.6 m deep, its near edge `nearEdge` m from the head. */
const desk = (nearEdge: number): PlaneCandidate => ({
  orientation: 'horizontal',
  label: 'desk',
  min: [-0.6, DESK_TOP - 0.01, -(nearEdge + 0.6)],
  max: [0.6, DESK_TOP, -nearEdge],
});

/** Where the diorama stands on `desk(nearEdge)`, whether or not it is accepted: the ledge front on the near edge. */
const onDesk = (nearEdge: number): Placement => ({ center: [0, DESK_TOP + DIORAMA.slab, -(nearEdge + FOOTPRINT.front)], yaw: 0 });

/**
 * The farthest near edge (m, horizontal from the seated head) at which every control on `level`
 * is within ACCEPT_REACH, found by bisection on reachAt (reach grows with the near edge).
 */
function nearEdgeLimit(level: ReachLevel): number {
  let [lo, hi] = [0, 2];
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (reachAt(onDesk(mid), SEATED, level) <= ACCEPT_REACH) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Q41's limit, before Q47: a seated 2 ft. */
const TWO_FEET = 0.61;
/** How far either side of a derived limit the desks stand. */
const STEP = 0.001;

describe('choosePlacement: a desk is accepted from the measured reach, within ACCEPT_REACH (ray-pinch reach from a chair)', () => {
  test('ACCEPT_REACH is 0.69 m (Q47, then Q50)', () => {
    expect(ACCEPT_REACH).toBe(0.69);
  });

  test('a 0.74 m desk with its near edge 0.50 m from a seated head (1.15 m) is accepted: level 1\'s ledge buttons are past 2 ft, within ACCEPT_REACH', () => {
    const p = choosePlacement([desk(0.5)], SEATED, LEVEL, forward);
    expect(p).not.toBeNull();
    expect(reachAt(p!, SEATED, LEVEL)).toBeGreaterThan(TWO_FEET);
    expect(reachAt(p!, SEATED, LEVEL)).toBeLessThanOrEqual(ACCEPT_REACH);
  });

  test('a 0.50 m desk is accepted on every level, w4-06 included (Q50)', () => {
    const refused = LEVELS.filter((level) => !choosePlacement([desk(0.5)], SEATED, level, forward)).map((level) => level.id);
    expect(refused).toEqual([]);
    for (const level of LEVELS) expect(nearEdgeLimit(level), level.id).toBeGreaterThanOrEqual(0.5);
  });

  test.each(LEVELS.map((level) => [level.id, level] as const))(
    '%s: a desk just inside the near-edge limit derived from reachAt is accepted, and one just past it floats',
    (_id, level) => {
      const limit = nearEdgeLimit(level);
      const inside = choosePlacement([desk(limit - STEP)], SEATED, level, forward);
      expect(inside).not.toBeNull();
      // The derivation stands the diorama where choosePlacement does.
      expect(inside!.center[2]).toBeCloseTo(onDesk(limit - STEP).center[2], 9);
      expect(reachAt(inside!, SEATED, level)).toBeLessThanOrEqual(ACCEPT_REACH);
      expect(choosePlacement([desk(limit + STEP)], SEATED, level, forward)).toBeNull();
    },
  );

  test('at 0.70 m it floats', () => {
    expect(choosePlacement([desk(0.7)], SEATED, LEVEL, forward)).toBeNull();
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

/** A 0.9 x 0.6 table turned `yawDeg` about Y, its near edge 0.40 m from the head unturned. */
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

/** The diorama base's corners (world XZ) for a placement: width x FOOTPRINT (back to front), facing yaw. */
const footprint = (p: { center: readonly number[]; yaw: number }, width: number) => {
  const hw = width / 2;
  const { back, front } = FOOTPRINT;
  return [[-hw, -back], [hw, -back], [hw, front], [-hw, front]].map(([x, z]) => [
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

describe('choosePlacement on rotated tables (plane pose + local polygon)', () => {
  test.each([0, 25, 40])('on a table turned %i degrees, taken where it stands, the whole base rests on the table', (deg) => {
    const t = turned(deg);
    const p = choosePlacement([t], head, LEVEL, forward)!;
    expect(p).not.toBeNull();
    for (const corner of footprint(p, 0.52)) expect(onTable(t, corner)).toBe(true);
    expect(reachAt(p, head, LEVEL)).toBeLessThanOrEqual(ACCEPT_REACH);
  });

  test('a table too small for the base is not used', () => {
    const small: PlaneCandidate = { ...turned(0), pose: { origin: [0.05, 0.75, -0.55], yaw: 0, min: [-0.2, -0.3], max: [0.2, 0.3] } };
    expect(choosePlacement([small], head, LEVEL, forward)).toBeNull();
  });
});

describe('studyTableFit: the virtual study table follows the offset', () => {
  const studyOrigin = (up: number, near: number) =>
    offsetOrigin(originFromCenter([...DIORAMA_DEFAULT_POSITION], 0, LEVEL.size[0]), 0, { up, near });

  test('unmoved, the table top meets the base underside', () => {
    expect(STUDY_TABLE_TOP).toBeCloseTo(DIORAMA_DEFAULT_POSITION[1] - DIORAMA.slab, 9);
    expect(studyTableFit({ up: 0, near: 0 })).toEqual({ z: 0, scaleY: 1 });
  });

  // The legs staying on the floor depends on the mesh being built about y = 0 (EnvironmentSystem);
  // tests/e2e/placement.e2e.mjs checks the drawn table's feet after Raise twice.
  test.each(Array.from({ length: 13 }, (_, i) => i - 6))('Raise %i: the top stays flush with the base underside', (up) => {
    const fit = studyTableFit({ up, near: 0 });
    expect(fit.scaleY).toBeGreaterThan(0);
    expect(STUDY_TABLE_TOP * fit.scaleY).toBeCloseTo(studyOrigin(up, 0)[1] - DIORAMA.slab, 9);
  });

  test.each([-2, -1, 1, 2])('Near %i slides the table along z with the diorama', (near) => {
    const fit = studyTableFit({ up: 3, near });
    expect(fit.z).toBeCloseTo(studyOrigin(3, near)[2] - DIORAMA_DEFAULT_POSITION[2], 9);
  });
});
