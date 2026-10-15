import { PETAL_GLYPHS, TRAIL_GLYPHS } from '../consts';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = window.matchMedia('(pointer: fine)').matches;

const $ = <T extends Element = HTMLElement>(sel: string, root: Element | Document = document) =>
  root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: Element | Document = document) =>
  Array.from(root.querySelectorAll<T>(sel));

function initScrollProgress() {
  const bar = $('[data-progress]');
  if (!bar) return;
  let ticking = false;

  const update = () => {
    ticking = false;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    bar.style.transform = `scaleX(${Math.min(1, window.scrollY / max)})`;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
  update();
}

function observeReveal(root: Element | Document = document) {
  const items = $$('[data-reveal]', root).filter((el) => !el.classList.contains('is-visible'));
  if (!items.length) return;

  if (REDUCED) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        el.classList.add('is-visible');
        io.unobserve(el);
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.12 }
  );

  items.forEach((el) => io.observe(el));
}

function splitWords(el: HTMLElement) {
  const build = (nodes: ChildNode[], out: HTMLElement): HTMLElement[] => {
    const masks: HTMLElement[] = [];

    for (const child of nodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        for (const part of (child.textContent ?? '').split(' ')) {
          if (part === '') {
            out.appendChild(document.createTextNode(' '));
            continue;
          }
          const mask = document.createElement('span');
          mask.className = 'line-mask';
          const inner = document.createElement('span');
          inner.className = 'line-inner';
          inner.textContent = part;
          mask.appendChild(inner);
          out.appendChild(mask);
          masks.push(mask);
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const src = child as HTMLElement;
        const clone = src.cloneNode(false) as HTMLElement;
        out.appendChild(clone);
        masks.push(...build(Array.from(src.childNodes), clone));
      }
    }

    return masks;
  };

  const original = Array.from(el.childNodes);
  el.textContent = '';

  build(original, el).forEach((mask, i) => {
    const inner = mask.firstElementChild as HTMLElement;
    inner.style.setProperty('--d', `${Math.min(i * 70, 760)}ms`);
  });
}

function initSplitHeadlines() {
  const heads = $$('[data-split]');
  if (!heads.length) return;

  heads.forEach((el) => splitWords(el));
  if (REDUCED) {
    heads.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    },
    { threshold: 0.2 }
  );

  heads.forEach((el) => io.observe(el));
}

function initCounters() {
  const nums = $$('[data-count]');
  if (!nums.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        io.unobserve(el);

        const to = parseFloat(el.dataset.count || '0');
        const suffix = el.dataset.suffix || '';
        const pad = el.dataset.pad === 'true';
        const dur = REDUCED ? 0 : 1800;

        if (dur === 0) {
          el.textContent = (pad ? to.toFixed(2) : String(Math.round(to))) + suffix;
          continue;
        }

        const t0 = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - t0) / dur);
          const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
          const v = to * e;
          el.textContent = (pad ? v.toFixed(2) : String(Math.round(v))) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    },
    { threshold: 0.25 }
  );

  nums.forEach((el) => io.observe(el));
}

function initTogether() {
  const root = $('[data-together]');
  if (!root) return;

  const since = root.dataset.since;
  if (!since) return;

  const start = new Date(`${since}T00:00:00`).getTime();
  if (Number.isNaN(start)) return;

  const cells = $$('[data-unit]', root);
  const fmt = (n: number) => String(Math.max(0, n)).padStart(2, '0');
  let lastSecond = -1;

  const tick = () => {
    const diff = Date.now() - start;
    if (diff < 0) return;

    const values = [
      Math.floor(diff / 86400000),
      Math.floor(diff / 3600000) % 24,
      Math.floor(diff / 60000) % 60,
      Math.floor(diff / 1000) % 60,
    ];

    if (values[3] !== lastSecond) {
      lastSecond = values[3];
      cells.forEach((cell, i) => {
        const v = i === 0 ? String(values[i]) : fmt(values[i]);
        if (cell.firstElementChild?.textContent !== v) {
          (cell.firstElementChild as HTMLElement).textContent = v;
          cell.classList.remove('is-tick');
          void cell.offsetWidth;
          cell.classList.add('is-tick');
        }
      });
    }
  };

  tick();
  window.setInterval(tick, 1000);
}

