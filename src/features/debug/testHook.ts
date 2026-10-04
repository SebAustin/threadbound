import { Object3D, Vector3, type UIKitMLAsset, type World } from '@iwsdk/core';
import { AIM_PLANE_Z, PERF_BUDGET } from '../../config/constants';
import { LEVELS } from '../../levels';
import { budgetBreaches, type FrameStats } from '../../lib/perfBudget';
import { handleOffset } from '../../lib/rail';
import { solutionSteps } from '../../lib/solutionSteps';
import { puzzleStore, type PuzzleCommand } from '../puzzle/puzzleStore';
import { PerfProbeSystem } from './PerfProbeSystem';

interface ScreenPoint {
  x: number;
  y: number;
}

interface WorldPoint {
  x: number;
  y: number;
  z: number;
}

/** Where something is on screen (for real clicks) and in the world (for aiming emulated hands). */
type Located = ScreenPoint & { world: WorldPoint };

export interface ThreadboundTestHook {
  /** Canvas-relative CSS pixel position of a diorama-local point. */
  project(x: number, y: number, z?: number): ScreenPoint;
  pegs(): Array<{ id: string } & ScreenPoint>;
  chute(): ScreenPoint | null;
  state(): ReturnType<typeof puzzleStore.get>;
  levels(): Array<{ id: string; name: string }>;
  dispatch(command: PuzzleCommand): void;
  /** A ledge button ('restart' | 'next' | 'settings' | 'daily'), null if absent. */
  button(action: string): (Located & { visible: boolean }) | null;
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
  marbles(): Array<WorldPoint & { scored: boolean; color: string }>;
  /** World-space position of a diorama-local point (for aiming emulated hands). */
  worldOf(x: number, y: number, z?: number): WorldPoint;
  room(): { visible: boolean; background: boolean; blendMode: string | null };
  /** What the diorama plaque last rendered, and where it sits in diorama-local space. */
  hud(): { model: unknown; local: WorldPoint } | null;
  /** Which plaque face is showing, and where a plaque element is. */
  plaque(): { face: string; resetLabel: string } | null;
  plaqueElement(id: string): Located | null;
  /** Whether the active XR session exposes a gaze input source (eye-tracked devices). */
  gazeAvailable(): boolean;
  /** Cost of the next rendered frame, and any performance-budget breaches. */
  frameStats(): Promise<FrameStats & { breaches: string[] }>;
  /** Ghost-hand tutorial: current step and whether it is drawn. */
  ghost(): { step: string; visible: boolean } | null;
}

