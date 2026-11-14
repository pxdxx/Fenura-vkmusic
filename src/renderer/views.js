import { h, icon, clear, artwork, setArtwork, wordmark, formatDuration, formatClock } from './dom.js';
import { createScrubber } from './scrubber.js';
import { sameSection } from './store.js';

// ---------- Общие элементы ----------

function iconButton(glyph, title, onclick, extra = '') {
  return h('button', { class: `icon-btn ${extra}`.trim(), title, 'aria-label': title, onclick }, icon(glyph));
}

function themeButton(store) {
  const button = h('button', { class: 'icon-btn', onclick: () => store.toggleTheme() });
  const paint = () => {
    button.replaceChildren(icon(store.isDark ? 'sun' : 'moon'));
    button.title = store.isDark ? 'Светлая тема (Ctrl+Shift+T)' : 'Тёмная тема (Ctrl+Shift+T)';
  };
  paint();
  store.on('theme', paint);
  return button;
}

// Подпись автора, как в NektoMe-HelpPanel (themes/site-tweaks.css). Блик пробегает раз в 9 секунд.
const CREDIT = 'Made by @pxdx | TG @pxdxz';
function credit() {
  // Блик: «окошко» с яркой копией текста едет вправо, копия внутри едет навстречу — текст стоит на месте.
  // Оба движения — transform, их видеокарта делает без перерисовки.
  const glint = (kind) => h('span', { class: `credit-glint ${kind}` }, h('span', { class: 'credit-glint-text', text: CREDIT }));
  return h('div', { class: 'credit', 'aria-hidden': 'true' }, h('span', { class: 'credit-text', text: CREDIT }), glint('white'), glint('tint'));
}

setTimeout(function shine() {
  const app = document.getElementById('app');
  if (!document.hidden && app && !app.classList.contains('idle') && !app.classList.contains('no-anim')) {
    for (const node of document.querySelectorAll('.credit')) {
      node.style.setProperty('--cw', `${node.offsetWidth + 40}px`);
      node.classList.remove('shine');
      void node.offsetWidth;
      node.classList.add('shine');
    }
  }
  setTimeout(shine, 9000);
}, 2000);

function equalizer() {
  return h('span', { class: 'eq', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i'));
}

function playlistCard(playlist, onOpen) {
  return h('button', { class: 'pl-card', title: playlist.title, onclick: () => onOpen(playlist) },
    h('div', { class: 'pl-cover' }, artwork(playlist.artworkURL, 140, 16), h('span', { class: 'pl-play' }, icon('play', 'filled'))),
    h('div', { class: 'name', text: playlist.title }),
    playlist.count ? h('div', { class: 'count', text: `${playlist.count} тр.` }) : null);
}

// Всплывающее меню над кнопкой. Закрывается кликом мимо или Esc.
export function popover(anchor, items, { title } = {}) {
  document.querySelector('.popover')?.remove();
  const menu = h('div', { class: 'popover glass', role: 'menu' },
    title ? h('div', { class: 'pop-title', text: title }) : null,
    items.map((item) => item === '-'
      ? h('div', { class: 'pop-sep' })
      : h('button', {
        class: `pop-item ${item.active ? 'active' : ''} ${item.danger ? 'danger' : ''}`,
        role: 'menuitem',
        onclick: () => {
          close();
          item.onclick();
        }
      }, item.icon ? icon(item.icon) : h('span', { class: 'pop-gap' }), h('span', { text: item.label }),
      item.active ? icon('check', 'pop-check') : null)));
  document.getElementById('app').append(menu);
  const rect = anchor.getBoundingClientRect();
  const mw = menu.offsetWidth;
  const mh = menu.offsetHeight;
  const left = Math.min(Math.max(8, rect.left + rect.width / 2 - mw / 2), window.innerWidth - mw - 8);
  const above = rect.top - mh - 10;
  menu.style.left = `${left}px`;
  menu.style.top = `${above > 8 ? above : rect.bottom + 10}px`;
  const onDown = (event) => {
    if (!menu.contains(event.target) && !anchor.contains(event.target)) close();
  };
  const onKey = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    }
  };
  function close() {
    menu.remove();
    document.removeEventListener('pointerdown', onDown, true);
    document.removeEventListener('keydown', onKey, true);
  }
  setTimeout(() => {
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
  }, 0);
  return close;
}

