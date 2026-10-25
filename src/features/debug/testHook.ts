import { Box3, Object3D, PokeInteractable, Quaternion, Vector3, type UIKitMLAsset, type World } from '@iwsdk/core';
import { AIM_PLANE_Z, CHUTE, PERF_BUDGET } from '../../config/constants';
import { LEVELS } from '../../levels';
import { budgetBreaches, type FrameStats } from '../../lib/perfBudget';
import { handleOffset } from '../../lib/rail';
import { solutionSteps } from '../../lib/solutionSteps';
import { puzzleStore, type PuzzleCommand } from '../puzzle/puzzleStore';
import type { CueName } from '../../lib/soundCues';
import { drainCues, drainCueTrace, type CueRecord } from '../audio/cueLog';
import { stringSynth } from '../audio/stringSynth';
import { MarbleSystem } from '../marbles/MarbleSystem';
import { PlacementSystem } from '../placement/PlacementSystem';
import { RevealSystem } from '../placement/RevealSystem';
import { Thread } from '../puzzle/components';
import { TouchFeedbackSystem, type TouchMirror } from '../input/TouchFeedbackSystem';
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

/** A UIKit element: where it is, plus its rendered width and height in meters. */
type Sized = Located & { width: number; height: number };

/** The ledge strip as drawn (src/features/hud/ledgeStrip.ts). */
interface LedgeProbe {
  /** Diorama-local position of the panel's origin: the middle of its bottom edge. */
  local: WorldPoint;
  /** Radians its face is raised from lying flat on the ledge, toward the player. */
  lean: number;
  /** Rendered size in meters, along its face. */
  width: number;
  height: number;
  /** What it shows ('' for a hidden line). */
  text: { hint: string; threads: string; spool: string };
  visible: boolean;
}

/** A touchable part as TouchFeedbackSystem shows it, and whether a fingertip can poke it. */
/** A touchable part's mirror, whether it takes a poke, and its root's object id (a rebuilt part gets a new one). */
type TouchProbe = Omit<TouchMirror, 'kind'> & { kind: string; pokeInteractable: boolean; objectId: number };
/** The plaque's poke state; null when the plaque entity can't be found, so a check can't pass by default. */
type PlaqueTouchProbe = { pokeInteractable: boolean | null };

export interface ThreadboundTestHook {
  /** Canvas-relative CSS pixel position of a diorama-local point. */
  project(x: number, y: number, z?: number): ScreenPoint;
  pegs(): Array<{ id: string } & ScreenPoint>;
  /** A chute's funnel centre (the first chute by default), where pinches aim; null if absent. */
  chute(index?: number): Located | null;
  state(): ReturnType<typeof puzzleStore.get>;
  levels(): Array<{ id: string; name: string }>;
  dispatch(command: PuzzleCommand): void;
  /** A ledge button ('restart' | 'next' | 'settings' | 'daily'), null if absent. */
  button(action: string): (Located & { visible: boolean }) | null;
  /**
   * Every touchable part by its root's name ('button-restart', 'chute', 'peg-a', 'handle-a',
   * 'thread-a-b'): its kind, what it shows ('rest' | 'hover' | 'target' | 'press'), how far it
   * is pressed in (meters) and whether it is pokeable; plus 'hud-plaque' (pokeable or not only).
   */
  touch(): Record<string, TouchProbe | PlaqueTouchProbe>;
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
  marbles(): Array<WorldPoint & { color: string }>;
  /** World-space position of a diorama-local point (for aiming emulated hands). */
  worldOf(x: number, y: number, z?: number): WorldPoint;
  /**
   * The virtual study: shown or not, its background, the session's blend mode, and the world y of its
   * table's top and of its feet (the floor is y = 0).
   */
  room(): { visible: boolean; background: boolean; blendMode: string | null; tableTop: number | null; tableBottom: number | null };
  /** What the diorama plaque last rendered, and where it sits in diorama-local space. */
  hud(): { model: unknown; local: WorldPoint } | null;
  /** Which plaque face is showing, and where a plaque element is. */
  plaque(): { face: string; resetLabel: string } | null;
  plaqueElement(id: string): Sized | null;
  /** The ledge strip: its pose on the ledge, its size, what it shows and whether it is drawn. */
  ledge(): LedgeProbe | null;
  /**
   * The welcome card: the entryView it last rendered (panel.userData.entry), whether it is
   * shown, and where its elements are on screen (null for an element it doesn't have).
   */
  welcome(): { entry: unknown; visible: boolean; elements: Record<WelcomeElement, Located | null> } | null;
  /** Audio: 'locked' until a gesture unlocks it, then the AudioContext state. */
  audio(): string;
  /**
   * Passthrough placement: where the diorama landed, how many detected planes were seen, the
   * search's phase, how many `place` commands this XR session has seen (since load outside XR),
   * whether the diorama is hidden, and `reveal`, the fade's progress from 0 to 1 (1 only once
   * every material is back to its own opacity and transparency).
   */
  placement(): {
    placedOn: string | null;
    planesSeen: number;
    phase: string;
    placements: number;
    hidden: boolean;
    reveal: number;
  };
  /** Recenters the emulated headset (IWER): its reference space fires 'reset' on the next frame. */
  recenter(): void;
  /** Whether the active XR session exposes a gaze input source (eye-tracked devices). */
  gazeAvailable(): boolean;
  /** Names of the sound cues the game asked for since the last drain (see features/audio/cueLog). */
  cues(): CueName[];
  /** The same cues with pitch and time (seconds). Draining either this or cues() empties both. */
  cueTrace(): CueRecord[];
  /**
   * A solve's celebration: stars lit on the plaque (they refill one by one after a fresh solve),
   * whether a cadence or replay is still playing, and each thread's vibration energy.
   */
  celebration(): { starsShown: number; replaying: boolean; threadEnergy: number[] };
  /** Visible meshes the camera draws (about one draw call each) grouped by what they belong to. */
  meshBreakdown(): Record<string, number>;
  /** Cost of the next rendered frame, and any performance-budget breaches. */
  frameStats(): Promise<FrameStats & { breaches: string[]; multiview: boolean; views: number }>;
  /** Ghost-hand tutorial: current step and whether it is drawn. */
  ghost(): { step: string; visible: boolean } | null;
}

