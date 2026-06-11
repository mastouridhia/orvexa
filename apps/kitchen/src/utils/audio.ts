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
  if (!ctx)
    ctx = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    )();
}

export function disableAudio(): void {
  enabled = false;
}

export function isAudioEnabled(): boolean {
  return enabled;
}

/** Initial unlock — call from a user gesture handler (login button, sound toggle). */
export function unlockAudio(): void {
  if (!ctx) enableAudio();
  if (ctx?.state === 'suspended') void ctx.resume();
}

/**
 * Register a one-time document listener so audio unlocks on the first tap/click/key
 * on the Board page — covers the case where the user was already authenticated and
 * skipped the login form (page refresh, direct URL).
 */
export function scheduleAutoUnlock(): void {
  const unlock = () => {
    unlockAudio();
    document.removeEventListener('pointerdown', unlock, true);
    document.removeEventListener('keydown', unlock, true);
  };
  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('keydown', unlock, true);
}

/** Plays a loud three-beep "new order" alert — square wave + compressor for max punch. */
export function playDing(): void {
  if (!enabled || !ctx) return;
  // Context can become suspended after the tab is backgrounded — resume then retry.
  if (ctx.state === 'suspended') {
    void ctx.resume().then(() => playDing());
    return;
  }

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -6;
  compressor.knee.value = 3;
  compressor.ratio.value = 4;
  compressor.attack.value = 0;
  compressor.release.value = 0.1;
  compressor.connect(ctx.destination);

  const beep = (start: number, freq: number, duration: number) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.frequency.value = freq;
    osc.type = 'square';
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.45, start + 0.01);
    gain.gain.setValueAtTime(0.45, start + duration - 0.02);
    gain.gain.linearRampToValueAtTime(0, start + duration);
    osc.connect(gain).connect(compressor);
    osc.start(start);
    osc.stop(start + duration);
  };

  const now = ctx.currentTime;
  beep(now,        1047, 0.13); // C6
  beep(now + 0.20, 1047, 0.13); // C6
  beep(now + 0.40, 1319, 0.22); // E6 — rising finish
}