declare global {
  interface Window {
    __threadbound?: ThreadboundTestHook;
  }
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const plain = (v: Vector3): WorldPoint => ({ x: v.x, y: v.y, z: v.z });

/** Screen and world placement helpers shared by every probe. */
class Probe {
  private readonly tmp = new Vector3();

  constructor(private readonly world: World) {}

  toScreen(worldPoint: Vector3): ScreenPoint {
    const rect = this.world.renderer.domElement.getBoundingClientRect();
    worldPoint.project(this.world.camera);
    return { x: ((worldPoint.x + 1) / 2) * rect.width, y: ((1 - worldPoint.y) / 2) * rect.height };
  }

  /** Screen point of a diorama-local point. */
  project(x: number, y: number, z = 0): ScreenPoint {
    const frame = puzzleStore.frame;
    if (!frame) return { x: -1, y: -1 };
    return this.toScreen(frame.localToWorld(x, y, z, this.tmp));
  }

  locate(object: Object3D): Located {
    const at = object.getWorldPosition(new Vector3());
    const world = plain(at);
    return { ...this.toScreen(at), world };
  }
}

type Hook<K extends keyof ThreadboundTestHook> = Pick<ThreadboundTestHook, K>;

function levelProbes(
  probe: Probe,
): Hook<'project' | 'pegs' | 'chute' | 'state' | 'levels' | 'dispatch' | 'slide' | 'solve' | 'frame' | 'worldOf'> {
  return {
    project: (x, y, z) => probe.project(x, y, z),
    // Project the knob faces: the surface players aim at (see AIM_PLANE_Z).
    pegs: () => puzzleStore.get().level?.pegs.map((p) => ({ id: p.id, ...probe.project(p.x, p.y, AIM_PLANE_Z) })) ?? [],
    chute: () => {
      const chute = puzzleStore.get().level?.chutes[0];
      return chute ? probe.project(chute.x, chute.y + 0.02) : null;
    },
    state: () => puzzleStore.get(),
    levels: () => LEVELS.map((l) => ({ id: l.id, name: l.name })),
    dispatch: (command) => puzzleStore.dispatch(command),
    // Rails clamp the off-axis coordinate back to the peg, so `along` serves for both.
    slide: (pegId, along) => puzzleStore.dispatch({ type: 'movePeg', pegId, x: along, y: along }),
    solve: () => {
      const level = puzzleStore.get().level;
      if (level) for (const step of solutionSteps(level)) puzzleStore.dispatch(step);
    },
    frame: () => {
      const anchor = puzzleStore.frame?.anchor;
      return anchor ? { origin: anchor.position.toArray().map(round3), yaw: anchor.rotation.y } : null;
    },
    worldOf: (x, y, z = 0) => {
      const frame = puzzleStore.frame;
      return frame ? plain(frame.localToWorld(x, y, z, new Vector3())) : { x: 0, y: 0, z: 0 };
    },
  };
}

function sceneProbes(world: World, probe: Probe): Hook<'button' | 'handle' | 'handleAt' | 'marbles' | 'ghost'> {
  return {
    button: (action) => {
      const object = world.scene.getObjectByName(`button-${action}`);
      return object ? { ...probe.locate(object), visible: object.visible } : null;
    },
    handle: (pegId) => {
      const object = world.scene.getObjectByName(`handle-${pegId}`);
      return object ? probe.toScreen(object.getWorldPosition(new Vector3())) : null;
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
      return probe.project(x + ox, y + oy, depth);
    },
    marbles: () => {
      const frame = puzzleStore.frame;
      const found: Array<WorldPoint & { scored: boolean; color: string }> = [];
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
    ghost: () => {
      const root = world.scene.getObjectByName('onboarding-ghost');
      return root ? { step: String(root.userData.step ?? ''), visible: root.visible } : null;
    },
  };
}

function plaqueProbes(world: World, probe: Probe): Hook<'hud' | 'plaque' | 'plaqueElement'> {
  const plaque = () => world.getSceneObject<UIKitMLAsset>('hud-plaque');
  return {
    hud: () => {
      const panel = plaque();
      const frame = puzzleStore.frame;
      if (!panel || !frame) return null;
      const local = frame.worldToLocal(panel.getWorldPosition(new Vector3()), new Vector3());
      return { model: panel.userData.hud ?? null, local: { x: round3(local.x), y: round3(local.y), z: round3(local.z) } };
    },
    plaque: () => {
      const panel = plaque();
      return panel
        ? { face: String(panel.userData.face ?? ''), resetLabel: String(panel.userData.resetLabel ?? 'Reset progress') }
        : null;
    },
    plaqueElement: (id) => {
      // UIKit elements are scene objects; their world position is the element's centre.
      const element = plaque()?.getElementById(id) as unknown;
      return element instanceof Object3D ? probe.locate(element) : null;
    },
  };
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function sessionProbes(world: World): Hook<'gazeAvailable' | 'room' | 'frameStats'> {
  return {
    frameStats: async () => {
      // Two frames: the first may still be mid-rebuild; renderer.info resets every render.
      await nextFrame();
      await nextFrame();
      const { calls, triangles } = world.renderer.info.render;
      const stats = { drawCalls: calls, triangles, physicsBodies: world.getSystem(PerfProbeSystem)?.physicsBodies ?? -1 };
      return { ...stats, breaches: budgetBreaches(stats, PERF_BUDGET) };
    },
    gazeAvailable: () => [...(world.session?.inputSources ?? [])].some((s) => s.targetRayMode === 'gaze'),
    room: () => ({
      visible: world.scene.getObjectByName('virtual-room')?.visible ?? false,
      background: world.scene.background !== null,
      blendMode: world.session?.environmentBlendMode ?? null,
    }),
  };
}

/**
 * Dev-only E2E hook: lets Playwright aim real input at pegs and buttons
 * regardless of framing, and drive levels through the same command bus the
 * player uses. Stripped from production builds by the import.meta.env.DEV guard.
 */
export function installTestHook(world: World): void {
  if (!import.meta.env.DEV) return;
  world.registerSystem(PerfProbeSystem);
  const probe = new Probe(world);
  window.__threadbound = {
    ...levelProbes(probe),
    ...sceneProbes(world, probe),
    ...plaqueProbes(world, probe),
    ...sessionProbes(world),
  };
}