// ---------- Уведомления ----------

export function createToaster(prefs) {
  const root = h('div', { class: 'toasts', 'aria-live': 'polite' });
  const show = (text, glyph = 'check') => {
    if (!prefs.get('showToasts')) return;
    const toast = h('div', { class: 'toast glass' }, icon(glyph), h('span', { text }));
    root.append(toast);
    while (root.children.length > 3) root.firstChild.remove();
    setTimeout(() => {
      toast.classList.add('out');
      setTimeout(() => toast.remove(), 300);
    }, 2400);
  };
  return { el: root, show };
}

// ---------- Вход ----------

export function createLogin({ api, store, openSettings }) {
  const status = h('div', { class: 'status', text: 'Вход через отдельное окно ВКонтакте' });
  const error = h('div', { class: 'error' });
  const action = h('div', {});
  const card = h('div', { class: 'glass login-card' },
    wordmark(46),
    h('div', { class: 'tagline', text: 'Ваша музыка ВКонтакте. Спокойно, красиво, без лишнего.' }),
    status, error, action);
  const root = h('div', { class: 'login' },
    h('div', { class: 'login-top' }, credit(), h('div', { class: 'capsule glass' }, themeButton(store), iconButton('settings', 'Настройки (Ctrl+,)', openSettings))),
    h('div', { class: 'middle' }, card));

  const open = () => api.login().catch((e) => {
    error.textContent = e.message;
  });

  const paint = () => {
    error.textContent = store.session.error || '';
    error.style.display = store.session.error ? '' : 'none';
    action.replaceChildren(store.session.busy
      ? h('div', { class: 'spinner-wrap', style: 'padding-top:4px' }, h('div', { class: 'spinner' }))
      : h('button', { class: 'pill accent big', text: 'Войти', onclick: open }));
  };
  store.on('session', paint);
  api.onLoginStatus((text) => {
    status.textContent = text;
  });
  paint();
  if (!api.demo) setTimeout(open, 60);
  return root;
}

// ---------- Верхняя полоса ----------

export function createTopbar({ store, prefs, sleep, openSettings }) {
  const input = h('input', {
    type: 'text',
    class: 'search-input',
    placeholder: 'Поиск треков, исполнителей, плейлистов',
    spellcheck: 'false',
    autocomplete: 'off'
  });
  let timer = null;
  input.addEventListener('focus', () => {
    if (store.section.type !== 'search') store.open({ type: 'search' });
  });
  input.addEventListener('input', () => {
    store.query = input.value;
    if (store.section.type !== 'search') store.open({ type: 'search' });
    clearTimeout(timer);
    timer = setTimeout(() => store.runSearch(), 380);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      clearTimeout(timer);
      store.runSearch();
    }
    if (event.key === 'Escape') {
      if (input.value) {
        input.value = '';
        store.query = '';
        store.runSearch();
      } else {
        input.blur();
      }
    }
    event.stopPropagation();
  });
  const clearBtn = h('button', { class: 'search-clear', title: 'Очистить', onclick: () => {
    input.value = '';
    store.query = '';
    store.runSearch();
    input.focus();
  } }, icon('x'));
  const search = h('label', { class: 'search glass' }, icon('search'), input, clearBtn, h('kbd', { text: 'Ctrl F' }));
  const paintClear = () => search.classList.toggle('has-text', Boolean(input.value));
  input.addEventListener('input', paintClear);
  store.on('search', () => {
    if (input.value !== store.query) input.value = store.query;
    paintClear();
  });

  const clock = h('div', { class: 'clock' });
  const paintClock = () => {
    const now = new Date();
    clock.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };
  paintClock();
  setInterval(paintClock, 10_000);

  const sleepChip = h('button', { class: 'chip sleep-chip', title: 'Таймер сна', onclick: () => sleep.cancel() });
  const paintSleep = () => {
    sleepChip.style.display = sleep.active ? '' : 'none';
    sleepChip.replaceChildren(icon('moon'), h('span', { text: sleep.label }), icon('x', 'chip-x'));
    sleepChip.title = 'Таймер сна. Нажмите, чтобы отменить';
  };
  sleep.on('change', paintSleep);
  sleep.on('tick', paintSleep);
  paintSleep();

  const root = h('header', { class: 'topbar' },
    h('div', { class: 'brand-space' }, credit()),
    search,
    h('div', { class: 'top-right' }, sleepChip,
      h('div', { class: 'capsule glass' }, clock, themeButton(store), iconButton('settings', 'Настройки (Ctrl+,)', openSettings))));

  return { el: root, focusSearch: () => input.focus() };
}

