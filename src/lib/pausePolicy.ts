/** Mirrors IWSDK's VisibilityState values (kept as strings so this stays pure). */
export type XrVisibility = 'non-immersive' | 'visible' | 'visible-blurred' | 'hidden';

const XR_VISIBILITIES: readonly XrVisibility[] = ['non-immersive', 'visible', 'visible-blurred', 'hidden'];

/** The runtime's visibility value, checked rather than cast; unknown values never pause. */
export function toXrVisibility(value: unknown): XrVisibility {
  return XR_VISIBILITIES.find((v) => v === value) ?? 'non-immersive';
}

export interface Visibility {
  readonly xrVisibility: XrVisibility;
  readonly documentHidden: boolean;
}

/** Marbles never fly while the player can't watch: system menu, headset off, hidden tab. */
export function shouldPause({ xrVisibility, documentHidden }: Visibility): boolean {
  return documentHidden || xrVisibility === 'visible-blurred' || xrVisibility === 'hidden';
}
