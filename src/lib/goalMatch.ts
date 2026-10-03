import type { MarbleColor, SortingColor } from './marbleColors';

/** A cup with no color accepts every marble; a colored cup only its own color. */
export function goalAccepts(goalColor: SortingColor | undefined, marbleColor: MarbleColor): boolean {
  return goalColor === undefined || goalColor === marbleColor;
}
