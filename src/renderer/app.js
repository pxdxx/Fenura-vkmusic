import { h } from './dom.js';
import { Player } from './player.js';
import { Store } from './store.js';
import { Prefs } from './prefs.js';
import { SleepTimer } from './sleep.js';
import { Fx } from './fx.js';
import { createLogin, createTopbar, createSidebar, createLibrary, createPlayerBar, createToaster } from './views.js';
import { createNowPlaying } from './nowplaying.js';
import { createSettings } from './settings-view.js';

const api = window.fenura;
const app = document.getElementById('app');
const root = document.getElementById('root');
const html = document.documentElement;

html.classList.add(`platform-${api.platform}`);
document.body.classList.add(`platform-${api.platform}`);
app.classList.add(`platform-${api.platform}`);

const player = new Player(api);
const store = new Store(api, player);
const prefs = new Prefs(api);
const sleep = new SleepTimer(player);
const toaster = createToaster(prefs);
const toast = toaster.show;
let version = '';

// ---------- Обои ----------

const wallStack = document.getElementById('wall');
let wallURL = null;

function applyWallpaper() {
  const url = prefs.wallpaperURL();
  app.classList.toggle('plain', !url);
  if (url === wallURL) return;
  wallURL = url;
  const old = [...wallStack.querySelectorAll('.wall-layer')];
  if (!url) {
    old.forEach((layer) => {
      layer.classList.remove('shown');
      setTimeout(() => layer.remove(), 800);
    });
    return;
  }
  const layer = h('div', { class: 'wall-layer' });
  const img = new Image();
  img.onload = () => {
    if (wallURL !== url) return;
    layer.style.backgroundImage = `url("${url.replace(/"/g, '%22')}")`;
    wallStack.append(layer);
    requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('shown')));
    setTimeout(() => old.forEach((o) => o.remove()), 900);
  };
  img.onerror = () => {
    if (prefs.get('wallpaper') === 'custom') prefs.set({ wallpaper: 'wal1' });
  };
  img.src = url;
}

// ---------- Анимированный фон ----------

const fx = new Fx(document.getElementById('fx'));
let accentRGB = [122, 167, 255];

function applyFxColor() {
  const auto = store.isDark ? [255, 255, 255] : [40, 38, 56];
  fx.setColor(prefs.get('fxColor') === 'accent' ? accentRGB : auto, accentRGB);
}

function applyFxState() {
  const v = prefs.values;
  fx.setState({
    animate: v.animations && !(v.fxPlayingOnly && !player.isPlaying),
    slow: !document.hasFocus()
  });
}

function applyFx() {
  const v = prefs.values;
  fx.setOptions({ density: v.fxDensity, speed: v.fxSpeed, opacity: v.fxOpacity });
  applyFxColor();
  fx.setType(v.fx);
  applyFxState();
}

player.on('playing', applyFxState);
document.addEventListener('visibilitychange', () => fx.refresh());
window.addEventListener('focus', applyFxState);
window.addEventListener('blur', applyFxState);

// ---------- Цвет акцента ----------

