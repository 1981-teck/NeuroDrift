import { UI as UI_CONST } from '../config/constants.js';

export class Visualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cache = { w: 0, h: 0, dpr: 0 };
    this._raf = null;
    this._analyser = null;
  }

  start(analyser) {
    this._analyser = analyser;
    this.stop();
    this._draw();
  }

  stop() {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
    this._analyser = null;
  }

  renderStatic() {
    const { rect, dpr } = this._syncCanvasSize();
    const c = this.ctx;

    c.setTransform(1, 0, 0, 1, 0, 0);
    c.scale(dpr, dpr);

    const bg = c.createLinearGradient(0, 0, 0, rect.height);
    bg.addColorStop(0, '#0d0d0d');
    bg.addColorStop(1, '#141414');
    c.fillStyle = bg;
    c.fillRect(0, 0, rect.width, rect.height);

    c.lineWidth = 2;
    c.strokeStyle = 'rgba(0, 230, 118, 0.55)';
    c.beginPath();

    const mid = rect.height / 2;
    const amp = rect.height * 0.12;
    const cycles = UI_CONST.STATIC_WAVE_CYCLES;
    const points = UI_CONST.STATIC_WAVE_POINTS;

    for (let i = 0; i <= points; i++) {
      const t = i / points;
      const x = t * rect.width;
      const y = mid + Math.sin(t * Math.PI * 2 * cycles) * amp * (0.5 + 0.5 * Math.sin(t * Math.PI));
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
  }

  _draw = () => {
    if (!this._analyser) return;

    this._raf = requestAnimationFrame(this._draw);

    const { rect, dpr } = this._syncCanvasSize();
    const c = this.ctx;

    c.setTransform(1, 0, 0, 1, 0, 0);
    c.scale(dpr, dpr);

    const bufferLen = this._analyser.frequencyBinCount;
    const data = new Uint8Array(bufferLen);
    this._analyser.getByteTimeDomainData(data);

    const bg = c.createLinearGradient(0, 0, 0, rect.height);
    bg.addColorStop(0, '#0d0d0d');
    bg.addColorStop(1, '#141414');
    c.fillStyle = bg;
    c.fillRect(0, 0, rect.width, rect.height);

    c.lineWidth = 2.5;
    const wave = c.createLinearGradient(0, 0, rect.width, 0);
    wave.addColorStop(0, '#00e676');
    wave.addColorStop(0.5, '#00c853');
    wave.addColorStop(1, '#00e676');
    c.strokeStyle = wave;

    c.beginPath();
    const sliceWidth = rect.width / bufferLen;
    let x = 0;

    for (let i = 0; i < bufferLen; i++) {
      const v = data[i] / 128.0;
      const y = v * (rect.height / 2);
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
      x += sliceWidth;
    }

    c.stroke();

    c.shadowBlur = 15;
    c.shadowColor = '#00e676';
    c.stroke();
    c.shadowBlur = 0;
  };

  _syncCanvasSize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.max(1, Math.floor(rect.width * dpr));
    const targetH = Math.max(1, Math.floor(rect.height * dpr));

    if (targetW !== this.cache.w || targetH !== this.cache.h || dpr !== this.cache.dpr) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
      this.cache = { w: targetW, h: targetH, dpr };
    }
    return { rect, dpr };
  }
}
