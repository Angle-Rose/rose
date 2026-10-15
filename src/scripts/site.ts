const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = window.matchMedia('(pointer: fine)').matches;

const $ = <T extends Element = HTMLElement>(sel: string, root: Element | Document = document) =>
  root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: Element | Document = document) =>
  Array.from(root.querySelectorAll<T>(sel));

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

function initCups() {
  const scenes = $$('[data-act]');
  if (!scenes.length) return;

  if (REDUCED) {
    scenes.forEach((s) => $('[data-cup]', s)?.classList.add('is-open'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        $('[data-cup]', entry.target as Element)?.classList.add('is-open');
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -18% 0px', threshold: 0.2 }
  );

  scenes.forEach((s) => io.observe(s));
}

function initActs() {
  const scenes = $$('[data-act]');
  const dots = $$('[data-act-dot]');
  if (!scenes.length) return;

  let current = -1;

  const go = (i: number, silent = false) => {
    if (i === current) return;
    const prev = current;
    current = i;

    if (!silent && prev !== -1) {
      window.dispatchEvent(new CustomEvent('letter:cut'));
      dots.forEach((d, n) => d.setAttribute('aria-current', String(n === i)));
    }

    window.dispatchEvent(new CustomEvent('letter:act', { detail: i }));
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        go(Number((entry.target as HTMLElement).dataset.act));
      }
    },
    { rootMargin: '-45% 0px -45% 0px' }
  );

  scenes.forEach((s) => io.observe(s));

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      const target = scenes[i];
      if (!target) return;
      const top = target.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top, behavior: REDUCED ? 'auto' : 'smooth' });
    });
  });

  window.addEventListener('letter:opened', () => go(0, true));
}

function initGate() {
  const seal = $<HTMLButtonElement>('[data-open]');
  const gate = $('[data-gate]');
  if (!seal || !gate) return;

  const open = () => {
    if (document.body.classList.contains('is-opening')) return;
    document.body.classList.add('is-opening');

    window.dispatchEvent(new CustomEvent('letter:open'));
    window.dispatchEvent(new CustomEvent('letter:mood', { detail: 1 }));
    gate.setAttribute('aria-hidden', 'true');

    window.setTimeout(() => {
      document.body.classList.remove('is-opening');
      document.body.classList.add('is-open');
      gate.remove();
      document.documentElement.classList.add('is-ready');
      window.dispatchEvent(new CustomEvent('letter:opened'));
      observeReveal();
      initTogether();
      window.scrollTo({ top: 0, behavior: 'auto' });
    }, REDUCED ? 0 : 1000);
  };

  seal.addEventListener('click', open);
  gate.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
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
  initCups();
  initGate();
  initReplay();
  initActs();
  initMagnetic();
  document.documentElement.classList.add('is-ready');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}