/* flx playbook — shared motion + tools */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const G = window.gsap;
  const ST = window.ScrollTrigger;
  if (G && ST) G.registerPlugin(ST);
  if (reduce) root.classList.add('reduced');
  const ss = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  let velocity = 0;
  if (!reduce && window.Lenis && G) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', (e) => { velocity = e.velocity || 0; if (ST) ST.update(); });
    G.ticker.add((t) => lenis.raf(t * 1000));
    G.ticker.lagSmoothing(0);
  }
  window.__lenis = lenis;
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const el = document.querySelector(a.getAttribute('href'));
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(el, { duration: 1.6 });
      else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  /* ---------- grain ---------- */
  (function grain() {
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const x = c.getContext('2d');
    const d = x.createImageData(160, 160);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = Math.random() * 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 255;
    }
    x.putImageData(d, 0, 0);
    const g = document.createElement('div');
    g.className = 'grain';
    g.setAttribute('aria-hidden', 'true');
    g.style.setProperty('--grain', `url(${c.toDataURL('image/png')})`);
    document.body.appendChild(g);
  })();

  /* ---------- split text ---------- */
  document.querySelectorAll('[data-split]').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach((w, wi) => {
      const word = document.createElement('span');
      word.className = 'word';
      word.setAttribute('aria-hidden', 'true');
      for (const ch of w) {
        const s = document.createElement('span');
        s.className = 'ch';
        s.textContent = ch;
        word.appendChild(s);
      }
      el.appendChild(word);
      if (wi < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  });

  function entrance() {
    if (!G || reduce) return;
    const lines = document.querySelectorAll('[data-split]');
    lines.forEach((line, li) => {
      const chars = line.querySelectorAll('.ch');
      G.from(chars, {
        opacity: 0, x: -18, filter: 'blur(10px)',
        duration: 1.2, ease: 'expo.out',
        delay: 0.05 + li * 0.22, stagger: 0.032,
        clearProps: 'filter'
      });
    });
    G.from('[data-rise]', { opacity: 0, y: 20, filter: 'blur(10px)', duration: 1.3, ease: 'expo.out', stagger: 0.08, delay: 0.4, clearProps: 'filter' });
    const candle = document.querySelector('.hero-candle');
    if (candle) {
      G.from(candle, { scaleY: 0, duration: 1.6, ease: 'expo.out', delay: 0.5 });
      G.from('.hero-liq', { scaleX: 0, transformOrigin: 'right center', duration: 1.4, ease: 'expo.inOut', delay: 0.9 });
    }
  }

  /* ---------- preloader / shutter ---------- */
  const shutter = document.querySelector('.shutter');
  const pre = document.querySelector('.preloader');
  function start() {
    if (root.classList.contains('covered') && shutter && G) {
      G.to(shutter, {
        clipPath: 'inset(0% 0% 100% 0%)', duration: 0.9, ease: 'expo.inOut', delay: 0.15,
        onComplete: () => { root.classList.remove('covered'); shutter.style.clipPath = ''; }
      });
      G.delayedCall(0.45, entrance);
    } else if (root.classList.contains('preload') && pre && G && !reduce) {
      const count = pre.querySelector('.pl-count');
      const bar = pre.querySelector('.pl-bar i');
      const obj = { v: 0 };
      const loaded = Promise.all([
        document.fonts ? document.fonts.ready : Promise.resolve(),
        new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true })))
      ]);
      const minTime = new Promise((r) => setTimeout(r, 1500));
      G.to(obj, { v: 5812.25, duration: 1.5, ease: 'power3.inOut', onUpdate: () => { count.textContent = obj.v.toFixed(2).padStart(7, '0'); } });
      G.to(bar, { scaleX: 1, duration: 1.5, ease: 'power3.inOut' });
      Promise.all([loaded, minTime]).then(() => {
        ss.set('seen', '1');
        const tl = G.timeline({ onComplete: () => { root.classList.remove('preload'); pre.remove(); } });
        tl.to(pre.querySelectorAll('.pl-sym, .pl-count'), { y: -30, opacity: 0, duration: 0.5, ease: 'power3.in', stagger: 0.05 })
          .to(pre, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1, ease: 'expo.inOut' }, '-=0.1')
          .add(entrance, '-=0.55');
      });
    } else {
      root.classList.remove('preload');
      entrance();
    }
  }
  start();

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented) return;
    const href = a.getAttribute('href');
    if (a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || !/^[\w-]+\.html(#[\w-]*)?$/.test(href)) return;
    if (!G || !shutter || reduce) { ss.set('nav', ''); return; }
    e.preventDefault();
    ss.set('nav', '1');
    const lbl = shutter.querySelector('.sh-label');
    if (lbl) lbl.textContent = a.dataset.dest || 'Loading';
    G.fromTo(shutter, { clipPath: 'inset(100% 0% 0% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: 0.75, ease: 'expo.inOut',
      onComplete: () => { location.href = href; }
    });
  });
  addEventListener('pageshow', (e) => {
    if (e.persisted && shutter) { shutter.style.clipPath = ''; root.classList.remove('covered'); }
  });

  /* ---------- crosshair cursor ---------- */
  if (fine && !reduce) {
    const x = document.createElement('div');
    x.className = 'xhair';
    x.setAttribute('aria-hidden', 'true');
    x.innerHTML = '<i class="xh-h"></i><i class="xh-v"></i><b class="xh-ring"><span></span></b><em class="xh-tag"></em>';
    document.body.appendChild(x);
    const h = x.querySelector('.xh-h'), v = x.querySelector('.xh-v'), ring = x.querySelector('.xh-ring'), tag = x.querySelector('.xh-tag'), rl = ring.querySelector('span');
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; x.classList.add('on'); }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => x.classList.remove('on'));
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('a, button, [data-cursor], label, select, input');
      ring.classList.toggle('big', !!t);
      rl.textContent = t ? (t.dataset.cursor || '') : '';
    });
    (function loop() {
      rx += (mx - rx) * 0.13;
      ry += (my - ry) * 0.13;
      h.style.transform = `translateY(${my}px)`;
      v.style.transform = `translateX(${mx}px)`;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      tag.style.transform = `translateY(${my}px)`;
      tag.textContent = (5846 - (my / innerHeight) * 64).toFixed(2);
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- magnetic ---------- */
  if (fine && !reduce) {
    document.querySelectorAll('.magnetic').forEach((el) => {
      let px = 0, py = 0, tx = 0, ty = 0, raf = 0;
      const tick = () => {
        px += (tx - px) * 0.18; py += (ty - py) * 0.18;
        el.style.transform = `translate(${px.toFixed(2)}px, ${py.toFixed(2)}px)`;
        raf = Math.abs(tx - px) > 0.1 || Math.abs(ty - py) > 0.1 ? requestAnimationFrame(tick) : 0;
      };
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        tx = (e.clientX - r.left - r.width / 2) * 0.22;
        ty = (e.clientY - r.top - r.height / 2) * 0.22;
        if (!raf) raf = requestAnimationFrame(tick);
      });
      el.addEventListener('pointerleave', () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(tick); });
    });
  }

  /* ---------- tape + velocity skew ---------- */
  const tracks = [...document.querySelectorAll('.tape-track')].map((t) => ({ el: t, x: 0, dir: t.dataset.dir === 'rev' ? 1 : -1 }));
  let skew = 0;
  const frame = () => {
    const vv = lenis ? velocity : 0;
    const target = Math.max(-2, Math.min(2, vv * 0.07));
    skew += (target - skew) * 0.08;
    root.style.setProperty('--skew', `${skew.toFixed(3)}deg`);
    tracks.forEach((t) => {
      const half = t.el.scrollWidth / 2;
      t.x += t.dir * (0.45 + Math.min(Math.abs(vv), 60) * 0.18);
      if (t.x <= -half) t.x += half;
      if (t.x >= 0 && t.dir > 0) t.x -= half;
      t.el.style.transform = `translate3d(${t.x.toFixed(2)}px,0,0)`;
    });
    if (!lenis) velocity *= 0.9;
  };
  if (!reduce) { if (G) G.ticker.add(frame); else (function l() { frame(); requestAnimationFrame(l); })(); }

  /* ---------- scroll-linked sections ---------- */
  if (G && ST && !reduce) {
    const hero = document.querySelector('.hero');
    if (hero) {
      G.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 } })
        .to('.hero-type h1', { scale: 1.08, yPercent: -12, opacity: 0.25, ease: 'none', transformOrigin: '30% 50%' }, 0)
        .to('.hero-candle', { yPercent: 18, scaleY: 1.3, ease: 'none' }, 0)
        .to('.hero-glow', { opacity: 0.2, scale: 1.3, ease: 'none' }, 0)
        .to('.hero-foot', { yPercent: -40, opacity: 0, ease: 'none' }, 0);
    }
    document.querySelectorAll('.rule').forEach((r) => {
      G.fromTo(r.querySelector('.rule-num'), { xPercent: 14, opacity: 0.18 }, {
        xPercent: 0, opacity: 1, ease: 'none',
        scrollTrigger: { trigger: r, start: 'top 95%', end: 'top 50%', scrub: 0.6 }
      });
      G.fromTo(r.querySelector('.rule-copy'), { y: 30, opacity: 0.3 }, {
        y: 0, opacity: 1, ease: 'none',
        scrollTrigger: { trigger: r, start: 'top 90%', end: 'top 55%', scrub: 0.6 }
      });
    });
    document.querySelectorAll('.section-head h2, .chapter-meta .display, .step-meta h2, .next-link .display').forEach((h) => {
      G.fromTo(h, { y: 28, opacity: 0.35 }, { y: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: h, start: 'top 95%', end: 'top 60%', scrub: 0.6 } });
    });
    document.querySelectorAll('.step-meta .n').forEach((n) => {
      G.fromTo(n, { yPercent: 30 }, { yPercent: -10, ease: 'none', scrollTrigger: { trigger: n.closest('.step'), start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
    });
    document.querySelectorAll('.fig-frame').forEach((f) => {
      if (f.closest('.htrack') && innerWidth >= 900) return;
      G.fromTo(f, { clipPath: 'inset(16% 0% 16% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
        scrollTrigger: { trigger: f, start: 'top 95%', end: 'top 50%', scrub: 0.6 }
      });
      const img = f.querySelector('img');
      if (img && !f.classList.contains('contain')) {
        G.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
      }
    });
    const mm = G.matchMedia();
    mm.add('(min-width: 900px)', () => {
      document.querySelectorAll('.hscroll').forEach((sec) => {
        const track = sec.querySelector('.htrack');
        const dist = () => Math.max(0, track.scrollWidth - sec.clientWidth);
        G.to(track, {
          x: () => -dist(), ease: 'none',
          scrollTrigger: { trigger: sec.closest('.pin-me') || sec, start: 'center center', end: () => '+=' + dist(), pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 }
        });
      });
    });
    addEventListener('load', () => ST.refresh());
  }

  /* ---------- index hover preview ---------- */
  const preview = document.querySelector('.preview');
  if (preview && fine && !reduce) {
    const pimg = preview.querySelector('img');
    let tx = 0, ty = 0, px = 0, py = 0, on = false;
    document.querySelectorAll('.idx-row a').forEach((a) => {
      a.addEventListener('pointerenter', () => { pimg.src = a.dataset.img; pimg.alt = ''; preview.classList.add('on'); on = true; });
      a.addEventListener('pointerleave', () => { preview.classList.remove('on'); on = false; });
    });
    addEventListener('pointermove', (e) => { tx = e.clientX + 30; ty = e.clientY - 120; }, { passive: true });
    (function l() {
      px += (tx - px) * 0.12; py += (ty - py) * 0.12;
      preview.style.transform = `translate(${px}px, ${py}px) scale(${on ? 1 : 0.9}) rotate(${((tx - px) * 0.03).toFixed(2)}deg)`;
      requestAnimationFrame(l);
    })();
  }

  /* ---------- position size calculator ---------- */
  const calc = document.getElementById('calc');
  if (calc) {
    const $ = (id) => document.getElementById(id);
    const fmt = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const run = () => {
      const acct = Math.max(0, parseFloat($('acct').value) || 0);
      const pct = parseFloat($('riskpct').value) || 0;
      const mult = document.querySelector('input[name="contract"]:checked').value === 'ES' ? 50 : 5;
      const stop = Math.max(0, parseFloat($('stop').value) || 0);
      $('riskpctOut').textContent = pct.toFixed(1) + '%';
      const maxRisk = acct * pct / 100;
      const perC = stop * mult;
      const n = perC > 0 ? Math.floor(maxRisk / perC) : 0;
      const actual = n * perC;
      const tgt = stop * 2;
      $('oContracts').textContent = n;
      $('oMax').textContent = fmt(maxRisk);
      $('oPer').textContent = fmt(perC);
      $('oActual').textContent = fmt(actual);
      $('oTarget').textContent = tgt.toFixed(2) + ' pts';
      $('oReward').textContent = fmt(n * tgt * mult);
      $('oLives').textContent = actual > 0 ? Math.floor(acct / actual) + ' losses' : '—';
      const msg = $('calcMsg');
      const offTick = stop > 0 && Math.abs(stop / 0.25 - Math.round(stop / 0.25)) > 1e-9;
      if (stop <= 0) { msg.textContent = 'Enter your stop distance in points.'; msg.className = 'calc-msg'; }
      else if (n === 0) { msg.textContent = mult === 50 ? 'Stop is too wide for one ES at this risk. Switch to MES or tighten the stop.' : 'Stop is too wide for one MES at this risk. Tighten the stop or skip the trade.'; msg.className = 'calc-msg warn'; }
      else if (offTick) { msg.textContent = 'Heads up: ES and MES move in 0.25-point ticks. Round the stop to the nearest tick.'; msg.className = 'calc-msg warn'; }
      else { msg.textContent = `Example values. ${n} ${mult === 50 ? 'ES' : 'MES'} risks ${fmt(actual)}, which is ${(actual / acct * 100).toFixed(2)}% of the account.`; msg.className = 'calc-msg'; }
    };
    calc.addEventListener('input', run);
    calc.addEventListener('change', run);
    calc.addEventListener('submit', (e) => e.preventDefault());
    run();
  }

  /* ---------- session tracker ---------- */
  const session = document.getElementById('session');
  if (session) {
    const slots = [...session.querySelectorAll('.slot')];
    const order = ['empty', 'win', 'loss', 'big'];
    const names = { empty: 'Open', win: 'Win', loss: 'Loss', big: 'Win 2%+' };
    const status = document.getElementById('sessionStatus');
    const render = () => {
      const st = slots.map((s) => s.dataset.s);
      const used = st.filter((s) => s !== 'empty').length;
      const bigWin = st.includes('big');
      const stop = bigWin || used >= 3;
      slots.forEach((s, i) => {
        s.querySelector('.label').textContent = names[s.dataset.s];
        s.disabled = stop && s.dataset.s === 'empty';
        s.setAttribute('aria-label', `Trade ${i + 1}: ${names[s.dataset.s]}`);
      });
      if (bigWin) { status.textContent = 'Solid winner banked. Done for the day.'; status.className = 'session-status stop'; }
      else if (used >= 3) { status.textContent = 'Three trades taken. Session over, win or lose.'; status.className = 'session-status stop'; }
      else { status.textContent = `${3 - used} of 3 trades left today.`; status.className = 'session-status'; }
    };
    slots.forEach((s) => s.addEventListener('click', () => {
      s.dataset.s = order[(order.indexOf(s.dataset.s) + 1) % order.length];
      render();
    }));
    document.getElementById('sessionReset').addEventListener('click', () => { slots.forEach((s) => (s.dataset.s = 'empty')); render(); });
    render();
  }

  /* ---------- checklist ---------- */
  const list = document.getElementById('checklist');
  if (list) {
    const boxes = [...list.querySelectorAll('input[type="checkbox"]')];
    const out = document.getElementById('checkCount');
    const verdict = document.getElementById('checkVerdict');
    const render = () => {
      const n = boxes.filter((b) => b.checked).length;
      out.textContent = `${n}/${boxes.length}`;
      const ok = n === boxes.length;
      verdict.textContent = ok ? 'Valid. Take it.' : 'No trade yet.';
      verdict.classList.toggle('ok', ok);
    };
    list.addEventListener('change', render);
    document.getElementById('checkReset').addEventListener('click', () => { boxes.forEach((b) => (b.checked = false)); render(); });
    render();
  }
})();
