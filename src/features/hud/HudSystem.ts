import { createSystem, type UIKit, type UIKitMLAsset } from '@iwsdk/core';
import { HUD } from '../../config/constants';
import { hudModel, type HudModel } from '../../lib/hud';
import { onboardingHint } from '../../lib/onboarding';
import { onboardingStepOf } from '../onboarding/onboardingState';
import { playerThreadCount, spoolUsed } from '../../lib/threadRules';
import { currentStreak, localDayKey } from '../../lib/daily';
import { isDailyIndex, PLAYABLE } from '../../levels';
import { puzzleStore, type PuzzleState } from '../puzzle/puzzleStore';
import { SettingsFace } from './settingsFace';

export type PlaqueFace = 'level' | 'settings';

const STAR_IDS = ['hud-star-1', 'hud-star-2', 'hud-star-3'] as const;

/**
 * The plaque standing on top of the diorama: level title, place in the world,
 * best stars and thread budget. It follows the diorama wherever it is placed.
 */
export class HudSystem extends createSystem({}) {
  private panel: UIKitMLAsset | undefined;
  private settingsFace: SettingsFace | undefined;
  private face: PlaqueFace = 'level';
  /**
   * State the plaque was last rendered from. The store fires on every change
   * (rail drags fire per frame); the plaque only depends on these snapshots.
   */
  private shownFrom: Pick<PuzzleState, 'level' | 'levelIndex' | 'threads' | 'status' | 'progress' | 'pegPositions'> | null =
    null;

  init(): void {
    this.panel = this.world.getSceneObject<UIKitMLAsset>('hud-plaque');
    if (!this.panel) return;
    // Grow upward from a fixed bottom edge, so a taller face never covers the playfield.
    this.panel.getElementById('plaque')?.setProperties({ anchorY: 'bottom' });
    this.settingsFace = new SettingsFace(this.panel);
    this.cleanupFuncs.push(
      this.settingsFace.bind(),
      puzzleStore.onCommand((command) => {
        if (command.type === 'levelBuilt') {
          this.follow();
          // A new level opens on its own face; moving the diorama keeps the settings open.
          if (!command.relocated) this.showFace('level');
        }
        if (command.type === 'toggleSettings') this.showFace(this.face === 'level' ? 'settings' : 'level');
      }),
      puzzleStore.subscribe((state) => this.render(state)),
    );
    this.follow();
    this.showFace('level');
    this.render(puzzleStore.get());
  }

  private showFace(face: PlaqueFace): void {
    const panel = this.panel;
    if (!panel) return;
    this.face = face;
    panel.userData.face = face;
    panel.getElementById('level-face')?.setProperties({ display: face === 'level' ? 'flex' : 'none' });
    panel.getElementById('settings-face')?.setProperties({ display: face === 'settings' ? 'flex' : 'none' });
  }

  /** Standing on the back panel's top edge, facing the player like the diorama does. */
  private follow(): void {
    const frame = puzzleStore.frame;
    const level = puzzleStore.get().level;
    if (!this.panel || !frame || !level) return;
    frame.localToWorld(level.size[0] / 2, level.size[1] + HUD.lift, HUD.depth, this.panel.position);
    this.panel.quaternion.copy(frame.anchor.quaternion);
  }

  private render(state: PuzzleState): void {
    this.settingsFace?.render(state.settings);
    const { level } = state;
    if (!this.panel || !level || !this.changed(state)) return;
    this.shownFrom = state;
    const hud = hudModel({
      levels: PLAYABLE,
      levelIndex: state.levelIndex,
      title: level.name,
      threadsUsed: playerThreadCount(state.threads),
      maxThreads: level.maxThreads,
      par: level.par,
      bestStars: state.progress.best[level.id] ?? 0,
      solved: state.status === 'complete',
      hint: onboardingHint(onboardingStepOf(state)),
      spool:
        level.spool === undefined ? undefined : { used: spoolUsed(state.threads, state.pegPositions), total: level.spool },
      daily: isDailyIndex(state.levelIndex)
        ? { streak: currentStreak(state.progress.streak, localDayKey(new Date())) }
        : undefined,
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
      last.progress !== state.progress ||
      // Sliding a rail peg changes thread lengths, which only the spool readout shows.
      (state.level?.spool !== undefined && last.pegPositions !== state.pegPositions)
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
    text('hud-spool', hud.spoolLabel);
    panel.getElementById('hud-spool')?.setProperties({ display: hud.spoolLabel ? 'flex' : 'none' });
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
