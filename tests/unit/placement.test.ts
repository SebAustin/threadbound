import { describe, expect, test } from 'vitest';
import {
  choosePlacement,
  facingYaw,
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
  const side: PlaneCandidate = { orientation: 'horizontal', label: 'table', min: [0.5, 0.74, -0.3], max: [1.1, 0.76, 0.3] };
  const ahead: PlaneCandidate = { orientation: 'horizontal', label: 'table', min: [-0.3, 0.74, -1.1], max: [0.3, 0.76, -0.5] };
  const behind: PlaneCandidate = { orientation: 'horizontal', label: 'table', min: [-0.3, 0.74, 0.3], max: [0.3, 0.76, 0.9] };

  test('prefers the surface in front over one at the side at similar distance', () => {
    const p = choosePlacement([side, ahead], head, 0.5, forward)!;
    expect(p.center[2]).toBeLessThan(-0.5);
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
    const angled: PlaneCandidate = { orientation: 'horizontal', label: 'table', min: [0.1, 0.74, -0.9], max: [0.7, 0.76, -0.5] };
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
