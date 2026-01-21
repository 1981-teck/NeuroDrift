import { AUDIO } from '../config/constants.js';
import { PRESETS } from '../config/presets.js';
import {
  updateBrainwaveUI,
  updateToneUI,
  updateNoiseColorUI,
  updateMasterUI,
  updateNoiseVolUI,
  updateBeatVolUI,
  setTimerBadge,
  setToggleButton,
} from '../ui/render.js';
import { SessionTimer } from '../session/SessionTimer.js';
import { AudioEngine } from '../audio/AudioEngine.js';
import { Visualizer } from '../visual/Visualizer.js';
import { state } from './state.js';

export class AppController {
  constructor(ui) {
    this.ui = ui;
    this.engine = new AudioEngine();
    this.timer = new SessionTimer();
    this.visualizer = new Visualizer(ui.canvas);
    this._startFreq = Number(ui.freqSlider.value);
  }

  initUI() {
    updateBrainwaveUI(this.ui, this.ui.freqSlider.value);
    updateToneUI(this.ui, this.ui.toneSlider.value);
    updateNoiseColorUI(this.ui);
    updateMasterUI(this.ui);
    updateBeatVolUI(this.ui);
    updateNoiseVolUI(this.ui);

    setToggleButton(this.ui.sweepBtn, state.autoSweep, 'Auto Sweep: ON', 'Auto Sweep: OFF');
    setToggleButton(this.ui.binauralBtn, state.binaural, 'Binaural: ON', 'Binaural: OFF');

    setTimerBadge(this.ui, 'READY', { active: false, ending: false });
    this.visualizer.renderStatic();
  }

  async togglePlay() {
    await this.engine.resumeIfNeeded();
    if (!state.isPlaying) await this._startSession();
    else this._stopSession();
  }

  async _startSession() {
    const ui = this.ui;

    const master = Number(ui.masterSlider.value);
    const beatVol = Number(ui.beatVolSlider.value);
    const noiseVol = Number(ui.noiseVolSlider.value);
    const noiseColor = Number(ui.noiseColorSlider.value);
    const carrierTone = Number(ui.toneSlider.value);
    const beatHz = Number(ui.freqSlider.value);
    const binaural = state.binaural;

    await this.engine.start({ master, noiseVol, noiseColor, carrierTone, beatHz, binaural, beatVol });
    state.isPlaying = true;

    ui.startBtn.innerHTML = '<span>Stop Session</span>';
    ui.startBtn.classList.add('playing');

    const timerMins = parseInt(ui.timerSlider.value, 10);
    if (!Number.isFinite(timerMins) || timerMins <= 0) setTimerBadge(ui, '∞ INFINITE', { active: true, ending: false });
    else setTimerBadge(ui, '0:00', { active: true, ending: false });

    this.visualizer.start(this.engine.getAnalyser());

    this._startFreq = beatHz;

    const timerResult = this.timer.start(ui.timerSlider.value, {
      onTick: ({ remaining, total, elapsed }) => {
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        setTimerBadge(ui, `${m}:${String(s).padStart(2, '0')}`, {
          active: true,
          ending: remaining <= AUDIO.TIMER_WARNING_SECONDS,
        });

        if (state.autoSweep && this._startFreq > 1 && total > 0) {
          const progress = Math.min(1, elapsed / total);
          const nextFreq = Math.max(1, this._startFreq - ((this._startFreq - 1) * progress));
          updateBrainwaveUI(ui, nextFreq);
          if (!state.isUserInteracting) ui.freqSlider.value = String(nextFreq);
        }
      },
      onEnd: () => this.togglePlay(),
    });

    if (timerResult.mode === 'timed' && state.autoSweep && beatHz > 1) {
      this.engine.rampBeatTo(1, timerResult.totalSecs);
    }
  }

  _stopSession() {
    this.timer.stop();
    this.engine.stop();

    state.isPlaying = false;
    this.ui.startBtn.innerHTML = '<span>Start Session</span>';
    this.ui.startBtn.classList.remove('playing');

    setTimerBadge(this.ui, 'READY', { active: false, ending: false });

    this.visualizer.stop();
    this.visualizer.renderStatic();
  }

  applyPreset(key, btnEl) {
    const p = PRESETS[key];
    if (!p) return;

    const ui = this.ui;
    ui.freqSlider.value = String(p.freq);
    ui.toneSlider.value = String(p.tone);
    ui.noiseVolSlider.value = String(p.noiseVol ?? 0);
    ui.noiseColorSlider.value = String(p.noiseColor ?? 1);

    // Optional: allow preset to set beats volume if present; otherwise keep current slider value.
    if (p.beatVol != null && ui.beatVolSlider) {
      ui.beatVolSlider.value = String(p.beatVol);
    }

    updateBrainwaveUI(ui, p.freq);
    updateToneUI(ui, p.tone);
    updateNoiseVolUI(ui);
    updateNoiseColorUI(ui);
    updateBeatVolUI(ui);

    ui.presetBtns.forEach((b) => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');

    if (state.isPlaying) {
      this.engine.setCarrierTone(p.tone);
      this.engine.setBeatFrequency(p.freq);
      this.engine.setNoiseVolume(p.noiseVol ?? 0);
      this.engine.setNoiseColor(p.noiseColor ?? 1);

      if (p.beatVol != null) this.engine.setBeatVolume(p.beatVol);
    }
  }

  setUserInteracting(v) { state.isUserInteracting = Boolean(v); }

  onFreqChange(val) {
    updateBrainwaveUI(this.ui, val);
    if (state.isPlaying) this.engine.setBeatFrequency(val);
    this.ui.presetBtns.forEach((b) => b.classList.remove('active'));
  }

  onToneChange(val) {
    updateToneUI(this.ui, val);
    if (state.isPlaying) this.engine.setCarrierTone(val);
  }

  onNoiseColorChange(val) {
    updateNoiseColorUI(this.ui);
    if (state.isPlaying) this.engine.setNoiseColor(val);
  }

  onMasterChange(val) {
    updateMasterUI(this.ui);
    if (state.isPlaying) this.engine.setMasterVolume(val);
  }

  onBeatVolChange(val) {
    updateBeatVolUI(this.ui);
    if (state.isPlaying) this.engine.setBeatVolume(val);
  }

  onNoiseVolChange(val) {
    updateNoiseVolUI(this.ui);
    if (state.isPlaying) this.engine.setNoiseVolume(val);
  }

  toggleAutoSweep() {
    state.autoSweep = !state.autoSweep;
    setToggleButton(this.ui.sweepBtn, state.autoSweep, 'Auto Sweep: ON', 'Auto Sweep: OFF');
  }

  toggleBinaural() {
    state.binaural = !state.binaural;
    setToggleButton(this.ui.binauralBtn, state.binaural, 'Binaural: ON', 'Binaural: OFF');
    if (state.isPlaying) this.engine.setBinauralMode(state.binaural);
  }
}
