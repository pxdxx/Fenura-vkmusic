'use strict';

// Замер нагрузки (`electron . --bench --out=папка`): демо-режим, несколько сценариев,
// загрузка процессора всех процессов Electron по app.getAppMetrics(). Результат в bench.json.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { app } = require('electron');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function option(args, name) {
  const found = args.find((arg) => arg.startsWith(`${name}=`));
  return found ? found.slice(name.length + 1) : '';
}

async function cpuOver(ms) {
  app.getAppMetrics();
  await wait(ms);
  const metrics = app.getAppMetrics();
  const byType = {};
  let total = 0;
  for (const m of metrics) {
    const v = m.cpu.percentCPUUsage;
    total += v;
    byType[m.type] = Math.round(((byType[m.type] || 0) + v) * 10) / 10;
  }
  const memory = Math.round(metrics.reduce((sum, m) => sum + m.memory.workingSetSize, 0) / 1024);
  return { total: Math.round(total * 10) / 10, byType, memoryMB: memory };
}

// Скриншоты для README (`--bench --shots --out=папка`): чистые кадры без ночного фильтра.
async function shots(win, out) {
  const exec = (code) => win.webContents.executeJavaScript(code, true);
  const shot = async (name) => {
    await wait(500);
    const image = await win.webContents.capturePage();
    fs.writeFileSync(path.join(out, name), image.toPNG());
  };
  win.setSize(1280, 800);
  win.show();
  await wait(2500);
  await exec("window.__fenura.prefs.set({ nightLight: 'off', wallpaper: 'wal1', fx: 'none' })");
  await exec("document.querySelectorAll('.row')[1].click()");
  await wait(2500);
  await shot('main.png');
  await exec('window.__fenura.nowPlaying.show()');
  await wait(900);
  await shot('nowplaying.png');
  await exec('window.__fenura.nowPlaying.hide()');
  await exec("window.__fenura.prefs.set({ wallpaper: 'wal7', fx: 'stars' })");
  await exec("window.__fenura.store.open({ type: 'rec' })");
  await wait(2200);
  await shot('recommendations.png');
  await exec("window.__fenura.prefs.set({ wallpaper: 'wal1', fx: 'none' })");
  await exec('window.__fenura.settings.open()');
  await wait(1500);
  await shot('settings.png');
  await exec('window.__fenura.settings.close()');
  await exec("window.__fenura.prefs.set({ wallpaper: 'plain', fx: 'moon' })");
  await exec("window.__fenura.store.open({ type: 'playlist', playlist: window.__fenura.store.playlists[1] })");
  await wait(2200);
  await shot('moon.png');
  setTimeout(() => app.exit(0), 200);
}

async function run(win, report, args) {
  const out = option(args, '--out') || path.join(os.tmpdir(), 'fenura-bench');
  fs.mkdirSync(out, { recursive: true });
  if (args.includes('--shots')) return shots(win, out);
  const exec = (code) => win.webContents.executeJavaScript(code, true);
  const result = { startupMs: Math.round(process.uptime() * 1000), report, scenarios: {} };

  win.setSize(1280, 800);
  win.show();
  win.focus();
  await wait(2500);

  const measure = async (name, setup, settle = 1500) => {
    if (setup) await exec(setup);
    await wait(settle);
    result.scenarios[name] = await cpuOver(5000);
  };

  // Время до первой отрисовки списка из 3000 треков (типичная большая библиотека).
  result.bigListFirstPaintMs = await exec(`(() => {
    const s = window.__fenura.store;
    const base = s.tracks;
    const big = Array.from({ length: 3000 }, (_, i) => ({ ...base[i % base.length], id: 'big' + i }));
    const t = performance.now();
    s.tracks = big;
    s.emit('tracks');
    document.body.offsetHeight;
    const ms = performance.now() - t;
    window.__benchBase = base;
    return Math.round(ms);
  })()`);
  await wait(3000);
  result.bigListRows = await exec("document.querySelectorAll('.row').length");
  await exec("(() => { const s = window.__fenura.store; s.tracks = window.__benchBase; s.emit('tracks'); })()");
  await wait(500);

  await measure('idle', null);
  if (args.includes('--credit')) {
    await measure('credit-loop', "document.querySelectorAll('.credit').forEach(n => { n.style.setProperty('--cw', (n.offsetWidth + 40) + 'px'); n.classList.add('shine'); n.querySelectorAll('.credit-glint, .credit-glint-text').forEach(g => g.style.animationIterationCount = 'infinite'); })");
    await exec("document.querySelectorAll('.credit').forEach(n => { n.style.animation = ''; })");
  }
  await measure('playing', "document.querySelector('.row').click()");
  if (args.includes('--probe')) {
    await measure('playing:no-eq', "document.querySelectorAll('.eq').forEach(e => e.style.display = 'none')");
    await measure('playing:no-eq-no-blur', "window.__fenura.prefs.set({ glassBlur: 0 })");
    await measure('playing:no-eq-no-blur-no-time', "window.__fenura.player.removeAllTime = true; document.querySelector('.player').style.visibility='hidden'");
    await exec("window.__fenura.prefs.set({ glassBlur: 26 }); document.querySelector('.player').style.visibility=''; document.querySelectorAll('.eq').forEach(e => e.style.display = '')");
    await measure('playing:blur-hidden-player', "document.querySelector('.player').style.visibility='hidden'");
    await exec("document.querySelector('.player').style.visibility=''");
  }
  for (const fx of ['stars', 'constellations', 'meteors', 'snow', 'rain', 'fireflies', 'moon']) {
    await measure(`fx:${fx}`, `window.__fenura.prefs.set({ fx: '${fx}' })`);
  }
  await measure('fx:none-plain', "window.__fenura.prefs.set({ fx: 'none', wallpaper: 'plain' })");
  await measure('settings-open', "window.__fenura.settings.open()");
  await exec('window.__fenura.settings.close()');
  await measure('nowplaying', 'window.__fenura.nowPlaying.show()');

  fs.writeFileSync(path.join(out, 'bench.json'), JSON.stringify(result, null, 2));
  setTimeout(() => app.exit(0), 200);
}

module.exports = { run };
