/* ════════════════════════════════════════════════════════════════
   Procedural mission-control ambience — pure WebAudio synthesis, no
   audio assets. A low-frequency drone + a slow filtered noise "wind"
   + an occasional radar ping. Must be started from a user gesture
   (browser autoplay policy); off by default.
   ════════════════════════════════════════════════════════════════ */

export class Ambience {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private pingTimer: number | null = null;
  running = false;

  start() {
    if (this.running) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);
    this.master = master;
    master.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 2.5); // slow fade-in

    // ── Low drone: two detuned sines through a gentle lowpass ──
    const drone = ctx.createGain();
    drone.gain.value = 0.18;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 220;
    [55, 55.4, 110].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = i === 2 ? 0.25 : 0.6;
      o.connect(g).connect(lp);
      o.start();
    });
    lp.connect(drone).connect(master);

    // ── Wind: filtered pink-ish noise, slowly modulated ──
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = "bandpass";
    nf.frequency.value = 480;
    nf.Q.value = 0.7;
    const ng = ctx.createGain();
    ng.gain.value = 0.04;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain).connect(nf.frequency);
    lfo.start();
    noise.connect(nf).connect(ng).connect(master);
    noise.start();

    // ── Occasional radar ping ──
    const ping = () => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(1320, t);
      o.frequency.exponentialRampToValueAtTime(880, t + 0.18);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.08, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + 0.65);
      this.pingTimer = window.setTimeout(ping, 6000 + Math.random() * 7000);
    };
    this.pingTimer = window.setTimeout(ping, 3500);

    this.running = true;
  }

  stop() {
    if (this.pingTimer) window.clearTimeout(this.pingTimer);
    if (this.ctx && this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      const ctx = this.ctx;
      window.setTimeout(() => ctx.close().catch(() => {}), 800);
    }
    this.ctx = null;
    this.master = null;
    this.running = false;
  }
}
