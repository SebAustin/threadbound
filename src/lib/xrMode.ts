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

/** The session mode once support is known; 'checking' until the first answer arrives. */
export type EntryMode = ImmersiveMode | null | 'checking';

/** What the welcome card and the DOM fallback offer: the Enter XR button, and a line under it ('' for none). */
export interface EntryView {
  readonly button: boolean;
  readonly note: string;
}

export const NO_XR_NOTE = 'Open in Quest Browser to play in mixed reality';
export const LAUNCH_FAILED_NOTE = "Couldn't start XR - try Enter XR again";

/**
 * The one place that decides the entry copy. Without an immersive mode there is no
 * button to press, only where to play instead; a launch that started no session keeps
 * the button and asks for another try (the press may have outlived its user activation).
 */
export function entryView({ mode, launchFailed }: { mode: EntryMode; launchFailed: boolean }): EntryView {
  if (mode === 'checking') return { button: false, note: '' };
  if (mode === null) return { button: false, note: NO_XR_NOTE };
  return { button: true, note: launchFailed ? LAUNCH_FAILED_NOTE : '' };
}

const BOOT_ERROR_LEAD = "Threadbound couldn't start";
const BOOT_ERROR_RETRY = 'Reload the page to try again.';
/** Longest reason quoted on the loading screen: one short line, never a dump. */
const MAX_REASON_CHARS = 80;

/**
 * The loading screen's line when the game fails to boot: the reason of an Error (its
 * first line only, so never a stack), or a generic line for anything else thrown.
 */
export function bootErrorMessage(error: unknown): string {
  const reason = error instanceof Error ? error.message.split('\n')[0].trim() : '';
  if (!reason) return `${BOOT_ERROR_LEAD}. ${BOOT_ERROR_RETRY}`;
  const short = reason.length > MAX_REASON_CHARS ? `${reason.slice(0, MAX_REASON_CHARS - 3)}...` : reason;
  return `${BOOT_ERROR_LEAD}: ${short.replace(/\.$/, '')}. ${BOOT_ERROR_RETRY}`;
}
