import type { UIKit, UIKitMLAsset } from '@iwsdk/core';
import { LEVELS } from '../../levels';
import type { PlaqueColors } from '../../lib/colors';
import { settingsModel, SKIP_LABEL, starsLabel } from '../../lib/hud';
import { levelSelectLabel, stepLevel } from '../../lib/levelSelect';
import { DISARMED, RESET_WINDOW_SECONDS, resetLabel, resetPinch, type ResetGuard } from '../../lib/resetGuard';
import type { DioramaOffset } from '../../lib/placement';
import type { Progress } from '../../lib/progress';
import { starTotal } from '../../lib/scoring';
import { stepOffset, type Settings } from '../../lib/settings';
import { stringSynth } from '../audio/stringSynth';
import { onTap } from '../input/onTap';
import { puzzleStore } from '../puzzle/puzzleStore';

const now = () => performance.now() / 1000;

/** Repaint just after the reset window closes, so the label is never caught mid-expiry. */
const DISARM_REPAINT_MS = RESET_WINDOW_SECONDS * 1000 + 50;

/** Every control on the face (ticket 12's layout), hidden placeholders included, and its other text. */
const TOGGLE_IDS = [
  'set-slow', 'set-contrast', 'set-reset',
  'set-prev', 'set-next', 'set-skip', 'set-play-all',
  'set-up', 'set-down', 'set-near', 'set-far',
] as const;
const READOUT_IDS = ['set-level', 'set-stars', 'set-offset'] as const;

/** The plaque's settings face: each control dispatches a settings change on the bus. */
export class SettingsFace {
  private shown: Settings | null = null;
  private shownLevel = -1;
  private shownProgress: Progress | null = null;
  private shownSkip: boolean | null = null;
  private resetGuard: ResetGuard = DISARMED;
  private disarmTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly panel: UIKitMLAsset) {}

  /** Wires the controls; returns the teardown. */
  bind(): () => void {
    // Every plaque control clicks like a ledge button.
    const control = (id: string, action: () => void) =>
      onTap(this.panel.getElementById(id), () => {
        stringSynth.tap();
        action();
      });
    const unbind = [
      control('set-slow', () => {
        const { slowMotion } = puzzleStore.get().settings;
        puzzleStore.dispatch({ type: 'settings', patch: { slowMotion: !slowMotion } });
      }),
      // A patch keeps the offset's identity (applySettingsPatch), so this never relocates the diorama.
      control('set-contrast', () => {
        const { highContrast } = puzzleStore.get().settings;
        puzzleStore.dispatch({ type: 'settings', patch: { highContrast: !highContrast } });
      }),
      control('set-reset', () => this.pinchReset()),
      // Revisit any level reached so far (its stars and melody), never skipping ahead.
      control('set-prev', () => this.stepLevel(-1)),
      control('set-next', () => this.stepLevel(1)),
      // Shown only while offered; PuzzleSystem ignores it otherwise. A tap acts on release, so the rebuild is safe.
      control('set-skip', () => puzzleStore.dispatch({ type: 'skip' })),
      ...(
        [
          ['set-up', 'up', 1],
          ['set-down', 'up', -1],
          ['set-near', 'near', 1],
          ['set-far', 'near', -1],
        ] as const
      ).map(([id, axis, direction]) => control(id, () => this.move(axis, direction))),
    ];
    return () => {
      for (const off of unbind) off();
      clearTimeout(this.disarmTimer);
    };
  }

  private stepLevel(direction: 1 | -1): void {
    const { levelIndex, progress } = puzzleStore.get();
    const index = stepLevel(levelIndex, direction, LEVELS, progress.best, progress.skipped);
    if (index !== levelIndex) puzzleStore.dispatch({ type: 'load', index, browsing: true });
  }

  /** The level readout between Prev and Next. */
  renderLevel(levelIndex: number): void {
    if (levelIndex === this.shownLevel) return;
    this.shownLevel = levelIndex;
    const text = levelSelectLabel(levelIndex, LEVELS.length);
    this.panel.getElementById<UIKit.Text>('set-level')?.setProperties({ text });
  }

  /** The campaign's star total, from the save (dailies and stale ids don't count). */
  renderStars(progress: Progress): void {
    if (progress === this.shownProgress) return;
    this.shownProgress = progress;
    const total = starTotal(LEVELS, progress.best);
    const text = starsLabel(total.earned, total.possible);
    this.panel.userData.starsLabel = text;
    // Ticket 12 laid it out hidden, with placeholder text: shown from the first render on.
    this.panel.getElementById<UIKit.Text>('set-stars')?.setProperties({ text, visibility: 'visible' });
  }

  /** The skip offer: hidden (never emptied, so its text keeps its layout) unless it is offered. */
  renderSkip(offered: boolean): void {
    if (offered === this.shownSkip) return;
    this.shownSkip = offered;
    this.panel.userData.skipOffered = offered;
    this.panel
      .getElementById<UIKit.Text>('set-skip')
      ?.setProperties({ text: SKIP_LABEL, visibility: offered ? 'visible' : 'hidden' });
  }

  /** One-handed diorama adjustment: each pinch is one clamped step. */
  private move(axis: keyof DioramaOffset, direction: 1 | -1): void {
    const offset = stepOffset(puzzleStore.get().settings.offset, axis, direction);
    puzzleStore.dispatch({ type: 'settings', patch: { offset } });
  }

  /** First pinch arms, a second within the window wipes progress (and brings the tutorial back). */
  private pinchReset(): void {
    const { guard, reset } = resetPinch(this.resetGuard, now());
    this.resetGuard = guard;
    if (reset) puzzleStore.dispatch({ type: 'resetProgress' });
    this.showResetLabel();
    clearTimeout(this.disarmTimer);
    if (!reset) this.disarmTimer = setTimeout(() => this.showResetLabel(), DISARM_REPAINT_MS);
  }

  private showResetLabel(): void {
    const label = resetLabel(this.resetGuard, now());
    this.panel.userData.resetLabel = label;
    this.panel.getElementById<UIKit.Text>('set-reset')?.setProperties({ text: label });
  }

  render(settings: Settings): void {
    if (settings === this.shown) return;
    this.shown = settings;
    const model = settingsModel(settings);
    this.panel.userData.contrastLabel = model.contrastLabel;
    this.panel.getElementById<UIKit.Text>('set-slow')?.setProperties({ text: model.slowLabel });
    // Ticket 12 laid it out hidden, with placeholder text: shown from the first render on.
    this.panel.getElementById<UIKit.Text>('set-contrast')?.setProperties({ text: model.contrastLabel, visibility: 'visible' });
    this.panel.getElementById<UIKit.Text>('set-offset')?.setProperties({ text: model.offsetLabel });
  }

  /**
   * Every control's colours, and its hover and press: set as conditional properties, so a
   * repaint's hover and press replace the stylesheet's (a plain backgroundColor alone would
   * leave the default hover colour lit in high contrast).
   */
  paint(colors: PlaqueColors): void {
    const toggle = {
      backgroundColor: colors.toggle,
      borderColor: colors.toggleBorder,
      color: colors.toggleText,
      hover: { backgroundColor: colors.toggleHover },
      active: { backgroundColor: colors.toggleActive },
    };
    for (const id of TOGGLE_IDS) this.panel.getElementById(id)?.setProperties(toggle);
    for (const id of READOUT_IDS) this.panel.getElementById(id)?.setProperties({ color: colors.readout });
    this.panel.getElementById('settings-title')?.setProperties({ color: colors.faceTitle });
  }
}
