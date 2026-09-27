import { createSystem, Vector3 } from '@iwsdk/core';
import { DIORAMA_DEFAULT_POSITION } from '../../config/constants';
import { parseLevel } from '../../lib/levelSchema';
import firstLevel from '../../levels/w1-01.json';
import { buildDiorama } from '../diorama/buildDiorama';
import { DioramaFrame } from '../diorama/dioramaFrame';
import { Thread } from './components';
import { puzzleStore } from './puzzleStore';

/** Loads a level, builds its diorama and owns level teardown. */
export class PuzzleSystem extends createSystem({
  threads: { required: [Thread] },
}) {
  init(): void {
    this.loadLevel(firstLevel);
  }

  loadLevel(data: unknown): void {
    const parsed = parseLevel(data);
    if (!parsed.ok) {
      console.error(`[Threadbound] invalid level: ${parsed.error}`);
      return;
    }
    this.teardown();
    const level = parsed.level;
    const [x, y, z] = DIORAMA_DEFAULT_POSITION;
    // Frame origin is the diorama's bottom-left; center it on the default spot.
    const frame = new DioramaFrame(new Vector3(x - level.size[0] / 2, y, z));
    puzzleStore.frame = frame;
    puzzleStore.diorama = buildDiorama(this.world, frame, level);
    puzzleStore.update({ level, threads: [], status: 'idle', scored: 0 });
  }

  private teardown(): void {
    for (const thread of [...this.queries.threads.entities]) {
      thread.dispose({ disposeResources: false });
    }
    for (const entity of puzzleStore.diorama?.entities ?? []) entity.dispose();
    puzzleStore.diorama = null;
  }
}
