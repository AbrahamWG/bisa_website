/* BISA site behaviour. No dependencies. Content lives in content.js. */
(() => {
  'use strict';

  const C = window.BISA_CONTENT || {};
  const SH = window.BISA_SHAPES;
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ss = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const img = n => `assets/img/${n}.webp`;
  const fmt = n => Math.round(n).toLocaleString('en-US');
  if (RM) root.classList.add('rm');

  /* one shared frame loop */
  const tasks = [];
  let lastY = window.scrollY;
  function frame(t) {
    const y = window.scrollY, vy = y - lastY; lastY = y;
    for (const f of tasks) f(t, y, vy);
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------------- links */
  function links() {
    const L = C.links || {};
    $$('[data-link]').forEach(a => { const u = L[a.dataset.link]; if (u) { a.href = u; a.target = '_blank'; a.rel = 'noopener'; } });
  }

  /* ---------------------------------------------------------------- render content */
  function renderEvents() {
    const list = $('#ev-list'), chips = $('#ev-chips'), foot = $('#ev-foot');
    const E = C.events || [];
    if (!list || !E.length) return;
    list.innerHTML = E.map((e, i) => `
      <li data-year="${e.year}">
        <button class="ev__row" type="button" data-i="${i}" aria-label="${esc(e.name)}, ${e.year}. Open photo">
          <span class="ev__year">${e.year}</span>
          <span class="ev__name">${esc(e.name)}</span>
          <img class="ev__thumb" src="${img(e.img)}" width="${e.w}" height="${e.h}" loading="lazy" alt="">
          <span class="ev__go" aria-hidden="true"><svg><use href="#i-arrow"/></svg></span>
        </button>
      </li>`).join('');

    const years = [...new Set(E.map(e => e.year))].sort((a, b) => b - a);
    chips.innerHTML = ['All', ...years].map((y, i) => `<button class="chip" type="button" data-y="${y}" aria-pressed="${i === 0}">${y}</button>`).join('');
    const rows = $$('li', list);
    const say = y => { const n = rows.filter(r => !r.hidden).length; foot.textContent = `${n} ${n === 1 ? 'event' : 'events'} on record${y === 'All' ? `, ${years[years.length - 1]} to ${years[0]}` : ` in ${y}`}`; };
    say('All');
    chips.addEventListener('click', ev => {
      const b = ev.target.closest('.chip'); if (!b) return;
      $$('.chip', chips).forEach(c => c.setAttribute('aria-pressed', c === b));
      rows.forEach(r => { r.hidden = b.dataset.y !== 'All' && r.dataset.year !== b.dataset.y; });
      say(b.dataset.y);
    });

    /* lightbox */
    const lb = $('#lb'), lbImg = $('#lb-img'), lbCap = $('#lb-cap'), lbPos = $('#lb-pos');
    let cur = 0;
    const visible = () => rows.filter(r => !r.hidden).map(r => +$('.ev__row', r).dataset.i);
    const show = i => {
      cur = i; const e = E[i], v = visible();
      lbImg.src = img(e.img); lbImg.width = e.w; lbImg.height = e.h; lbImg.alt = `${e.name}, ${e.year}`;
      lbCap.textContent = `${e.name}, ${e.year}`;
      lbPos.textContent = `${v.indexOf(i) + 1} / ${v.length}`;
    };
    const step = d => { const v = visible(); show(v[(v.indexOf(cur) + d + v.length) % v.length]); };
    list.addEventListener('click', ev => {
      const b = ev.target.closest('.ev__row'); if (!b) return;
      show(+b.dataset.i);
      if (lb.showModal) lb.showModal(); else lb.setAttribute('open', '');
    });
    $('#lb-prev').addEventListener('click', () => step(-1));
    $('#lb-next').addEventListener('click', () => step(1));
    $('#lb-close').addEventListener('click', () => lb.close());
    lb.addEventListener('click', ev => { if (ev.target === lb) lb.close(); });
    lb.addEventListener('keydown', ev => { if (ev.key === 'ArrowLeft') step(-1); if (ev.key === 'ArrowRight') step(1); });

    /* cursor-following preview */
    const pv = $('#ev-preview'), pvImg = $('img', pv);
    if (FINE && !RM) {
      let tx = 0, ty = 0, x = 0, y = 0, on = false, warmed = false;
      list.addEventListener('pointerover', ev => {
        const b = ev.target.closest('.ev__row'); if (!b) return;
        if (!warmed) { warmed = true; E.forEach(e => { new Image().src = img(e.img); }); }
        pvImg.src = img(E[+b.dataset.i].img);
        if (!on) { x = ev.clientX; y = ev.clientY; }
        on = true; pv.classList.add('is-on');
      });
      list.addEventListener('pointermove', ev => { tx = ev.clientX; ty = ev.clientY; });
      list.addEventListener('pointerleave', () => { on = false; pv.classList.remove('is-on'); });
      tasks.push(() => {
        if (!on && Math.abs(tx - x) < .5) return;
        const px = x; x = lerp(x, tx, .14); y = lerp(y, ty, .14);
        const off = innerWidth * .16;
        pv.style.transform = `translate3d(${x + off}px,${y}px,0) rotate(${clamp((x - px) * .35, -9, 9)}deg)`;
      });
    }
  }

  function renderTeam() {
    const ul = $('#people'), T = C.team || [];
    if (!ul) return;
    const initials = n => n.split(/\s+/).map(w => w[0]).slice(0, 2).join('');
    ul.innerHTML = T.map((p, i) => `
      <li class="person" data-reveal style="--i:${i % 4}">
        <div class="person__ph">
          ${p.img ? `<img src="${img(p.img)}" width="640" height="640" loading="lazy" alt="${p.mascot ? `${esc(p.name)} the cat` : `Portrait of ${esc(p.name)}`}">` : `<span class="person__mono" aria-hidden="true">${esc(initials(p.name))}</span>`}
          ${p.mascot ? '<span class="person__tag">Meow</span>' : ''}
        </div>
        <div class="person__meta"><b>${esc(p.name)}</b><span>${esc(p.role)}${p.note ? `<br>${esc(p.note)}` : ''}</span></div>
      </li>`).join('') + `
      <li class="person person--you" data-reveal style="--i:3">
        <div class="person__ph"><svg aria-hidden="true"><use href="#i-plus"/></svg></div>
        <div class="person__meta"><b><a href="${esc((C.links || {}).apply || '#join')}" target="_blank" rel="noopener">You, next year?</a></b><span>Elections happen every spring</span></div>
      </li>`;
    const d = $('#depts');
    if (d) d.innerHTML = (C.departments || []).map(n => `<span>${esc(n)}</span>`).join('<i>/</i> ');

    if (FINE && !RM) $$('.person', ul).forEach(el => {
      const ph = $('.person__ph', el);
      el.addEventListener('pointermove', e => {
        const r = ph.getBoundingClientRect();
        ph.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 14 + 'deg');
        ph.style.setProperty('--rx', ((e.clientY - r.top) / r.height - .5) * -10 + 'deg');
      });
      el.addEventListener('pointerleave', () => { ph.style.setProperty('--ry', '0deg'); ph.style.setProperty('--rx', '0deg'); });
    });
  }

  function renderMerch() {
    const ul = $('#merch-grid');
    if (!ul) return;
    ul.innerHTML = (C.merch || []).map((m, i) => `
      <li class="item" data-reveal style="--i:${i}">
        <div class="item__ph">
          ${m.img ? `<img src="${img(m.img)}" width="1080" height="1080" loading="lazy" alt="${esc(m.name)}">` : `<div class="item__words" aria-hidden="true">${(m.words || []).map(w => `<span>${esc(w)}</span>`).join('')}</div>`}
          <span class="item__price">${esc(m.price)}</span>
        </div>
        <div class="item__body">
          <h3>${esc(m.name)}</h3>
          <p>${esc(m.text)}</p>
          <p class="mono">${esc(m.note || '')}</p>
          ${m.href ? `<a class="btn btn--sm btn--solid" href="${esc(m.href)}" target="_blank" rel="noopener">Get one now <svg aria-hidden="true"><use href="#i-arrow"/></svg></a>` : ''}
        </div>
      </li>`).join('');
  }

  function renderFaq() {
    const box = $('#faq-list'), L = C.links || {};
    if (!box) return;
    const fill = s => s.replace(/\{(\w+)\}/g, (m, k) => L[k] || m).replace(/<a href='(https?:[^']+)'/g, "<a target='_blank' rel='noopener' href='$1'");
    box.innerHTML = (C.faq || []).map((f, i) => `
      <details class="q" name="faq"${i === 0 ? ' open' : ''}>
        <summary><span>${esc(f.q)}</span><span class="q__i" aria-hidden="true"><svg><use href="#i-plus"/></svg></span></summary>
        <div class="q__a"><p>${fill(f.a)}</p></div>
      </details>`).join('');
  }

  /* ---------------------------------------------------------------- hero: 18,307 dots */
  function hero() {
    const track = $('.hero__track'), stick = $('.hero__stick'), cv = $('.hero__canvas');
    if (!track || !cv || !SH) return;
    const panels = [1, 2, 3].map(i => $('.hero__panel--' + i));
    const labelBox = $('.hero__labels'), labels = $$('.hero__label'), kmEl = $('[data-km]');
    const N = SH.n;
    const dec = b => { const s = atob(b), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new Uint16Array(u.buffer); };
    const ia = dec(SH.islands.b64), lg = dec(SH.logo.b64);

    let seed = 1985;
    const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const perm = new Uint32Array(N); for (let i = 0; i < N; i++) perm[i] = i;
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }

    /* aA: archipelago (width = 1). aB: the mark (height = 1). aS: west-to-east order plus three random seeds. */
    const aA = new Float32Array(N * 2), aB = new Float32Array(N * 2), aS = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      aA[2 * i] = ia[2 * i] / 65535 - .5;
      aA[2 * i + 1] = (ia[2 * i + 1] / 65535 - .5) / SH.islands.aspect;
      const j = perm[i];
      aB[2 * i] = (lg[2 * j] / 65535 - .5) * SH.logo.aspect;
      aB[2 * i + 1] = lg[2 * j + 1] / 65535 - .5;
      aS[4 * i] = i / N; aS[4 * i + 1] = rnd(); aS[4 * i + 2] = rnd(); aS[4 * i + 3] = rnd();
    }

    let W = 0, H = 0, dpr = 1, TA = [0, 0, 1], TB = [0, 0, 1];
    const gl = cv.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'high-performance' });
    let U = null;

    if (gl) {
      const VS = `
        attribute vec2 aA; attribute vec2 aB; attribute vec4 aS;
        uniform vec2 uRes; uniform vec3 uTA; uniform vec3 uTB; uniform vec3 uMouse;
        uniform float uT, uP, uIntro, uDpr;
        varying vec3 vCol; varying float vAl;
        void main(){
          vec2 a = uTA.xy + aA * uTA.z;
          vec2 b = uTB.xy + aB * uTB.z;
          float st = aS.y * .42;
          float e = smoothstep(st, st + .58, uP);
          float arc = sin(3.14159 * e);
          vec2 d = b - a;
          vec2 pos = mix(a, b, e);
          pos += vec2(-d.y, d.x) * arc * (aS.z - .5) * .85;
          pos += vec2(sin(uT * .7 + aS.w * 40.), cos(uT * .6 + aS.z * 40.)) * arc * uRes.y * .06;
          pos.y -= arc * uRes.y * .1 * aS.w;

          float it = aS.x * .6;
          float ie = smoothstep(it, it + .4, uIntro);
          ie = 1. - pow(1. - ie, 3.);
          vec2 from = vec2(a.x + (aS.z - .5) * uRes.x * .35, a.y + uRes.y * (.35 + aS.w * .7));
          pos = mix(from, pos, ie);

          float calm = 1. - arc;
          pos.y += sin(pos.x * .011 + uT * .9 + aS.w * 2.) * 1.6 * calm * (1. - e * .7);
          pos.x += cos(pos.y * .013 + uT * .7) * 1.1 * calm * (1. - e * .7);

          vec2 m = pos - uMouse.xy;
          float md = length(m);
          pos += (m / (md + .001)) * exp(-md * md / 16000.) * uMouse.z * (26. + 70. * aS.w);

          vec2 c = pos / uRes * 2. - 1.;
          gl_Position = vec4(c.x, -c.y, 0., 1.);
          gl_PointSize = (mix(1.25 + aS.w * 1.9, 1.5 + aS.w * 1.5, e) + arc * 1.6 * aS.z) * uDpr;

          vec3 mori = vec3(.96, .94, .89), emas = vec3(.992, .718, .098), merah = vec3(1., .33, .30), nila = vec3(.62, .68, 1.);
          vec3 ca = mori;
          if (aS.y > .9) ca = emas; else if (aS.y > .84) ca = merah; else if (aS.y < .22) ca = nila;
          vec3 cb = mix(emas, vec3(1., .9, .6), aS.w * aS.w * .55);
          vCol = mix(ca, cb, smoothstep(.15, .9, e));
          float tw = .62 + .38 * sin(uT * 1.6 + aS.w * 60.);
          vAl = mix(tw, .82 + .18 * tw, e) * ie;
        }`;
      const FS = `
        precision mediump float;
        varying vec3 vCol; varying float vAl;
        void main(){
          float d = length(gl_PointCoord - .5);
          float a = smoothstep(.5, .18, d) * vAl;
          gl_FragColor = vec4(vCol * a, a);
        }`;
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
      const pr = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
      if (gl.getProgramParameter(pr, gl.LINK_STATUS)) {
        gl.useProgram(pr);
        const attr = (name, data, size) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); const l = gl.getAttribLocation(pr, name); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0); };
        attr('aA', aA, 2); attr('aB', aB, 2); attr('aS', aS, 4);
        U = {}; ['uRes', 'uTA', 'uTB', 'uMouse', 'uT', 'uP', 'uIntro', 'uDpr'].forEach(n => { U[n] = gl.getUniformLocation(pr, n); });
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.clearColor(0, 0, 0, 0);
      }
    }
    const ctx2d = U ? null : cv.getContext('2d');

    function layout() {
      W = stick.clientWidth; H = stick.clientHeight; dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      const m = W < 760;
      const mw = m ? W * 1.34 : Math.min(W * .88, H * 1.62, 1600);
      TA = [W * .5, m ? H * .27 : H * .385, mw];
      TB = [m ? W * .5 : W * .73, m ? H * .29 : H * .53, m ? H * .36 : Math.min(H * .68, W * .62)];
      const [x0, , x1, y1] = SH.islands.bbox, y0 = SH.islands.bbox[1];
      labels.forEach(l => {
        const nx = (+l.dataset.lon - x0) / (x1 - x0) - .5, ny = ((y1 - +l.dataset.lat) / (y1 - y0) - .5) / SH.islands.aspect;
        l.style.left = (TA[0] + nx * mw).toFixed(1) + 'px'; l.style.top = (TA[1] + ny * mw).toFixed(1) + 'px';
      });
      if (U) gl.viewport(0, 0, cv.width, cv.height);
      else if (ctx2d) {
        ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0); ctx2d.clearRect(0, 0, W, H); ctx2d.fillStyle = 'rgba(245,240,228,.8)';
        for (let i = 0; i < N; i++) ctx2d.fillRect(TA[0] + aA[2 * i] * mw, TA[1] + aA[2 * i + 1] * mw, 1.3, 1.3);
      }
    }
    layout();
    addEventListener('resize', layout);

    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, s: 0, ts: 0 };
    stick.addEventListener('pointermove', e => { const r = stick.getBoundingClientRect(); mouse.tx = e.clientX - r.left; mouse.ty = e.clientY - r.top; mouse.ts = e.pointerType === 'touch' ? 0 : 1; if (mouse.s < .02) { mouse.x = mouse.tx; mouse.y = mouse.ty; } });
    stick.addEventListener('pointerleave', () => { mouse.ts = 0; });

    let inView = true, prog = 0, t0 = 0, kmShown = -1;
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { inView = es[0].isIntersecting; }).observe(stick);
    const put = (el, o, y) => { el.style.opacity = o.toFixed(3); el.style.visibility = o < .01 ? 'hidden' : 'visible'; el.style.pointerEvents = o > .6 ? '' : 'none'; el.style.transform = `translate3d(0,${y.toFixed(1)}px,0)`; };

    tasks.push(t => {
      if (!t0) t0 = t;
      const r = track.getBoundingClientRect(), span = r.height - innerHeight;
      const target = RM || span <= 0 ? 0 : clamp(-r.top / span);
      prog = lerp(prog, target, .1); if (Math.abs(prog - target) < .0004) prog = target;
      if (!inView) return;

      const o1 = 1 - ss(.03, .13, prog), o2 = ss(.2, .3, prog) * (1 - ss(.5, .6, prog)), o3 = ss(.74, .86, prog);
      put(panels[0], o1, -prog * 260);
      put(panels[1], o2, (prog - .4) * -160);
      put(panels[2], o3, (1 - o3) * 40);
      labelBox.style.opacity = (1 - ss(.02, .1, prog)).toFixed(3);
      const km = Math.round(13950 * ss(.19, .42, prog) / 10) * 10;
      if (km !== kmShown) { kmShown = km; kmEl.textContent = fmt(km); }

      if (!U) return;
      mouse.x = lerp(mouse.x, mouse.tx, .16); mouse.y = lerp(mouse.y, mouse.ty, .16); mouse.s = lerp(mouse.s, mouse.ts, .08);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U.uRes, W, H); gl.uniform3f(U.uTA, TA[0], TA[1], TA[2]); gl.uniform3f(U.uTB, TB[0], TB[1], TB[2]);
      gl.uniform3f(U.uMouse, mouse.x, mouse.y, mouse.s);
      gl.uniform1f(U.uT, RM ? 0 : t / 1000);
      gl.uniform1f(U.uP, clamp((prog - .1) / .68));
      gl.uniform1f(U.uIntro, RM ? 1 : clamp((t - t0) / 2800));
      gl.uniform1f(U.uDpr, dpr);
      gl.drawArrays(gl.POINTS, 0, N);
    });
  }

  /* ---------------------------------------------------------------- nav */
  function nav() {
    const bar = $('#nav'), menu = $('#menu'), tog = $('#menu-toggle');
    let open = false;
    const set = v => { open = v; menu.hidden = !v; tog.setAttribute('aria-expanded', v); tog.setAttribute('aria-label', v ? 'Close menu' : 'Open menu'); document.body.style.overflow = v ? 'hidden' : ''; };
    tog.addEventListener('click', () => set(!open));
    menu.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && open) set(false); });
    matchMedia('(min-width: 901px)').addEventListener('change', e => { if (e.matches) set(false); });

    let acc = 0;
    tasks.push((t, y, vy) => {
      if (open || y < 300) { bar.classList.remove('is-hidden'); acc = 0; return; }
      acc = Math.sign(vy) === Math.sign(acc) ? acc + vy : vy;
      if (acc > 60) bar.classList.add('is-hidden'); else if (acc < -30) bar.classList.remove('is-hidden');
    });

    const map = new Map($$('.nav__links a').map(a => [a.getAttribute('href').slice(1), a]));
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => es.forEach(e => { const a = map.get(e.target.id); if (a) { if (e.isIntersecting) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); } }), { rootMargin: '-45% 0px -50% 0px' });
      map.forEach((a, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
    }
  }

  /* ---------------------------------------------------------------- scroll-lit statement */
  function lit() {
    const el = $('.lit'); if (!el || RM) return;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const f = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(p => { if (!p) return; if (/^\s+$/.test(p)) f.append(' '); else { const s = document.createElement('span'); s.className = 'w'; s.textContent = p; f.append(s); } });
          n.replaceWith(f);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el); el.classList.add('is-armed');
    const ws = $$('.w', el); let shown = -1;
    tasks.push(() => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) return;
      const n = Math.round(clamp((innerHeight * .88 - r.top) / (innerHeight * .5 + r.height)) * ws.length * 1.12);
      if (n === shown) return; shown = n;
      ws.forEach((w, i) => w.classList.toggle('on', i < n));
    });
  }

  /* ---------------------------------------------------------------- parallax, counters, fit text, reveal */
  function parallax() {
    if (RM) return;
    const els = $$('[data-par]').map(el => ({ el, k: +el.dataset.par, y: 0 }));
    tasks.push(() => {
      for (const p of els) {
        const r = p.el.getBoundingClientRect();
        if (r.bottom < -300 || r.top > innerHeight + 300) continue;
        const ty = (r.top - p.y + r.height / 2 - innerHeight / 2) * p.k;
        p.y = lerp(p.y, ty, .12);
        p.el.style.translate = `0 ${p.y.toFixed(1)}px`;
      }
    });
  }

  function counters() {
    const els = $$('[data-count]');
    if (RM || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return; io.unobserve(e.target);
      const el = e.target, end = +el.dataset.count, plain = el.hasAttribute('data-plain'), from = plain ? end - 40 : 0, t0 = performance.now(), dur = 1700;
      const tick = t => { const k = clamp((t - t0) / dur), v = from + (end - from) * (1 - Math.pow(1 - k, 4)); el.textContent = plain ? Math.round(v) : fmt(v); if (k < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }), { threshold: .6 });
    els.forEach(el => io.observe(el));
  }

  function fit() {
    const els = $$('[data-fit]');
    const run = () => els.forEach(el => {
      const s = el.firstElementChild; if (!s) return;
      el.style.fontSize = '100px';
      const w = s.offsetWidth, avail = el.clientWidth;
      if (w > 0 && avail > 0) el.style.fontSize = (100 * avail / w * (parseFloat(el.dataset.fit) || .985)).toFixed(2) + 'px';
      else el.style.fontSize = '';
    });
    run();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
    addEventListener('resize', run);
  }

  function reveal() {
    const els = $$('[data-reveal]');
    if (RM || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.remove('pre'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -7% 0px' });
    els.forEach(el => { if (el.getBoundingClientRect().top > innerHeight * .92) { el.classList.add('pre'); io.observe(el); } });
  }

  /* ---------------------------------------------------------------- nusantara: sideways strip */
  function strip() {
    const box = $('.nus__h'), tr = $('.nus__track'); if (!box || !tr) return;
    const front = $('.nus__word--line span'), back = $('.nus__word:not(.nus__word--line) span'), hint = $('.nus__hint');
    const mq = matchMedia('(min-width: 900px) and (min-height: 520px)');
    let dist = 0, x = 0;
    const setup = () => {
      const on = mq.matches && !RM;
      root.classList.toggle('hmode', on);
      tr.style.transform = '';
      if (on) { dist = Math.max(0, tr.scrollWidth - innerWidth); box.style.setProperty('--h', Math.round(innerHeight + dist * .9) + 'px'); }
      else box.style.removeProperty('--h');
    };
    setup(); addEventListener('resize', setup); addEventListener('load', setup);
    tasks.push(() => {
      if (!root.classList.contains('hmode')) return;
      const r = box.getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100) return;
      const p = clamp(-r.top / (r.height - innerHeight));
      x = lerp(x, p, .12); if (Math.abs(x - p) < .0003) x = p;
      tr.style.transform = `translate3d(${(-x * dist).toFixed(1)}px,0,0)`;
      const sc = 1 + x * .06;
      if (front) front.style.transform = `scale(${sc})`;
      if (back) back.style.transform = `scale(${sc})`;
      if (hint) hint.style.opacity = (1 - ss(.7, .9, x)).toFixed(2);
    });
  }

  /* ---------------------------------------------------------------- two clocks */
  function clocks() {
    const b = $('#clock-b'), j = $('#clock-j'), bd = $('#clock-b-d'), jd = $('#clock-j-d'), note = $('#clock-note');
    if (!b || !j) return;
    const mk = (tz, o) => new Intl.DateTimeFormat('en-US', { timeZone: tz, ...o });
    const tick = () => {
      try {
        const now = new Date();
        const T = { hour: 'numeric', minute: '2-digit' }, D = { weekday: 'long' };
        b.textContent = mk('America/Los_Angeles', T).format(now); j.textContent = mk('Asia/Jakarta', T).format(now);
        bd.textContent = mk('America/Los_Angeles', D).format(now) + ' · Pacific Time';
        jd.textContent = mk('Asia/Jakarta', D).format(now) + ' · WIB';
        const h = +mk('Asia/Jakarta', { hour: 'numeric', hour12: false }).format(now) % 24;
        note.textContent = h >= 7 && h < 22 ? 'They’re awake back home. Good time to call.' : 'Everyone back home is asleep. Text instead.';
      } catch (e) { /* Intl time zones unavailable: keep the static text */ }
    };
    tick(); setInterval(tick, 15000);
  }

  /* ---------------------------------------------------------------- small things */
  function copy() {
    $$('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
      const text = btn.dataset.copy, label = btn.dataset.label;
      const done = msg => { btn.firstChild.textContent = msg + ' '; setTimeout(() => { btn.firstChild.textContent = label + ' '; }, 2600); };
      try { await navigator.clipboard.writeText(text); done('Email copied'); }
      catch (e) { done(text); }
    }));
  }

  function magnetic() {
    if (!FINE || RM) return;
    $$('[data-mag]').forEach(el => {
      el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); el.style.transform = `translate(${((e.clientX - r.left) / r.width - .5) * 14}px,${((e.clientY - r.top) / r.height - .5) * 12}px)`; });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------------------------------------------------------------- go */
  const safe = fn => { try { fn(); } catch (e) { console.error(e); } };
  [renderEvents, renderTeam, renderMerch, renderFaq, links, hero, nav, lit, strip, fit, parallax, counters, clocks, copy, magnetic, reveal].forEach(safe);
  requestAnimationFrame(frame);
})();
