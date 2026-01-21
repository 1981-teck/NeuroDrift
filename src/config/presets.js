export const PRESETS = {
  // NON TOCCARE: valori e chiavi dei 3 preset principali
  sleep:    { freq: 2.5,  tone: 150, noiseVol: 0.15, noiseColor: 1.0, label: 'Deep Sleep Preset' },
  meditate: { freq: 6.0,  tone: 200, noiseVol: 0.05, noiseColor: 1.0, label: 'Meditation Preset' },
  focus:    { freq: 14.0, tone: 350, noiseVol: 0.00, noiseColor: 1.0, label: 'Focus Preset' },

  // Preset extra (opzionali): aggiunti senza toccare i 3 sopra
  relax:    { freq: 10.0, tone: 180, noiseVol: 0.03, noiseColor: 0.8, label: 'Relax Preset' },
  boost:    { freq: 20.0, tone: 420, noiseVol: 0.00, noiseColor: 1.0, label: 'Boost Preset' },
};
