import { Bus } from './bus.js';

// Настройки внешнего вида и поведения. Хранятся в settings.json через main-процесс, применяются CSS-переменными.

export const WALLPAPERS = [
  { id: 'wal1', name: 'Незабудки', accent: '#7aa7ff' },
  { id: 'wal2', name: 'Свет', accent: '#c9c4ff' },
  { id: 'wal3', name: 'Шторм', accent: '#8fb8d8' },
  { id: 'wal4', name: 'Ртуть', accent: '#b8bcc8' },
  { id: 'wal5', name: 'Пальмы', accent: '#e0c48a' },
  { id: 'wal6', name: 'Горизонт', accent: '#d6d2c4' },
  { id: 'wal7', name: 'Луна', accent: '#ef6f6f' },
  { id: 'wal8', name: 'Кот', accent: '#e8e8e8' },
  { id: 'wal9', name: 'Собор', accent: '#e3b778' }
];

export const ACCENTS = [
  { name: 'Небо', value: '#7aa7ff' },
  { name: 'Лаванда', value: '#a996ff' },
  { name: 'Мята', value: '#5fd3a8' },
  { name: 'Янтарь', value: '#f0b860' },
  { name: 'Персик', value: '#f59a76' },
  { name: 'Роза', value: '#f27bb0' },
  { name: 'Коралл', value: '#ef6f6f' },
  { name: 'Лёд', value: '#a8c7d8' },
  { name: 'Жемчуг', value: '#d9d6e4' }
];

export const DEFAULTS = {
  theme: 'dark',            // dark | light | auto
  autoDarkFrom: 19,
  autoDarkTo: 7,
  wallpaper: 'wal1',        // wal1..wal9 | plain | custom
  customWallpaper: '',
  wallDim: 0.35,
  wallBlur: 0,
  wallSat: 1,
  wallMotion: false,
  vignette: true,
  glassAlpha: 0.5,
  glassBlur: 26,
  settingsDensity: 0.75,    // минимальная плотность окна настроек
  radius: 18,
  accent: '#7aa7ff',
  accentMode: 'wall',       // wall | art | custom
  scale: 1,
  density: 'comfortable',   // comfortable | compact
  showCovers: true,
  showNumbers: true,
  animations: true,
  clock: true,
  nightLight: 'auto',       // off | on | auto
  nightStrength: 0.3,
  nightFrom: 22,
  nightTo: 7,
  fade: true,
  showToasts: true,
  fx: 'none',               // см. EFFECTS в fx.js
  fxDensity: 0.6,
  fxSpeed: 1,
  fxOpacity: 0.8,
  fxColor: 'auto',          // auto (белый в тёмной теме) | accent
  fxPlayingOnly: false
};

const inWindow = (hour, from, to) => (from <= to ? hour >= from && hour < to : hour >= from || hour < to);

export class Prefs extends Bus {
  constructor(api) {
    super();
    this.api = api;
    this.values = { ...DEFAULTS };
    this.saveTimer = null;
  }

  load(saved) {
    this.values = { ...DEFAULTS, ...(saved || {}) };
    // «Аврора» из прошлых версий стала «Пустым фоном».
    if (this.values.wallpaper === 'aurora') this.values.wallpaper = 'plain';
    // «Плёнка» и «Сияние» убраны.
    if (this.values.fx === 'aurora' || this.values.fx === 'grain') this.values.fx = 'none';
  }

  get(key) {
    return this.values[key];
  }

  set(patch) {
    Object.assign(this.values, patch);
    this.emit('change', patch);
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.api.setPrefs(this.values).catch(() => undefined), 250);
  }

  reset() {
    const keep = { customWallpaper: this.values.customWallpaper };
    this.set({ ...DEFAULTS, ...keep });
  }

  // Тема с учётом режима «авто» (по времени суток).
  resolveDark(now = new Date()) {
    const mode = this.values.theme;
    if (mode === 'auto') return inWindow(now.getHours(), this.values.autoDarkFrom, this.values.autoDarkTo);
    return mode !== 'light';
  }

  nightActive(now = new Date()) {
    const mode = this.values.nightLight;
    if (mode === 'auto') return inWindow(now.getHours(), this.values.nightFrom, this.values.nightTo);
    return mode === 'on';
  }

  wallpaperURL() {
    const id = this.values.wallpaper;
    if (id === 'custom') return this.values.customWallpaper || '';
    if (WALLPAPERS.some((w) => w.id === id)) return `wallpapers/${id}.jpg`;
    return '';
  }

  // Акцент: от обоев или выбранный вручную. Режим «из обложки» докрашивается снаружи цветом трека.
  baseAccent() {
    if (this.values.accentMode !== 'custom') {
      const wall = WALLPAPERS.find((w) => w.id === this.values.wallpaper);
      if (wall) return wall.accent;
    }
    return this.values.accent;
  }
}
