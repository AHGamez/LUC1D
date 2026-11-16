/** Tiny synthesized Lublox sound effects (Web Audio, no files). */
let ctx: AudioContext | null = null;
function ac() {
  if (typeof window === "undefined") return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}
function tone(freq: number, end: number, dur: number, type: OscillatorType, vol: number) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator(),
    g = a.createGain(),
    t = a.currentTime;
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(end, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur);
}
export const lbxSound = {
  jump: () => tone(320, 640, 0.16, "square", 0.06),
  land: () => tone(140, 60, 0.1, "triangle", 0.08),
  step: () => tone(90 + Math.random() * 30, 50, 0.06, "triangle", 0.05),
  tag: () => {
    tone(880, 440, 0.25, "sawtooth", 0.07);
    setTimeout(() => tone(660, 990, 0.2, "square", 0.05), 120);
  },
  win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, f, 0.18, "square", 0.06), i * 110)),
  oof: () => tone(300, 80, 0.3, "sawtooth", 0.07),
  lock: () => tone(1200, 1200, 0.04, "sine", 0.05),
};
