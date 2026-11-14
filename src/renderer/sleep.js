import { Bus } from './bus.js';

// Таймер сна: через N минут плавно (8 секунд) приглушает звук и ставит паузу. Режим «после трека» останавливает
// воспроизведение, когда закончится текущая композиция.

const FADE_MS = 8000;

export class SleepTimer extends Bus {
  constructor(player) {
    super();
    this.player = player;
    this.mode = 'off';
    this.endsAt = 0;
    this.timer = null;
    this.ticker = null;
    player.on('sleep', () => this.finish());
  }

  get active() {
    return this.mode !== 'off';
  }

  get remaining() {
    return this.mode === 'time' ? Math.max(0, this.endsAt - Date.now()) : 0;
  }

  get label() {
    if (this.mode === 'track') return 'после трека';
    if (this.mode !== 'time') return '';
    const total = Math.ceil(this.remaining / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m >= 1 ? `${m} мин` : `0:${String(s).padStart(2, '0')}`;
  }

  set(minutes) {
    this.reset();
    if (minutes === 'track') {
      this.mode = 'track';
      this.player.stopAfterTrack = true;
    } else {
      this.mode = 'time';
      this.endsAt = Date.now() + minutes * 60_000;
      this.timer = setTimeout(() => this.fire(), Math.max(0, minutes * 60_000 - FADE_MS));
      this.ticker = setInterval(() => this.emit('tick'), 1000);
    }
    this.emit('change');
  }

  cancel() {
    this.reset();
    this.emit('change');
  }

  reset() {
    clearTimeout(this.timer);
    clearInterval(this.ticker);
    this.timer = null;
    this.ticker = null;
    this.mode = 'off';
    this.endsAt = 0;
    this.player.stopAfterTrack = false;
    this.player.ramps.gain += 1;
    this.player.gain = 1;
    this.player.applyVolume();
  }

  fire() {
    if (!this.player.isPlaying) {
      this.finish();
      return;
    }
    this.player.ramp('gain', 0, FADE_MS, () => {
      this.player.pause();
      setTimeout(() => {
        this.player.gain = 1;
        this.player.applyVolume();
      }, this.player.fadeMs + 80);
      this.finish();
    });
  }

  finish() {
    clearTimeout(this.timer);
    clearInterval(this.ticker);
    this.timer = null;
    this.ticker = null;
    this.mode = 'off';
    this.player.stopAfterTrack = false;
    this.emit('change');
    this.emit('fired');
  }
}
