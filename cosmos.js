/* Tabu cosmos: a ray-traced black hole behind the hero and a star layer that reacts to scroll.
 * Progressive enhancement only. Without WebGL the 2D field in motion.js takes over. */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches) return;
  const root = document.documentElement;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const mobile = () => innerWidth < 700;
  root.classList.add('cosmos');

  /* ------------------------------------------------------------------
   * Event horizon: every pixel is a light ray bent around a Schwarzschild
   * mass, crossing a Doppler-beamed accretion disk on its way to the stars.
   * ------------------------------------------------------------------ */
  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FRAG = `
precision highp float;
uniform vec2 uCenter;
uniform float uUnit, uTime, uDive, uFade;
uniform vec2 uLook;
const float RIN = 2.4;
const float ROUT = 11.0;

float hash12(vec2 p) { vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec3 hash33(vec3 q) { q = fract(q * vec3(.1031, .1030, .0973)); q += dot(q, q.yxz + 33.33); return fract((q.xxy + q.yxx) * q.zyx); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x), mix(hash12(i + vec2(0, 1)), hash12(i + 1.), f.x), f.y);
}
float fbm(vec2 p) { float v = 0., a = .5; for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.03 + 7.1; a *= .5; } return v; }

// Brand temperature ramp: white-hot core, amber, Tabu orange, violet rim.
vec3 diskColor(float t) {
  vec3 c = mix(vec3(1., .95, .86), vec3(1., .70, .43), smoothstep(0., .18, t));
  c = mix(c, vec3(1., .36, .18), smoothstep(.15, .5, t));
  return mix(c, vec3(.72, .63, 1.), smoothstep(.5, 1., t));
}

vec3 sky(vec3 p, vec3 v) {
  vec3 d = normalize(v), col = vec3(0.);
  for (int l = 0; l < 2; l++) {
    float sc = l == 0 ? 55. : 130.;
    vec3 q = d * sc, h = hash33(floor(q));
    float dist = length(fract(q) - .5 - (h - .5) * .55);
    float tw = .55 + .45 * sin(uTime * (1.2 + h.y * 3.) + h.z * 40.);
    col += mix(vec3(1., .82, .7), vec3(.78, .76, 1.), h.y) * step(.84, h.x) * smoothstep(.16, 0., dist) * tw * (l == 0 ? 1.3 : .7);
  }
  float n = fbm(d.xy * 2.2 + d.z * 1.7 + uTime * .006);
  col += mix(vec3(1., .36, .18), vec3(.48, .36, 1.), fbm(d.yx * 1.6 - 3.)) * pow(n, 3.2) * .5;
  // A spacetime grid far behind the hole, lensed by the same rays.
  if (v.z < -.01) {
    vec2 g = (p + v * ((-34. - p.z) / v.z)).xy;
    vec2 a = abs(fract(g / 3.2) - .5);
    col += vec3(1., .6, .45) * smoothstep(.04, 0., min(a.x, a.y)) * exp(-length(g) * .03) * .07;
  }
  return col;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - uCenter) / uUnit;
  float dist = 15. - 6.5 * uDive;
  float el = .19 + uLook.y * .1 + uDive * .32;
  float az = uLook.x * .38;
  vec3 cam = dist * vec3(sin(az) * cos(el), sin(el), cos(az) * cos(el));
  vec3 fwd = normalize(-cam), right = normalize(cross(fwd, vec3(0, 1, 0))), up = cross(right, fwd);
  float roll = -.13 + uLook.x * .06;
  vec3 r2 = right * cos(roll) + up * sin(roll), u2 = up * cos(roll) - right * sin(roll);

  vec3 p = cam, v = normalize(fwd * 1.7 + r2 * uv.x + u2 * uv.y);
  float h2 = dot(cross(p, v), cross(p, v));
  vec3 col = vec3(0.);
  float alpha = 0., minR = 99., fate = 0.;
  for (int i = 0; i < 150; i++) {
    float rr = dot(p, p), r = sqrt(rr);
    float dt = clamp(.085 * r, .03, 2.2);
    vec3 prev = p;
    v += -1.5 * h2 * p / (rr * rr * r) * dt;
    p += v * dt;
    minR = min(minR, r);
    if (prev.y * p.y < 0.) {
      vec3 c = mix(prev, p, prev.y / (prev.y - p.y));
      float pr = length(c.xz);
      if (pr > RIN && pr < ROUT) {
        float x = (pr - RIN) / (ROUT - RIN);
        float spin = uTime * 2.4 / pow(pr, 1.5);
        vec2 q = mat2(cos(spin), -sin(spin), sin(spin), cos(spin)) * c.xz;
        float n = fbm(q * 1.25 + 3.);
        float bands = .55 + .45 * sin(pr * 6.5 + n * 5.);
        float dens = smoothstep(0., .06, x) * (1. - smoothstep(.5, 1., x)) * (.3 + .95 * n * bands);
        float beta = sqrt(.5 / pr);
        float cosT = dot(vec3(-c.z, 0., c.x) / pr, -normalize(v));
        float g = sqrt(1. - beta * beta) / (1. - beta * cosT) * sqrt(1. - 1. / pr);
        vec3 dc = diskColor(clamp(x + (1. - g) * .55, 0., 1.)) * (.2 + 3.2 * pow(1. - x, 2.2)) * pow(g, 2.4);
        float a = clamp(dens * .9, 0., .95);
        col += (1. - alpha) * dc * a;
        alpha += (1. - alpha) * a;
      }
    }
    if (r < 1. || alpha > .97) { fate = 1.; break; }
    if (r > 42.) { fate = 2.; break; }
  }
  if (fate > 1.5) col += (1. - alpha) * sky(p, v);
  col += vec3(1., .5, .28) * exp(-(minR - 1.5) * 5.) * .35 * step(1.5, fate);

  col = 1. - exp(-col * .82);
  float vig = smoothstep(1.9, .35, length(uv * vec2(.55, 1.)));
  vec3 base = vec3(.051, .059, .078);
  col = base + col * (1. - base) * mix(.35, 1., vig) * smoothstep(0., uFade, gl_FragCoord.y);
  gl_FragColor = vec4(col + (hash12(gl_FragCoord.xy + uTime) - .5) / 255., 1.);
}`;

  function eventHorizon() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'hero__cosmos';
    canvas.setAttribute('aria-hidden', 'true');
    const opts = { alpha: false, antialias: false, depth: false, powerPreference: 'high-performance' };
    const gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
    if (!gl) return;

    let prog, loc, buf;
    function build() {
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
      const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
      if (!vs || !fs) return false;
      prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
      gl.useProgram(prog);
      buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const a = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
      loc = {};
      ['uCenter', 'uUnit', 'uTime', 'uDive', 'uLook', 'uFade'].forEach(n => { loc[n] = gl.getUniformLocation(prog, n); });
      return true;
    }
    if (!build()) return;
    hero.insertBefore(canvas, hero.firstChild);
    root.classList.add('cosmos-gl');

    // Resolution adapts to the GPU: start sharp, step down while frames run long.
    let quality = mobile() ? .5 : .7, scale = 1, w = 0, h = 0;
    let frame = 0, visible = true, lost = false, start = performance.now(), last = 0;
    let samples = 0, slow = 0, skip = false, odd = false, scrolling = false, scrollTimer = 0;
    let lookX = 0, lookY = 0, aimX = 0, aimY = 0, dive = 0, heroH = 1;
    function resize() {
      scale = Math.min(devicePixelRatio || 1, 1.5) * quality;
      w = hero.clientWidth; heroH = hero.offsetHeight; h = Math.min(hero.clientHeight, innerHeight * 1.3);
      canvas.style.height = `${h}px`;
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    // After the intro settles, two 45-frame windows in a row with >10% long frames cost one quality step.
    let strikes = 0;
    function adapt(dt, now) {
      if (now - start < 3000 || scrolling) return;
      if (dt > 19) slow++;
      if (++samples < 45) return;
      strikes = slow > 4 ? strikes + 1 : 0;
      if (strikes > 1) {
        strikes = 0;
        if (quality > .3) { quality *= .82; resize(); } else skip = true;
      }
      samples = slow = 0;
    }
    function draw(now) {
      frame = 0;
      if (!visible || document.hidden || lost) return;
      const dt = last ? Math.min(now - last, 100) : 16;
      last = now;
      adapt(dt, now);
      frame = requestAnimationFrame(draw);
      if (skip && (odd = !odd)) return;
      const t = (now - start) / 1000;
      const drift = fine ? 0 : 1;
      lookX += ((aimX || Math.sin(t * .11) * .45 * drift) - lookX) * .04;
      lookY += ((aimY || Math.sin(t * .07) * .3 * drift) - lookY) * .04;
      const vh = innerHeight;
      gl.uniform2f(loc.uCenter, w * .5 * scale, (h - (mobile() ? .36 : .4) * vh) * scale);
      gl.uniform1f(loc.uUnit, Math.min(innerWidth * 1.05, vh * .78) * scale);
      gl.uniform1f(loc.uTime, t);
      gl.uniform1f(loc.uDive, dive);
      gl.uniform1f(loc.uFade, h * .32 * scale);
      gl.uniform2f(loc.uLook, lookX, lookY);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!canvas.classList.contains('is-lit')) canvas.classList.add('is-lit');
    }
    const run = () => { if (!frame && visible && !document.hidden && !lost) { last = 0; frame = requestAnimationFrame(draw); } };
    const halt = () => { cancelAnimationFrame(frame); frame = 0; };

    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? run() : halt(); }).observe(hero);
    document.addEventListener('visibilitychange', () => document.hidden ? halt() : run());
    if (fine) {
      hero.addEventListener('pointermove', e => {
        const r = hero.getBoundingClientRect();
        aimX = clamp((e.clientX - r.left) / r.width - .5, -.5, .5) * 1.4;
        aimY = clamp((e.clientY - r.top) / Math.min(r.height, innerHeight) - .5, -.5, .5) * -1.2;
      }, { passive: true });
      hero.addEventListener('pointerleave', () => { aimX = aimY = 0; });
    }
    // Scroll jank comes from the page, not the shader, so frames during a scroll don't count.
    addEventListener('scroll', () => {
      dive = clamp(scrollY / Math.max(1, heroH * .9), 0, 1);
      scrolling = true; clearTimeout(scrollTimer); scrollTimer = setTimeout(() => { scrolling = false; }, 200);
    }, { passive: true });
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; halt(); });
    canvas.addEventListener('webglcontextrestored', () => { lost = false; if (build()) { resize(); run(); } });
    reduce.addEventListener('change', () => { if (reduce.matches) { halt(); lost = true; canvas.remove(); root.classList.remove('cosmos-gl', 'cosmos'); } });
    resize(); run();
  }

  /* ------------------------------------------------------------------
   * Star layer: parallax stars that stretch into warp streaks with scroll
   * speed, a comet trail behind the pointer and the odd shooting star.
   * Drawing is clipped to the dark sections, so light sections stay clean.
   * ------------------------------------------------------------------ */
  function starLayer() {
    const c = document.createElement('canvas');
    c.className = 'cosmos-layer';
    c.setAttribute('aria-hidden', 'true');
    document.body.append(c);
    const g = c.getContext('2d');
    if (!g) return;
    const COLORS = ['#ffb36d', '#c4b2ff', '#ffffff', '#ffffff', '#ffe2c8'];
    const stars = Array.from({ length: mobile() ? 70 : 170 }, () => ({
      x: Math.random(), y: Math.random(), z: .15 + Math.random() ** 2 * .85,
      p: Math.random() * 6.283, color: COLORS[(Math.random() * COLORS.length) | 0],
    }));
    const trail = [];
    const darks = [...document.querySelectorAll('.hero, .marquee, .section--dark, .footer')];
    let bands = [], blank = false;
    // Page offsets of the dark sections, refreshed when layout changes rather than every frame.
    function measure() { bands = darks.map(el => { const r = el.getBoundingClientRect(); return [r.top + scrollY, r.height]; }); }
    let w = 0, h = 0, frame = 0, prevY = scrollY, sy = prevY, vel = 0, comet = null, nextComet = performance.now() + 3500, stopped = false;
    function size() {
      const dpr = Math.min(devicePixelRatio || 1, mobile() ? 1 : 1.5);
      w = innerWidth; h = innerHeight;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function draw(now) {
      frame = requestAnimationFrame(draw);
      const y = sy;
      vel += (clamp(y - prevY, -90, 90) - vel) * .18;
      prevY = y;
      const clip = bands.filter(([top, height]) => top - y < h && top + height - y > 0);
      if (!clip.length) { if (!blank) { g.clearRect(0, 0, w, h); blank = true; } return; }
      blank = false;
      g.clearRect(0, 0, w, h);
      g.save();
      g.beginPath();
      clip.forEach(([top, height]) => g.rect(0, top - y, w, height));
      g.clip();
      g.globalCompositeOperation = 'lighter';
      g.lineCap = 'round';
      for (const s of stars) {
        const sy = (((s.y * h - y * s.z * .3) % h) + h) % h;
        const sx = s.x * w;
        const tw = .55 + .45 * Math.sin(now * .0015 * (1 + s.z) + s.p);
        const streak = vel * s.z * 1.6;
        g.globalAlpha = clamp((.18 + .6 * s.z) * tw + Math.abs(streak) * .004, 0, 1);
        g.strokeStyle = s.color;
        g.lineWidth = .6 + s.z * 1.5;
        g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx, sy + (Math.abs(streak) < .5 ? .01 : streak)); g.stroke();
      }
      // Comet behind the pointer: fades over ~400ms.
      while (trail.length && now - trail[0].t > 400) trail.shift();
      for (let i = 1; i < trail.length; i++) {
        const k = i / trail.length;
        g.globalAlpha = k * .55;
        g.strokeStyle = k > .7 ? '#ffd2a8' : '#ff7a45';
        g.lineWidth = k * 5;
        g.beginPath(); g.moveTo(trail[i - 1].x, trail[i - 1].y); g.lineTo(trail[i].x, trail[i].y); g.stroke();
      }
      if (!comet && now > nextComet) {
        const a = .5 + Math.random() * .5;
        comet = { x: Math.random() * w * .8, y: Math.random() * h * .4, vx: Math.cos(a) * 1.1, vy: Math.sin(a) * 1.1, t0: now };
      }
      if (comet) {
        const age = now - comet.t0, life = 1100;
        const hx = comet.x + comet.vx * age, hy = comet.y + comet.vy * age;
        const tx = hx - comet.vx * 160, ty = hy - comet.vy * 160;
        const grad = g.createLinearGradient(tx, ty, hx, hy);
        grad.addColorStop(0, 'rgba(255,91,46,0)'); grad.addColorStop(1, 'rgba(255,236,214,1)');
        g.globalAlpha = Math.sin(Math.PI * Math.min(age / life, 1));
        g.strokeStyle = grad; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(tx, ty); g.lineTo(hx, hy); g.stroke();
        if (age > life) { comet = null; nextComet = now + 5000 + Math.random() * 7000; }
      }
      g.restore();
    }
    const run = () => { if (!frame && !stopped && !document.hidden) frame = requestAnimationFrame(draw); };
    const halt = () => { cancelAnimationFrame(frame); frame = 0; };
    addEventListener('scroll', () => { sy = scrollY; }, { passive: true });
    document.addEventListener('visibilitychange', () => document.hidden ? halt() : (prevY = sy = scrollY, run()));
    if (fine) addEventListener('pointermove', e => { trail.push({ x: e.clientX, y: e.clientY, t: performance.now() }); if (trail.length > 40) trail.shift(); }, { passive: true });
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 150); });
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.body);
    addEventListener('load', measure);
    reduce.addEventListener('change', () => { if (reduce.matches) { stopped = true; halt(); c.remove(); } });
    size(); measure(); run();
  }

  /* ------------------------------------------------------------------
   * Glide: wheel input eases toward its target instead of jumping, and
   * in-page links travel there fast enough to light up the warp streaks.
   * Touch, keyboard, scrollbar and find-in-page stay fully native.
   * ------------------------------------------------------------------ */
  function glide() {
    if (!fine) return;
    const doc = document.scrollingElement || root;
    let current = scrollY, target = current, frame = 0, last = 0, tween = null, max = 0, off = false;
    const measure = () => { max = doc.scrollHeight - innerHeight; };
    const ease = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    function step(now) {
      const dt = last ? Math.min(now - last, 50) : 16;
      last = now;
      if (tween) {
        const t = Math.min((now - tween.t0) / tween.dur, 1);
        current = tween.from + (tween.to - tween.from) * ease(t);
        if (t === 1) { target = current; if (tween.done) tween.done(); tween = null; }
      } else {
        current += (target - current) * (1 - Math.exp(-dt / 95));
        if (Math.abs(target - current) < .5) current = target;
      }
      scrollTo(0, current);
      if (tween || current !== target) frame = requestAnimationFrame(step);
      else { frame = 0; last = 0; }
    }
    const go = () => { if (!frame) frame = requestAnimationFrame(step); };
    const stop = () => { cancelAnimationFrame(frame); frame = 0; last = 0; tween = null; current = target = scrollY; };
    // Lets nested scrollers (the form's textarea, open selects) keep the wheel while they can still move.
    function nested(node, dy) {
      for (; node && node !== document.body && node !== root; node = node.parentElement) {
        if (node.matches('textarea, select')) return true;
        const oy = getComputedStyle(node).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight
          && (dy > 0 ? node.scrollTop + node.clientHeight < node.scrollHeight - 1 : node.scrollTop > 0)) return true;
      }
      return false;
    }
    addEventListener('wheel', e => {
      if (off || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || document.body.classList.contains('is-locked')) return;
      if (e.target instanceof Element && nested(e.target, e.deltaY)) return;
      e.preventDefault();
      if (!frame) current = target = scrollY;
      if (tween) { tween = null; target = current; }
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
      target = clamp(target + e.deltaY * unit, 0, max);
      go();
    }, { passive: false });
    document.addEventListener('click', e => {
      const a = e.target instanceof Element && e.target.closest('a[href^="#"]');
      if (off || !a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || a.classList.contains('skip')) return;
      const id = a.getAttribute('href').slice(1), dest = id && document.getElementById(id);
      if (!dest) return;
      e.preventDefault();
      const from = scrollY, to = clamp(dest.getBoundingClientRect().top + from - 80, 0, max);
      const keyboard = e.detail === 0;
      tween = { from, to, t0: performance.now(), dur: clamp(450 + Math.abs(to - from) * .22, 650, 1500),
        done: keyboard ? () => { if (!dest.hasAttribute('tabindex')) dest.setAttribute('tabindex', '-1'); dest.focus({ preventScroll: true }); } : null };
      current = from; last = 0;
      history.pushState(null, '', `#${id}`);
      go();
    });
    addEventListener('keydown', e => { if (frame && !e.metaKey && !e.ctrlKey && !e.altKey) stop(); });
    addEventListener('pointerdown', e => { if (frame && e.target === root) stop(); });
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.body);
    addEventListener('resize', measure);
    reduce.addEventListener('change', () => { if (reduce.matches) { off = true; stop(); root.style.scrollBehavior = ''; } });
    root.style.scrollBehavior = 'auto';
    measure();
  }

  eventHorizon();
  starLayer();
  glide();
})();
