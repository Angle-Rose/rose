






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





function initReveal() {
  const items = $$('[data-reveal]');
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
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
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

  heads.forEach((el) => {
    splitWords(el);
    el.classList.add('is-split');
  });

  if (REDUCED) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    },
    { threshold: 0.25 }
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
        const pad = (el.dataset.pad === 'true');
        const dur = REDUCED ? 0 : 1600;

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
    { threshold: 0.2 }
  );

  nums.forEach((el) => io.observe(el));
}





function initMagnetic() {
  if (!FINE || REDUCED) return;

  $$('[data-magnetic]').forEach((el) => {
    const strength = parseFloat(el.dataset.magnetic || '0.32');

    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) * strength;
      const dy = (e.clientY - (r.top + r.height / 2)) * strength;
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      const inner = el.firstElementChild as HTMLElement | null;
      if (inner) inner.style.transform = `translate3d(${dx * -0.28}px, ${dy * -0.28}px, 0)`;
    });

    el.addEventListener('pointerleave', () => {
      el.style.transform = '';
      const inner = el.firstElementChild as HTMLElement | null;
      if (inner) inner.style.transform = '';
    });
  });
}





function initTilt() {
  if (!FINE || REDUCED) return;

  $$('[data-tilt]').forEach((el) => {
    const max = parseFloat(el.dataset.tilt || '9');

    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateX(${-py * max}deg) rotateY(${px * max}deg) translateY(-6px)`;
      el.style.setProperty('--mx', `${(px + 0.5) * 100}%`);
      el.style.setProperty('--my', `${(py + 0.5) * 100}%`);
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





function initHeroParallax() {
  const hero = $('[data-hero]');
  if (!hero || !FINE || REDUCED) return;

  const layers = $$('[data-depth]', hero);

  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    for (const el of layers) {
      const d = parseFloat(el.dataset.depth || '0.1');
      el.style.transform = `translate3d(${(px * d * -120).toFixed(2)}px, ${(py * d * -120).toFixed(2)}px, 0)`;
    }
  });

  hero.addEventListener('pointerleave', () => {
    for (const el of layers) el.style.transform = '';
  });
}





function initHeartTrail() {
  if (!FINE || REDUCED) return;
  if (window.matchMedia('(hover: none)').matches) return;

  const layer = document.createElement('div');
  layer.className = 'heart-trail';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  const HEARTS = ['♥', '❤', '✿', '❥'];
  const pool: HTMLElement[] = [];
  let last = 0;

  window.addEventListener(
    'pointermove',
    (e) => {
      const now = performance.now();
      if (now - last < 48) return;
      last = now;

      let el = pool.pop();
      if (!el) {
        el = document.createElement('span');
        layer.appendChild(el);
      }
      el.className = 'heart';
      el.textContent = HEARTS[(Math.random() * HEARTS.length) | 0];
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





function initNav() {
  const nav = $('[data-nav]');
  const toggle = $<HTMLButtonElement>('[data-nav-toggle]');
  const links = $$<HTMLAnchorElement>('[data-nav] a[href^="#"]');

  if (nav) {
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    nav.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('a')) {
        nav.classList.remove('is-open');
        toggle?.setAttribute('aria-expanded', 'false');
      }
    });
  }

  if (!links.length) return;

  const sections = links
    .map((a) => document.getElementById(a.getAttribute('href')!.slice(1)))
    .filter((s): s is HTMLElement => Boolean(s));

  if (!sections.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const id = entry.target.id;
        for (const a of links) {
          a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`);
        }
      }
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );

  sections.forEach((s) => io.observe(s));

  
  for (const a of links) {
    a.addEventListener('click', (e) => {
      const target = document.getElementById(a.getAttribute('href')!.slice(1));
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 74;
      window.scrollTo({ top, behavior: REDUCED ? 'auto' : 'smooth' });
      history.replaceState(null, '', a.getAttribute('href')!);
    });
  }
}





function initFaq() {
  $$('[data-faq-item]').forEach((item) => {
    const btn = $<HTMLButtonElement>('[data-faq-btn]', item);
    const panel = $<HTMLElement>('[data-faq-panel]', item);
    if (!btn || !panel) return;

    btn.addEventListener('click', () => {
      const open = item.classList.contains('is-open');

      
      $$('[data-faq-item]').forEach((other) => {
        other.classList.remove('is-open');
        const b = $<HTMLButtonElement>('[data-faq-btn]', other);
        b?.setAttribute('aria-expanded', 'false');
      });

      if (!open) {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}





function initForm() {
  const form = $<HTMLFormElement>('[data-form]');
  if (!form) return;

  const status = $('[data-form-status]', form);
  const submit = $<HTMLButtonElement>('[type="submit"]', form);

  form.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement | HTMLTextAreaElement;
    if (t.validity.valid) t.closest('.field')?.classList.remove('has-error');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    let valid = true;
    $$('.field', form).forEach((f) => {
      const input = $('input, textarea', f);
      if (!input) return;
      const bad = !(input as HTMLInputElement).validity.valid;
      f.classList.toggle('has-error', bad);
      if (bad && valid) (input as HTMLInputElement).focus();
      valid = valid && !bad;
    });

    if (!valid) {
      if (status) status.textContent = 'Please check the highlighted fields.';
      return;
    }

    if (submit) {
      submit.disabled = true;
      submit.dataset.label = submit.textContent || '';
      submit.textContent = 'Sending…';
    }
    if (status) status.textContent = 'Sending your enquiry…';

    
    
    window.setTimeout(() => {
      form.reset();
      if (submit) {
        submit.disabled = false;
        submit.textContent = submit.dataset.label || 'Send enquiry';
      }
      if (status) status.textContent = 'Thank you. We read every word — expect a reply within 48 hours.';
      form.classList.add('is-sent');
      window.setTimeout(() => form.classList.remove('is-sent'), 4000);
    }, 1100);
  });
}





function initMarquees() {
  $$('[data-marquee]').forEach((m) => {
    const inner = m.firstElementChild as HTMLElement | null;
    if (!inner || inner.dataset.cloned) return;
    const clone = inner.cloneNode(true) as HTMLElement;
    clone.dataset.cloned = 'true';
    clone.setAttribute('aria-hidden', 'true');
    m.appendChild(clone);
  });
}



function boot() {
  initScrollProgress();
  initReveal();
  initSplitHeadlines();
  initCounters();
  initMarquees();
  initFaq();
  initForm();
  initNav();
  initMagnetic();
  initTilt();
  initParallax();
  initHeroParallax();
  initHeartTrail();
  document.documentElement.classList.add('is-ready');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}