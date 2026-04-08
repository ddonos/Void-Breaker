export class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    } catch {
      this.enabled = false;
    }
  }

  _play(_type, freq, duration, waveform = 'sine', gainVal = 0.3) {
    try {
      if (!this.ctx || !this.enabled) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = waveform;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      this.enabled = false;
    }
  }

  _playNoise(duration, gain) {
    try {
      if (!this.ctx || !this.enabled) return;
      const bufSize = Math.floor(this.ctx.sampleRate * duration);
      const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i += 1) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      const gainNode = this.ctx.createGain();
      src.buffer = buf;
      gainNode.gain.setValueAtTime(gain, this.ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      src.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      src.start();
    } catch {
      this.enabled = false;
    }
  }

  shoot() {
    this._play('shoot', 880, 0.08, 'sawtooth', 0.15);
  }

  enemyShoot() {
    this._play('enemyShoot', 220, 0.08, 'square', 0.1);
  }

  hit() {
    this._playNoise(0.1, 0.2);
  }

  explosion() {
    this._play('boom', 80, 0.3, 'sine', 0.5);
  }

  levelUp() {
    try {
      if (!this.ctx || !this.enabled) return;
      const freqs = [261.63, 329.63, 392.0, 523.25];
      freqs.forEach((freq, index) => {
        const when = this.ctx.currentTime + index * 0.07;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, when);
        gain.gain.setValueAtTime(0.22, when);
        gain.gain.exponentialRampToValueAtTime(0.001, when + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(when);
        osc.stop(when + 0.18);
      });
    } catch {
      this.enabled = false;
    }
  }

  shopBuy() {
    this._play('buy', 880, 0.15, 'triangle', 0.25);
  }

  bossAlert() {
    this._play('boss', 55, 0.8, 'square', 0.4);
  }
}
