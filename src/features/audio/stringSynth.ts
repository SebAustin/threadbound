import { AudioContext as ThreeAudioContext } from '@iwsdk/core';
import { cueRoute, PANNER } from '../../lib/cueSpace';
import { CUE_CEILING, CUES, cuePitches, type CueName } from '../../lib/soundCues';
import { PENTATONIC_HZ } from '../../lib/threadTuning';
import { recordCue, type CuePoint } from './cueLog';

const NOTE_SECONDS = 1.4;
const LIMITER = { thresholdDb: -3, ratio: 20, attackSeconds: 0.001, releaseSeconds: 0.1 } as const;
const DECAY = 0.996;

/**
 * Plucked-string synth (Karplus–Strong). Every thread is literally a string:
 * one buffer per scale note is rendered once, then each bounce is a cheap
 * AudioBufferSourceNode. Audio starts on the first user gesture, as browsers require.
 *
 * It plays through three.js's shared audio context, the one IWSDK's AudioSystem listens with: that
 * system's AudioListener rides the player's head and writes the head pose into the context's
 * listener every frame. So in an XR session a positional cue with a place (lib/cueSpace) goes
 * through a panner there and is heard from it; everything else, and the browser, stays mono.
 */
class StringSynth {
  private ctx: AudioContext | null = null;
  private buffers = new Map<number, AudioBuffer>();
  private master: GainNode | null = null;
  /** Inside an XR session: only there is the head tracked, so only there are cues panned. */
  private immersive = false;
  /** Spatial notes still ringing; each lowers it when it ends. */
  private liveSpatial = 0;
  private pannerFailed = false;

  /** 'locked' until the first unlock; then the AudioContext's own state. */
  get state(): 'locked' | AudioContextState {
    return this.ctx ? this.ctx.state : 'locked';
  }

  /** Call from a user-gesture handler (pinch/click) to unlock audio. */
  unlock(): void {
    if (this.ctx) {
      this.resume();
      return;
    }
    try {
      // Shared with IWSDK's AudioSystem (one context for the game), created suspended before any gesture.
      const ctx = ThreeAudioContext.getContext();
      this.master = ctx.createGain();
      this.master.gain.value = 0.5;
      // Limiter (hard knee, fast attack, high ratio near full scale): a busy drop
      // plus stacked cues must never clip, while quiet sounds pass untouched.
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = LIMITER.thresholdDb;
      limiter.knee.value = 0;
      limiter.ratio.value = LIMITER.ratio;
      limiter.attack.value = LIMITER.attackSeconds;
      limiter.release.value = LIMITER.releaseSeconds;
      this.master.connect(limiter).connect(ctx.destination);
      this.ctx = ctx;
      for (const hz of [...PENTATONIC_HZ, ...cuePitches()]) this.buffers.set(hz, this.render(hz));
      this.resume();
    } catch (error) {
      console.warn('[Threadbound] audio unavailable, continuing silently', error);
      this.ctx = null;
      this.master = null;
    }
  }

  /** In an XR session or not (AudioUnlockSystem follows the session). */
  setImmersive(on: boolean): void {
    this.immersive = on;
  }

  /**
   * The sound for a game event (see lib/soundCues). `hz` overrides the cue's pitch
   * (a thread's climb, a replayed note, a cadence note, the ambience phrase); `gain` scales its volume (impact).
   * `source` is the world point a positional cue comes from; its numbers are copied, so a scratch vector will do.
   */
  play(name: CueName, hz = CUES[name].hz, gain = 1, source?: CuePoint): void {
    const panAt = cueRoute(CUES[name], source, this.immersive, this.liveSpatial) === 'spatial' ? source : undefined;
    const spatial = this.pluck(hz, Math.min(CUE_CEILING, CUES[name].volume * gain), panAt);
    recordCue(name, hz, source ?? null, spatial);
  }

  /** A press on a ledge button or plaque control: the gesture also unlocks audio. */
  tap(): void {
    this.unlock();
    this.play('button');
  }

  /** Where the context's listener is (world metres, for the DEV hook); null while locked. */
  listenerPosition(): CuePoint | null {
    const listener = this.ctx?.listener;
    if (!listener?.positionX) return null;
    return { x: listener.positionX.value, y: listener.positionY.value, z: listener.positionZ.value };
  }

  /** Plays one note, through a panner at `panAt` when given. Returns whether it was panned. */
  pluck(hz: number, velocity = 1, panAt?: CuePoint): boolean {
    const ctx = this.ctx;
    if (!ctx || !this.master) return false;
    const note = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = Math.min(1, Math.max(0.05, velocity));
    note.buffer = this.bufferFor(hz);
    note.connect(gain);
    const spatial = panAt !== undefined && this.panThrough(ctx, note, gain, panAt);
    if (!spatial) gain.connect(this.master);
    note.start();
    return spatial;
  }

  private resume(): void {
    if (this.ctx?.state !== 'suspended') return;
    this.ctx.resume().catch((error: unknown) => console.warn('[Threadbound] audio did not resume', error));
  }

  /** Any pitch plays: render it on first use (a pitch missing here used to fail silently). */
  private bufferFor(hz: number): AudioBuffer {
    let buffer = this.buffers.get(hz);
    if (!buffer) {
      buffer = this.render(hz);
      this.buffers.set(hz, buffer);
    }
    return buffer;
  }

  /**
   * Puts a panner at `at` between the note's gain and the master, released when the note ends.
   * False when the browser refuses one: the note then plays mono, as before.
   */
  private panThrough(ctx: AudioContext, note: AudioBufferSourceNode, gain: GainNode, at: CuePoint): boolean {
    let panner: PannerNode;
    try {
      panner = new PannerNode(ctx, { ...PANNER, positionX: at.x, positionY: at.y, positionZ: at.z });
    } catch (error) {
      if (!this.pannerFailed) console.warn('[Threadbound] no panner, positional cues play mono', error);
      this.pannerFailed = true;
      return false;
    }
    gain.connect(panner).connect(this.master!);
    this.liveSpatial += 1;
    note.onended = () => {
      panner.disconnect();
      this.liveSpatial -= 1;
    };
    return true;
  }

  private render(hz: number): AudioBuffer {
    const ctx = this.ctx!;
    const rate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, Math.floor(rate * NOTE_SECONDS), rate);
    const out = buffer.getChannelData(0);
    const period = Math.max(2, Math.round(rate / hz));
    // Seed one period with noise, then low-pass it in a delay loop: the averaging
    // of neighbouring samples is what makes the noise "ring" like a string.
    for (let i = 0; i < period; i++) out[i] = Math.random() * 2 - 1;
    for (let i = period; i < out.length; i++) {
      const prev = out[i - period];
      const next = out[i - period + 1];
      out[i] = DECAY * 0.5 * (prev + next);
    }
    return buffer;
  }
}

export const stringSynth = new StringSynth();
