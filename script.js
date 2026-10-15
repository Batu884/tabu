// Address that the contact form sends to. Change this to your real inbox.
const CONTACT_EMAIL = "hello@tabu.com";
// Enter the 10-digit Indian WhatsApp number to show the contact link.
const CONTACT_WHATSAPP = "";

(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  if (reduced) root.classList.add("reduced");

  $("#year").textContent = new Date().getFullYear();
  $$("[data-email]").forEach((a) => { a.href = `mailto:${CONTACT_EMAIL}`; a.textContent = CONTACT_EMAIL; });

  const whatsappNumber = CONTACT_WHATSAPP.replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(whatsappNumber)) {
    const message = "Hi Tabu Digital, I'm interested in a website and SEO/AEO audit.";
    $$("[data-whatsapp-link]").forEach((link) => {
      link.href = `https://wa.me/91${whatsappNumber}?text=${encodeURIComponent(message)}`;
      link.textContent = `+91 ${whatsappNumber}`;
      link.closest("[data-whatsapp-contact]").hidden = false;
    });
  }

  /* ------------------------------------------------------------------
   * Text scramble — used for section kickers and the hero word cycler
   * ------------------------------------------------------------------ */
  const GLYPHS = "!<>-_\\/[]{}=+*^?#01ABCDEFX";
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  function scramble(el, to, dur = 900) {
    if (reduced) { el.textContent = to; return Promise.resolve(); }
    const from = el.textContent;
    const len = Math.max(from.length, to.length);
    const q = Array.from({ length: len }, (_, i) => {
      const start = Math.random() * dur * 0.4;
      return { from: from[i] || "", to: to[i] || "", start, end: start + Math.random() * dur * 0.6, ch: "" };
    });
    const t0 = performance.now();
    cancelAnimationFrame(el._scr);
    return new Promise((resolve) => {
      const frame = (now) => {
        const t = now - t0;
        let out = "", done = 0;
        for (const item of q) {
          if (t >= item.end) { done++; out += esc(item.to); }
          else if (t >= item.start) {
            if (!item.ch || Math.random() < 0.3) item.ch = GLYPHS[(Math.random() * GLYPHS.length) | 0];
            out += `<span class="sc">${esc(item.ch)}</span>`;
          } else out += esc(item.from);
        }
        el.innerHTML = out;
        if (done === q.length) { el.textContent = to; resolve(); }
        else el._scr = requestAnimationFrame(frame);
      };
      el._scr = requestAnimationFrame(frame);
    });
  }

  /* ------------------------------------------------------------------
   * Split headings into masked words
   * ------------------------------------------------------------------ */
  $$(".split").forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", words.join(" "));
    el.textContent = "";
    words.forEach((word, i) => {
      const outer = document.createElement("span");
      outer.className = "w";
      outer.setAttribute("aria-hidden", "true");
      const inner = document.createElement("span");
      inner.style.setProperty("--i", i);
      inner.textContent = word;
      outer.append(inner);
      el.append(outer, i < words.length - 1 ? " " : "");
    });
  });

  /* ------------------------------------------------------------------
   * Reveal on scroll (staggered per parent)
   * ------------------------------------------------------------------ */
  const revealTargets = $$(".reveal, .split, .scramble");
  const show = (el) => {
    el.classList.add("is-visible");
    if (el.classList.contains("scramble")) scramble(el, el.dataset.text || el.textContent, 800);
    if (el.matches(".term")) runTerminal();
  };
  $$(".scramble").forEach((el) => { el.dataset.text = el.textContent; });
  if ("IntersectionObserver" in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        io.unobserve(el);
        const siblings = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
        const idx = Math.max(0, siblings.indexOf(el));
        setTimeout(() => show(el), el.classList.contains("reveal") ? idx * 90 : 0);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    revealTargets.forEach((el) => io.observe(el));
  } else {
    setTimeout(() => revealTargets.forEach(show));
  }

  /* ------------------------------------------------------------------
   * Intro loader → hero sequence
   * ------------------------------------------------------------------ */
  function runLoader(done) {
    const loader = $(".loader");
    let seen = false;
    try { seen = sessionStorage.getItem("tabu-intro") === "1"; } catch (_) {}
    if (!loader || reduced || seen) {
      loader && loader.classList.add("is-gone");
      requestAnimationFrame(() => requestAnimationFrame(done));
      return;
    }
    try { sessionStorage.setItem("tabu-intro", "1"); } catch (_) {}
    document.body.classList.add("is-locked");
    const bar = $(".loader__bar"), count = $(".loader__count span");
    let fontsReady = false;
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { fontsReady = true; });
    const t0 = performance.now(), dur = 1500;
    const tick = (now) => {
      let t = clamp((now - t0) / dur, 0, 1);
      if (t === 1 && !fontsReady && now - t0 < 3500) t = 0.99;
      const e = 1 - Math.pow(1 - t, 3);
      bar.style.setProperty("--p", e);
      count.textContent = Math.round(e * 100);
      if (t < 1) return requestAnimationFrame(tick);
      setTimeout(() => {
        loader.classList.add("is-done");
        document.body.classList.remove("is-locked");
        setTimeout(done, 200);
        setTimeout(() => loader.classList.add("is-gone"), 1100);
      }, 150);
    };
    requestAnimationFrame(tick);
  }

  async function heroSequence() {
    document.body.classList.add("is-loaded");
    const win = $(".hero__window");
    const typed = $(".typed");
    const text = typed.dataset.text;
    if (reduced) {
      typed.textContent = text;
      win.classList.add("is-built");
      $$(".win__stats em").forEach((e) => e.classList.add("is-ok"));
    } else {
      await sleep(900);
      for (let i = 1; i <= text.length; i++) { typed.textContent = text.slice(0, i); await sleep(45 + Math.random() * 50); }
      await sleep(200);
      win.classList.add("is-loading");
      await sleep(650);
      win.classList.add("is-built");
      for (const em of $$(".win__stats em")) { await sleep(220); em.classList.add("is-ok"); }
    }
    startCycler();
  }

  function startCycler() {
    const el = $(".cycler");
    if (!el || reduced) return;
    const words = el.dataset.words.split(",");
    let i = 0;
    setInterval(() => { i = (i + 1) % words.length; scramble(el, words[i], 700); }, 2600);
  }

  runLoader(heroSequence);

  /* ------------------------------------------------------------------
   * Hero particle network
   * ------------------------------------------------------------------ */
  const hero = $(".hero");
  const heroMouse = { x: -9999, y: -9999, nx: 0, ny: 0 };
  (function heroCanvas() {
    const c = $(".hero__canvas");
    if (!c || reduced) return;
    const ctx = c.getContext("2d");
    let w = 0, h = 0, pts = [], running = true;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = c.clientWidth; h = c.clientHeight;
      c.width = w * dpr; c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(120, Math.floor((w * h) / 14000));
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.4 + 0.5,
      }));
    };
    const LINK = 120, MOUSE = 190;
    const frame = () => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        const dx = heroMouse.x - p.x, dy = heroMouse.y - p.y, d = Math.hypot(dx, dy);
        if (d < MOUSE && d > 0.1) { p.x -= (dx / d) * 0.6; p.y -= (dy / d) * 0.6; }
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; else if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; else if (p.y > h) p.y = 0;
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK) {
            ctx.strokeStyle = `rgba(255,255,255,${(1 - d / LINK) * 0.14})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        const dm = Math.hypot(a.x - heroMouse.x, a.y - heroMouse.y);
        if (dm < MOUSE + 60) {
          ctx.strokeStyle = `rgba(255,91,46,${(1 - dm / (MOUSE + 60)) * 0.55})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(heroMouse.x, heroMouse.y); ctx.stroke();
        }
        ctx.fillStyle = dm < MOUSE + 60 ? "rgba(255,154,61,.9)" : "rgba(255,255,255,.45)";
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(frame);
    };
    resize();
    let rt;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
    const setRunning = (on) => { if (on && !running) { running = true; requestAnimationFrame(frame); } else if (!on) running = false; };
    new IntersectionObserver(([e]) => setRunning(e.isIntersecting && !document.hidden)).observe(hero);
    document.addEventListener("visibilitychange", () => setRunning(!document.hidden && hero.getBoundingClientRect().bottom > 0));
    requestAnimationFrame(frame);
  })();

  /* ------------------------------------------------------------------
   * Hero mouse parallax + window tilt (tilt also flattens on scroll)
   * ------------------------------------------------------------------ */
  const heroWin = $(".hero__window");
  const chips = $$(".float-chip");
  const glow = $(".hero__glow");
  function updateHeroWindow() {
    if (reduced) return;
    const base = 16 * (1 - clamp(window.scrollY / 420, 0, 1));
    heroWin.style.transform = `rotateX(${base - heroMouse.ny * 5}deg) rotateY(${heroMouse.nx * 7}deg)`;
  }
  if (!reduced) {
    hero.addEventListener("mousemove", (e) => {
      const r = hero.getBoundingClientRect();
      heroMouse.x = e.clientX - r.left; heroMouse.y = e.clientY - r.top;
      heroMouse.nx = (e.clientX - r.left) / r.width - 0.5;
      heroMouse.ny = (e.clientY - r.top) / r.height - 0.5;
      glow.style.setProperty("--gx", `${heroMouse.nx * 80}px`);
      glow.style.setProperty("--gy", `${heroMouse.ny * 60}px`);
      chips.forEach((c, i) => {
        const depth = (i + 1) * 14;
        c.style.setProperty("--px", `${heroMouse.nx * depth}px`);
        c.style.setProperty("--py", `${heroMouse.ny * depth}px`);
      });
      const wr = heroWin.getBoundingClientRect();
      heroWin.style.setProperty("--mx", `${e.clientX - wr.left}px`);
      heroWin.style.setProperty("--my", `${e.clientY - wr.top}px`);
      updateHeroWindow();
    });
    hero.addEventListener("mouseleave", () => {
      heroMouse.x = heroMouse.y = -9999; heroMouse.nx = heroMouse.ny = 0;
      updateHeroWindow();
    });
    updateHeroWindow();
  }

  /* ------------------------------------------------------------------
   * Custom cursor
   * ------------------------------------------------------------------ */
  if (finePointer && !reduced) {
    root.classList.add("has-cursor");
    const cur = $(".cursor"), dot = $(".cursor__dot"), ring = $(".cursor__ring");
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    window.addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
      cur.classList.remove("is-hidden");
    }, { passive: true });
    const loop = () => {
      rx = lerp(rx, mx, 0.18); ry = lerp(ry, my, 0.18);
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener("mouseover", (e) => {
      const t = e.target;
      cur.classList.toggle("is-text", !!t.closest("input, textarea"));
      cur.classList.toggle("is-hover", !t.closest("input, textarea") && !!t.closest("a, button, summary, select, label"));
    });
    document.addEventListener("mousedown", () => cur.classList.add("is-down"));
    document.addEventListener("mouseup", () => cur.classList.remove("is-down"));
    document.documentElement.addEventListener("mouseleave", () => cur.classList.add("is-hidden"));
  }

  /* ------------------------------------------------------------------
   * Magnetic buttons, 3D tilt, spotlight
   * ------------------------------------------------------------------ */
  if (finePointer && !reduced) {
    $$(".magnetic").forEach((el) => {
      const inner = el.firstElementChild;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
        if (inner) inner.style.transform = `translate(${x * 0.12}px, ${y * 0.15}px)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "";
        if (inner) inner.style.transform = "";
      });
    });

    $$(".tilt").forEach((el) => {
      if (el === heroWin) return;
      const max = el.classList.contains("term") ? 4 : 7;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(1000px) rotateX(${-py * max}deg) rotateY(${px * max}deg)`;
      });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
    });
  }
  $$(".spot").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });

  /* ------------------------------------------------------------------
   * Nav: hover pill, mobile menu, current section
   * ------------------------------------------------------------------ */
  const nav = $(".nav");
  const toggle = $(".nav__toggle");
  const menu = $("#nav-menu");
  const pill = $(".nav__pill");
  $$("a:not(.btn)", menu).forEach((a) => {
    a.addEventListener("mouseenter", () => {
      pill.style.setProperty("--x", `${a.offsetLeft}px`);
      pill.style.setProperty("--w", `${a.offsetWidth}px`);
    });
  });
  const setMenu = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.classList.toggle("is-open", open);
    nav.classList.toggle("menu-open", open);
    if (open) nav.classList.remove("is-hidden");
  };
  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  const navLinks = new Map($$("a:not(.btn)", menu).map((a) => [a.getAttribute("href").slice(1), a]));
  if ("IntersectionObserver" in window) {
    const sio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        navLinks.forEach((a) => a.classList.remove("is-current"));
        const link = navLinks.get(e.target.id);
        if (link) link.classList.add("is-current");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("main section[id]").forEach((s) => sio.observe(s));
  }

  /* ------------------------------------------------------------------
   * Scroll-driven bits: progress, nav, back-to-top, process track
   * ------------------------------------------------------------------ */
  const progress = $(".progress");
  const totop = $(".totop");
  const stepsWrap = $(".steps-wrap");
  const track = $(".steps__track");
  const steps = $$(".step");
  let lastY = window.scrollY, ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? y / max : 0;
    progress.style.setProperty("--p", p);
    totop.style.setProperty("--p", p);
    totop.classList.toggle("is-on", y > 700);
    nav.classList.toggle("is-scrolled", y > 20);
    if (!menu.classList.contains("is-open")) nav.classList.toggle("is-hidden", y > 600 && y > lastY + 2);
    if (y < lastY - 2) nav.classList.remove("is-hidden");
    lastY = y;

    const r = stepsWrap.getBoundingClientRect();
    const sp = clamp((innerHeight * 0.7 - r.top) / r.height, 0, 1);
    stepsWrap.style.setProperty("--p", sp);
    track.style.setProperty("--p", sp);
    const horizontal = track.offsetWidth > track.offsetHeight;
    steps.forEach((s) => {
      const at = horizontal ? (s.offsetLeft + 32) / stepsWrap.offsetWidth : (s.offsetTop + 40) / stepsWrap.offsetHeight;
      s.classList.toggle("is-active", sp >= at);
    });

    updateHeroWindow();
    ticking = false;
  };
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ------------------------------------------------------------------
   * Marquee — speeds up and skews with scroll velocity
   * ------------------------------------------------------------------ */
  (function marquee() {
    const trackEl = $(".marquee__track");
    if (!trackEl || reduced) return;
    const group = $(".marquee__group", trackEl);
    let x = 0, vel = 0, prevY = window.scrollY, dir = 1, visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(trackEl);
    const loop = () => {
      const y = window.scrollY, dy = y - prevY;
      prevY = y;
      if (dy !== 0) dir = dy > 0 ? 1 : -1;
      vel = lerp(vel, clamp(dy, -60, 60), 0.1);
      if (visible) {
        const w = group.offsetWidth;
        x -= (0.6 + Math.abs(vel) * 0.25) * dir;
        if (x <= -w) x += w;
        if (x > 0) x -= w;
        trackEl.style.transform = `translate3d(${x}px,0,0) skewX(${clamp(-vel * 0.25, -10, 10)}deg)`;
      }
      requestAnimationFrame(loop);
    };
    loop();
  })();

  /* ------------------------------------------------------------------
   * Deploy terminal
   * ------------------------------------------------------------------ */
  const term = $(".term__body code");
  let termRun = 0, termStarted = false;
  const SCRIPT = [
    { cmd: "git push production main" },
    { out: '<span class="t-d">Enumerating objects: 18, done.</span>' },
    { out: '<span class="t-d">Writing objects: 100% (18/18), done.</span>', wait: 300 },
    { out: '<span class="t-i">→</span> Building <span class="t-b">yourbusiness.com</span>' },
    { task: "Pages compiled", ms: 600 },
    { task: "Images optimised", ms: 800 },
    { task: "CSS & JS minified", ms: 500 },
    { task: "Accessibility checks passed", ms: 650 },
    { out: '<span class="t-i">→</span> Deploying to production' },
    { task: "Backup snapshot created", ms: 550 },
    { task: "SSL certificate valid", ms: 400 },
    { task: "Zero-downtime release", ms: 700 },
    { out: '  <span class="t-ok">●</span> <span class="t-b">Live</span> at <span class="t-w">https://yourbusiness.com</span>', wait: 600 },
    { out: "" },
    { cmd: "tabu status" },
    { out: '  <span class="t-d">site       </span> yourbusiness.com' },
    { out: '  <span class="t-d">status     </span> <span class="t-ok">● online</span>' },
    { out: '  <span class="t-d">ssl        </span> <span class="t-ok">✓ valid</span>' },
    { out: '  <span class="t-d">backups    </span> <span class="t-ok">✓ scheduled</span>' },
    { out: '  <span class="t-d">monitoring </span> <span class="t-ok">✓ active</span>' },
  ];
  const SPIN = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";
  async function runTerminal() {
    if (termStarted && !runTerminal.force) return;
    termStarted = true; runTerminal.force = false;
    const id = ++termRun;
    const alive = () => id === termRun;
    term.innerHTML = "";
    const prompt = '<span class="t-p">➜</span> <span class="t-i">~/sites/yourbusiness</span> <span class="t-p">$</span> ';
    if (reduced) {
      term.innerHTML = SCRIPT.map((s) => s.cmd ? prompt + `<span class="t-c">${s.cmd}</span>` : s.task ? `  <span class="t-ok">✓</span> ${s.task}` : s.out).join("\n") + "\n" + prompt;
      return;
    }
    for (const step of SCRIPT) {
      if (!alive()) return;
      if (step.cmd) {
        const line = document.createElement("span");
        line.innerHTML = prompt + '<span class="t-c"></span>';
        term.append(line);
        const c = line.lastElementChild;
        await sleep(350);
        for (const ch of step.cmd) { if (!alive()) return; c.textContent += ch; await sleep(35 + Math.random() * 55); }
        await sleep(300);
        term.append("\n");
      } else if (step.task) {
        const line = document.createElement("span");
        term.append(line, "\n");
        const t0 = performance.now();
        let k = 0;
        while (performance.now() - t0 < step.ms) {
          if (!alive()) return;
          line.innerHTML = `  <span class="t-w">${SPIN[k++ % SPIN.length]}</span> ${step.task}<span class="t-d">…</span>`;
          await sleep(70);
        }
        line.innerHTML = `  <span class="t-ok">✓</span> ${step.task} <span class="t-d">(${(step.ms / 1000).toFixed(1)}s)</span>`;
      } else {
        const line = document.createElement("span");
        line.innerHTML = step.out;
        term.append(line, "\n");
        await sleep(step.wait || 160);
      }
    }
    if (alive()) { const l = document.createElement("span"); l.innerHTML = prompt; term.append(l); }
  }
  $(".term__replay").addEventListener("click", () => { runTerminal.force = true; runTerminal(); });

  /* ------------------------------------------------------------------
   * FAQ — animated open/close
   * ------------------------------------------------------------------ */
  $$(".faq details").forEach((d) => {
    const summary = $("summary", d), body = $(".faq__body", d);
    summary.addEventListener("click", (e) => {
      if (reduced || !body.animate) return;
      e.preventDefault();
      if (d._anim) d._anim.cancel();
      if (d.open) {
        d._anim = body.animate({ height: [`${body.offsetHeight}px`, "0px"], opacity: [1, 0] }, { duration: 350, easing: "cubic-bezier(.16,1,.3,1)" });
        d._anim.onfinish = () => { d.open = false; d._anim = null; };
      } else {
        d.open = true;
        d._anim = body.animate({ height: ["0px", `${body.scrollHeight}px`], opacity: [0, 1] }, { duration: 450, easing: "cubic-bezier(.16,1,.3,1)" });
        d._anim.onfinish = () => { d._anim = null; };
      }
    });
  });

  /* ------------------------------------------------------------------
   * Ambient mouse glows: contact section + footer wordmark
   * ------------------------------------------------------------------ */
  const contactSec = $(".section--contact"), contactGlow = $(".contact__glow");
  contactSec.addEventListener("mousemove", (e) => {
    const r = contactSec.getBoundingClientRect();
    contactGlow.style.setProperty("--cx", `${e.clientX - r.left}px`);
    contactGlow.style.setProperty("--cy", `${e.clientY - r.top}px`);
  });
  const word = $(".footer__word");
  $(".footer").addEventListener("mousemove", (e) => {
    const r = word.getBoundingClientRect();
    word.style.setProperty("--fx", `${e.clientX - r.left}px`);
    word.style.setProperty("--fy", `${e.clientY - r.top}px`);
  });

  /* ------------------------------------------------------------------
   * Confetti burst
   * ------------------------------------------------------------------ */
  function burst(x, y, n = 36) {
    if (reduced) return;
    const colors = ["#ff5b2e", "#ff9a3d", "#ffc46b", "#3ddc84", "#ffffff"];
    for (let i = 0; i < n; i++) {
      const p = document.createElement("i");
      p.className = "burst";
      p.style.left = `${x}px`; p.style.top = `${y}px`;
      p.style.background = colors[i % colors.length];
      document.body.append(p);
      const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 180;
      const dx = Math.cos(a) * v, dy = Math.sin(a) * v - 80;
      p.animate([
        { transform: "translate(-50%,-50%) rotate(0deg) scale(1)", opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 160}px)) rotate(${Math.random() * 720}deg) scale(.6)`, opacity: 0 },
      ], { duration: 1100 + Math.random() * 600, easing: "cubic-bezier(.2,.7,.4,1)" }).onfinish = () => p.remove();
    }
  }

  /* ------------------------------------------------------------------
   * Contact form
   * ------------------------------------------------------------------ */
  const form = $("#contact-form");
  $$("[data-plan]").forEach((btn) => btn.addEventListener("click", () => { form.plan.value = btn.dataset.plan; }));
  const note = $(".form__note", form);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let ok = true;
    [form.name, form.email, form.message].forEach((f) => {
      const v = f.value.trim();
      const valid = v && (f.type !== "email" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
      f.classList.remove("is-invalid");
      if (!valid) { void f.offsetWidth; f.classList.add("is-invalid"); ok = false; }
    });
    if (!ok) {
      note.textContent = "Please fill in your name, a valid email and a short message.";
      note.className = "form__note is-error";
      return;
    }
    const name = form.name.value.trim(), biz = form.business.value.trim();
    const subject = `New project enquiry — ${name}${biz ? ` (${biz})` : ""}`;
    const body = [`Name: ${name}`, `Email: ${form.email.value.trim()}`, `Business: ${biz || "—"}`, `Interested in: ${form.plan.value}`, "", form.message.value.trim()].join("\n");
    const btn = $("button[type=submit]", form).getBoundingClientRect();
    burst(btn.left + btn.width / 2, btn.top + btn.height / 2);
    note.textContent = "Opening your email app — just hit send and we'll be in touch.";
    note.className = "form__note is-ok";
    setTimeout(() => { window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; }, 500);
  });
  form.addEventListener("input", (e) => e.target.classList.remove("is-invalid"));

  /* ------------------------------------------------------------------
   * Little extras for the curious
   * ------------------------------------------------------------------ */
  const title = document.title;
  document.addEventListener("visibilitychange", () => { document.title = document.hidden ? "Your website is waiting · Tabu" : title; });

  const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let kp = 0;
  document.addEventListener("keydown", (e) => {
    kp = e.key === KONAMI[kp] ? kp + 1 : (e.key === KONAMI[0] ? 1 : 0);
    if (kp === KONAMI.length) {
      kp = 0;
      for (let i = 0; i < 5; i++) setTimeout(() => burst(Math.random() * innerWidth, Math.random() * innerHeight * 0.6, 30), i * 180);
    }
  });

  console.log(
    "%ctabu%c\nHand-built, self-hosted, looked after.\nPoking around the source? We like you already → " + CONTACT_EMAIL,
    "font: 700 42px 'Space Grotesk', sans-serif; color: #ff5b2e; letter-spacing: -2px;",
    "font: 13px 'JetBrains Mono', monospace; color: #a4abbb;"
  );
})();
