import { Vector3, type World } from '@iwsdk/core';
import { puzzleStore } from '../puzzle/puzzleStore';

export interface ThreadboundTestHook {
  /** Canvas-relative CSS pixel position of a diorama-local point. */
  project(x: number, y: number, z?: number): { x: number; y: number };
  pegs(): Array<{ id: string; x: number; y: number }>;
  chute(): { x: number; y: number } | null;
  state(): ReturnType<typeof puzzleStore.get>;
  marbles(): Array<{ x: number; y: number; z: number; scored: boolean }>;
}

declare global {
  interface Window {
    __threadbound?: ThreadboundTestHook;
  }
}

/**
 * Dev-only E2E hook: lets Playwright aim real mouse input at pegs regardless of
 * camera framing. Stripped from production builds by the import.meta.env.DEV guard.
 */
export function installTestHook(world: World): void {
  if (!import.meta.env.DEV) return;
  const tmp = new Vector3();
  const project = (x: number, y: number, z = 0) => {
    const frame = puzzleStore.frame;
    const rect = world.renderer.domElement.getBoundingClientRect();
    if (!frame) return { x: -1, y: -1 };
    frame.localToWorld(x, y, z, tmp).project(world.camera);
    return { x: ((tmp.x + 1) / 2) * rect.width, y: ((1 - tmp.y) / 2) * rect.height };
  };
  window.__threadbound = {
    project,
    pegs: () => puzzleStore.get().level?.pegs.map((p) => ({ id: p.id, ...project(p.x, p.y) })) ?? [],
    chute: () => {
      const level = puzzleStore.get().level;
      return level ? project(level.chute.x, level.chute.y + 0.02) : null;
    },
    state: () => puzzleStore.get(),
    marbles: () => {
      const frame = puzzleStore.frame;
      const world3 = new Vector3();
      const local = new Vector3();
      return world.scene.children.flatMap((root) => {
        const found: Array<{ x: number; y: number; z: number; scored: boolean }> = [];
        root.traverse((o) => {
          if (o.name !== 'marble' || !frame) return;
          frame.worldToLocal(o.getWorldPosition(world3), local);
          const round = (n: number) => Math.round(n * 1000) / 1000;
          found.push({ x: round(local.x), y: round(local.y), z: round(local.z), scored: false });
        });
        return found;
      });
    },
  };
}
