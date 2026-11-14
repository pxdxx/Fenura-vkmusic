// Анимированный фон поверх обоев: звёзды, созвездия, звездопад, снег, дождь, светлячки, луна.
// Рисуется на одном <canvas>: до 30 кадров в секунду, без фокуса 15, в скрытом окне не рисуется.

export const EFFECTS = [
  { id: 'none', name: 'Нет' },
  { id: 'stars', name: 'Звёзды' },
  { id: 'constellations', name: 'Созвездия' },
  { id: 'meteors', name: 'Звездопад' },
  { id: 'snow', name: 'Снег' },
  { id: 'rain', name: 'Дождь' },
  { id: 'fireflies', name: 'Светлячки' },
  { id: 'moon', name: 'Луна' }
];

const rand = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Fx {
  constructor(canvas, { preview = false } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.preview = preview;
    this.type = 'none';
    this.opts = { density: 0.6, speed: 1, opacity: 0.8 };
    this.rgb = [255, 255, 255];
    this.accent = [122, 167, 255];
    this.p = [];
    this.time = 0;
    this.raf = 0;
    this.last = 0;
    this.animate = true;
    this.slow = false;
    this.w = 0;
    this.h = 0;
    if (!preview) {
      this.resizeTimer = null;
      new ResizeObserver(() => {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => this.resize(true), 120);
      }).observe(canvas);
      this.resize(false);
    }
  }

  // ---------- Управление ----------

  setType(type) {
    if (type === this.type) return;
    this.type = type;
    this.init();
    this.refresh();
  }

  setOptions(opts) {
    const densityChanged = opts.density !== undefined && opts.density !== this.opts.density;
    Object.assign(this.opts, opts);
    if (densityChanged) this.init();
    this.refresh();
  }

  setColor(rgb, accent) {
    this.rgb = rgb;
    if (accent) this.accent = accent;
    this.sprite = null;
    this.moonSprite = null;
    this.refresh();
  }

  // animate=false — картинка замирает (анимации выключены или музыка на паузе в режиме «только с музыкой»).
  setState({ animate, slow }) {
    if (animate !== undefined) this.animate = animate;
    if (slow !== undefined) this.slow = slow;
    this.refresh();
  }

  refresh() {
    const shouldRun = this.type !== 'none' && this.animate && !document.hidden && !this.preview;
    if (shouldRun && !this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame((t) => this.frame(t));
    } else if (!shouldRun && this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
    if (!shouldRun) this.draw();
  }

  resize(reinit) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (reinit) this.init();
    this.draw();
  }

  // Превью для плитки в настройках: прокручиваем симуляцию и рисуем один кадр.
  renderPreview(type, width, height) {
    const dpr = 2;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = width;
    this.h = height;
    this.type = type;
    this.init();
    for (let i = 0; i < 40; i++) this.update(0.05);
    if (type === 'meteors') this.spawnMeteor(0.45);
    this.draw();
  }

  frame(now) {
    this.raf = requestAnimationFrame((t) => this.frame(t));
    const elapsed = now - this.last;
    // Медленному фону хватает 30 кадров/с (15 без фокуса): каждый кадр заново размывает стекло панелей.
    const minGap = this.slow ? 64 : 32;
    if (elapsed < minGap - 4) return;
    this.last = now;
    this.update(Math.min(elapsed / 1000, 0.05) * this.opts.speed);
    this.draw();
  }

  // ---------- Частицы ----------

  count(base) {
    const area = this.preview ? 0.55 : (this.w * this.h) / (1280 * 720);
    return Math.max(3, Math.round(base * this.opts.density * area));
  }

  star() {
    return { x: rand(0, this.w), y: rand(0, this.h), r: Math.random() ** 2.2 * 1.6 + 0.35, ph: rand(0, TAU), tw: rand(0.6, 2.4), vx: rand(1, 4) };
  }

  init() {
    const { w, h } = this;
    this.p = [];
    this.bg = [];
    this.m = [];
    this.time = 0;
    if (!w || !h) return;
    switch (this.type) {
      case 'stars':
        this.p = Array.from({ length: this.count(340) }, () => this.star());
        break;
      case 'constellations':
        this.bg = Array.from({ length: this.count(140) }, () => this.star());
        this.p = Array.from({ length: this.count(80) }, () => ({
          x: rand(0, w), y: rand(0, h), vx: rand(-9, 9), vy: rand(-9, 9), r: rand(1.1, 2.3), ph: rand(0, TAU), tw: rand(0.5, 1.5)
        }));
        break;
      case 'meteors':
        this.p = Array.from({ length: this.count(220) }, () => this.star());
        this.nextMeteor = rand(0.4, 1.6);
        break;
      case 'snow':
        this.p = Array.from({ length: this.count(240) }, () => ({
          x: rand(0, w), y: rand(0, h), r: rand(0.8, 3.4), vy: rand(16, 52), sw: rand(0.4, 1.4), ph: rand(0, TAU)
        }));
        this.p.forEach((f) => { f.vy *= 0.5 + f.r / 3.4; });
        break;
      case 'rain':
        this.p = Array.from({ length: this.count(280) }, () => ({
          x: rand(-50, w), y: rand(0, h), len: rand(10, 26), vy: rand(560, 940), a: rand(0.12, 0.42)
        }));
        break;
      case 'fireflies':
        this.p = Array.from({ length: this.count(46) }, () => ({
          x: rand(0, w), y: rand(0, h), ang: rand(0, TAU), sp: rand(8, 26), r: rand(5, 13), ph: rand(0, TAU), tw: rand(0.5, 1.6), turn: rand(-0.6, 0.6)
        }));
        break;
      case 'moon': {
        // Перенесено из NektoMe-HelpPanel (content/backdrop.js, сцена «Луна»).
        const r = this.preview ? Math.min(w, h) * 0.16 : clamp(Math.min(w, h) * 0.055, 26, 64);
        const cloudScale = this.preview ? 0.35 : 1;
        this.p = Array.from({ length: this.count(115) }, () => {
          const sr = Math.random() < 0.08 ? rand(1.1, 1.6) : rand(0.35, 1);
          return { x: rand(0, w), y: rand(0, h), r: sr, a: rand(0.12, 0.6), speed: rand(0.4, 1.6), phase: rand(0, TAU), tinted: Math.random() < 0.18 };
        });
        this.moon = { x: w * 0.83, y: h * 0.2, r };
        this.moonSprite = null;
        this.clouds = Array.from({ length: Math.max(1, Math.round(6 * this.opts.density)) }, () => ({
          x: rand(0, w), y: rand(0.06, 0.5) * h,
          rx: rand(140, 320) * cloudScale, ry: rand(8, 22) * cloudScale,
          v: rand(3, 9), a: rand(0.035, 0.07)
        }));
        break;
      }
      default:
        break;
    }
  }

  spawnMeteor(progress = 0) {
    const { w, h } = this;
    const speed = rand(560, 900);
    const angle = rand(0.42, 0.62);
    const m = {
      x: rand(w * 0.25, w * 1.05), y: rand(-h * 0.1, h * 0.35),
      vx: -Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: 0, max: rand(0.7, 1.3), len: rand(0.1, 0.18)
    };
    m.life = m.max * progress;
    m.x += m.vx * m.life;
    m.y += m.vy * m.life;
    this.m.push(m);
  }

  update(dt) {
    const { w, h } = this;
    this.time += dt;
    switch (this.type) {
      case 'stars':
      case 'meteors':
        for (const s of this.p) {
          s.x -= s.vx * dt * 0.5;
          if (s.x < -2) s.x = w + 2;
        }
        if (this.type === 'meteors') {
          this.nextMeteor -= dt;
          if (this.nextMeteor <= 0) {
            this.spawnMeteor();
            this.nextMeteor = rand(1.2, 4.5) / Math.max(this.opts.density, 0.25);
          }
          for (const m of this.m) {
            m.life += dt;
            m.x += m.vx * dt;
            m.y += m.vy * dt;
          }
          this.m = this.m.filter((m) => m.life < m.max);
        }
        break;
      case 'constellations':
        for (const n of this.p) {
          n.x += n.vx * dt;
          n.y += n.vy * dt;
          if (n.x < -20) n.x = w + 20;
          if (n.x > w + 20) n.x = -20;
          if (n.y < -20) n.y = h + 20;
          if (n.y > h + 20) n.y = -20;
        }
        break;
      case 'snow':
        for (const f of this.p) {
          f.y += f.vy * dt;
          f.x += Math.sin(this.time * f.sw + f.ph) * 14 * dt;
          if (f.y > h + 4) {
            f.y = -4;
            f.x = rand(0, w);
          }
        }
        break;
      case 'rain':
        for (const d of this.p) {
          d.y += d.vy * dt;
          d.x += d.vy * 0.12 * dt;
          if (d.y > h + d.len) {
            d.y = -d.len;
            d.x = rand(-50, w);
          }
        }
        break;
      case 'moon':
        for (const c of this.clouds) {
          c.x += c.v * dt;
          if (c.x - c.rx > w) c.x = -c.rx;
        }
        break;
      case 'fireflies':
        for (const f of this.p) {
          f.ang += (Math.sin(this.time * 0.7 + f.ph) * 0.9 + f.turn) * dt;
          f.x += Math.cos(f.ang) * f.sp * dt;
          f.y += Math.sin(f.ang) * f.sp * dt;
          if (f.x < -20) f.x = w + 20;
          if (f.x > w + 20) f.x = -20;
          if (f.y < -20) f.y = h + 20;
          if (f.y > h + 20) f.y = -20;
        }
        break;
      default:
        break;
    }
  }

  // ---------- Отрисовка ----------

  col(a) {
    return `rgba(${this.rgb[0]},${this.rgb[1]},${this.rgb[2]},${a})`;
  }

  glowSprite() {
    if (this.sprite) return this.sprite;
    const size = 64;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, this.col(1));
    grad.addColorStop(0.18, this.col(0.85));
    grad.addColorStop(0.45, this.col(0.22));
    grad.addColorStop(1, this.col(0));
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    this.sprite = c;
    return c;
  }

  // Серп луны с тонким мягким свечением по краю. Рисуется один раз вдвое крупнее, чтобы край был гладким.
  buildMoonSprite() {
    const r = this.moon.r;
    const scale = 2;
    const pad = r * 0.8;
    const size = r * 2 + pad * 2;
    const center = size / 2;
    const shape = document.createElement('canvas');
    shape.width = Math.round(size * scale);
    shape.height = Math.round(size * scale);
    const sg = shape.getContext('2d');
    sg.scale(scale, scale);
    sg.fillStyle = this.col(1);
    sg.beginPath();
    sg.arc(center, center, r, 0, TAU);
    sg.fill();
    sg.globalCompositeOperation = 'destination-out';
    sg.beginPath();
    sg.arc(center + r * 0.42, center - r * 0.18, r * 0.9, 0, TAU);
    sg.fill();
    const c = document.createElement('canvas');
    c.width = shape.width;
    c.height = shape.height;
    const g = c.getContext('2d');
    g.shadowColor = this.col(0.3);
    g.shadowBlur = r * 0.2 * scale;
    g.drawImage(shape, 0, 0);
    this.moonSprite = { canvas: c, size };
    return this.moonSprite;
  }

  drawStars(list, scale = 1) {
    const ctx = this.ctx;
    const sprite = this.glowSprite();
    for (const s of list) {
      const a = (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(this.time * s.tw + s.ph))) * scale;
      if (s.r > 1.25) {
        const size = s.r * 7;
        ctx.globalAlpha = a * this.opts.opacity * 0.9;
        ctx.drawImage(sprite, s.x - size / 2, s.y - size / 2, size, size);
      } else {
        ctx.globalAlpha = a * this.opts.opacity;
        ctx.fillStyle = this.col(1);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, TAU);
        ctx.fill();
      }
    }
  }

  draw() {
    const { ctx, w, h } = this;
    if (!w || !h) return;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, w, h);
    if (this.preview) {
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#191826');
      bg.addColorStop(1, '#0b0b10');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
    }
    const o = this.opts.opacity;
    switch (this.type) {
      case 'stars':
        this.drawStars(this.p);
        break;
      case 'meteors':
        this.drawStars(this.p, 0.8);
        for (const m of this.m) {
          const k = m.life / m.max;
          const fade = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
          const tx = m.x - m.vx * m.len;
          const ty = m.y - m.vy * m.len;
          const grad = ctx.createLinearGradient(m.x, m.y, tx, ty);
          grad.addColorStop(0, this.col(0.95));
          grad.addColorStop(1, this.col(0));
          ctx.globalAlpha = Math.max(fade, 0) * o;
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(m.x, m.y);
          ctx.lineTo(tx, ty);
          ctx.stroke();
          ctx.drawImage(this.glowSprite(), m.x - 6, m.y - 6, 12, 12);
        }
        break;
      case 'constellations': {
        this.drawStars(this.bg, 0.6);
        const max = this.preview ? 60 : 150;
        const nodes = this.p;
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = this.col(1);
        for (let i = 0; i < nodes.length; i++) {
          const a = nodes[i];
          for (let j = i + 1; j < nodes.length; j++) {
            const b = nodes[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            if (Math.abs(dx) > max || Math.abs(dy) > max) continue;
            const d = Math.hypot(dx, dy);
            if (d > max) continue;
            ctx.globalAlpha = (1 - d / max) * 0.4 * o;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        const sprite = this.glowSprite();
        for (const n of nodes) {
          const a = 0.6 + 0.4 * Math.sin(this.time * n.tw + n.ph);
          const size = n.r * 6;
          ctx.globalAlpha = a * o;
          ctx.drawImage(sprite, n.x - size / 2, n.y - size / 2, size, size);
        }
        break;
      }
      case 'snow': {
        const sprite = this.glowSprite();
        for (const f of this.p) {
          const size = f.r * 3.2;
          ctx.globalAlpha = (0.35 + f.r / 6) * o;
          ctx.drawImage(sprite, f.x - size / 2, f.y - size / 2, size, size);
        }
        break;
      }
      case 'rain':
        ctx.strokeStyle = this.col(1);
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        for (const d of this.p) {
          ctx.globalAlpha = d.a * o;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - d.len * 0.12, d.y - d.len);
          ctx.stroke();
        }
        break;
      case 'fireflies': {
        const sprite = this.glowSprite();
        ctx.globalCompositeOperation = 'lighter';
        for (const f of this.p) {
          const pulse = 0.5 + 0.5 * Math.sin(this.time * f.tw * 2 + f.ph);
          const size = f.r * (2.2 + pulse);
          ctx.globalAlpha = (0.25 + 0.75 * pulse) * o;
          ctx.drawImage(sprite, f.x - size / 2, f.y - size / 2, size, size);
        }
        break;
      }
      case 'moon': {
        const accent = `rgb(${this.accent[0]},${this.accent[1]},${this.accent[2]})`;
        const plain = this.col(1);
        for (const st of this.p) {
          const tw = 0.65 + 0.35 * Math.sin(this.time * st.speed + st.phase);
          ctx.globalAlpha = clamp(st.a * tw * o * 1.25, 0, 1);
          ctx.fillStyle = st.tinted ? accent : plain;
          ctx.beginPath();
          ctx.arc(st.x, st.y, st.r, 0, TAU);
          ctx.fill();
        }
        const sprite = this.moonSprite || this.buildMoonSprite();
        ctx.globalAlpha = clamp(0.85 * o * 1.25, 0, 1);
        ctx.drawImage(sprite.canvas, this.moon.x - sprite.size / 2, this.moon.y - sprite.size / 2, sprite.size, sprite.size);
        for (const c of this.clouds) {
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, c.rx);
          grad.addColorStop(0, plain);
          grad.addColorStop(1, this.col(0));
          ctx.save();
          ctx.translate(c.x, c.y);
          ctx.scale(1, c.ry / c.rx);
          ctx.globalAlpha = clamp(c.a * o * 1.25, 0, 1);
          ctx.fillStyle = grad;
          ctx.fillRect(-c.rx, -c.rx, c.rx * 2, c.rx * 2);
          ctx.restore();
        }
        break;
      }
      default:
        break;
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}
