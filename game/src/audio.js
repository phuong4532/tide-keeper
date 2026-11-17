// Sound, all synthesised with WebAudio: no files. Nothing plays until the first key or click, and M mutes.
export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
    this.noise = null;
  }

  /** Call from a key or click: browsers only allow audio after one. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Context();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      const length = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    } catch (error) {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
  }

  tone(freq, length, { type = 'sine', gain = 0.2, slide = 0, delay = 0 } = {}) {
    if (!this.ctx) return;
    const start = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), start + length);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(amp);
    amp.connect(this.master);
    osc.start(start);
    osc.stop(start + length + 0.02);
  }

  hiss(length, { gain = 0.2, freq = 1000, delay = 0 } = {}) {
    if (!this.ctx) return;
    const start = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const amp = this.ctx.createGain();
    src.buffer = this.noise;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, freq / 4), start + length);
    amp.gain.setValueAtTime(gain, start);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + length);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(this.master);
    src.start(start);
    src.stop(start + length + 0.02);
  }

  /** Play the sound for a game event name. */
  play(name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'burn':
        this.tone(880 + Math.random() * 200, 0.06, { type: 'triangle', gain: 0.05 });
        break;
      case 'laser':
        this.tone(1500, 0.07, { type: 'sawtooth', gain: 0.05, slide: 400 });
        break;
      case 'kill':
        this.tone(520, 0.14, { type: 'square', gain: 0.07, slide: 500 });
        this.hiss(0.15, { gain: 0.08, freq: 3000 });
        break;
      case 'boom':
        this.tone(160, 0.5, { type: 'sawtooth', gain: 0.18, slide: -110 });
        this.hiss(0.6, { gain: 0.25, freq: 1500 });
        break;
      case 'hurt':
        this.tone(110, 0.3, { type: 'square', gain: 0.18, slide: -60 });
        this.hiss(0.3, { gain: 0.3, freq: 900 });
        break;
      case 'zap':
        this.hiss(0.25, { gain: 0.22, freq: 6000 });
        this.tone(1800, 0.2, { type: 'sawtooth', gain: 0.07, slide: -1400 });
        break;
      case 'dry':
        this.tone(240, 0.25, { type: 'triangle', gain: 0.12, slide: -150 });
        break;
      case 'wave':
        this.tone(147, 0.9, { type: 'sawtooth', gain: 0.12 });
        this.tone(220, 0.9, { type: 'sine', gain: 0.1, delay: 0.05 });
        break;
      case 'clear':
        [523, 659, 784].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', gain: 0.12, delay: i * 0.09 }));
        break;
      case 'upgrade':
        [392, 523, 659, 880].forEach((f, i) => this.tone(f, 0.22, { type: 'square', gain: 0.07, delay: i * 0.06 }));
        break;
      case 'over':
        [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.5, { type: 'sawtooth', gain: 0.12, delay: i * 0.28, slide: -20 }));
        break;
      case 'win':
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.5, { type: 'triangle', gain: 0.13, delay: i * 0.14 }));
        break;
      case 'pulse':
        this.tone(90, 0.6, { type: 'sine', gain: 0.3, slide: 260 });
        this.hiss(0.5, { gain: 0.2, freq: 2500 });
        break;
      case 'buoy':
        this.tone(660, 0.18, { type: 'triangle', gain: 0.1 });
        this.tone(880, 0.3, { type: 'sine', gain: 0.1, delay: 0.1 });
        break;
      case 'cannon':
        this.tone(120, 0.25, { type: 'square', gain: 0.1, slide: -70 });
        this.hiss(0.2, { gain: 0.12, freq: 1200 });
        break;
      case 'boss':
        [110, 98, 82].forEach((f, i) => this.tone(f, 1.2, { type: 'sawtooth', gain: 0.16, delay: i * 0.35 }));
        break;
      case 'shatter':
        this.hiss(0.5, { gain: 0.3, freq: 5000 });
        this.tone(900, 0.4, { type: 'triangle', gain: 0.12, slide: -700 });
        break;
      case 'summon':
        this.tone(200, 0.4, { type: 'sine', gain: 0.12, slide: 160 });
        break;
      default:
        break;
    }
  }
}
