import type { RefusalReason } from '../../lib/threadRules';
import { stringSynth } from '../audio/stringSynth';
import { devLog } from '../debug/devLog';
import { puzzleStore } from './puzzleStore';

/** Every refusal is heard and shown on the plaque, until the player's next success clears it. */
export function refuse(reason: RefusalReason, attempt: string): void {
  stringSynth.play('refused');
  devLog(`${attempt} rejected: ${reason}`);
  puzzleStore.update({ refusal: reason });
}