// ---------- Боковая панель ----------

export function createSidebar({ store }) {
  const nav = (label, glyph, section) => {
    const row = h('button', { class: 'nav-row', onclick: () => store.open(section) },
      h('span', { class: 'nav-ic' }, icon(glyph)), h('span', { class: 'label', text: label }));
    row.dataset.key = section.type;
    return row;
  };
  const rows = [
    nav('Моя музыка', 'list-music', { type: 'my' }),
    nav('Для вас', 'sparkles', { type: 'rec' }),
    nav('Популярное', 'trending-up', { type: 'pop' }),
    nav('Поиск', 'search', { type: 'search' })
  ];
  const playlistBox = h('div', { class: 'side-pl-box' });
  const profileBox = h('div', {});
  const root = h('aside', { class: 'sidebar glass' },
    h('div', { class: 'brand' }, wordmark(24)),
    h('div', { class: 'side-heading', text: 'Медиатека' }), ...rows, playlistBox, h('div', { class: 'side-spacer' }), profileBox);

  const paintSelection = () => {
    rows.forEach((row) => row.classList.toggle('selected', row.dataset.key === store.section.type));
    playlistBox.querySelectorAll('.nav-row').forEach((row) => {
      row.classList.toggle('selected', store.section.type === 'playlist' && row.dataset.key === String(store.section.playlist.id));
    });
  };

  const paintPlaylists = () => {
    clear(playlistBox);
    playlistBox.style.display = store.playlists.length ? '' : 'none';
    if (store.playlists.length) {
      const list = h('div', { class: 'side-playlists' });
      for (const playlist of store.playlists) {
        const row = h('button', { class: 'nav-row pl', title: playlist.title, onclick: () => store.open({ type: 'playlist', playlist }) },
          artwork(playlist.artworkURL, 26, 7), h('span', { class: 'label', text: playlist.title }));
        row.dataset.key = playlist.id;
        list.append(row);
      }
      playlistBox.append(h('div', { class: 'side-heading', text: 'Плейлисты' }), list);
    }
    paintSelection();
  };

  const paintProfile = () => {
    clear(profileBox);
    const profile = store.session.profile;
    if (!profile) return;
    const name = `${profile.firstName} ${profile.lastName}`.trim();
    profileBox.append(h('div', { class: 'profile' },
      artwork(profile.photoURL, 34, 17),
      h('div', { class: 'who' },
        h('div', { class: 'name', text: name, title: name }),
        h('div', { class: 'sub', text: 'ВКонтакте' })),
      iconButton('log-out', 'Выйти из аккаунта', () => store.logout(), 'small')));
  };

  store.on('section', paintSelection);
  store.on('search', paintSelection);
  store.on('playlists', paintPlaylists);
  store.on('session', paintProfile);
  paintPlaylists();
  paintProfile();
  paintSelection();
  return root;
}

// ---------- Библиотека ----------

