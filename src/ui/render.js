export function brainwaveLabel(freq) {
  const f = Number(freq);
  if (f <= 4) return 'Delta — Deep Sleep & Recovery';
  if (f <= 8) return 'Theta — Deep Meditation';
  if (f <= 14) return 'Alpha — Relaxation & Calm';
  if (f <= 30) return 'Beta — Active Thinking';
  return 'Gamma — High Focus & Processing';
}

export function formatTimerValue(val) {
  const n = parseInt(val, 10);
  if (!Number.isFinite(n) || n === 0) return 'OFF';
  if (n < 60) return `${n} min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function pct(v) {
  return `${Math.round(parseFloat(v) * 100)}%`;
}

export function updateBrainwaveUI(ui, freq) {
  ui.freqVal.textContent = `${Number(freq).toFixed(1)} Hz`;
  ui.freqType.textContent = brainwaveLabel(freq);
}

export function updateToneUI(ui, tone) {
  ui.toneVal.textContent = `${parseInt(tone, 10)} Hz`;
}

export function updateNoiseColorUI(ui) {
  const c = parseFloat(ui.noiseColorSlider.value);
  if (c <= 0.01) ui.noiseColorVal.textContent = 'White';
  else if (c >= 0.99) ui.noiseColorVal.textContent = 'Pink';
  else ui.noiseColorVal.textContent = `${Math.round(c * 100)}% Pink`;
}

export function updateMasterUI(ui) {
  const p = pct(ui.masterSlider.value);
  ui.masterVal.textContent = p;
  ui.masterVal2.textContent = p;
}

export function updateNoiseVolUI(ui) {
  const nv = parseFloat(ui.noiseVolSlider.value);
  ui.noiseVolVal.textContent = nv === 0 ? 'None' : `${Math.round(nv * 100)}%`;
}

export function setTimerBadge(ui, text, { active = false, ending = false } = {}) {
  ui.timerDisplay.textContent = text;
  ui.timerDisplay.classList.toggle('active', active);
  ui.timerDisplay.classList.toggle('ending', ending);
}

export function setToggleButton(btn, active, onText, offText) {
  btn.classList.toggle('active', active);
  btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  btn.textContent = active ? onText : offText;
}
