export type ImmersiveMode = 'immersive-ar' | 'immersive-vr';

/**
 * Mixed reality on a real table is the primary experience; VR in the virtual
 * study is the fallback for runtimes without passthrough (Safari on visionOS,
 * desktop emulators configured for VR, players without a usable table).
 */
export function resolveSessionMode(supported: {
  readonly ar: boolean;
  readonly vr: boolean;
}): ImmersiveMode | null {
  if (supported.ar) return 'immersive-ar';
  if (supported.vr) return 'immersive-vr';
  return null;
}

/** The virtual study is hidden only when the real world is visible through it. */
export function shouldShowVirtualRoom(
  immersive: boolean,
  blendMode: string | undefined,
): boolean {
  if (!immersive) return true;
  return blendMode !== 'alpha-blend' && blendMode !== 'additive';
}
