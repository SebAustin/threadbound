/** Mirrors IWSDK's VisibilityState values (kept as strings so this stays pure). */
export type XrVisibility = 'non-immersive' | 'visible' | 'visible-blurred' | 'hidden';

export interface Visibility {
  readonly xrVisibility: XrVisibility;
  readonly documentHidden: boolean;
}

/** Marbles never fly while the player can't watch: system menu, headset off, hidden tab. */
export function shouldPause({ xrVisibility, documentHidden }: Visibility): boolean {
  return documentHidden || xrVisibility === 'visible-blurred' || xrVisibility === 'hidden';
}