declare global {
  interface Window {
    __threadbound?: ThreadboundTestHook;
    /** The emulated XR device the IWSDK dev plugin injects (IWER). */
    IWER_DEVICE?: { recenter(): void };
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

/** The welcome card's elements the E2E scripts aim at (public/ui/welcome.uikitml). */
const WELCOME_ELEMENTS = ['welcome-card', 'xr-button', 'xr-note'] as const;
type WelcomeElement = (typeof WELCOME_ELEMENTS)[number];

function levelProbes(
  probe: Probe,
): Hook<'project' | 'pegs' | 'chute' | 'state' | 'levels' | 'dispatch' | 'slide' | 'solve' | 'frame' | 'worldOf'> {
  return {
    project: (x, y, z) => probe.project(x, y, z),
    // Project the knob faces: the surface players aim at (see AIM_PLANE_Z).
    pegs: () => puzzleStore.get().level?.pegs.map((p) => ({ id: p.id, ...probe.project(p.x, p.y, AIM_PLANE_Z) })) ?? [],
    chute: (index = 0) => {
      const chute = puzzleStore.get().level?.chutes[index];
      const frame = puzzleStore.frame;
      if (!chute || !frame) return null;
      const y = chute.y + CHUTE.lift;
      return { ...probe.project(chute.x, y), world: plain(frame.localToWorld(chute.x, y, 0, new Vector3())) };
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

function touchProbe(world: World): Hook<'touch'> {
  return {
    touch: () => {
      const parts: Record<string, TouchProbe | PlaqueTouchProbe> = {};
      for (const entity of world.getSystem(TouchFeedbackSystem)?.queries.touchables.entities ?? []) {
        const root = entity.object3D;
        const mirror = root?.userData.touch as TouchMirror | undefined;
        if (!root || !mirror) continue;
        parts[root.name] = { ...mirror, pokeInteractable: entity.hasComponent(PokeInteractable), objectId: root.id };
      }
      const plaque = world.getSceneEntity('hud-plaque');
      parts['hud-plaque'] = { pokeInteractable: plaque ? plaque.hasComponent(PokeInteractable) : null };
      return parts;
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
      const found: Array<WorldPoint & { color: string }> = [];
      if (!frame) return found;
      const worldPos = new Vector3();
      const local = new Vector3();
      world.scene.traverse((o) => {
        if (o.name !== 'marble') return;
        frame.worldToLocal(o.getWorldPosition(worldPos), local);
        const color = String(o.userData.color ?? 'teal');
        found.push({ x: round3(local.x), y: round3(local.y), z: round3(local.z), color });
      });
      return found;
    },
    ghost: () => {
      const root = world.scene.getObjectByName('onboarding-ghost');
      return root ? { step: String(root.userData.step ?? ''), visible: root.visible } : null;
    },
  };
}

/** A UIKit element's screen and world position: elements are scene objects, placed at their centre. */
function locateElement(probe: Probe, panel: UIKitMLAsset | undefined, id: string): Located | null {
  const element = panel?.getElementById(id) as unknown;
  return element instanceof Object3D ? probe.locate(element) : null;
}

function welcomeProbes(world: World, probe: Probe): Hook<'welcome'> {
  return {
    welcome: () => {
      const panel = world.getSceneObject<UIKitMLAsset>('welcome-panel');
      if (!panel) return null;
      const elements = Object.fromEntries(WELCOME_ELEMENTS.map((id) => [id, locateElement(probe, panel, id)]));
      return {
        entry: panel.userData.entry ?? null,
        visible: panel.visible,
        elements: elements as Record<WelcomeElement, Located | null>,
      };
    },
  };
}

/** Meters per UIKit unit (centimetres) in a panel placed at scale 1. */
const M_PER_UNIT = 0.01;

/** A UIKit element's laid-out size (border box) in meters, scaled like its panel. */
function elementSize(panel: UIKitMLAsset, element: unknown): { width: number; height: number } {
  const size = (element as { size?: { value?: readonly [number, number] } } | undefined)?.size?.value ?? [0, 0];
  const scale = panel.getWorldScale(new Vector3()).x * M_PER_UNIT;
  return { width: size[0] * scale, height: size[1] * scale };
}

/** Where a plaque element is, and how big it is drawn. */
function sizedElement(probe: Probe, panel: UIKitMLAsset | undefined, id: string): Sized | null {
  const located = locateElement(probe, panel, id);
  return panel && located ? { ...located, ...elementSize(panel, panel.getElementById(id)) } : null;
}

function ledgeProbe(world: World): LedgeProbe | null {
  const panel = world.getSceneObject<UIKitMLAsset>('ledge-strip');
  const frame = puzzleStore.frame;
  if (!panel || !frame) return null;
  const local = frame.worldToLocal(panel.getWorldPosition(new Vector3()), new Vector3());
  // The face's up axis rises from the ledge front toward the back: its angle above the ledge is the lean.
  const up = new Vector3(0, 1, 0).applyQuaternion(panel.getWorldQuaternion(new Quaternion()));
  const upLocal = frame.directionToLocal(up, new Vector3());
  const text = (panel.userData.ledge as LedgeProbe['text'] | undefined) ?? { hint: '', threads: '', spool: '' };
  return {
    local: plain(local),
    lean: Math.atan2(upLocal.y, -upLocal.z),
    ...elementSize(panel, panel.getElementById('ledge')),
    text: { ...text },
    visible: visibleInScene(panel),
  };
}

function plaqueProbes(world: World, probe: Probe): Hook<'hud' | 'plaque' | 'plaqueElement' | 'ledge'> {
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
    plaqueElement: (id) => sizedElement(probe, plaque(), id),
    ledge: () => ledgeProbe(world),
  };
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/**
 * The name that says what a mesh belongs to: its first named ancestor, with a
 * trailing instance suffix folded away ('peg-a' / 'chute-1' / 'thread-p2' count
 * together), so the breakdown groups by kind rather than by instance.
 */
function ownerOf(object: Object3D): string {
  for (let o: Object3D | null = object; o; o = o.parent) {
    if (o.name && o.name !== 'Scene') return o.name.replace(/[-_]?[a-z]?\d+$/i, '').replace(/-[a-z]$/, '');
  }
  const geometry = (object as { geometry?: { type?: string } }).geometry?.type ?? '?';
  const chain: string[] = [];
  for (let o = object.parent; o && chain.length < 4; o = o.parent) chain.push(o.type);
  return `(unnamed ${geometry} in ${chain.join('<')})`;
}

function visibleInScene(object: Object3D): boolean {
  for (let o: Object3D | null = object; o; o = o.parent) if (!o.visible) return false;
  return true;
}

function celebrationProbe(world: World): Hook<'celebration'> {
  return {
    celebration: () => {
      const marbles = world.getSystem(MarbleSystem);
      const plaque = world.getSceneObject<UIKitMLAsset>('hud-plaque');
      const threads = marbles ? [...marbles.queries.threads.entities] : [];
      return {
        starsShown: Number(plaque?.userData.starsShown ?? 0),
        replaying: marbles?.replaying ?? false,
        threadEnergy: threads.map((t) => t.getValue(Thread, 'energy') ?? 0),
      };
    },
  };
}

function placementProbes(world: World): Hook<'placement' | 'recenter'> {
  return {
    placement: () => {
      const placement = world.getSystem(PlacementSystem);
      return {
        placedOn: placement?.placedOn ?? null,
        planesSeen: placement?.planesSeen ?? 0,
        phase: placement?.phase ?? 'inactive',
        placements: placement?.placements ?? 0,
        hidden: puzzleStore.get().dioramaHidden,
        reveal: world.getSystem(RevealSystem)?.progress ?? 0,
      };
    },
    recenter: () => {
      if (!window.IWER_DEVICE) throw new Error('recenter: no emulated XR device (window.IWER_DEVICE)');
      window.IWER_DEVICE.recenter();
    },
  };
}

/** World y of the study table's top and of its feet, as drawn (it scales with the offset). */
function studyTableSpan(world: World): { top: number; bottom: number } | null {
  const table = world.scene.getObjectByName('study-table');
  if (!table) return null;
  table.updateWorldMatrix(true, false);
  const box = new Box3().setFromObject(table);
  return { top: box.max.y, bottom: box.min.y };
}

function sessionProbes(world: World): Hook<'gazeAvailable' | 'room' | 'frameStats' | 'meshBreakdown' | 'cues' | 'cueTrace' | 'audio'> {
  return {
    audio: () => stringSynth.state,
    cues: () => drainCues(),
    cueTrace: () => drainCueTrace(),
    meshBreakdown: () => {
      const counts: Record<string, number> = {};
      world.scene.traverse((o) => {
        // A mesh on a layer the camera doesn't draw (a hit area) costs no draw call.
        if (!(o as { isMesh?: boolean }).isMesh || !visibleInScene(o) || !o.layers.test(world.camera.layers)) return;
        const owner = ownerOf(o);
        counts[owner] = (counts[owner] ?? 0) + 1;
      });
      return counts;
    },
    frameStats: async () => {
      // Two frames: the first may still be mid-rebuild; renderer.info resets every render.
      await nextFrame();
      await nextFrame();
      const { calls, triangles } = world.renderer.info.render;
      const bodies = world.getSystem(PerfProbeSystem);
      if (!bodies) throw new Error('PerfProbeSystem is not registered (src/index.ts, DEV only)');
      // In XR without multiview (e.g. desktop emulators) each eye is drawn separately, so the
      // frame's calls are per view times two. Quest Browser has OVR_multiview2: one pass.
      const presenting = world.renderer.xr.isPresenting;
      const multiview = world.renderer.extensions.has('OVR_multiview2');
      const views = presenting && !multiview ? 2 : 1;
      const stats = { drawCalls: calls, triangles, physicsBodies: bodies.physicsBodies };
      const perView = { ...stats, drawCalls: Math.ceil(calls / views), triangles: Math.ceil(triangles / views) };
      return { ...stats, breaches: budgetBreaches(perView, PERF_BUDGET), multiview, views };
    },
    gazeAvailable: () => [...(world.session?.inputSources ?? [])].some((s) => s.targetRayMode === 'gaze'),
    room: () => {
      const table = studyTableSpan(world);
      return {
        visible: world.scene.getObjectByName('virtual-room')?.visible ?? false,
        background: world.scene.background !== null,
        blendMode: world.session?.environmentBlendMode ?? null,
        tableTop: table?.top ?? null,
        tableBottom: table?.bottom ?? null,
      };
    },
  };
}

/**
 * Dev-only E2E hook: lets Playwright aim real input at pegs and buttons
 * regardless of framing, and drive levels through the same command bus the
 * player uses. Stripped from production builds by the import.meta.env.DEV guard.
 */
export function installTestHook(world: World): void {
  if (!import.meta.env.DEV) return;
  const probe = new Probe(world);
  window.__threadbound = {
    ...levelProbes(probe),
    ...sceneProbes(world, probe),
    ...touchProbe(world),
    ...plaqueProbes(world, probe),
    ...welcomeProbes(world, probe),
    ...sessionProbes(world),
    ...placementProbes(world),
    ...celebrationProbe(world),
  };
}
