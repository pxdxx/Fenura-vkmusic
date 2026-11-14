import { h, icon, artwork, setArtwork, formatClock } from './dom.js';
import { createScrubber } from './scrubber.js';
import { sleepMenu } from './views.js';

// Полноэкранный «Сейчас играет»: большая обложка, размытая подсветка из неё же и крупное управление.
export function createNowPlaying({ store, player, sleep, toast }) {
  const glow = h('div', { class: 'np-glow' });
  const art = artwork(null, 320, 28);
  const title = h('div', { class: 'np-title' });
  const artist = h('div', { class: 'np-artist' });
  const cur = h('div', { class: 'time cur', text: '0:00' });
  const dur = h('div', { class: 'time', text: '0:00' });
  const seek = createScrubber({
    label: 'Позиция',
    onInput: (value) => {
      cur.textContent = formatClock(value);
    },
    onCommit: (value) => player.seek(value)
  });
  seek.el.classList.add('big');

  const like = h('button', { class: 'ctl np-like', title: 'В моей музыке', onclick: async () => {
    if (!player.current) return;
    const was = store.addedIds.has(player.current.id);
    await store.toggleLike(player.current);
    if (store.addedIds.has(player.current.id) !== was) toast(was ? 'Убрано из моей музыки' : 'Добавлено в мою музыку', 'heart');
  } }, icon('heart'));
  const shuffle = h('button', { class: 'ctl', title: 'Перемешать', onclick: () => player.toggleShuffle() }, icon('shuffle'));
  const prev = h('button', { class: 'ctl big', title: 'Предыдущий', onclick: () => player.previous() }, icon('skip-back', 'filled'));
  const playBtn = h('button', { class: 'play-btn huge', onclick: () => player.toggle() });
  const next = h('button', { class: 'ctl big', title: 'Следующий', onclick: () => player.next() }, icon('skip-forward', 'filled'));
  const repeat = h('button', { class: 'ctl', title: 'Повтор', onclick: () => player.cycleRepeat() });
  const sleepBtn = h('button', { class: 'ctl', title: 'Таймер сна', onclick: () => sleepMenu(sleepBtn, sleep, toast) }, icon('moon'));
  const close = h('button', { class: 'icon-btn np-close', title: 'Свернуть (Esc)', onclick: () => hide() }, icon('chevron-down'));

  const root = h('div', { class: 'nowplaying', 'aria-hidden': 'true' },
    glow,
    close,
    h('div', { class: 'np-body' },
      h('div', { class: 'np-art' }, art),
      h('div', { class: 'np-info' },
        h('div', { class: 'np-texts' }, title, artist),
        like),
      h('div', { class: 'timeline np-timeline' }, cur, seek.el, dur),
      h('div', { class: 'np-controls' }, shuffle, prev, playBtn, next, repeat),
      h('div', { class: 'np-bottom' }, sleepBtn)));

  let open = false;
  const show = () => {
    if (!player.current) return;
    open = true;
    root.classList.add('open');
    root.setAttribute('aria-hidden', 'false');
  };
  const hide = () => {
    open = false;
    root.classList.remove('open');
    root.setAttribute('aria-hidden', 'true');
  };
  root.addEventListener('click', (event) => {
    if (event.target === root || event.target === glow) hide();
  });

  const paintTrack = () => {
    const track = player.current;
    if (!track) {
      hide();
      return;
    }
    title.textContent = track.title;
    artist.textContent = track.artist;
    setArtwork(art, track.artworkURL);
    glow.style.backgroundImage = track.artworkURL ? `url("${track.artworkURL.replace(/"/g, '%22')}")` : '';
    paintLike();
  };
  const paintLike = () => like.classList.toggle('on', Boolean(player.current && store.addedIds.has(player.current.id)));
  const paintTime = () => {
    seek.enable(Boolean(player.current));
    seek.set(player.currentTime, [0, Math.max(player.duration, 1)]);
    if (!seek.dragging) cur.textContent = formatClock(player.currentTime);
    dur.textContent = formatClock(player.duration);
  };
  const paintPlay = () => {
    root.classList.toggle('playing', player.isPlaying);
    playBtn.replaceChildren(icon(player.isPlaying ? 'pause' : 'play', `filled ic-${player.isPlaying ? 'pause' : 'play'}`));
    playBtn.title = player.isPlaying ? 'Пауза' : 'Играть';
  };
  const paintModes = () => {
    shuffle.classList.toggle('on', player.shuffle);
    repeat.classList.toggle('on', player.repeatMode !== 'off');
    repeat.replaceChildren(icon(player.repeatMode === 'one' ? 'repeat-1' : 'repeat'));
  };
  const paintSleep = () => sleepBtn.classList.toggle('on', sleep.active);

  player.on('track', paintTrack);
  player.on('time', paintTime);
  player.on('playing', paintPlay);
  player.on('modes', paintModes);
  store.on('added', paintLike);
  sleep.on('change', paintSleep);
  paintTrack();
  paintTime();
  paintPlay();
  paintModes();
  paintSleep();

  return {
    el: root,
    show,
    hide,
    toggle: () => (open ? hide() : show()),
    get open() {
      return open;
    }
  };
}
