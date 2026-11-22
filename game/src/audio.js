// audio.js — synthesized WebAudio sounds only; no audio files, no network.
export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.alarmNodes = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      return true;
    } catch {
      return false;
    }
  }

  tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + when;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch {
      // Audio is decoration; never break the game for it.
    }
  }

  step(sneak) {
    this.tone(sneak ? 130 : 95, 0.05, 'sine', sneak ? 0.02 : 0.045, 0, 70);
  }

  chime() {
    this.tone(880, 0.16, 'sine', 0.12);
    this.tone(1318, 0.24, 'sine', 0.1, 0.09);
  }

  beep() {
    this.tone(1200, 0.07, 'square', 0.05);
  }

  hackDone() {
    this.tone(660, 0.1, 'sine', 0.1);
    this.tone(990, 0.16, 'sine', 0.1, 0.08);
  }

  smoke() {
    this.tone(300, 0.25, 'sine', 0.07, 0, 90);
  }

  // A short alarm sting when a guard spots the thief.
  sting() {
    this.tone(440, 0.3, 'sawtooth', 0.09, 0, 220);
    this.tone(466, 0.3, 'sawtooth', 0.09, 0.12, 233);
  }

  busted() {
    this.tone(220, 0.5, 'sawtooth', 0.1, 0, 110);
    this.tone(165, 0.7, 'sawtooth', 0.1, 0.3, 82);
  }

  win() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => this.tone(n, 0.28, 'sine', 0.11, i * 0.11));
  }

  // Continuous swell while the alarm meter is high; call every frame.
  alarmSwell(level) {
    if (!this.ctx || this.muted) {
      this.stopSwell();
      return;
    }
    if (level < 55) {
      this.stopSwell();
      return;
    }
    try {
      if (!this.alarmNodes) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = 98;
        gain.gain.value = 0.0;
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        this.alarmNodes = { osc, gain };
      }
      const vol = 0.02 + (level / 100) * 0.035;
      this.alarmNodes.gain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.2);
      this.alarmNodes.osc.frequency.setTargetAtTime(
        98 + Math.sin(this.ctx.currentTime * 2.2) * 14,
        this.ctx.currentTime,
        0.1,
      );
    } catch {
      this.stopSwell();
    }
  }

  stopSwell() {
    if (!this.alarmNodes) return;
    try {
      this.alarmNodes.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      const nodes = this.alarmNodes;
      this.alarmNodes = null;
      setTimeout(() => {
        try {
          nodes.osc.stop();
        } catch {}
      }, 300);
    } catch {
      this.alarmNodes = null;
    }
  }
}
