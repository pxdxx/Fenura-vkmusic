import { h, icon, clear } from './dom.js';
import { WALLPAPERS, ACCENTS } from './prefs.js';
import { Fx, EFFECTS } from './fx.js';

// Окно настроек: всё применяется сразу, без кнопки «Сохранить».

const PRESETS = [
  { name: 'Ночь', glyph: 'moon', patch: { theme: 'dark', wallDim: 0.6, wallBlur: 6, wallSat: 0.8, glassAlpha: 0.6, glassBlur: 30, nightLight: 'on', nightStrength: 0.35, vignette: true } },
  { name: 'Стекло', glyph: 'sparkle', patch: { wallDim: 0.2, wallBlur: 0, wallSat: 1.1, glassAlpha: 0.28, glassBlur: 34, vignette: true } },
  { name: 'Фокус', glyph: 'blend', patch: { wallDim: 0.5, wallBlur: 24, wallSat: 0.9, glassAlpha: 0.4, glassBlur: 20 } },
  { name: 'Плотный', glyph: 'layers', patch: { wallDim: 0.4, wallBlur: 0, glassAlpha: 0.88, glassBlur: 12 } }
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const pct = (v) => `${Math.round(v * 100)}%`;

export function createSettings({ prefs, api, getVersion, onClose }) {
  const tabs = [
    { id: 'wall', label: 'Обои', glyph: 'image', paint: paintWall },
    { id: 'fx', label: 'Фон', glyph: 'sparkles', paint: paintFx },
    { id: 'look', label: 'Внешний вид', glyph: 'sliders-horizontal', paint: paintLook },
    { id: 'color', label: 'Цвет', glyph: 'palette', paint: paintColor },
    { id: 'night', label: 'Ночной режим', glyph: 'moon', paint: paintNight },
    { id: 'player', label: 'Плеер', glyph: 'headphones', paint: paintPlayer },
    { id: 'about', label: 'О программе', glyph: 'info', paint: paintAbout }
  ];
  let active = 'wall';
  const body = h('div', { class: 'set-body' });
  const nav = h('nav', { class: 'set-nav' });
  const panel = h('div', { class: 'settings-panel glass', role: 'dialog', 'aria-label': 'Настройки' },
    h('div', { class: 'set-side' },
      h('div', { class: 'set-title', text: 'Настройки' }),
      nav),
    h('div', { class: 'set-main' },
      h('button', { class: 'icon-btn set-close', title: 'Закрыть (Esc)', onclick: () => onClose() }, icon('x')),
      body));
  const root = h('div', { class: 'settings-overlay' }, panel);
  root.addEventListener('pointerdown', (event) => {
    if (event.target === root) onClose();
  });

  // ---------- Контролы ----------

  function row(label, hint, control) {
    return h('div', { class: 'set-row' },
      h('div', { class: 'set-label' }, h('div', { text: label }), hint ? h('div', { class: 'hint', text: hint }) : null),
      control);
  }

  function slider(label, key, min, max, step, format, hint) {
    const value = h('span', { class: 'set-value' });
    const input = h('input', { type: 'range', min, max, step, class: 'range' });
    const paint = () => {
      input.value = prefs.get(key);
      value.textContent = format(Number(input.value));
      input.style.setProperty('--p', String((Number(input.value) - min) / (max - min)));
    };
    input.addEventListener('input', () => {
      prefs.set({ [key]: Number(input.value) });
      paint();
    });
    paint();
    return h('div', { class: 'set-row slider' },
      h('div', { class: 'set-label' }, h('div', { text: label }), hint ? h('div', { class: 'hint', text: hint }) : null, value),
      input);
  }

  function toggle(label, key, hint) {
    const sw = h('button', { class: 'switch', role: 'switch' }, h('i'));
    const paint = () => {
      sw.classList.toggle('on', Boolean(prefs.get(key)));
      sw.setAttribute('aria-checked', String(Boolean(prefs.get(key))));
    };
    sw.addEventListener('click', () => {
      prefs.set({ [key]: !prefs.get(key) });
      paint();
    });
    paint();
    const r = row(label, hint, sw);
    r.classList.add('clickable');
    r.addEventListener('click', (event) => {
      if (event.target !== sw && !sw.contains(event.target)) sw.click();
    });
    return r;
  }

  function segmented(key, options, onChange) {
    const wrap = h('div', { class: 'segmented' });
    const paint = () => wrap.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(prefs.get(key))));
    for (const option of options) {
      const b = h('button', { onclick: () => {
        prefs.set({ [key]: option.value });
        paint();
        onChange?.();
      } }, option.glyph ? icon(option.glyph) : null, option.label);
      b.dataset.v = String(option.value);
      wrap.append(b);
    }
    paint();
    return wrap;
  }

  function hourSelect(key) {
    const select = h('select', { class: 'select' }, HOURS.map((hr) => h('option', { value: hr, text: `${String(hr).padStart(2, '0')}:00` })));
    select.value = String(prefs.get(key));
    select.addEventListener('change', () => prefs.set({ [key]: Number(select.value) }));
    return select;
  }

  function schedule(fromKey, toKey, label) {
    return row(label, null, h('div', { class: 'schedule' }, h('span', { text: 'с' }), hourSelect(fromKey), h('span', { text: 'до' }), hourSelect(toKey)));
  }

  function group(title, ...children) {
    return h('section', { class: 'set-group' }, title ? h('div', { class: 'set-group-title', text: title }) : null, ...children);
  }

  // ---------- Вкладки ----------

  function paintWall() {
    const grid = h('div', { class: 'wall-grid' });
    const paintSel = () => grid.querySelectorAll('.wall-tile').forEach((t) => t.classList.toggle('on', t.dataset.id === prefs.get('wallpaper')));
    const tile = (id, name, inner) => {
      const t = h('button', { class: 'wall-tile', title: name, onclick: () => {
        prefs.set({ wallpaper: id });
        paintSel();
      } }, inner, h('span', { class: 'wall-name', text: name }), h('span', { class: 'wall-check' }, icon('check')));
      t.dataset.id = id;
      return t;
    };
    grid.append(tile('plain', 'Пустой', h('div', { class: 'wall-plain' })));
    for (const wall of WALLPAPERS) {
      grid.append(tile(wall.id, wall.name, h('img', { src: `wallpapers/${wall.id}-thumb.jpg`, alt: '', loading: 'lazy', draggable: 'false' })));
    }
    const custom = prefs.get('customWallpaper');
    const customTile = custom
      ? tile('custom', 'Свои', h('img', { src: custom, alt: '', draggable: 'false' }))
      : null;
    if (customTile) grid.append(customTile);
    const add = h('button', { class: 'wall-tile add', title: 'Выбрать картинку с компьютера', onclick: async () => {
      const url = await api.pickWallpaper().catch(() => null);
      if (!url) return;
      prefs.set({ customWallpaper: url, wallpaper: 'custom' });
      paint();
    } }, h('div', { class: 'add-inner' }, icon('image-plus'), h('span', { text: custom ? 'Заменить свои' : 'Свои обои' })));
    grid.append(add);
    paintSel();

    body.append(
      h('h2', { text: 'Обои' }),
      h('p', { class: 'lead', text: 'Фон окна. Панели поверх него полупрозрачные, их прозрачность настраивается во вкладке «Внешний вид».' }),
      grid,
      group('Обработка',
        slider('Затемнение', 'wallDim', 0, 0.9, 0.01, pct, 'Чем темнее, тем спокойнее для глаз ночью'),
        slider('Размытие', 'wallBlur', 0, 40, 1, (v) => `${v} px`),
        slider('Насыщенность', 'wallSat', 0, 1.5, 0.01, pct, '0% — чёрно-белые обои'),
        toggle('Медленное движение', 'wallMotion', 'Обои едва заметно плывут'),
        toggle('Виньетка', 'vignette', 'Мягкое затемнение по краям')));
  }

  function paintFx() {
    const grid = h('div', { class: 'wall-grid' });
    const paintSel = () => grid.querySelectorAll('.wall-tile').forEach((t) => t.classList.toggle('on', t.dataset.id === prefs.get('fx')));
    for (const effect of EFFECTS) {
      const canvas = h('canvas');
      const t = h('button', { class: 'wall-tile fx-tile', title: effect.name, onclick: () => {
        prefs.set({ fx: effect.id });
        paintSel();
      } }, canvas, h('span', { class: 'wall-name', text: effect.name }), h('span', { class: 'wall-check' }, icon('check')));
      t.dataset.id = effect.id;
      grid.append(t);
      // Превью рисуем после вставки в документ, когда известен размер плитки.
      requestAnimationFrame(() => {
        const preview = new Fx(canvas, { preview: true });
        preview.renderPreview(effect.id, canvas.clientWidth || 160, canvas.clientHeight || 100);
      });
    }
    paintSel();

    body.append(
      h('h2', { text: 'Фон' }),
      h('p', { class: 'lead', text: 'Живой слой поверх обоев или пустого фона: звёзды, созвездия, снег и другое. Панели остаются поверх него.' }),
      grid,
      group('Настройка',
        slider('Плотность', 'fxDensity', 0.15, 1.5, 0.05, pct),
        slider('Скорость', 'fxSpeed', 0.2, 2.5, 0.05, (v) => `×${v.toFixed(2).replace(/0$/, '')}`),
        slider('Яркость', 'fxOpacity', 0.1, 1, 0.01, pct),
        row('Цвет', null, segmented('fxColor', [
          { value: 'auto', label: 'Белый' },
          { value: 'accent', label: 'Акцентный', glyph: 'palette' }
        ])),
        toggle('Двигаться только под музыку', 'fxPlayingOnly', 'На паузе фон замирает'),
        h('div', { class: 'hint-line', text: 'Если в «Внешнем виде» выключены анимации, фон показывается неподвижным.' })));
  }

  function paintLook() {
    const presets = h('div', { class: 'presets' }, PRESETS.map((preset) => h('button', { class: 'preset', onclick: () => {
      prefs.set(preset.patch);
      paint();
    } }, icon(preset.glyph), h('span', { text: preset.name }))));

    const autoRow = schedule('autoDarkFrom', 'autoDarkTo', 'Тёмная тема по расписанию');
    const paintAuto = () => {
      autoRow.style.display = prefs.get('theme') === 'auto' ? '' : 'none';
    };
    paintAuto();

    body.append(
      h('h2', { text: 'Внешний вид' }),
      group('Быстрые пресеты', presets),
      group('Тема',
        segmented('theme', [
          { value: 'dark', label: 'Тёмная', glyph: 'moon' },
          { value: 'light', label: 'Светлая', glyph: 'sun' },
          { value: 'auto', label: 'Авто', glyph: 'sun-moon' }
        ], paintAuto),
        autoRow),
      group('Панели',
        slider('Непрозрачность панелей', 'glassAlpha', 0, 1, 0.01, pct, '0% — сквозь панели полностью видны обои'),
        slider('Матовое стекло', 'glassBlur', 0, 40, 1, (v) => (v ? `${v} px` : 'выкл'), 'Размытие обоев под панелями'),
        slider('Плотность окна настроек', 'settingsDensity', 0.3, 1, 0.01, pct, 'Настройки не станут прозрачнее этого, даже если панели почти прозрачные'),
        slider('Скругление углов', 'radius', 4, 28, 1, (v) => `${v} px`)),
      group('Размер и плотность',
        slider('Масштаб интерфейса', 'scale', 0.85, 1.25, 0.05, pct),
        row('Плотность списка', null, segmented('density', [
          { value: 'comfortable', label: 'Просторно' },
          { value: 'compact', label: 'Компактно' }
        ]))),
      group('Элементы',
        toggle('Обложки в списке треков', 'showCovers'),
        toggle('Номера треков', 'showNumbers'),
        toggle('Часы в шапке', 'clock'),
        toggle('Анимации', 'animations', 'Плавные переходы, эквалайзер, движение фона'),
        toggle('Всплывающие уведомления', 'showToasts')));
  }

  function paintColor() {
    const swatches = h('div', { class: 'swatches' });
    const paintSw = () => {
      swatches.querySelectorAll('.swatch').forEach((s) => s.classList.toggle('on', prefs.get('accentMode') === 'custom' && s.dataset.v === prefs.get('accent')));
    };
    for (const accent of ACCENTS) {
      const s = h('button', { class: 'swatch', title: accent.name, style: `--c:${accent.value}`, onclick: () => {
        prefs.set({ accent: accent.value, accentMode: 'custom' });
        paintSw();
        paintMode();
      } }, icon('check'));
      s.dataset.v = accent.value;
      swatches.append(s);
    }
    const picker = h('input', { type: 'color', class: 'color-input', title: 'Любой цвет', value: prefs.get('accent') });
    picker.addEventListener('input', () => {
      prefs.set({ accent: picker.value, accentMode: 'custom' });
      paintSw();
      paintMode();
    });
    swatches.append(h('label', { class: 'swatch custom', title: 'Любой цвет' }, icon('palette'), picker));
    paintSw();

    const mode = segmented('accentMode', [
      { value: 'wall', label: 'От обоев', glyph: 'image' },
      { value: 'art', label: 'Из обложки', glyph: 'disc-3' },
      { value: 'custom', label: 'Свой', glyph: 'palette' }
    ], () => paintSw());
    const paintMode = () => mode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === prefs.get('accentMode')));

    body.append(
      h('h2', { text: 'Цвет' }),
      h('p', { class: 'lead', text: 'Акцент — цвет кнопок, ползунков и играющего трека. Мягкие оттенки меньше режут глаз в темноте.' }),
      group('Откуда брать акцент', mode),
      group('Палитра', swatches),
      group('Пример',
        h('div', { class: 'accent-preview' },
          h('button', { class: 'pill accent' }, icon('play', 'filled'), 'Слушать'),
          h('button', { class: 'pill soft' }, icon('shuffle'), 'Перемешать'),
          h('div', { class: 'scrub demo', style: '--p:0.62' }, h('div', { class: 'rail' }, h('div', { class: 'fill' })), h('div', { class: 'knob' })))));
  }

  function paintNight() {
    const scheduleRow = schedule('nightFrom', 'nightTo', 'Включать');
    const paintSchedule = () => {
      scheduleRow.style.display = prefs.get('nightLight') === 'auto' ? '' : 'none';
    };
    paintSchedule();
    body.append(
      h('h2', { text: 'Ночной режим' }),
      h('p', { class: 'lead', text: 'Тёплый фильтр убирает холодный синий свет со всего окна — как «ночной свет» в Windows, только для плеера.' }),
      group('Тёплый фильтр',
        segmented('nightLight', [
          { value: 'off', label: 'Выкл' },
          { value: 'on', label: 'Всегда' },
          { value: 'auto', label: 'По расписанию', glyph: 'clock' }
        ], paintSchedule),
        scheduleRow,
        slider('Теплота', 'nightStrength', 0.05, 0.6, 0.01, pct)),
      group('Одним нажатием',
        h('button', { class: 'pill accent', onclick: () => {
          prefs.set(PRESETS[0].patch);
          paint();
        } }, icon('moon'), 'Сделать уютно на ночь')));
  }

  function paintPlayer() {
    const keys = [
      ['Играть / пауза', 'Пробел'],
      ['Следующий трек', 'Ctrl + →'],
      ['Предыдущий трек', 'Ctrl + ←'],
      ['Громкость', 'Ctrl + ↑ / ↓'],
      ['Без звука', 'M'],
      ['Поиск', 'Ctrl + F'],
      ['Сейчас играет', 'Ctrl + P'],
      ['Сменить тему', 'Ctrl + Shift + T'],
      ['Настройки', 'Ctrl + ,'],
      ['Закрыть окно поверх', 'Esc']
    ];
    body.append(
      h('h2', { text: 'Плеер' }),
      group('Звук',
        toggle('Плавная пауза', 'fade', 'Звук мягко затихает и нарастает, а не обрывается')),
      group('Горячие клавиши',
        h('div', { class: 'keys' }, keys.map(([what, combo]) => h('div', { class: 'key-row' },
          h('span', { text: what }),
          h('span', { class: 'combo' }, combo.split(' ').map((part) => (part === '+' || part === '/' ? h('span', { class: 'plus', text: part }) : h('kbd', { text: part }))))))))
    );
  }

  function paintAbout() {
    body.append(
      h('h2', { text: 'О программе' }),
      h('div', { class: 'about' },
        h('div', { class: 'about-name', text: 'Fenura' }),
        h('div', { class: 'about-ver', text: `Версия ${getVersion() || ''}`.trim() }),
        h('p', { class: 'lead', text: 'Музыкальный плеер для ВКонтакте на Windows. Неофициальный клиент: не связан с ВКонтакте. Пароль приложение не видит и не хранит.' })),
      group('Сброс',
        row('Вернуть все настройки внешнего вида', 'Свои обои останутся в списке', h('button', { class: 'pill soft danger', onclick: () => {
          prefs.reset();
          paint();
        } }, icon('refresh-cw'), 'Сбросить'))));
  }

  // ---------- Отрисовка ----------

  function paintNav() {
    clear(nav);
    for (const tab of tabs) {
      nav.append(h('button', { class: `set-tab ${tab.id === active ? 'on' : ''}`, onclick: () => {
        active = tab.id;
        paint();
      } }, icon(tab.glyph), h('span', { text: tab.label })));
    }
  }

  // Вкладки дописывают элементы прямо в body. При перерисовке той же вкладки сохраняем прокрутку.
  let paintedTab = null;
  function paint() {
    paintNav();
    const scroll = paintedTab === active ? body.scrollTop : 0;
    paintedTab = active;
    clear(body);
    tabs.find((t) => t.id === active).paint();
    body.scrollTop = scroll;
  }

  return {
    el: root,
    open() {
      paint();
      root.classList.add('open');
    },
    close() {
      root.classList.remove('open');
    },
    get isOpen() {
      return root.classList.contains('open');
    }
  };
}
