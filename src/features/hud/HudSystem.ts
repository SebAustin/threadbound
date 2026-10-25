import { createSystem, type UIKit, type UIKitMLAsset } from '@iwsdk/core';
import { HUD } from '../../config/constants';
import { hudModel, starsShown, type HudModel } from '../../lib/hud';
import { onboardingHint } from '../../lib/onboarding';
import { onboardingStepOf } from '../onboarding/onboardingState';
import { playerThreadCount, spoolUsed } from '../../lib/threadRules';
import { currentStreak } from '../../lib/daily';
import { dailyStarsOn } from '../../lib/progress';
import { campaignComplete } from '../../lib/resume';
import { LEVELS } from '../../levels';
import { puzzleStore, type PuzzleState } from '../puzzle/puzzleStore';
import type { PlaqueFace } from '../../lib/viewExtent';
import { LedgeStrip } from './ledgeStrip';
import { SettingsFace } from './settingsFace';
import { onTap } from '../input/onTap';

const STAR_IDS = ['hud-star-1', 'hud-star-2', 'hud-star-3'] as const;

/** The best stars the plaque stands for: today's daily stars, or the level's best. */
function bestStarsOf(state: PuzzleState, levelId: string): number {
  return state.daily ? dailyStarsOn(state.progress, state.daily.day) : (state.progress.best[levelId] ?? 0);
}

/**
 * The plaque standing on top of the diorama (level title, place in the world,
 * best stars) and the strip on its ledge (the hint line, and the threads placed
 * against the thread limit). Both follow the diorama wherever it is placed.
 */
export class HudSystem extends createSystem({}) {
  private panel: UIKitMLAsset | undefined;
  private ledge: LedgeStrip | undefined;
  private settingsFace: SettingsFace | undefined;
  private face: PlaqueFace = 'level';
  /**
   * State the plaque was last rendered from. The store fires on every change
   * (rail drags fire per frame); the plaque only depends on these snapshots.
   */
  private shownFrom: PuzzleState | null = null;
  /** Best stars the plaque stands for (what it shows once any stagger is over). */
  private bestStars = 0;
  /** Seconds since a fresh solve, while its stars are still lighting one by one; null otherwise. */
  private sinceSolve: number | null = null;
  /** Stars currently lit on the plaque. */
  private starsLit = -1;

  init(): void {
    this.panel = this.world.getSceneObject<UIKitMLAsset>('hud-plaque');
    if (!this.panel) return;
    const strip = this.world.getSceneObject<UIKitMLAsset>('ledge-strip');
    this.ledge = strip && new LedgeStrip(strip);
    // Grow upward from a fixed bottom edge, so a taller face never covers the playfield.
    this.panel.getElementById('plaque')?.setProperties({ anchorY: 'bottom' });
    this.settingsFace = new SettingsFace(this.panel);
    this.cleanupFuncs.push(
      this.settingsFace.bind(),
      // The melody book: pinching the stars replays the level's saved tune.
      onTap(this.panel.getElementById('hud-stars'), () => puzzleStore.dispatch({ type: 'playMelody' })),
      puzzleStore.onCommand((command) => {
        if (command.type === 'levelBuilt') {
          this.follow();
          // A new level opens on its own face; moving it or browsing levels keeps the settings open.
          if (command.reason === 'fresh') this.showFace('level');
          // Another level (or a restart) ends a stagger; moving the solved level lets it finish.
          if (command.reason !== 'relocated') this.endStagger();
        }
        if (command.type === 'toggleSettings') this.showFace(this.face === 'level' ? 'settings' : 'level');
        if (command.type === 'solved') this.staggerStars();
      }),
      puzzleStore.subscribe((state) => this.render(state)),
    );
    this.follow();
    this.showFace('level');
    this.render(puzzleStore.get());
  }

