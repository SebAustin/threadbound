import { CUES, cuePitches, type CueName } from '../../lib/soundCues';
import { PENTATONIC_HZ } from '../../lib/threadTuning';
import { recordCue } from './cueLog';

const NOTE_SECONDS = 1.4;
const DECAY = 0.996;

/**
 * Plucked-string synth (Karplus–Strong). Every thread is literally a string:
 * one buffer per scale note is rendered once, then each bounce is a cheap
 * AudioBufferSourceNode. The AudioContext is created lazily on the first
 * user gesture, as browsers require.
 */
class StringSynth {
  private ctx: AudioContext | null = null;
  private buffers = new Map<number, AudioBuffer>();
  private master: GainNode | null = null;

  /** Call from a user-gesture handler (pinch/click) to unlock audio. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      // Limiter: a busy drop plus stacked cues must never clip.
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -6;
      limiter.ratio.value = 12;
      this.master.connect(limiter).connect(this.ctx.destination);
      for (const hz of [...PENTATONIC_HZ, ...cuePitches()]) this.buffers.set(hz, this.render(hz));
    } catch (error) {
      console.warn('[Threadbound] audio unavailable, continuing silently', error);
      this.ctx = null;
    }
  }

  /** The sound for a game event (see lib/soundCues); `hz` overrides its pitch (ambience phrase). */
  play(name: CueName, hz = CUES[name].hz): void {
    recordCue(name);
    this.pluck(hz, CUES[name].volume);
  }

  pluck(hz: number, velocity = 1): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    // Any pitch plays: render it on first use (a pitch missing here used to fail silently).
    let buffer = this.buffers.get(hz);
    if (!buffer) {
      buffer = this.render(hz);
      this.buffers.set(hz, buffer);
    }
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = Math.min(1, Math.max(0.05, velocity));
    source.buffer = buffer;
    source.connect(gain).connect(this.master);
    source.start();
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
