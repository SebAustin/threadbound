export type MarbleColor = 'teal' | 'amber' | 'azure';

/** A cup with no color accepts every marble; a colored cup only its own color. */
export function goalAccepts(goalColor: MarbleColor | undefined, marbleColor: MarbleColor): boolean {
  return goalColor === undefined || goalColor === marbleColor;
}
