import { Vector3, type World } from '@iwsdk/core';
import { LEVELS } from '../../levels';
import { handleOffset } from '../../lib/rail';
import { solutionSteps } from '../../lib/solutionSteps';
import { puzzleStore, type PuzzleCommand } from '../puzzle/puzzleStore';

interface ScreenPoint {
  x: number;
  y: number;
}

export interface ThreadboundTestHook {
  /** Canvas-relative CSS pixel position of a diorama-local point. */
  project(x: number, y: number, z?: number): ScreenPoint;
  pegs(): Array<{ id: string } & ScreenPoint>;
  chute(): ScreenPoint | null;
  state(): ReturnType<typeof puzzleStore.get>;
  levels(): Array<{ id: string; name: string }>;
  dispatch(command: PuzzleCommand): void;
  /** Canvas position of a control button ('restart' | 'next'), null if absent. */
  button(action: string): (ScreenPoint & { visible: boolean }) | null;
  /** Canvas position of a rail peg's slider tab, null if the peg has no rail. */
  handle(pegId: string): ScreenPoint | null;
  /** Where that tab would be on screen with its peg at `along` on the rail. */
  handleAt(pegId: string, along: number): ScreenPoint | null;
  /** Slides a rail peg to `along` (clamped to its rail) through the command bus. */
  slide(pegId: string, along: number): void;
  /** Applies the current level's stored solution (slides, snips, threads); does not drop. */
  solve(): void;
  /** Current diorama frame: origin (bottom-left, world) and yaw. */
  frame(): { origin: number[]; yaw: number } | null;
  marbles(): Array<{ x: number; y: number; z: number; scored: boolean; color: string }>;
  /** World-space position of a diorama-local point (for aiming emulated hands). */
  worldOf(x: number, y: number, z?: number): { x: number; y: number; z: number };
  room(): { visible: boolean; background: boolean; blendMode: string | null };
  /** What the diorama plaque last rendered, and where it sits in diorama-local space. */
  hud(): { model: unknown; local: { x: number; y: number; z: number } } | null;
  /** Ghost-hand tutorial: current step and whether it is drawn. */
  ghost(): { step: string; visible: boolean } | null;
}

declare global {
  interface Window {
    __threadbound?: ThreadboundTestHook;
  }
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Dev-only E2E hook: lets Playwright aim real input at pegs and buttons
 * regardless of framing, and drive levels through the same command bus the
 * player uses. Stripped from production builds by the import.meta.env.DEV guard.
 */
export function installTestHook(world: World): void {
  if (!import.meta.env.DEV) return;
  const tmp = new Vector3();
  const toScreen = (worldPoint: Vector3): ScreenPoint => {
    const rect = world.renderer.domElement.getBoundingClientRect();
    worldPoint.project(world.camera);
    return { x: ((worldPoint.x + 1) / 2) * rect.width, y: ((1 - worldPoint.y) / 2) * rect.height };
  };
  const project = (x: number, y: number, z = 0): ScreenPoint => {
    const frame = puzzleStore.frame;
    if (!frame) return { x: -1, y: -1 };
    return toScreen(frame.localToWorld(x, y, z, tmp));
  };

  window.__threadbound = {
    project,
    pegs: () => puzzleStore.get().level?.pegs.map((p) => ({ id: p.id, ...project(p.x, p.y) })) ?? [],
    chute: () => {
      const level = puzzleStore.get().level;
      const chute = level?.chutes[0];
      return chute ? project(chute.x, chute.y + 0.02) : null;
    },
    state: () => puzzleStore.get(),
    levels: () => LEVELS.map((l) => ({ id: l.id, name: l.name })),
    dispatch: (command) => puzzleStore.dispatch(command),
    button: (action) => {
      const object = world.scene.getObjectByName(`button-${action}`);
      if (!object) return null;
      return { ...toScreen(object.getWorldPosition(new Vector3())), visible: object.visible };
    },
    handle: (pegId) => {
      const object = world.scene.getObjectByName(`handle-${pegId}`);
      return object ? toScreen(object.getWorldPosition(new Vector3())) : null;
    },
    handleAt: (pegId, along) => {
      const frame = puzzleStore.frame;
      const peg = puzzleStore.get().level?.pegs.find((p) => p.id === pegId);
      const object = world.scene.getObjectByName(`handle-${pegId}`);
      if (!frame || !peg?.rail || !object) return null;
      const depth = frame.worldToLocal(object.getWorldPosition(new Vector3()), new Vector3()).z;
      const [ox, oy] = handleOffset(peg.rail.axis);
      const x = peg.rail.axis === 'x' ? along : peg.x;
      const y = peg.rail.axis === 'y' ? along : peg.y;
      return project(x + ox, y + oy, depth);
    },
    // Rails clamp the off-axis coordinate back to the peg, so `along` serves for both.
    slide: (pegId, along) => puzzleStore.dispatch({ type: 'movePeg', pegId, x: along, y: along }),
    solve: () => {
      const level = puzzleStore.get().level;
      if (level) for (const step of solutionSteps(level)) puzzleStore.dispatch(step);
    },
    frame: () => {
      const anchor = puzzleStore.frame?.anchor;
      if (!anchor) return null;
      return { origin: anchor.position.toArray().map(round3), yaw: anchor.rotation.y };
    },
    marbles: () => {
      const frame = puzzleStore.frame;
      const found: Array<{ x: number; y: number; z: number; scored: boolean; color: string }> = [];
      if (!frame) return found;
      const worldPos = new Vector3();
      const local = new Vector3();
      world.scene.traverse((o) => {
        if (o.name !== 'marble') return;
        frame.worldToLocal(o.getWorldPosition(worldPos), local);
        const color = String(o.userData.color ?? 'teal');
        found.push({ x: round3(local.x), y: round3(local.y), z: round3(local.z), scored: false, color });
      });
      return found;
    },
    worldOf: (x, y, z = 0) => {
      const frame = puzzleStore.frame;
      if (!frame) return { x: 0, y: 0, z: 0 };
      const v = frame.localToWorld(x, y, z, new Vector3());
      return { x: v.x, y: v.y, z: v.z };
    },
    hud: () => {
      const plaque = world.scene.getObjectByName('HUD Plaque') ?? world.getSceneObject('hud-plaque');
      const frame = puzzleStore.frame;
      if (!plaque || !frame) return null;
      const local = frame.worldToLocal(plaque.getWorldPosition(new Vector3()), new Vector3());
      return { model: plaque.userData.hud ?? null, local: { x: round3(local.x), y: round3(local.y), z: round3(local.z) } };
    },
    ghost: () => {
      const root = world.scene.getObjectByName('onboarding-ghost');
      return root ? { step: String(root.userData.step ?? ''), visible: root.visible } : null;
    },
    room: () => ({
      visible: world.scene.getObjectByName('virtual-room')?.visible ?? false,
      background: world.scene.background !== null,
      blendMode: world.session?.environmentBlendMode ?? null,
    }),
  };
}
