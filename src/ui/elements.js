export function getUI() {
  return {
    startBtn: document.getElementById('startBtn'),
    presetBar: document.getElementById('presetBar'),
    presetBtns: Array.from(document.querySelectorAll('.preset-btn')),

    canvas: document.getElementById('visualizer'),
    timerDisplay: document.getElementById('timerDisplay'),

    freqSlider: document.getElementById('freqSlider'),
    toneSlider: document.getElementById('toneSlider'),

    noiseColorSlider: document.getElementById('noiseColorSlider'),
    masterSlider: document.getElementById('masterSlider'),
    beatVolSlider: document.getElementById('beatVolSlider'),
    beatVolVal: document.getElementById('beatVolVal'),
    noiseVolSlider: document.getElementById('noiseVolSlider'),

    timerSlider: document.getElementById('timerSlider'),

    sweepBtn: document.getElementById('sweepBtn'),
    binauralBtn: document.getElementById('binauralBtn'),

    freqVal: document.getElementById('freqVal'),
    toneVal: document.getElementById('toneVal'),
    timerVal: document.getElementById('timerVal'),
    freqType: document.getElementById('freqType'),

    noiseColorVal: document.getElementById('noiseColorVal'),
    masterVal: document.getElementById('masterVal'),
    masterVal2: document.getElementById('masterVal2'),
    noiseVolVal: document.getElementById('noiseVolVal'),
  };
}
