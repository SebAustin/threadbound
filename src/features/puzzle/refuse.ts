import type { RefusalReason } from '../../lib/threadRules';
import { stringSynth } from '../audio/stringSynth';
import { devLog } from '../debug/devLog';
import { puzzleStore } from './puzzleStore';

/** A low, dull G2 thunk: unlike any note a thread can play. */
const REFUSE_HZ = 98;
const REFUSE_VOLUME = 0.5;

/** Every refusal is heard and shown on the plaque, until the player's next success clears it. */
export function refuse(reason: RefusalReason, attempt: string): void {
  stringSynth.pluck(REFUSE_HZ, REFUSE_VOLUME);
  devLog(`${attempt} rejected: ${reason}`);
  puzzleStore.update({ refusal: reason });
}
