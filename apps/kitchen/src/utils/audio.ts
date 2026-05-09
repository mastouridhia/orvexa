/**
 * Web Audio "ding" for new orders. Uses the Audio API rather than a packaged
 * sound file: keeps the bundle tiny and avoids autoplay-policy issues — the
 * AudioContext is created lazily on first user gesture (login click), then
 * reused across the session.
 */
let ctx: AudioContext | null = null;
let enabled = true;

export function enableAudio(): void {
  enabled = true;
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
}

export function disableAudio(): void {
  enabled = false;
}

export function isAudioEnabled(): boolean {
  return enabled;
}

/** Initial unlock — call from a user gesture handler (login button, sound toggle). */
export function unlockAudio(): void {
  if (!ctx) {
    enableAudio();
  }
  if (ctx?.state === 'suspended') void ctx.resume();
}

/** Plays a short two-tone "new order" ding. */
export function playDing(): void {
  if (!enabled) return;
  if (!ctx) return;
  const now = ctx.currentTime;
  const tone = (start: number, freq: number, duration: number) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(start);
    osc.stop(start + duration);
  };
  tone(now, 880, 0.15);
  tone(now + 0.13, 1175, 0.22);
}