const SECTION_META = {
  my: { kicker: 'Медиатека', glyph: 'list-music' },
  rec: { kicker: 'Подборка', glyph: 'sparkles' },
  pop: { kicker: 'Чарт', glyph: 'trending-up' },
  search: { kicker: 'Поиск', glyph: 'search' },
  playlist: { kicker: 'Плейлист', glyph: 'layers' }
};

export function createLibrary({ store, player, toast, focusSearch, openNowPlaying }) {
  const headerBox = h('div', {});
  const noticeBox = h('div', {});
  const extraBox = h('div', { class: 'contents' });
  const resultsBox = h('div', { class: 'contents' });
  const listBox = h('div', { class: 'contents' });
  const stateBox = h('div', { class: 'contents' });
  const root = h('main', { class: 'library glass' }, headerBox, noticeBox, extraBox, resultsBox, stateBox, listBox);

  let lastTitle = null;

  const shufflePlay = () => {
    if (!store.tracks.length) return;
    if (!player.shuffle) player.toggleShuffle();
    store.play(store.tracks[Math.floor(Math.random() * store.tracks.length)]);
  };

  // Во вкладках вместо плитки со значком — обложка играющего трека.
  // Клик по обложке открывает «Сейчас играет». Если ничего не играет или у трека нет обложки — плитка со значком.
  let headerCoverURL = null;
  const sectionCover = (glyph) => {
    const url = player.current && player.current.artworkURL;
    headerCoverURL = url || null;
    if (!url) return h('div', { class: 'section-tile' }, icon(glyph));
    return h('button', { class: 'now-cover', title: 'Сейчас играет', onclick: () => openNowPlaying?.() },
      artwork(url, 132, 20));
  };

  // ----- Шапка -----
  const paintHeader = () => {
    const title = store.title;
    const animate = title !== lastTitle;
    lastTitle = title;
    const section = store.section;
    const meta = SECTION_META[section.type] || SECTION_META.my;
    const actions = h('div', { class: 'lib-actions' });
    if (store.tracks.length) {
      actions.append(
        h('button', { class: 'pill accent', onclick: () => store.play(store.tracks[0]) }, icon('play', 'filled'), 'Слушать'),
        h('button', { class: 'pill soft', onclick: shufflePlay }, icon('shuffle'), 'Перемешать'));
    }
    if (section.type === 'rec') {
      actions.append(h('button', {
        class: 'pill soft',
        disabled: store.isRefreshing ? true : null,
        onclick: () => store.refreshRecommendations()
      }, store.isRefreshing ? h('div', { class: 'spinner small' }) : icon('refresh-cw'), 'Обновить'));
    }
    const cover = section.type === 'playlist'
      ? artwork(section.playlist.artworkURL, 132, 20)
      : sectionCover(meta.glyph);
    const sub = section.type === 'playlist' && section.playlist.subtitle
      ? h('div', { class: 'lib-desc', text: section.playlist.subtitle }) : null;
    const header = h('div', { class: `lib-header ${section.type === 'playlist' ? 'hero' : ''}`, style: animate ? '' : 'animation:none' },
      cover,
      h('div', { class: 'lib-titles' },
        h('div', { class: 'kicker', text: meta.kicker }),
        h('div', { class: 'lib-title', text: title, title }),
        h('div', { class: 'lib-subtitle', text: store.subtitle }),
        sub,
        actions));
    headerBox.replaceChildren(header);
  };

  // ----- Сообщение об ошибке -----
  const paintNotice = () => {
    const text = store.notice || player.lastError;
    noticeBox.replaceChildren(text ? h('div', { class: 'notice' }, icon('info'), h('span', { text })) : '');
    noticeBox.style.display = text ? '' : 'none';
  };

  const openPlaylist = (playlist) => store.open({ type: 'playlist', playlist });

  const paintExtra = () => {
    clear(extraBox);
    const section = store.section;
    if (section.type === 'search' && !store.query.trim()) {
      extraBox.append(h('div', { class: 'search-hint' },
        h('div', { class: 'hint-ic' }, icon('search')),
        h('div', { class: 'big', text: 'Что послушаем?' }),
        h('div', { class: 'small', text: 'Начните вводить название трека, исполнителя или плейлиста в поле сверху.' }),
        h('button', { class: 'pill soft', onclick: () => focusSearch() }, icon('search'), 'К поиску')));
    } else if (section.type === 'my' && store.playlists.length) {
      extraBox.append(h('section', { class: 'block' },
        h('div', { class: 'section-label', text: 'Ваши плейлисты' }),
        h('div', { class: 'strip' }, store.playlists.map((playlist) => playlistCard(playlist, openPlaylist)))));
    }
  };

  const paintResults = () => {
    clear(resultsBox);
    if (store.section.type !== 'search') return;
    if (store.search.playlists.length) {
      resultsBox.append(h('section', { class: 'block' },
        h('div', { class: 'section-label', text: 'Плейлисты' }),
        h('div', { class: 'strip' }, store.search.playlists.map((playlist) => playlistCard(playlist, openPlaylist)))));
    }
    if (store.search.tracks.length) {
      resultsBox.append(h('div', { class: 'section-label', text: 'Треки' }));
    }
  };

  // ----- Список треков -----
  const trackAt = (node) => {
    const row = node.closest('.row');
    return row ? { row, track: store.tracks[Number(row.dataset.i)] } : null;
  };

  const like = async (track) => {
    const was = store.addedIds.has(track.id);
    await store.toggleLike(track);
    const now = store.addedIds.has(track.id);
    if (now !== was) toast(now ? 'Добавлено в мою музыку' : 'Убрано из моей музыки', 'heart');
  };

  listBox.addEventListener('click', (event) => {
    const hit = trackAt(event.target);
    if (!hit || !hit.track) return;
    if (event.target.closest('.like')) {
      like(hit.track);
      return;
    }
    if (player.current && player.current.id === hit.track.id) {
      player.toggle();
    } else {
      store.play(hit.track);
    }
  });
  listBox.addEventListener('contextmenu', async (event) => {
    const hit = trackAt(event.target);
    if (!hit || !hit.track) return;
    event.preventDefault();
    const choice = await window.fenura.trackMenu(store.addedIds.has(hit.track.id)).catch(() => null);
    if (choice === 'play') store.play(hit.track);
    if (choice === 'toggle') like(hit.track);
  });

  // Большие списки рисуем порциями: первые строки сразу, остальные в фоне, не блокируя интерфейс.
  // Если список тот же самый, что уже на экране, не перерисовываем его.
  const FIRST_CHUNK = 80;
  const CHUNK = 250;
  let paintedList = null;
  let paintedLength = -1;
  let paintSeq = 0;

  const buildRow = (track, index) => {
      const row = h('div', { class: 'row', dataset: { i: index, id: track.id }, role: 'button', tabindex: '-1' },
        h('div', { class: 'idx' },
          h('span', { class: 'num', text: String(index + 1) }),
          equalizer(),
          h('span', { class: 'glyph' }, icon('play', 'filled g-play'), icon('pause', 'filled g-pause'))),
        artwork(track.artworkURL, 42, 10),
        h('div', { class: 'meta' },
          h('div', { class: 't', text: track.title, title: track.title }),
          h('div', { class: 'a', text: track.artist, title: track.artist })),
        h('button', { class: 'like', title: 'В моей музыке', tabindex: '-1' }, icon('heart')),
        h('div', { class: 'dur', text: formatDuration(track.duration) }));
      row.classList.toggle('added', Boolean(track.isAdded));
      return row;
  };

  const paintList = () => {
    const list = store.tracks;
    if (list === paintedList && list.length === paintedLength && listBox.firstChild) {
      markCurrent();
      return;
    }
    const seq = ++paintSeq;
    paintedList = list;
    paintedLength = list.length;
    clear(listBox);
    if (!list.length) return;
    const card = h('div', { class: 'tracks' });
    const appendRange = (from, to) => {
      const fragment = document.createDocumentFragment();
      for (let i = from; i < to; i++) fragment.append(buildRow(list[i], i));
      card.append(fragment);
    };
    appendRange(0, Math.min(FIRST_CHUNK, list.length));
    listBox.append(card);
    markCurrent();
    let next = FIRST_CHUNK;
    const more = () => {
      if (seq !== paintSeq || next >= list.length) return;
      const end = Math.min(next + CHUNK, list.length);
      appendRange(next, end);
      next = end;
      markCurrent();
      if (next < list.length) setTimeout(more, 16);
    };
    if (next < list.length) setTimeout(more, 30);
  };

  let currentRow = null;
  const markCurrent = () => {
    const id = player.current ? player.current.id : null;
    if (currentRow) currentRow.classList.remove('current', 'playing');
    currentRow = id ? listBox.querySelector(`.row[data-id="${CSS.escape(String(id))}"]`) : null;
    if (currentRow) {
      currentRow.classList.add('current');
      currentRow.classList.toggle('playing', player.isPlaying);
    }
    tickEq();
  };

  // Эквалайзер у играющего трека: 8 обновлений в секунду, только когда его видно.
  const appRoot = document.getElementById('app');
  let eqTimer = null;
  const eqStep = () => {
    const bars = currentRow ? currentRow.querySelectorAll('.eq i') : [];
    for (const bar of bars) bar.style.transform = `scaleY(${(0.2 + Math.random() * 0.8).toFixed(2)})`;
  };
  const tickEq = () => {
    const run = Boolean(currentRow) && player.isPlaying && !document.hidden
      && !appRoot.classList.contains('idle') && !appRoot.classList.contains('no-anim');
    if (run && !eqTimer) {
      eqStep();
      eqTimer = setInterval(eqStep, 125);
    } else if (!run && eqTimer) {
      clearInterval(eqTimer);
      eqTimer = null;
    }
  };
  new MutationObserver(tickEq).observe(appRoot, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', tickEq);

  const paintState = () => {
    clear(stateBox);
    if (store.isLoading && !store.tracks.length) {
      stateBox.append(h('div', { class: 'skeleton' }, Array.from({ length: 7 }, (_, i) =>
        h('div', { class: 'sk-row', style: `animation-delay:${i * 80}ms` }, h('i', { class: 'sk-art' }), h('i', { class: 'sk-lines' })))));
    } else if (!store.tracks.length && store.section.type !== 'search') {
      stateBox.append(h('div', { class: 'empty' },
        h('div', { class: 'hint-ic' }, icon('headphones')),
        h('div', { class: 'big', text: 'Пока тихо' }),
        h('div', { class: 'small', text: 'Выберите раздел или обновите библиотеку.' })));
    } else if (!store.tracks.length && store.section.type === 'search' && store.query.trim().length >= 2 && !store.search.playlists.length) {
      stateBox.append(h('div', { class: 'empty' },
        h('div', { class: 'hint-ic' }, icon('search')),
        h('div', { class: 'big', text: 'Ничего не нашлось' }),
        h('div', { class: 'small', text: 'Попробуйте написать иначе.' })));
    }
  };

  const paintAll = () => {
    paintHeader();
    paintNotice();
    paintExtra();
    paintResults();
    paintState();
    paintList();
  };

  let renderedSection = null;
  store.on('section', () => {
    const changed = !renderedSection || !sameSection(renderedSection, store.section);
    renderedSection = store.section;
    paintHeader();
    paintNotice();
    if (changed) {
      root.scrollTop = 0;
      paintExtra();
      paintResults();
    }
    paintState();
    paintList();
  });
  store.on('tracks', () => {
    paintHeader();
    paintNotice();
    paintState();
    paintList();
  });
  store.on('search', () => {
    renderedSection = store.section;
    paintHeader();
    paintNotice();
    paintExtra();
    paintResults();
    paintState();
    paintList();
  });
  store.on('notice', paintNotice);
  store.on('playlists', () => {
    if (store.section.type === 'my') paintExtra();
  });
  store.on('added', (id) => {
    const row = listBox.querySelector(`.row[data-id="${CSS.escape(String(id))}"]`);
    if (row) row.classList.toggle('added', store.addedIds.has(id));
  });
  player.on('track', markCurrent);
  player.on('playing', () => {
    if (currentRow) currentRow.classList.toggle('playing', player.isPlaying);
    tickEq();
  });
  player.on('error', paintNotice);
  player.on('track', paintNotice);
  player.on('track', () => {
    if (store.section.type === 'playlist') return;
    const url = (player.current && player.current.artworkURL) || null;
    if (url !== headerCoverURL) paintHeader();
  });

  renderedSection = store.section;
  paintAll();
  return root;
}

// ---------- Плеер ----------

const SLEEP_OPTIONS = [
  { label: '15 минут', value: 15 },
  { label: '30 минут', value: 30 },
  { label: '45 минут', value: 45 },
  { label: '1 час', value: 60 },
  { label: '1,5 часа', value: 90 },
  { label: 'После этого трека', value: 'track' }
];

export function sleepMenu(anchor, sleep, toast) {
  const items = SLEEP_OPTIONS.map((option) => ({
    label: option.label,
    icon: option.value === 'track' ? 'audio-lines' : 'timer',
    onclick: () => {
      sleep.set(option.value);
      toast(option.value === 'track' ? 'Остановлю после этого трека' : `Таймер сна: ${option.label}`, 'moon');
    }
  }));
  if (sleep.active) {
    items.push('-', { label: 'Выключить таймер', icon: 'timer-off', danger: true, onclick: () => {
      sleep.cancel();
      toast('Таймер сна выключен', 'timer-off');
    } });
  }
  popover(anchor, items, { title: sleep.active ? `Таймер сна · ${sleep.label}` : 'Таймер сна' });
}

export function createPlayerBar({ store, player, sleep, toast, openNowPlaying }) {
  const art = artwork(null, 56, 14);
  const artBtn = h('button', { class: 'art-btn', title: 'Сейчас играет', onclick: () => player.current && openNowPlaying() }, art,
    h('span', { class: 'art-hover' }, icon('maximize-2')));
  const title = h('div', { class: 'title', text: 'Ничего не играет' });
  const artist = h('div', { class: 'artist', text: 'Выберите трек' });
  const like = h('button', { class: 'like', title: 'В моей музыке', style: 'display:none', onclick: async () => {
    if (!player.current) return;
    const was = store.addedIds.has(player.current.id);
    await store.toggleLike(player.current);
    if (store.addedIds.has(player.current.id) !== was) toast(was ? 'Убрано из моей музыки' : 'Добавлено в мою музыку', 'heart');
  } }, icon('heart'));

  const shuffle = h('button', { class: 'ctl', title: 'Перемешать', onclick: () => player.toggleShuffle() }, icon('shuffle'));
  const prev = h('button', { class: 'ctl', title: 'Предыдущий (Ctrl+←)', onclick: () => player.previous() }, icon('skip-back', 'filled'));
  const playBtn = h('button', { class: 'play-btn', title: 'Играть / пауза (Пробел)', onclick: () => player.toggle() });
  const next = h('button', { class: 'ctl', title: 'Следующий (Ctrl+→)', onclick: () => player.next() }, icon('skip-forward', 'filled'));
  const repeat = h('button', { class: 'ctl', title: 'Повтор', onclick: () => player.cycleRepeat() });

  const cur = h('div', { class: 'time cur', text: '0:00' });
  const dur = h('div', { class: 'time', text: '0:00' });
  const seek = createScrubber({
    label: 'Позиция',
    onInput: (value) => {
      cur.textContent = formatClock(value);
    },
    onCommit: (value) => player.seek(value)
  });
  const volume = createScrubber({
    label: 'Громкость',
    live: true,
    onCommit: (value) => {
      player.setVolume(value);
      window.fenura.setVolume(value).catch(() => undefined);
    }
  });
  volume.el.classList.add('vol');
  volume.enable(true);
  volume.set(player.volume, [0, 1]);

  let beforeMute = 0.6;
  const muteBtn = h('button', { class: 'ctl', title: 'Без звука (M)', onclick: () => toggleMute() });
  const toggleMute = () => {
    if (player.volume > 0) {
      beforeMute = player.volume;
      player.setVolume(0);
    } else {
      player.setVolume(beforeMute || 0.6);
    }
    window.fenura.setVolume(player.volume).catch(() => undefined);
  };

  const sleepBtn = h('button', { class: 'ctl sleep-btn', title: 'Таймер сна', onclick: () => sleepMenu(sleepBtn, sleep, toast) }, icon('moon'));
  const expandBtn = h('button', { class: 'ctl', title: 'Сейчас играет', onclick: () => player.current && openNowPlaying() }, icon('maximize-2'));

  const root = h('footer', { class: 'player glass paused' },
    h('div', { class: 'now' }, artBtn, h('div', { class: 'text' }, title, artist), like),
    h('div', { class: 'transport' },
      h('div', { class: 'controls' }, shuffle, prev, playBtn, next, repeat),
      h('div', { class: 'timeline' }, cur, seek.el, dur)),
    h('div', { class: 'extras' }, sleepBtn, expandBtn, muteBtn, volume.el));

  const paintTrack = () => {
    const track = player.current;
    title.textContent = track ? track.title : 'Ничего не играет';
    title.title = track ? track.title : '';
    artist.textContent = track ? track.artist : 'Выберите трек';
    setArtwork(art, track ? track.artworkURL : null);
    like.style.display = track ? '' : 'none';
    root.classList.toggle('empty-track', !track);
    paintLike();
    seek.enable(Boolean(track));
    paintTime();
  };

  const paintLike = () => {
    const on = Boolean(player.current && store.addedIds.has(player.current.id));
    like.classList.toggle('on', on);
  };

  const paintTime = () => {
    seek.set(player.currentTime, [0, Math.max(player.duration, 1)]);
    if (!seek.dragging) cur.textContent = formatClock(player.currentTime);
    dur.textContent = formatClock(player.duration);
  };

  const paintPlay = () => {
    root.classList.toggle('playing', player.isPlaying);
    root.classList.toggle('paused', !player.isPlaying);
    playBtn.replaceChildren(player.isBuffering && player.isPlaying
      ? h('div', { class: 'spinner small on-accent' })
      : icon(player.isPlaying ? 'pause' : 'play', `filled ic-${player.isPlaying ? 'pause' : 'play'}`));
    playBtn.title = player.isPlaying ? 'Пауза (Пробел)' : 'Играть (Пробел)';
  };

  const paintModes = () => {
    shuffle.classList.toggle('on', player.shuffle);
    repeat.classList.toggle('on', player.repeatMode !== 'off');
    repeat.replaceChildren(icon(player.repeatMode === 'one' ? 'repeat-1' : 'repeat'));
    repeat.title = player.repeatMode === 'off' ? 'Повтор выключен' : player.repeatMode === 'all' ? 'Повторять всё' : 'Повторять трек';
  };

  const paintVolume = () => {
    volume.set(player.volume, [0, 1]);
    muteBtn.replaceChildren(icon(player.volume === 0 ? 'volume-x' : player.volume < 0.5 ? 'volume-1' : 'volume-2'));
  };

  const paintSleep = () => {
    sleepBtn.classList.toggle('on', sleep.active);
    sleepBtn.title = sleep.active ? `Таймер сна: ${sleep.label}` : 'Таймер сна';
  };

  player.on('track', paintTrack);
  player.on('time', paintTime);
  player.on('playing', paintPlay);
  player.on('buffering', paintPlay);
  player.on('modes', paintModes);
  player.on('volume', paintVolume);
  store.on('added', paintLike);
  store.on('section', paintLike);
  sleep.on('change', paintSleep);
  sleep.on('tick', paintSleep);
  paintTrack();
  paintPlay();
  paintModes();
  paintVolume();
  paintSleep();
  return { el: root, toggleMute };
}