function initMagnetic() {
  if (!FINE || REDUCED) return;

  $$('[data-magnetic]').forEach((el) => {
    const strength = parseFloat(el.dataset.magnetic || '0.3');

    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) * strength;
      const dy = (e.clientY - (r.top + r.height / 2)) * strength;
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    });

    el.addEventListener('pointerleave', () => {
      el.style.transform = '';
    });
  });
}

function initTilt() {
  if (!FINE || REDUCED) return;

  $$('[data-tilt]').forEach((el) => {
    const max = parseFloat(el.dataset.tilt || '7');

    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateX(${-py * max}deg) rotateY(${px * max}deg)`;
    });

    el.addEventListener('pointerleave', () => {
      el.style.transform = '';
    });
  });
}

function initParallax() {
  if (REDUCED) return;

  const items = $$('[data-parallax]');
  if (!items.length) return;

  let ticking = false;

  const update = () => {
    ticking = false;
    const vh = window.innerHeight;

    for (const el of items) {
      const speed = parseFloat(el.dataset.parallax || '0.15');
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      const p = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.setProperty('--py-shift', `${(-p * speed * 100).toFixed(2)}px`);
    }
  };

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
}

function initPetals() {
  if (REDUCED) return;

  const layer = $('[data-petals]');
  if (!layer) return;

  const count = window.innerWidth < 720 ? 18 : 30;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'petal';
    p.textContent = PETAL_GLYPHS[(Math.random() * PETAL_GLYPHS.length) | 0];
    p.style.left = `${Math.random() * 100}%`;
    p.style.fontSize = `${(9 + Math.random() * 15).toFixed(1)}px`;
    p.style.setProperty('--fall', `${(16 + Math.random() * 18).toFixed(1)}s`);
    p.style.setProperty('--delay', `${(-Math.random() * 24).toFixed(1)}s`);
    p.style.setProperty('--drift', `${(Math.random() * 90 - 45).toFixed(0)}px`);
    p.style.setProperty('--sway', `${(5 + Math.random() * 7).toFixed(1)}s`);
    p.style.opacity = (0.16 + Math.random() * 0.34).toFixed(2);
    layer.appendChild(p);
  }
}

function initHeartTrail() {
  if (!FINE || REDUCED) return;
  if (window.matchMedia('(hover: none)').matches) return;
  if (!document.body.classList.contains('is-open')) return;

  const layer = document.createElement('div');
  layer.className = 'heart-trail';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  const pool: HTMLElement[] = [];
  let last = 0;

  window.addEventListener(
    'pointermove',
    (e) => {
      const now = performance.now();
      if (now - last < 52) return;
      last = now;

      let el = pool.pop();
      if (!el) {
        el = document.createElement('span');
        layer.appendChild(el);
      }
      el.className = 'heart';
      el.textContent = TRAIL_GLYPHS[(Math.random() * TRAIL_GLYPHS.length) | 0];
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
      el.style.setProperty('--drift', `${(Math.random() * 60 - 30).toFixed(0)}px`);
      el.style.setProperty('--spin', `${(Math.random() * 80 - 40).toFixed(0)}deg`);
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';

      window.setTimeout(() => {
        el?.remove();
        if (el && pool.length < 24) pool.push(el);
      }, 1100);
    },
    { passive: true }
  );
}

function initGate() {
  const seal = $<HTMLButtonElement>('[data-open]');
  const gate = $('[data-gate]');
  if (!seal || !gate) return;

  const reveal = () => {
    if (document.body.classList.contains('is-opening')) return;
    document.body.classList.add('is-opening');

    window.dispatchEvent(new CustomEvent('letter:mood', { detail: 1 }));
    gate.setAttribute('aria-hidden', 'true');

    window.setTimeout(() => {
      document.body.classList.remove('is-opening');
      document.body.classList.add('is-open');
      gate.remove();
      document.documentElement.classList.add('is-ready');
      initScrollProgress();
      observeReveal();
      initTogether();
      initHeartTrail();
      window.scrollTo({ top: 0, behavior: 'auto' });
    }, REDUCED ? 0 : 1050);
  };

  seal.addEventListener('click', reveal);
  gate.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      reveal();
    }
  });
}

function initReplay() {
  const btn = $<HTMLButtonElement>('[data-replay]');
  if (!btn) return;

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
  });
}

function boot() {
  initPetals();
  initSplitHeadlines();
  initCounters();
  initGate();
  initReplay();
  initMagnetic();
  initTilt();
  initParallax();
  document.documentElement.classList.add('is-ready');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}