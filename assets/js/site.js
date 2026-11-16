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
  if (window.BISA_FOOTER) window.BISA_FOOTER(); // shared footer from layout.js

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

  /* ---------------------------------------------------------------- events: highlights */
  /* A few events shown big at the top of the Events page, picked in content.js under "highlights". The section
     pins and the scroll steps through them: the title rolls out and in, and the next photo wipes up over the last.
     With reduced motion, or on very short screens, it stays a plain list. */
  function highlights() {
    const sec = $('.hl'), list = $('#hl-items'), rail = $('#hl-rail'), E = C.events || [];
    if (!sec || !list || !rail) return;
    const track = $('.hl__track', sec), stick = $('.hl__stick', sec);
    const data = (C.highlights || []).map(h => { const i = E.findIndex(e => e.img === h.event); return i < 0 ? null : { ...h, e: E[i] }; }).filter(Boolean);
    if (!data.length) { sec.remove(); return; }
    const n2 = n => String(n).padStart(2, '0'), word = x => `<span class="hl__w"><span>${esc(x)}</span></span>`;
    list.innerHTML = data.map((d, n) => `
      <li class="hl__item">
        <div class="hl__copy">
          <p class="eyebrow"><i>${esc(d.pillar || 'Acara')}</i>${d.pillarEn ? `<span>${esc(d.pillarEn)}</span>` : ''}</p>
          <h3 class="hl__title">${(d.title || d.e.name).split(/\s+/).filter(Boolean).map(word).join(' ')} <em>${word(d.e.year)}</em></h3>
        </div>
        <div class="hl__ph"><img src="${img(d.photo || d.e.img)}"${n ? ' loading="lazy"' : ''} alt="${esc(d.e.name)}, ${d.e.year}"></div>
      </li>`).join('');
    rail.innerHTML = data.map((d, n) => `<li><button class="mono" type="button" data-n="${n}" aria-label="Highlight ${n + 1} of ${data.length}: ${esc(d.e.name)}, ${d.e.year}"><i><b></b></i>${n2(n + 1)}</button></li>`).join('');

    const items = $$('.hl__item', list), tabs = $$('button', rail), N = items.length;
    const mq = matchMedia('(min-height: 480px)');
    const io = t => t * t * (3 - 2 * t);
    let pin = false, step = 1, f = -1, drawn = -1, cur = -1;

    const setup = () => {
      pin = !RM && mq.matches;
      sec.classList.toggle('hl--pin', pin);
      f = drawn = cur = -1;
      if (!pin) { track.style.removeProperty('--h'); items.forEach(it => it.removeAttribute('style')); return; }
      $$('img', list).forEach(im => { im.loading = 'eager'; });
      const H = stick.clientHeight;
      step = H * .85;   // scroll distance per highlight
      track.style.setProperty('--h', Math.round((N - 1) * step + H * 1.25) + 'px');
    };
    setup(); addEventListener('resize', setup); mq.addEventListener('change', setup);

    rail.addEventListener('click', ev => {
      const bt = ev.target.closest('button'); if (!bt || !pin) return;
      scrollTo({ top: scrollY + track.getBoundingClientRect().top + bt.dataset.n * step, behavior: 'smooth' });
    });

    tasks.push(() => {
      if (!pin) return;
      const r = track.getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100) return;
      const target = clamp(-r.top / step, 0, N - 1);
      f = f < 0 ? target : lerp(f, target, .1); if (Math.abs(f - target) < .0004) f = target;
      if (f === drawn) return; drawn = f;

      // k is the highlight on screen, t is how far the next one has come in. Each one rests before it moves
      const k = Math.min(N - 1, Math.floor(f)), t = k >= N - 1 ? 0 : io(clamp((f - k - .16) / .68));
      items.forEach((it, n) => {
        const out = n === k, inc = n === k + 1, s = it.style;
        s.visibility = out || inc && t > 0 ? 'visible' : 'hidden';
        if (!out && !inc) return;
        s.setProperty('--y', (out ? -112 * io(clamp(t / .55)) : 112 * (1 - io(clamp((t - .35) / .65)))).toFixed(2) + '%');   // title rolls up and out, then the next rolls in
        s.setProperty('--o', (out ? 1 - clamp(t / .4) : clamp((t - .6) / .4)).toFixed(3));                                  // small label fades
        s.setProperty('--c', (out ? 0 : (1 - t) * 100).toFixed(2) + '%');                                                   // photo wipes up from the bottom
        s.setProperty('--s', (out ? -12 * t : 16 * (1 - t)).toFixed(2) + '%');                                              // both photos travel a little with the wipe
      });
      const on = t > .5 ? k + 1 : k;
      if (on !== cur) { cur = on; tabs.forEach((bt, n) => bt.setAttribute('aria-current', n === on ? 'true' : 'false')); }
      tabs.forEach((bt, n) => bt.style.setProperty('--p', clamp(f - n + 1).toFixed(3)));
    });
  }

  /* ---------------------------------------------------------------- events: archive */
  /* Every event on one sideways strip, newest first, with a tall year marker in front of each year.
     The year buttons glide the strip to that year, and the strip marks the year you have scrolled to. */
  function archive() {
    const strip = $('#ar-strip'), yrs = $('#ar-years'), E = C.events || [];
    if (!strip || !yrs || !E.length) return;
    const years = [...new Set(E.map(e => e.year))];
    const of = y => E.map((e, i) => ({ e, i })).filter(o => o.e.year === y);
    const n2 = n => String(n).padStart(2, '0'), evs = n => `${n} ${n === 1 ? 'event' : 'events'}`;
    strip.innerHTML = years.map(y => {
      const g = of(y);
      return `
      <li class="ar__mark" data-y="${y}" aria-hidden="true"><span class="mono">${evs(g.length)}</span><b>${y}</b></li>` + g.map((o, j) => `
      <li class="ar__card" data-reveal style="--i:${j % 4}">
        <button class="ar__btn" type="button" data-open="${o.i}" aria-label="${esc(o.e.name)}, ${y}. Open photo">
          <span class="ar__ph"><img src="${img(o.e.img)}" width="${o.e.w}" height="${o.e.h}" loading="lazy" alt="" draggable="false"></span>
          <span class="ar__meta"><span class="mono">${y} · ${n2(j + 1)} / ${n2(g.length)}</span><span class="ar__name">${esc(o.e.name)}</span><span class="ar__go" aria-hidden="true"><svg><use href="#i-arrow"/></svg></span></span>
        </button>
      </li>`).join('');
    }).join('');
    yrs.innerHTML = years.map((y, i) => `<button class="yr" type="button" data-y="${y}" aria-pressed="${i === 0}" aria-label="${y}, ${evs(of(y).length)}"><b>${y}</b><sup class="mono" aria-hidden="true">${of(y).length}</sup></button>`).join('');
    const foot = $('#ar-foot');
    if (foot) foot.textContent = `${evs(E.length)}, ${Math.min(...years)} to ${Math.max(...years)}`;

    const marks = $$('.ar__mark', strip), btns = $$('.yr', yrs), cards = $$('.ar__card', strip), pics = cards.map(c => $('img', c));
    const bar = $('#ar-bar'), prev = $('#ar-prev'), next = $('#ar-next');
    const how = RM ? 'auto' : 'smooth';
    const pad = () => parseFloat(getComputedStyle(strip).paddingLeft) || 0;
    let active = years[0], lock = 0, last = -1, glide = 0;

    const setYear = y => {
      if (y === active) return; active = y;
      btns.forEach(b => {
        const hit = +b.dataset.y === y; b.setAttribute('aria-pressed', hit);
        if (hit) yrs.scrollTo({ left: b.offsetLeft - (yrs.clientWidth - b.offsetWidth) / 2, behavior: how });   // keep the picked year in view on phones
      });
    };
    yrs.addEventListener('click', ev => {
      const b = ev.target.closest('.yr'); if (!b) return;
      const m = marks.find(el => el.dataset.y === b.dataset.y); if (!m) return;
      glide = 0; lock = performance.now() + 1000;   // hold the picked year while the strip travels there
      setYear(+b.dataset.y);
      strip.scrollTo({ left: m.offsetLeft - pad(), behavior: how });
    });
    const page = d => { glide = 0; strip.scrollBy({ left: d * strip.clientWidth * .8, behavior: how }); };
    if (prev) prev.addEventListener('click', () => page(-1));
    if (next) next.addEventListener('click', () => page(1));
    // Left and right arrow keys walk through the cards
    strip.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const bs = $$('.ar__btn', strip), i = bs.indexOf(document.activeElement); if (i < 0) return;
      e.preventDefault(); bs[clamp(i + (e.key === 'ArrowRight' ? 1 : -1), 0, bs.length - 1)].focus();
    });

    const sync = () => {
      const x = strip.scrollLeft, w = strip.clientWidth, max = strip.scrollWidth - w;
      if (bar) bar.style.transform = `scaleX(${(max > 0 ? clamp(x / max) : 1).toFixed(4)})`;
      if (prev) prev.disabled = x < 2;
      if (next) next.disabled = x > max - 2;
      if (performance.now() > lock) {
        let yv = +marks[0].dataset.y; const edge = pad() + w * .35;
        for (const m of marks) if (m.offsetLeft - x <= edge) yv = +m.dataset.y;
        if (max > 0 && x >= max - 2) yv = +marks[marks.length - 1].dataset.y;
        setYear(yv);
      }
      // Photos slide a little inside their frames as the strip moves
      if (!RM) cards.forEach((c, i) => { const cx = (c.offsetLeft + c.offsetWidth / 2 - x) / w; if (cx > -.4 && cx < 1.4) pics[i].style.transform = `translate3d(${((.5 - cx) * 6).toFixed(2)}%,0,0)`; });
    };
    addEventListener('resize', () => { last = -1; });

    // Mouse: drag the strip, and let it coast after letting go
    if (FINE) {
      let down = false, moved = false, sx = 0, sl = 0, px = 0, v = 0;
      strip.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button) return; down = true; moved = false; glide = 0; sx = px = e.clientX; sl = strip.scrollLeft; v = 0; });
      addEventListener('pointermove', e => {
        if (!down) return;
        const dx = e.clientX - sx; if (!moved && Math.abs(dx) < 6) return;
        moved = true; strip.classList.add('is-drag');
        strip.scrollLeft = sl - dx; v = e.clientX - px; px = e.clientX;
      });
      const end = () => { if (!down) return; down = false; strip.classList.remove('is-drag'); if (moved) glide = RM ? 0 : v; };
      addEventListener('pointerup', end); addEventListener('pointercancel', end);
      strip.addEventListener('click', e => { if (moved) { moved = false; e.preventDefault(); e.stopPropagation(); } }, true);   // a drag is not a click
      tasks.push(() => { if (down || !glide) return; strip.scrollLeft -= glide; glide *= .93; if (Math.abs(glide) < .4) glide = 0; });
    }
    tasks.push(() => { const x = strip.scrollLeft; if (x === last) return; last = x; sync(); });
  }

  /* ---------------------------------------------------------------- events: photo viewer */
  /* Any element with data-open="<index into events>" opens that event's photo. Arrows step through every event. */
  function lightbox() {
    const lb = $('#lb'), E = C.events || [];
    if (!lb || !E.length) return;
    const lbImg = $('#lb-img'), lbCap = $('#lb-cap'), lbPos = $('#lb-pos');
    let cur = 0;
    const show = i => {
      cur = (i + E.length) % E.length; const e = E[cur];
      lbImg.src = img(e.img); lbImg.width = e.w; lbImg.height = e.h; lbImg.alt = `${e.name}, ${e.year}`;
      lbCap.textContent = `${e.name}, ${e.year}`;
      lbPos.textContent = `${cur + 1} / ${E.length}`;
    };
    document.addEventListener('click', ev => {
      const b = ev.target.closest('[data-open]'); if (!b || !E[+b.dataset.open]) return;
      show(+b.dataset.open);
      if (lb.showModal) lb.showModal(); else lb.setAttribute('open', '');
    });
    $('#lb-prev').addEventListener('click', () => show(cur - 1));
    $('#lb-next').addEventListener('click', () => show(cur + 1));
    $('#lb-close').addEventListener('click', () => lb.close());
    lb.addEventListener('click', ev => { if (ev.target === lb) lb.close(); });
    lb.addEventListener('keydown', ev => { if (ev.key === 'ArrowLeft') show(cur - 1); if (ev.key === 'ArrowRight') show(cur + 1); });
  }

  /* ---------------------------------------------------------------- render content */
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
        <div class="person__meta"><b><a href="${esc((C.links || {}).apply || 'join.html')}" target="_blank" rel="noopener">You, next year?</a></b><span>Elections happen every spring</span></div>
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
    const titleEl = $('.hero__title');
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

          // Islands use two colors only: white and gold
          vec3 mori = vec3(.96, .94, .89), emas = vec3(.992, .718, .098);
          vec3 ca = mori;
          if (aS.y > .78) ca = emas;
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
      // Phones: sit the islands between the navbar and the title, closer to the title
      let ay = H * .385;
      if (m) { const top = 76, bot = titleEl ? titleEl.offsetTop : H * .55, mh = mw / SH.islands.aspect; ay = Math.max(top + 14 + mh / 2, Math.min(top + (bot - top) * .6, bot - 22 - mh / 2)); }
      TA = [W * .5, ay, mw];
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
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

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
  [highlights, archive, lightbox, renderTeam, renderFaq, links, hero, nav, lit, strip, fit, parallax, counters, clocks, copy, magnetic, reveal].forEach(safe);
  requestAnimationFrame(frame);
})();
