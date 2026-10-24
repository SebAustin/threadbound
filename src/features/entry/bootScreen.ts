import { bootErrorMessage, type EntryView } from '../../lib/xrMode';

/** What the shell last showed for entering XR: the card's view, and whether a session is running. */
interface EntryShown {
  readonly view: EntryView;
  readonly immersive: boolean;
}

const CHECKING: EntryShown = { view: { button: false, note: '' }, immersive: false };

/**
 * The page shell around the game (index.html), runtime only: the walnut cover with its
 * "Loading Threadbound..." line while the game loads, then the bottom bar with the DOM
 * Enter XR fallback or the card's note. The cover is removed, not hidden, once the game
 * is up, so it can never swallow mouse play; the bar is pointer-events: none except the
 * button. A shell without these elements (a test page) makes every call a no-op.
 */
class BootScreen {
  private up = false;
  private failed = false;
  private entry: EntryShown = CHECKING;

  /** The game is up: drop the cover and show what the card last offered. */
  ready(): void {
    if (this.failed) return;
    this.up = true;
    document.getElementById('boot-cover')?.remove();
    document.body.classList.remove('booting');
    this.paint();
  }

  /** The game failed to boot: the cover stays, and #boot says why. */
  fail(error: unknown): void {
    this.failed = true;
    const boot = document.getElementById('boot');
    if (!boot) return;
    boot.textContent = bootErrorMessage(error);
    boot.hidden = false;
    document.getElementById('enter-xr')?.toggleAttribute('hidden', true);
  }

  /** Mirrors the card's entryView: the button outside a session, and the note in place of the loading line. */
  showEntry(view: EntryView, immersive: boolean): void {
    this.entry = { view, immersive };
    if (this.up) this.paint();
  }

  /** Runs `action` when the DOM Enter XR is activated (a click, or Enter/Space on focus); returns the teardown. */
  onEnter(action: () => void): () => void {
    const button = document.getElementById('enter-xr');
    if (!button) return () => {};
    button.addEventListener('click', action);
    return () => button.removeEventListener('click', action);
  }

  private paint(): void {
    const { view, immersive } = this.entry;
    const note = immersive ? '' : view.note;
    const boot = document.getElementById('boot');
    if (boot) {
      boot.textContent = note;
      boot.hidden = note === '';
    }
    document.getElementById('enter-xr')?.toggleAttribute('hidden', !view.button || immersive);
  }
}

export const bootScreen = new BootScreen();
