import { AUDIO } from '../config/constants.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;

    this.mainGain = null;   // master volume
    this.mixBus = null;     // sums tone + noise

    this.toneGain = null;
    this.noiseGain = null;

    this.analyser = null;

    this.merger = null;

    this.oscLeft = null;
    this.oscRight = null;

    this.noiseNode = null;      // AudioWorkletNode
    this.noiseFilter = null;

    this.isPlaying = false;

    this._carrierTone = 200;
    this._beatHz = 6.0;
    this._binaural = true;

    // Keep headroom to avoid clipping.
    this._baseToneLevel = 0.35;

    // User-controlled tone (carrier/binaural) volume
    this._beatVolume = 0.35;
  }

  async ensureInit() {
    if (this.ctx) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    // Best-effort: request stereo at the destination when supported.
    try {
      this.ctx.destination.channelCount = 2;
      this.ctx.destination.channelCountMode = 'explicit';
      this.ctx.destination.channelInterpretation = 'speakers';
    } catch (_) {}

    // Load noise worklet
    await this.ctx.audioWorklet.addModule(
      new URL('./worklets/colored-noise-processor.js', import.meta.url)
    );

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.85;

    this.mainGain = this.ctx.createGain();
    this.mainGain.gain.value = 0.33;

    // Mix bus (tone + noise) -> master -> destination
    this.mixBus = this.ctx.createGain();
    this.mixBus.gain.value = 1.0;

    // Keep pipeline explicitly stereo to reduce unintended downmix/crosstalk effects
    for (const n of [this.mixBus, this.mainGain, this.toneGain, this.noiseGain].filter(Boolean)) {
      try {
        n.channelCount = 2;
        n.channelCountMode = 'explicit';
        n.channelInterpretation = 'speakers';
      } catch (_) {}
    }

    // IMPORTANT: analyser is a TAP (parallel), not in the audio path.
    // This matches the v1 wiring and avoids any browser-specific channel policy surprises.
    this.mixBus.connect(this.mainGain);
    this.mainGain.connect(this.ctx.destination);
    this.mainGain.connect(this.analyser);

    this.toneGain = this.ctx.createGain();
    this.toneGain.gain.value = this._getTargetToneGain();
    try {
      this.toneGain.channelCount = 2;
      this.toneGain.channelCountMode = 'explicit';
      this.toneGain.channelInterpretation = 'speakers';
    } catch (_) {}
    this.toneGain.connect(this.mixBus);

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0.0;
    try {
      this.noiseGain.channelCount = 2;
      this.noiseGain.channelCountMode = 'explicit';
      this.noiseGain.channelInterpretation = 'speakers';
    } catch (_) {}
    this.noiseGain.connect(this.mixBus);

    // Stereo merger for binaural routing
    this.merger = this.ctx.createChannelMerger(2);
    this.merger.connect(this.toneGain);

    // Noise generator (continuous, no loop clicks)
    this.noiseNode = new AudioWorkletNode(this.ctx, 'colored-noise', {
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });

    // Optional comfort filter on noise
    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseFilter.type = 'lowpass';
    this.noiseFilter.frequency.value = AUDIO.NOISE_LP_FREQ;
    this.noiseFilter.Q.value = AUDIO.NOISE_LP_Q;

    this.noiseNode.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);

    // default: pink
    this.setNoiseColor(1.0, true);
  }

  async resumeIfNeeded() {
    await this.ensureInit();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  getAnalyser() {
    return this.analyser;
  }

  async start({ master, noiseVol, noiseColor, carrierTone, beatHz, binaural, beatVol }) {
    await this.resumeIfNeeded();
    if (this.isPlaying) return;

    this._carrierTone = Number(carrierTone);
    this._beatHz = Number(beatHz);
    this._binaural = Boolean(binaural);
    this._beatVolume = Math.min(1, Math.max(0, Number(beatVol)));

    // Oscillators
    this.oscLeft = this.ctx.createOscillator();
    this.oscRight = this.ctx.createOscillator();
    this.oscLeft.type = 'sine';
    this.oscRight.type = 'sine';

    // Routing + freq
    this._applyRouting(true);
    this._applyFrequencies(0.001, true);

    const now = this.ctx.currentTime;

    // Master
    this.mainGain.gain.cancelScheduledValues(now);
    this.mainGain.gain.setValueAtTime(this.mainGain.gain.value, now);
    this.mainGain.gain.setTargetAtTime(Number(master), now, 0.05);

    // Tone gain fade-in
    this.toneGain.gain.cancelScheduledValues(now);
    this.toneGain.gain.setValueAtTime(0, now);
    this.toneGain.gain.linearRampToValueAtTime(this._getTargetToneGain(), now + AUDIO.FADE_IN_TIME);

    // Noise gain fade-in
    this.noiseGain.gain.cancelScheduledValues(now);
    this.noiseGain.gain.setValueAtTime(0, now);
    this.noiseGain.gain.linearRampToValueAtTime(Number(noiseVol), now + AUDIO.FADE_IN_TIME + 0.3);

    // Noise color
    this.setNoiseColor(noiseColor, false);

    this.oscLeft.start();
    this.oscRight.start();

    this.isPlaying = true;
  }

  stop() {
    if (!this.isPlaying || !this.ctx) return;

    const now = this.ctx.currentTime;
    try {
      this.toneGain.gain.cancelScheduledValues(now);
      this.toneGain.gain.setTargetAtTime(0, now, AUDIO.FADE_OUT_TIME);

      this.noiseGain.gain.cancelScheduledValues(now);
      this.noiseGain.gain.setTargetAtTime(0, now, AUDIO.FADE_OUT_TIME);
    } catch (_) {}

    this.isPlaying = false;

    // cleanup oscillators after fade
    window.setTimeout(() => {
      this._cleanupOscillators();
      // suspend context to save CPU
      if (!this.isPlaying && this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    }, Math.floor(AUDIO.FADE_OUT_TIME * 1000 + 250));
  }

  _cleanupOscillators() {
    const safeStopDisconnect = (node) => {
      if (!node) return;
      try { node.stop?.(); } catch (_) {}
      try { node.disconnect?.(); } catch (_) {}
    };
    safeStopDisconnect(this.oscLeft);  this.oscLeft = null;
    safeStopDisconnect(this.oscRight); this.oscRight = null;
  }

  setMasterVolume(v) {
    if (!this.mainGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.mainGain.gain.setTargetAtTime(Number(v), now, 0.08);
  }

  setNoiseVolume(v) {
    if (!this.noiseGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.noiseGain.gain.setTargetAtTime(Number(v), now, 0.1);
  }

  setBeatVolume(v) {
    this._beatVolume = Math.min(1, Math.max(0, Number(v)));
    if (!this.toneGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.toneGain.gain.setTargetAtTime(this._getTargetToneGain(), now, 0.08);
  }

  setNoiseColor(color, immediate = false) {
    if (!this.noiseNode || !this.ctx) return;
    const c = Math.min(1, Math.max(0, Number(color)));
    const param = this.noiseNode.parameters.get('color');
    const now = this.ctx.currentTime;

    if (immediate) {
      param.cancelScheduledValues(now);
      param.setValueAtTime(c, now);
    } else {
      param.setTargetAtTime(c, now, AUDIO.COLOR_PARAM_TC);
    }
  }

  setCarrierTone(hz) {
    this._carrierTone = Number(hz);
    this._applyFrequencies(0.15);
  }

  setBeatFrequency(hz) {
    this._beatHz = Number(hz);
    this._applyFrequencies(0.15);
  }

  setBinauralMode(enabled) {
    this._binaural = Boolean(enabled);
    if (this.toneGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.toneGain.gain.setTargetAtTime(this._getTargetToneGain(), now, 0.1);
    }
    this._applyRouting(false);
    // When binaural is off, we force both oscillators to the same carrier frequency (no beat).
    this._applyFrequencies(0.15);
  }

  rampBeatTo(targetHz, durationSeconds) {
    if (!this.ctx || !this.oscRight || !this.oscLeft) return;

    const target = Number(targetHz);
    const duration = Number(durationSeconds);
    if (!Number.isFinite(target) || !Number.isFinite(duration) || duration <= 0) return;

    this._beatHz = target;

    const now = this.ctx.currentTime;
    const carrier = this._carrierTone;

    // If binaural is off, keep both oscillators on carrier (no beat).
    const effectiveBeat = this._binaural ? target : 0;

    // Symmetric binaural pair around carrier:
    // L = carrier - beat/2, R = carrier + beat/2
    const half = effectiveBeat * 0.5;
    const leftTarget = Math.max(0.1, carrier - half);
    const rightTarget = Math.max(0.1, carrier + half);

    this.oscLeft.frequency.cancelScheduledValues(now);
    this.oscRight.frequency.cancelScheduledValues(now);

    this.oscLeft.frequency.setValueAtTime(this.oscLeft.frequency.value, now);
    this.oscRight.frequency.setValueAtTime(this.oscRight.frequency.value, now);

    this.oscLeft.frequency.linearRampToValueAtTime(leftTarget, now + duration);
    this.oscRight.frequency.linearRampToValueAtTime(rightTarget, now + duration);
  }

  _getTargetToneGain() {
    const base = this._beatVolume;
    return this._binaural ? base : (base * AUDIO.MONAURAL_COMP);
  }

  _applyRouting(force = false) {
    if (!this.oscLeft || !this.oscRight) return;
    try {
      this.oscLeft.disconnect();
      this.oscRight.disconnect();

      if (this._binaural) {
        this.oscLeft.connect(this.merger, 0, 0);
        this.oscRight.connect(this.merger, 0, 1);
      } else {
        // monaural: both oscillators feed the same bus (they will be set to the same carrier frequency)
        this.oscLeft.connect(this.toneGain);
        this.oscRight.connect(this.toneGain);
      }
    } catch (e) {
      if (force) throw e;
    }
  }

  _applyFrequencies(ramp = 0.15, force = false) {
    if (!this.oscLeft || !this.oscRight || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const carrier = this._carrierTone;
      const beat = this._beatHz;

      // If binaural is off, keep both oscillators on carrier (no beat).
      const effectiveBeat = this._binaural ? beat : 0;

      // Symmetric binaural pair around carrier:
      // L = carrier - beat/2, R = carrier + beat/2
      const half = effectiveBeat * 0.5;
      const leftHz = Math.max(0.1, carrier - half);
      const rightHz = Math.max(0.1, carrier + half);

      this.oscLeft.frequency.setTargetAtTime(leftHz, now, ramp);
      this.oscRight.frequency.setTargetAtTime(rightHz, now, ramp);
    } catch (e) {
      if (force) throw e;
    }
  }
}
