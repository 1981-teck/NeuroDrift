import { AUDIO } from '../config/constants.js';

export class SessionTimer {
  constructor() {
    this._interval = null;
    this._totalSecs = 0;
    this._elapsed = 0;
  }

  stop() {
    if (this._interval) {
      window.clearInterval(this._interval);
      this._interval = null;
    }
    this._totalSecs = 0;
    this._elapsed = 0;
  }

  start(minutes, { onTick, onEnding, onEnd } = {}) {
    this.stop();

    const mins = parseInt(minutes, 10);
    if (!Number.isFinite(mins) || mins <= 0) return { mode: 'infinite' };

    this._totalSecs = mins * 60;
    this._elapsed = 0;

    this._interval = window.setInterval(() => {
      this._elapsed += 1;

      const remainingRaw = this._totalSecs - this._elapsed;
      const remaining = Math.max(0, remainingRaw);

      onTick?.({ remaining, total: this._totalSecs, elapsed: this._elapsed });

      if (remaining <= AUDIO.TIMER_WARNING_SECONDS) onEnding?.({ remaining });
      if (remainingRaw <= 0) {
        this.stop();
        onEnd?.();
      }
    }, 1000);

    return { mode: 'timed', totalSecs: this._totalSecs };
  }
}
