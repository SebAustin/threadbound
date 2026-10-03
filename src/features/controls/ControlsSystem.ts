import { createSystem, Pressed, type Entity } from '@iwsdk/core';
import { stringSynth } from '../audio/stringSynth';
import { ControlButton, type ControlAction } from '../puzzle/components';
import { puzzleStore, type PuzzleCommand } from '../puzzle/puzzleStore';

const PRESS_HZ = 587.33;
const PRESS_VOLUME = 0.5;

const COMMANDS: Readonly<Record<ControlAction, PuzzleCommand>> = {
  restart: { type: 'restart' },
  next: { type: 'next' },
  settings: { type: 'toggleSettings' },
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
}) {
  private released: Entity[] = [];

  init(): void {
    this.cleanupFuncs.push(this.queries.pressed.subscribe('disqualify', (e) => this.released.push(e)));
  }

  update(): void {
    if (this.released.length === 0) return;
    for (const entity of this.released) this.press(entity);
    this.released.length = 0;
  }

  private press(entity: Entity): void {
    // A hidden button (Next before solving) is not there for the player.
    if (!entity.active || !entity.object3D?.visible) return;
    const action = entity.getValue(ControlButton, 'action') as ControlAction;
    stringSynth.unlock();
    stringSynth.pluck(PRESS_HZ, PRESS_VOLUME);
    puzzleStore.dispatch(COMMANDS[action]);
  }
}
