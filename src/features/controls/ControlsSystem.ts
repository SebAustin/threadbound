import { createSystem, type Entity, type Mesh } from '@iwsdk/core';
import { stringSynth } from '../audio/stringSynth';
import { ControlButton, type ControlAction } from '../puzzle/components';
import { puzzleStore, type PuzzleCommand } from '../puzzle/puzzleStore';
import { onPointer } from '../input/pointerEvents';

const PRESS_HZ = 587.33;
const PRESS_VOLUME = 0.5;

const COMMANDS: Readonly<Record<ControlAction, PuzzleCommand>> = {
  restart: { type: 'restart' },
  next: { type: 'next' },
  settings: { type: 'toggleSettings' },
};

/** Restart / Next buttons on the diorama ledge: poke them or pinch them from afar. */
export class ControlsSystem extends createSystem({
  buttons: { required: [ControlButton] },
}) {
  init(): void {
    this.cleanupFuncs.push(this.queries.buttons.subscribe('qualify', (e) => this.attach(e)));
    // 'qualify' only fires for future matches; buttons built earlier need wiring now.
    for (const button of this.queries.buttons.entities) this.attach(button);
  }

  private attach(entity: Entity): void {
    const object = entity.object3D;
    if (!object) return;
    const action = entity.getValue(ControlButton, 'action') as ControlAction;
    // Listeners live on the button's own meshes and are discarded with them.
    // Child meshes: events bubble from the hit mesh, and IWSDK stops them at the root.
    object.traverse((child) => {
      if (child === object || !(child as Mesh).isMesh) return;
      onPointer(child, 'click', (e) => {
        e.stopPropagation();
        if (!object.visible) return;
        stringSynth.unlock();
        stringSynth.pluck(PRESS_HZ, PRESS_VOLUME);
        puzzleStore.dispatch(COMMANDS[action]);
      });
    });
  }
}
