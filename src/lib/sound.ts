/**
 * Som de página virando, sintetizado com Web Audio (ruído filtrado).
 * Não precisa de arquivo de áudio. O AudioContext só é criado depois de uma
 * interação do usuário, porque os navegadores bloqueiam áudio automático.
 */
let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let enabled = false;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  if (on) ensureContext();
}

function ensureContext() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      const len = Math.floor(ctx.sampleRate * 0.5);
      noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

export function playPageFlip(): void {
  if (!enabled) return;
  ensureContext();
  if (!ctx || !noise) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;

  // Passa-banda varrendo do agudo ao grave imita o "fruuu" do papel
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 0.9;
  filter.frequency.setValueAtTime(3800, t);
  filter.frequency.exponentialRampToValueAtTime(700, t + 0.35);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.35, t + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);

  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(t);
  src.stop(t + 0.5);
}
