import { createSystem, type UIKit, type UIKitMLAsset } from '@iwsdk/core';
import { HUD } from '../../config/constants';
import { hudModel, type HudModel } from '../../lib/hud';
import { onboardingHint } from '../../lib/onboarding';
import { onboardingStepOf } from '../onboarding/onboardingState';
import { playerThreadCount } from '../../lib/threadRules';
import { LEVELS } from '../../levels';
import { puzzleStore, type PuzzleState } from '../puzzle/puzzleStore';

const STAR_IDS = ['hud-star-1', 'hud-star-2', 'hud-star-3'] as const;

/**
 * The plaque standing on top of the diorama: level title, place in the world,
 * best stars and thread budget. It follows the diorama wherever it is placed.
 */
export class HudSystem extends createSystem({}) {
  private panel: UIKitMLAsset | undefined;
  /**
   * State the plaque was last rendered from. The store fires on every change
   * (rail drags fire per frame); the plaque only depends on these snapshots.
   */
  private shownFrom: Pick<PuzzleState, 'level' | 'levelIndex' | 'threads' | 'status' | 'progress'> | null = null;

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
    if (!this.panel || !level || !this.changed(state)) return;
    this.shownFrom = state;
    const hud = hudModel({
      levels: LEVELS,
      levelIndex: state.levelIndex,
      title: level.name,
      threadsUsed: playerThreadCount(state.threads),
      maxThreads: level.maxThreads,
      par: level.par,
      bestStars: state.progress.best[level.id] ?? 0,
      solved: state.status === 'complete',
      hint: onboardingHint(onboardingStepOf(state)),
    });
    this.apply(hud);
  }

  /** Snapshots are immutable, so identity tells whether anything shown changed. */
  private changed(state: PuzzleState): boolean {
    const last = this.shownFrom;
    return (
      last === null ||
      last.level !== state.level ||
      last.levelIndex !== state.levelIndex ||
      last.threads !== state.threads ||
      last.status !== state.status ||
      last.progress !== state.progress
    );
  }

  private apply(hud: HudModel): void {
    const panel = this.panel;
    if (!panel) return;
    panel.userData.hud = hud;
    const text = (id: string, value: string) => panel.getElementById<UIKit.Text>(id)?.setProperties({ text: value });
    text('hud-title', hud.title);
    text('hud-world', hud.worldLabel);
    text('hud-threads', hud.threadsLabel);
    text('hud-hint', hud.hint);
    panel.getElementById('hud-hint')?.setProperties({ display: hud.hint ? 'flex' : 'none' });
    panel
      .getElementById('hud-header')
      ?.setProperties({ backgroundColor: hud.status === 'solved' ? HUD.solvedColor : HUD.playingColor });
    STAR_IDS.forEach((id, i) => {
      panel.getElementById(id)?.setProperties({ backgroundColor: hud.stars[i] ? HUD.starOn : HUD.starOff });
    });
  }
}