function hexToRgb(hex) {
  const v = hex.replace('#', '');
  const n = parseInt(v.length === 3 ? v.split('').map((c) => c + c).join('') : v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function applyAccent() {
  let rgb = hexToRgb(prefs.baseAccent());
  if (prefs.get('accentMode') === 'art' && player.ambient) {
    const to255 = (v) => Math.round(Math.min(Math.max(v, 0), 1) * 255);
    // Цвет обложки смягчаем, чтобы кислотные обложки не слепили ночью.
    const mix = store.isDark ? 255 : 0;
    const k = store.isDark ? 0.3 : 0.25;
    rgb = {
      r: Math.round(to255(player.ambient.r) * (1 - k) + mix * k),
      g: Math.round(to255(player.ambient.g) * (1 - k) + mix * k),
      b: Math.round(to255(player.ambient.b) * (1 - k) + mix * k)
    };
  }
  const value = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  const changed = accentRGB[0] !== rgb.r || accentRGB[1] !== rgb.g || accentRGB[2] !== rgb.b;
  accentRGB = [rgb.r, rgb.g, rgb.b];
  if (changed) applyFxColor();
  html.style.setProperty('--accent', value);
  // Текст на акцентной кнопке: тёмный на светлом цвете и наоборот.
  const luma = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  html.style.setProperty('--on-accent', luma > 0.55 ? '#111117' : '#ffffff');
}

// ---------- Тема, ночной фильтр и остальные настройки ----------

function applyTheme() {
  html.dataset.theme = store.isDark ? 'dark' : 'light';
  applyAccent();
  applyFxColor();
}

function syncTheme() {
  const dark = prefs.resolveDark();
  if (dark !== store.isDark) {
    store.setTheme(dark);
    api.setTheme(dark).catch(() => undefined);
  }
}

function applyPrefs() {
  const v = prefs.values;
  const style = html.style;
  style.setProperty('--glass-a', String(v.glassAlpha));
  style.setProperty('--glass-blur', `${v.glassBlur}px`);
  style.setProperty('--settings-a', String(v.settingsDensity));
  style.setProperty('--radius', `${v.radius}px`);
  style.setProperty('--wall-dim', String(v.wallDim));
  style.setProperty('--wall-blur', `${v.wallBlur}px`);
  style.setProperty('--wall-sat', String(v.wallSat));
  style.setProperty('--night-a', String(v.nightStrength));

  app.classList.toggle('wall-motion', Boolean(v.wallMotion));
  app.classList.toggle('wall-filtered', v.wallBlur > 0 || v.wallSat !== 1);
  app.classList.toggle('vignette', Boolean(v.vignette));
  app.classList.toggle('no-glass-blur', !v.glassBlur);
  app.classList.toggle('no-anim', !v.animations);
  app.classList.toggle('density-compact', v.density === 'compact');
  app.classList.toggle('no-covers', !v.showCovers);
  app.classList.toggle('no-numbers', !v.showNumbers);
  app.classList.toggle('no-clock', !v.clock);
  app.classList.toggle('night', prefs.nightActive());

  api.setZoom(v.scale);
  requestAnimationFrame(() => measureCaption());
  player.fadeMs = v.fade && !api.test ? 240 : 0;
  applyWallpaper();
  syncTheme();
  applyAccent();
  applyFx();
}

store.on('theme', applyTheme);
player.on('ambient', applyAccent);
prefs.on('change', applyPrefs);

// Тема «авто» и ночной фильтр по расписанию: проверяем раз в минуту.
setInterval(() => {
  app.classList.toggle('night', prefs.nightActive());
  syncTheme();
}, 30_000);

// Кнопка темы и Ctrl+Shift+T явно выбирают тему (режим «авто» при этом выключается).
store.toggleTheme = () => prefs.set({ theme: store.isDark ? 'light' : 'dark' });

// ---------- Окна поверх: настройки и «Сейчас играет» ----------

const settings = createSettings({ prefs, api, getVersion: () => version, onClose: () => settings.close() });
const nowPlaying = createNowPlaying({ store, player, sleep, toast });
const openSettings = () => settings.open();

sleep.on('fired', () => toast('Таймер сна: спокойной ночи', 'moon'));

app.append(nowPlaying.el, settings.el, toaster.el, h('div', { class: 'nightlight', 'aria-hidden': 'true' }));

// ---------- Экраны ----------

let shell = null;
let login = null;
let topbar = null;
let playerBar = null;

function buildShell() {
  topbar = createTopbar({ store, prefs, sleep, openSettings });
  playerBar = createPlayerBar({ store, player, sleep, toast, openNowPlaying: () => nowPlaying.show() });
  return h('div', { class: 'shell' },
    topbar.el,
    createSidebar({ store }),
    createLibrary({ store, player, toast, focusSearch: () => topbar.focusSearch(), openNowPlaying: () => nowPlaying.show() }),
    playerBar.el);
}

function render() {
  const loggedIn = store.session.loggedIn;
  if (loggedIn && !shell) {
    login = null;
    shell = buildShell();
    root.replaceChildren(shell);
  } else if (!loggedIn && !login) {
    shell = null;
    topbar = null;
    playerBar = null;
    nowPlaying.hide();
    login = createLogin({ api, store, openSettings });
    root.replaceChildren(login);
  }
}

store.on('session', render);
api.onSession((snapshot) => store.setSession(snapshot));

// ---------- Системные кнопки окна ----------

// Точный размер области кнопок «свернуть / развернуть / закрыть» берём у системы (Window Controls Overlay).
const controls = navigator.windowControlsOverlay;
function measureCaption() {
  if (!controls || !controls.visible) return;
  const area = controls.getTitlebarAreaRect();
  const width = Math.max(0, window.innerWidth - (area.x + area.width));
  if (width > 0) html.style.setProperty('--caption-w', `${Math.round(width)}px`);
  if (area.height > 0) html.style.setProperty('--caption-h', `${Math.round(area.height)}px`);
}
controls?.addEventListener('geometrychange', measureCaption);
window.addEventListener('resize', measureCaption);
measureCaption();

// ---------- Адаптивность и экономия ресурсов ----------

const resize = new ResizeObserver(([entry]) => {
  app.classList.toggle('compact', entry.contentRect.width < 900);
});
resize.observe(app);

document.addEventListener('visibilitychange', () => {
  app.classList.toggle('idle', document.hidden);
});
window.addEventListener('blur', () => app.classList.add('idle'));
window.addEventListener('focus', () => app.classList.remove('idle'));

// ---------- Клавиши ----------

document.addEventListener('keydown', (event) => {
  const target = event.target;
  const typing = target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.isContentEditable);
  const mod = event.ctrlKey || event.metaKey;

  if (event.key === 'Escape') {
    if (settings.isOpen) {
      settings.close();
      return;
    }
    if (nowPlaying.open) {
      nowPlaying.hide();
      return;
    }
  }
  if (mod && event.code === 'Comma') {
    event.preventDefault();
    if (settings.isOpen) settings.close();
    else openSettings();
    return;
  }
  if (mod && event.shiftKey && event.code === 'KeyT') {
    event.preventDefault();
    store.toggleTheme();
    return;
  }
  if (!store.session.loggedIn) return;
  if (mod && !event.shiftKey && event.code === 'KeyF') {
    event.preventDefault();
    settings.close();
    nowPlaying.hide();
    topbar?.focusSearch();
    return;
  }
  if (mod && !event.shiftKey && event.code === 'KeyP') {
    event.preventDefault();
    nowPlaying.toggle();
    return;
  }
  if (mod && !event.shiftKey && event.code === 'ArrowRight') {
    event.preventDefault();
    player.next();
    return;
  }
  if (mod && !event.shiftKey && event.code === 'ArrowLeft') {
    event.preventDefault();
    player.previous();
    return;
  }
  if (mod && (event.code === 'ArrowUp' || event.code === 'ArrowDown')) {
    event.preventDefault();
    player.setVolume(player.volume + (event.code === 'ArrowUp' ? 0.05 : -0.05));
    api.setVolume(player.volume).catch(() => undefined);
    return;
  }
  if (typing) return;
  if (event.code === 'KeyM' && !mod && !event.altKey) {
    playerBar?.toggleMute();
    return;
  }
  if (event.code === 'Space' && !mod && !event.altKey) {
    if (target instanceof HTMLElement && target.tagName === 'BUTTON') target.blur();
    event.preventDefault();
    player.toggle();
  }
});

// ---------- Запуск ----------

(async function start() {
  const init = await api.init();
  version = init.version;
  prefs.load(init.prefs);
  store.isDark = prefs.resolveDark();
  player.setVolume(init.volume ?? 0.85);
  applyTheme();
  applyPrefs();
  api.setTheme(store.isDark).catch(() => undefined);
  store.session = init.session;
  render();
  if (init.session.loggedIn) store.bootstrap();

  if (api.test) {
    window.__fenura = { store, player, api, prefs, settings, nowPlaying, sleep, fx };
  }
  await document.fonts.ready;
  api.ready({
    hls: Boolean(window.Hls && window.Hls.isSupported()),
    mediaSession: 'mediaSession' in navigator,
    fonts: document.fonts.check('700 14px "Nunito Fenura"'),
    version: init.version
  }).catch(() => undefined);
})();
