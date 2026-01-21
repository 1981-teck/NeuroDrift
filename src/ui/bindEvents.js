import { formatTimerValue, updateNoiseColorUI, updateMasterUI, updateNoiseVolUI } from './render.js';

export function bindEvents(ui, app) {
  ui.startBtn.addEventListener('click', () => app.togglePlay());

  ui.presetBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.preset-btn');
    if (!btn) return;
    app.applyPreset(btn.getAttribute('data-preset'), btn);
  });

  const interactStart = () => app.setUserInteracting(true);
  const interactEnd = () => app.setUserInteracting(false);

  ui.freqSlider.addEventListener('pointerdown', interactStart);
  ui.freqSlider.addEventListener('pointerup', interactEnd);
  ui.freqSlider.addEventListener('pointercancel', interactEnd);
  ui.freqSlider.addEventListener('pointerleave', interactEnd);

  ui.freqSlider.addEventListener('input', (e) => app.onFreqChange(e.target.value));
  ui.toneSlider.addEventListener('input', (e) => app.onToneChange(e.target.value));

  ui.noiseColorSlider.addEventListener('input', (e) => app.onNoiseColorChange(e.target.value));
  ui.masterSlider.addEventListener('input', (e) => app.onMasterChange(e.target.value));
  ui.noiseVolSlider.addEventListener('input', (e) => app.onNoiseVolChange(e.target.value));

  ui.timerSlider.addEventListener('input', (e) => {
    ui.timerVal.textContent = formatTimerValue(e.target.value);
  });

  ui.sweepBtn.addEventListener('click', () => app.toggleAutoSweep());
  ui.binauralBtn.addEventListener('click', () => app.toggleBinaural());

  ui.timerVal.textContent = formatTimerValue(ui.timerSlider.value);
  updateMasterUI(ui);
  updateNoiseVolUI(ui);
  updateNoiseColorUI(ui);
}
