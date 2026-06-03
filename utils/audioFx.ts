class AudioSynth {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playEat() {
    this.init();
    const context = this.ctx; // Fixed: Local scoping block variable completely satisfies strict analysis rules
    if (!context) return;

    const o = context.createOscillator();
    const g = context.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(587.33, context.currentTime);
    o.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.08);
    g.gain.setValueAtTime(0.3, context.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
    o.connect(g);
    g.connect(context.destination);
    o.start();
    o.stop(context.currentTime + 0.1);
  }

  playEpicSpawn() {
    this.init();
    const context = this.ctx; // Fixed: Captures a immutable freeze state over the instance property
    if (!context) return;

    const n = context.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];

    notes.forEach((f, index) => {
      const o = context.createOscillator(); // Safe inside the callback loop closure
      const g = context.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(f, n + (index * 0.04));
      g.gain.setValueAtTime(0.15, n + (index * 0.04));
      g.gain.exponentialRampToValueAtTime(0.001, n + 0.4);
      o.connect(g);
      g.connect(context.destination);
      o.start(n + (index * 0.04));
      o.stop(n + 0.4);
    });
  }

  playDie() {
    this.init();
    const context = this.ctx;
    if (!context) return;

    const o = context.createOscillator();
    const g = context.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(150, context.currentTime);
    o.frequency.linearRampToValueAtTime(40, context.currentTime + 0.4);
    g.gain.setValueAtTime(0.4, context.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.4);
    o.connect(g);
    g.connect(context.destination);
    o.start();
    o.stop(context.currentTime + 0.4);
  }

  playPowerUp() {
    this.init();
    const context = this.ctx;
    if (!context) return;

    const o = context.createOscillator();
    const g = context.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(300, context.currentTime);
    o.frequency.exponentialRampToValueAtTime(600, context.currentTime + 0.2);
    g.gain.setValueAtTime(0.2, context.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.25);
    o.connect(g);
    g.connect(context.destination);
    o.start();
    o.stop(context.currentTime + 0.25);
  }

  playPoison() {
    this.init();
    const context = this.ctx;
    if (!context) return;

    const o = context.createOscillator();
    const g = context.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(200, context.currentTime);
    o.frequency.exponentialRampToValueAtTime(50, context.currentTime + 0.3);
    g.gain.setValueAtTime(0.3, context.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
    o.connect(g);
    g.connect(context.destination);
    o.start();
    o.stop(context.currentTime + 0.3);
  }
}

export const sfx = new AudioSynth();