  /**
   * A fresh solve: the stars empty, then light one by one up to the best (update). Read from the
   * store now, after every update the solve made: a listener can be handed an older snapshot last.
   */
  private staggerStars(): void {
    const state = puzzleStore.get();
    if (!state.level) return;
    this.bestStars = bestStarsOf(state, state.level.id);
    this.sinceSolve = 0;
    this.lightStars(0);
  }

  private endStagger(): void {
    if (this.sinceSolve === null) return;
    this.sinceSolve = null;
    const state = puzzleStore.get();
    this.bestStars = state.level ? bestStarsOf(state, state.level.id) : 0;
    this.lightStars(this.bestStars);
  }

  /** Lights the stars of a fresh solve one by one. Allocation-free while nothing changes. */
  update(delta: number): void {
    if (this.sinceSolve === null) return;
    this.sinceSolve += delta;
    const shown = starsShown(this.bestStars, this.sinceSolve);
    if (shown !== this.starsLit) this.lightStars(shown);
    if (shown >= this.bestStars) this.sinceSolve = null;
  }

  private lightStars(count: number): void {
    const panel = this.panel;
    if (!panel) return;
    this.starsLit = count;
    panel.userData.starsShown = count;
    STAR_IDS.forEach((id, i) => {
      panel.getElementById(id)?.setProperties({ backgroundColor: i < count ? HUD.starOn : HUD.starOff });
    });
  }

  private showFace(face: PlaqueFace): void {
    const panel = this.panel;
    if (!panel) return;
    this.face = face;
    panel.userData.face = face;
    panel.getElementById('level-face')?.setProperties({ display: face === 'level' ? 'flex' : 'none' });
    panel.getElementById('settings-face')?.setProperties({ display: face === 'settings' ? 'flex' : 'none' });
  }

  /** The plaque stands on the back panel's top edge, facing the player like the diorama does; the strip lies on the ledge. */
  private follow(): void {
    const frame = puzzleStore.frame;
    const level = puzzleStore.get().level;
    if (!this.panel || !frame || !level) return;
    frame.localToWorld(level.size[0] / 2, level.size[1] + HUD.lift, HUD.depth, this.panel.position);
    this.panel.quaternion.copy(frame.anchor.quaternion);
    this.ledge?.place(frame, level.size[0]);
  }

  private render(state: PuzzleState): void {
    this.settingsFace?.render(state.settings);
    this.settingsFace?.renderLevel(state.levelIndex);
    // While placement searches, the plaque and the strip hide with the diorama.
    if (this.panel) this.panel.visible = !state.dioramaHidden;
    this.ledge?.show(!state.dioramaHidden);
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
      bestStars: bestStarsOf(state, level.id),
      solved: state.status === 'complete',
      hint: onboardingHint(onboardingStepOf(state)),
      spool:
        level.spool === undefined ? undefined : { used: spoolUsed(state.threads, state.pegPositions), total: level.spool },
      daily: state.daily ? { streak: currentStreak(state.progress.streak, state.daily.day) } : undefined,
      refusal: state.refusal,
      levelHint: state.status === 'complete' ? undefined : level.hint,
      // From the save, so the ending survives a reload and shows on any campaign level once all are solved.
      campaignComplete: !state.daily && campaignComplete(LEVELS, state.progress.best),
      noTable: state.surface === 'floating',
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
      last.daily !== state.daily ||
      last.refusal !== state.refusal ||
      last.surface !== state.surface ||
      // Sliding a rail peg changes thread lengths, which only the ledge's spool readout shows.
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
    this.ledge?.render(hud);
    panel
      .getElementById('hud-header')
      ?.setProperties({ backgroundColor: hud.status === 'solved' ? HUD.solvedColor : HUD.playingColor });
    // While a fresh solve's stars are lighting one by one, update() owns them.
    if (this.sinceSolve !== null) return;
    this.bestStars = hud.stars.filter(Boolean).length;
    if (this.starsLit !== this.bestStars) this.lightStars(this.bestStars);
  }
}
