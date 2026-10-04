import { createSystem, Pressed, type Entity } from '@iwsdk/core';
import { stringSynth } from '../audio/stringSynth';
import { ControlButton, isControlAction, TapReleased, tagRelease, type ControlAction } from '../puzzle/components';
import { puzzleStore, type PuzzleCommand } from '../puzzle/puzzleStore';

const COMMANDS: Readonly<Record<ControlAction, PuzzleCommand>> = {
  restart: { type: 'restart' },
  next: { type: 'next' },
  settings: { type: 'toggleSettings' },
  daily: { type: 'toggleDaily' },
};

/**
 * Ledge buttons: poke them, pinch them from afar (hand ray or gaze), or click.
 * IWSDK tags the pressed entity with Pressed for every input kind, whereas DOM
 * style 'click' events only reach mouse pointers. Buttons act on release, one
 * frame later: Restart/Next rebuild the level, and disposing the button a hand
 * still holds would leave that pointer captured on a dead object.
 */
export class ControlsSystem extends createSystem({
  pressed: { required: [ControlButton, Pressed] },
  released: { required: [ControlButton, TapReleased] },
}) {
  init(): void {
    this.cleanupFuncs.push(this.queries.pressed.subscribe('disqualify', tagRelease));
  }

  update(): void {
    for (const entity of this.queries.released.entities) {
      // Untag first: pressing Restart/Next disposes every ledge button.
      entity.removeComponent(TapReleased);
      this.press(entity);
    }
  }

  private press(entity: Entity): void {
    // A hidden button (Next before solving) is not there for the player.
    if (!entity.active || !entity.object3D?.visible) return;
    const action = entity.getValue(ControlButton, 'action');
    if (!isControlAction(action)) return;
    stringSynth.tap();
    puzzleStore.dispatch(COMMANDS[action]);
  }
}
