import { createSystem, type UIKit, type UIKitMLAsset } from '@iwsdk/core';
import { HUD } from '../../config/constants';
import { hudModel, type HudModel } from '../../lib/hud';
import { LEVELS } from '../../levels';
import { puzzleStore, type PuzzleState } from '../puzzle/puzzleStore';

const STAR_IDS = ['hud-star-1', 'hud-star-2', 'hud-star-3'] as const;

/**
 * The plaque standing on top of the diorama: level title, place in the world,
 * best stars and thread budget. It follows the diorama wherever it is placed.
 */
export class HudSystem extends createSystem({}) {
  private panel: UIKitMLAsset | undefined;
  /** Last rendered copy; the store fires often, the panel only changes rarely. */
  private shown = '';

  init(): void {
    this.panel = this.world.getSceneObject<UIKitMLAsset>('hud-plaque');
    if (!this.panel) return;
    this.cleanupFuncs.push(
      puzzleStore.onCommand((command) => {
        if (command.type === 'levelBuilt') this.follow();
      }),
      puzzleStore.subscribe((state) => this.render(state)),
    );
    this.follow();
    this.render(puzzleStore.get());
  }

  /** Centered above the back panel, facing the player like the diorama does. */
  private follow(): void {
    const frame = puzzleStore.frame;
    const level = puzzleStore.get().level;
    if (!this.panel || !frame || !level) return;
    frame.localToWorld(level.size[0] / 2, level.size[1] + HUD.lift, HUD.depth, this.panel.position);
    this.panel.quaternion.copy(frame.anchor.quaternion);
  }

  private render(state: PuzzleState): void {
    const { level } = state;
    if (!this.panel || !level) return;
    const hud = hudModel({
      levels: LEVELS,
      levelIndex: state.levelIndex,
      title: level.name,
      threadsUsed: state.threads.filter((t) => !t.preset).length,
      maxThreads: level.maxThreads,
      par: level.par,
      bestStars: state.progress.best[level.id] ?? 0,
      solved: state.status === 'complete',
    });
    const key = JSON.stringify(hud);
    if (key === this.shown) return;
    this.shown = key;
    this.apply(hud);
  }

  private apply(hud: HudModel): void {
    const panel = this.panel;
    if (!panel) return;
    panel.userData.hud = hud;
    const text = (id: string, value: string) => panel.getElementById<UIKit.Text>(id)?.setProperties({ text: value });
    text('hud-title', hud.title);
    text('hud-world', hud.worldLabel);
    text('hud-threads', hud.threadsLabel);
    panel
      .getElementById('hud-header')
      ?.setProperties({ backgroundColor: hud.status === 'solved' ? HUD.solvedColor : HUD.playingColor });
    STAR_IDS.forEach((id, i) => {
      panel.getElementById(id)?.setProperties({ backgroundColor: hud.stars[i] ? HUD.starOn : HUD.starOff });
    });
  }
}
