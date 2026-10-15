/* Tabu motion studio: progressive enhancement; no third-party runtime. */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches) return;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;
  const hero = document.querySelector('.hero');
  const canvas = document.querySelector('.hero__canvas');
  const ctx = canvas?.getContext('2d', { alpha: true });
  const sections = [...document.querySelectorAll('main > section[id], .footer')];
  let disposed = false;
  let frameId = 0;
  let heroVisible = true;
  let width = 0, height = 0, time = 0, last = 0;
  let px = 0, py = 0, aimX = 0, aimY = 0;
  let scrollFrame = 0;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const mobile = () => innerWidth < 700;
  root.classList.add('motion-studio');

  // A projected toroidal field: depth-sorted, additive light, pointer inertia.
  function resize() {
    if (!ctx) return;
    width = hero.clientWidth;
    height = Math.min(hero.clientHeight, innerHeight * 1.65);
    const dpr = Math.min(devicePixelRatio || 1, mobile() ? 1.25 : 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    updateScroll();
  }
  function project(x, y, z, rotation, tilt) {
    const xx = x * Math.cos(rotation) - z * Math.sin(rotation);
    const zz = x * Math.sin(rotation) + z * Math.cos(rotation);
    const yy = y * Math.cos(tilt) - zz * Math.sin(tilt);
    const depth = y * Math.sin(tilt) + zz * Math.cos(tilt);
    const perspective = 3.6 / (3.6 + depth);
    const scale = Math.min(width * .43, 490);
    return [width / 2 + xx * scale * perspective, Math.min(height * .38, 460) + yy * scale * perspective, depth];
  }
  function draw(now) {
    frameId = 0;
    if (disposed || document.hidden || !heroVisible || !ctx) return;
    const dt = last ? Math.min(now - last, 40) : 16;
    last = now;
    time += dt * .00015;
    px += (aimX - px) * .045;
    py += (aimY - py) * .045;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';
    const ribbons = mobile() ? 18 : 32;
    const points = mobile() ? 64 : 100;
    const rotation = time * .28 + px * .22;
    const tilt = .55 + Math.sin(time * .28) * .16 + py * .2;
    for (let j = 0; j < ribbons; j++) {
      const v = j / ribbons * Math.PI * 2;
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const u = i / points * Math.PI * 2;
        const twist = v + u * 1.5 + time * .7;
        const minor = .20 + Math.sin(u * 3 + time) * .035;
        const radius = .86 + minor * Math.cos(twist);
        const p = project(radius * Math.cos(u), minor * Math.sin(twist), radius * Math.sin(u), rotation, tilt);
        if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
      const warm = (Math.sin(v + time) + 1) / 2;
      ctx.strokeStyle = `rgba(${Math.round(150 + 105 * warm)},${Math.round(100 + 30 * warm)},${Math.round(245 - 180 * warm)},${mobile() ? .10 : .13})`;
      ctx.lineWidth = j % 5 === 0 ? 1.2 : .6;
      ctx.stroke();
    }
    // Orbiting light beads follow the same geometry as the field.
    for (let i = 0; i < 13; i++) {
      const u = i * 2.39996 + time * (i % 2 ? .4 : -.3);
      const p = project(Math.cos(u) * 1.08, Math.sin(u * 2 + time) * .16, Math.sin(u) * 1.08, rotation, tilt);
      const glow = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 9);
      glow.addColorStop(0, 'rgba(255,174,106,.7)'); glow.addColorStop(1, 'rgba(255,91,46,0)');
      ctx.fillStyle = glow; ctx.fillRect(p[0] - 9, p[1] - 9, 18, 18);
    }
    ctx.globalCompositeOperation = 'source-over';
    schedule();
  }
  function schedule() {
    if (!frameId && !disposed && heroVisible && !document.hidden && ctx) frameId = requestAnimationFrame(draw);
  }
  function suspend() { cancelAnimationFrame(frameId); frameId = 0; last = 0; }
  const heroObserver = new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    if (heroVisible) schedule(); else suspend();
  });
  heroObserver.observe(hero);
  document.addEventListener('visibilitychange', () => document.hidden ? suspend() : schedule());
  if (fine) hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    aimX = (e.clientX - r.left) / r.width - .5;
    aimY = (e.clientY - r.top) / Math.min(r.height, innerHeight) - .5;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { aimX = aimY = 0; });

  // Only visible sections receive scroll writes. Native scrolling stays intact.
  const visible = new Set();
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      target.classList.toggle('motion-in-view', isIntersecting);
      if (isIntersecting) visible.add(target); else visible.delete(target);
    });
    updateScroll();
  }, { rootMargin: '100px 0px' });
  sections.forEach(section => sectionObserver.observe(section));
  function updateScroll() {
    scrollFrame = 0;
    if (disposed) return;
    visible.forEach(section => {
      const r = section.getBoundingClientRect();
      const p = clamp((innerHeight - r.top) / (innerHeight + r.height), 0, 1);
      section.style.setProperty('--scene', p.toFixed(4));
    });
    const y = scrollY;
    if (heroVisible) {
      hero.style.setProperty('--hero-travel', `${Math.min(y * .16, 120)}px`);
      hero.style.setProperty('--hero-fade', Math.max(.22, 1 - y / (innerHeight * 1.3)).toFixed(3));
    }
  }
  addEventListener('scroll', () => { if (!scrollFrame && !disposed) scrollFrame = requestAnimationFrame(updateScroll); }, { passive: true });
  let resizeTimer;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150); });

  // Fine pointer: a specular film follows the light across each search card.
  document.querySelectorAll('.search-card, .plan, .card').forEach((card, index) => {
    card.style.setProperty('--card-index', index % 3);
    if (!fine) return;
    card.addEventListener('pointermove', e => {
      if (disposed) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--light-x', `${(e.clientX - r.left) / r.width * 100}%`);
      card.style.setProperty('--light-y', `${(e.clientY - r.top) / r.height * 100}%`);
      card.classList.add('has-light');
    }, { passive: true });
    card.addEventListener('pointerleave', () => card.classList.remove('has-light'));
  });

  // Click wave is decorative and never intercepts a link or form action.
  document.querySelectorAll('.btn').forEach(button => button.addEventListener('pointerdown', e => {
    if (disposed) return;
    const r = button.getBoundingClientRect();
    const wave = document.createElement('i'); wave.className = 'click-wave'; wave.setAttribute('aria-hidden', 'true');
    wave.style.left = `${e.clientX - r.left}px`; wave.style.top = `${e.clientY - r.top}px`;
    button.append(wave); wave.addEventListener('animationend', () => wave.remove(), { once: true });
  }));
  function stopMotion() {
    if (!reduce.matches) return;
    disposed = true; root.classList.remove('motion-studio'); root.classList.add('reduced');
    suspend(); cancelAnimationFrame(scrollFrame); heroObserver.disconnect(); sectionObserver.disconnect();
    sections.forEach(s => s.classList.remove('motion-in-view'));
    if (ctx) ctx.clearRect(0, 0, width, height);
  }
  reduce.addEventListener('change', stopMotion);
  resize(); schedule();
})();
