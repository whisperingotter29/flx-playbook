/* The Scene: one bullish sweep-and-return setup, drawn candle by candle and scrubbed by scroll. */
(() => {
  const wrap = document.querySelector('.scene-wrap');
  if (!wrap) return;
  const canvas = wrap.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // [open, high, low, close] — hand-built so every concept in the playbook appears in order.
  const C = [
    [100, 103, 99, 102], [102, 105, 101, 104], [104, 105, 102, 103], [103, 107, 102.5, 106],
    [106, 110, 105, 109], [109, 110, 107, 107.5], [107.5, 108, 105, 106], [106, 111, 105.5, 110],
    [110, 114, 109.5, 113], [113, 116, 112, 115], [115, 117, 113.5, 114], [114, 118, 113, 117],
    [117, 121, 116, 119], [119, 120, 115.5, 116], [116, 117, 113, 114], [114, 116, 112.5, 115],
    [115, 115.5, 111, 112], [112, 112.5, 109, 110], [110, 112, 108.5, 111.5], [111.5, 112, 108.8, 109],
    [109, 109.5, 106, 107], [107, 107.5, 104, 105.5], [105.5, 108.5, 105, 108], [108, 110.5, 107.5, 109.5],
    [109.5, 110, 107, 108], [108, 108.5, 105.5, 106.5], [106.5, 108, 105.2, 107], [107, 107.5, 104.6, 105],
    [105, 106.2, 101.8, 105.8], [105.8, 109.5, 105.4, 109], [109, 112.8, 108.6, 112], [112, 114.5, 111.5, 113.5],
    [113.5, 114, 111, 111.5], [111.5, 112, 109, 109.5], [109.5, 110, 107.2, 107.8], [107.8, 110.2, 107, 109.8],
    [109.8, 112.5, 109.4, 112], [112, 115, 111.6, 114.5], [114.5, 117, 114, 116], [116, 116.5, 114.2, 115],
    [115, 118.6, 114.8, 118], [118, 121.6, 117.6, 120.5], [120.5, 123.5, 120, 122.5], [122.5, 123, 121, 121.8]
  ];
  const N = C.length;
  const BSL = 121, BSL_I = 12, SSL = 104, SSL_I = 21, HL_I = 6;
  const OB_I = 27, OB = [C[27][2], C[27][1]];
  const SWEEP_I = 28, ENTRY_I = 34, TP_I = 41;
  const ENTRY = 107.5, STOP = 101.3, TP = 120.75;
  const RR = (TP - ENTRY) / (ENTRY - STOP);
  const P_MIN = 98.5, P_MAX = 125;
  const col = {
    bg: '#07080b', grid: 'rgba(236,239,245,0.05)', gridTxt: '#5a6170',
    bull: '#26a69a', bear: '#ef5350', accent: '#3d6cff', ink: '#eceff5', muted: '#8a91a1'
  };
  const FONT = '"JetBrains Mono", ui-monospace, Menlo, monospace';

  // scroll progress -> candle index (piecewise so each stage gets equal scroll)
  const PB = [0, 0.16, 0.34, 0.52, 0.72, 0.93, 1];
  const IB = [6.2, 20, 27, 31.2, 35.6, N, N];
  const mapP = (p) => {
    for (let i = 1; i < PB.length; i++) {
      if (p <= PB[i]) { const t = (p - PB[i - 1]) / (PB[i] - PB[i - 1]); return IB[i - 1] + (IB[i] - IB[i - 1]) * t; }
    }
    return N;
  };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

  let W = 0, H = 0, L = null;
  let idx = reduce ? N : IB[0], target = idx, dirty = true;

  const caps = [...wrap.querySelectorAll('.cap')];
  const steps = [...wrap.querySelectorAll('.scene-steps span')];
  const bar = wrap.querySelector('.scene-progress i');
  const hudPrice = document.getElementById('hudPrice');
  const hudStage = document.getElementById('hudStage');
  const hudPnl = document.getElementById('hudPnl');

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const mobile = W < 760;
    L = mobile
      ? { x0: 12, x1: W - 64, y0: H * 0.3, y1: H * 0.62, mobile }
      : { x0: Math.max(W * 0.37, 440), x1: W - 96, y0: H * 0.3, y1: H * 0.86, mobile };
    if (reduce) L = { x0: 16, x1: W - 70, y0: H * 0.06, y1: H * 0.94, mobile };
    dirty = true;
  }
  const py = (p) => L.y0 + ((P_MAX - p) / (P_MAX - P_MIN)) * (L.y1 - L.y0);
  const slot = () => (L.x1 - L.x0) / N;
  const cx = (i) => L.x0 + slot() * (i + 0.5);

  function label(text, x, y, opt = {}) {
    ctx.font = `${opt.weight || 500} ${opt.size || 10.5}px ${FONT}`;
    const w = ctx.measureText(text).width;
    const padX = 6, h = (opt.size || 10.5) + 8;
    let lx = opt.align === 'right' ? x - w - padX * 2 : opt.align === 'center' ? x - w / 2 - padX : x;
    lx = Math.max(4, Math.min(W - w - padX * 2 - 4, lx));
    if (opt.bg) { ctx.fillStyle = opt.bg; ctx.fillRect(lx, y - h / 2, w + padX * 2, h); }
    ctx.fillStyle = opt.color || col.ink;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, lx + padX, y + 0.5);
  }

  function dashed(x0, y, x1, color, alpha, dash = [5, 5], width = 1) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(x0, Math.round(y) + 0.5); ctx.lineTo(x1, Math.round(y) + 0.5); ctx.stroke(); ctx.restore();
  }

  function candleAt(i, frac) {
    const [o, h, l, c] = C[i];
    if (frac >= 1) return [o, h, l, c];
    const cc = o + (c - o) * frac;
    const top = Math.max(o, cc), bot = Math.min(o, cc);
    return [o, top + (h - Math.max(o, c)) * frac, bot - (Math.min(o, c) - l) * frac, cc];
  }

  function draw() {
    if (!L) return;
    ctx.clearRect(0, 0, W, H);
    const s = slot();
    const bw = Math.max(2, s * 0.62);
    const n = Math.floor(idx);
    const frac = idx - n;

    // grid + price scale
    ctx.font = `400 10px ${FONT}`;
    for (let p = 100; p <= 124; p += 4) {
      const y = Math.round(py(p)) + 0.5;
      ctx.strokeStyle = col.grid; ctx.lineWidth = 1; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(L.x0 - s, y); ctx.lineTo(L.x1 + 6, y); ctx.stroke();
      ctx.fillStyle = col.gridTxt; ctx.textBaseline = 'middle';
      ctx.fillText((5700 + p).toFixed(2), L.x1 + 12, y);
    }

    // liquidity lines
    const liqA = clamp(idx - 21.5);
    if (liqA > 0) {
      dashed(cx(BSL_I), py(BSL), L.x1, col.accent, liqA * (idx >= TP_I + 1 ? 0.45 : 1));
      label('BSL ' + (5700 + BSL).toFixed(2), L.x1, py(BSL) - 12, { align: 'right', color: col.accent, size: 10 });
      const swept = idx >= SWEEP_I + 0.4;
      dashed(cx(SSL_I), py(SSL), swept ? cx(SWEEP_I) : L.x1, col.accent, liqA * (swept ? 0.45 : 1));
      if (!swept) label('SSL ' + (5700 + SSL).toFixed(2), L.x1, py(SSL) + 13, { align: 'right', color: col.accent, size: 10 });
    }

    // order block
    const obA = clamp((idx - (SWEEP_I + 0.8)) * 1.5);
    if (obA > 0) {
      const x0 = cx(OB_I) - bw / 2, y0 = py(OB[1]), y1 = py(OB[0]);
      ctx.save(); ctx.globalAlpha = obA;
      ctx.fillStyle = 'rgba(61,108,255,0.13)';
      ctx.fillRect(x0, y0, (L.x1 - x0) * obA, y1 - y0);
      ctx.strokeStyle = 'rgba(61,108,255,0.7)'; ctx.lineWidth = 1; ctx.setLineDash([]);
      ctx.strokeRect(Math.round(x0) + 0.5, Math.round(y0) + 0.5, (L.x1 - x0) * obA, y1 - y0);
      ctx.restore();
      if (obA > 0.6 && idx < ENTRY_I + 0.7) label('BULLISH OB · 5M', x0 + 4, (y0 + y1) / 2, { color: col.accent, size: 10 });
    }

    // position box
    const posA = clamp((idx - (ENTRY_I + 0.6)) * 1.4);
    const closed = idx >= TP_I + 0.55;
    if (posA > 0) {
      const x0 = cx(ENTRY_I);
      const xEnd = closed ? cx(TP_I) + bw / 2 : L.x1;
      const w = (xEnd - x0) * posA;
      ctx.save(); ctx.globalAlpha = posA;
      ctx.fillStyle = closed ? 'rgba(38,166,154,0.24)' : 'rgba(38,166,154,0.13)';
      ctx.fillRect(x0, py(TP), w, py(ENTRY) - py(TP));
      ctx.fillStyle = 'rgba(239,83,80,0.15)';
      ctx.fillRect(x0, py(ENTRY), w, py(STOP) - py(ENTRY));
      ctx.strokeStyle = col.ink; ctx.globalAlpha = posA * 0.6; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(x0, Math.round(py(ENTRY)) + 0.5); ctx.lineTo(x0 + w, Math.round(py(ENTRY)) + 0.5); ctx.stroke();
      ctx.restore();
      if (posA > 0.7) {
        const lx = x0 + w;
        label('TARGET ' + (5700 + TP).toFixed(2), lx, py(TP) + 12, { align: 'right', bg: col.bull, color: '#04110f', size: 10 });
        label('ENTRY ' + (5700 + ENTRY).toFixed(2), lx, py(ENTRY), { align: 'right', bg: '#1d222d', color: col.ink, size: 10 });
        label('STOP ' + (5700 + STOP).toFixed(2), lx, py(STOP) - 12, { align: 'right', bg: col.bear, color: '#1a0605', size: 10 });
        if (!closed) label('RR 1:' + RR.toFixed(2), x0 + 4, (py(TP) + py(ENTRY)) / 2, { color: col.bull, size: 11, weight: 600 });
      }
    }

    // candles
    for (let i = 0; i <= Math.min(n, N - 1); i++) {
      const f = i < n ? 1 : frac;
      if (f <= 0) continue;
      const [o, h, l, c] = candleAt(i, f);
      const up = c >= o;
      const x = cx(i);
      const color = up ? col.bull : col.bear;
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1; ctx.setLineDash([]);
      if (i === SWEEP_I && idx > SWEEP_I) { ctx.save(); ctx.shadowColor = col.accent; ctx.shadowBlur = 18; }
      ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, py(h)); ctx.lineTo(Math.round(x) + 0.5, py(l)); ctx.stroke();
      const top = py(Math.max(o, c)), bot = py(Math.min(o, c));
      ctx.fillRect(x - bw / 2, top, bw, Math.max(1, bot - top));
      if (i === SWEEP_I && idx > SWEEP_I) ctx.restore();
    }

    // structure labels
    const hlA = clamp(idx - (HL_I + 2));
    if (hlA > 0) { ctx.globalAlpha = hlA; label('HL', cx(HL_I), py(C[HL_I][2]) + 16, { align: 'center', color: col.bull, size: 10, weight: 600 }); ctx.globalAlpha = 1; }
    const hhA = clamp(idx - (BSL_I + 2));
    if (hhA > 0) { ctx.globalAlpha = hhA; label('HH', cx(BSL_I), py(C[BSL_I][1]) - 16, { align: 'center', color: col.bull, size: 10, weight: 600 }); ctx.globalAlpha = 1; }

    // sweep ring
    const sw = idx - SWEEP_I;
    if (sw > 0.2) {
      const x = cx(SWEEP_I), y = py(C[SWEEP_I][2]);
      const t = clamp((sw - 0.2) / 2.4);
      if (t < 1) {
        ctx.save(); ctx.globalAlpha = 1 - t; ctx.strokeStyle = col.accent; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, 6 + t * Math.min(90, W * 0.08), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
      ctx.save(); ctx.fillStyle = col.accent; ctx.shadowColor = col.accent; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      if (idx < ENTRY_I + 0.6) label('SWEEP', x, y + 18, { align: 'center', bg: col.accent, color: '#fff', size: 10, weight: 600 });
    }

    // closed trade stamp
    if (closed) {
      const a = clamp((idx - (TP_I + 0.55)) * 2);
      ctx.save(); ctx.globalAlpha = a;
      const bx0 = cx(ENTRY_I), bx1 = cx(TP_I) + bw / 2;
      const size = Math.min(L.mobile ? 30 : 64, (bx1 - bx0) * 0.5);
      ctx.font = `800 ${size}px "Archivo", "Arial Narrow", sans-serif`;
      ctx.fillStyle = col.ink; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      ctx.fillText('+' + RR.toFixed(1) + 'R', (bx0 + bx1) / 2, (py(TP) + py(ENTRY)) / 2);
      ctx.textAlign = 'left';
      ctx.restore();
    }

    // last price line
    const li = Math.min(n, N - 1);
    const cur = candleAt(li, li < n ? 1 : Math.max(frac, 0.01));
    const up = cur[3] >= cur[0];
    dashed(L.x0 - s, py(cur[3]), L.x1 + 6, up ? col.bull : col.bear, 0.55, [2, 3]);
    label((5700 + cur[3]).toFixed(2), L.x1 + 6, py(cur[3]), { bg: up ? col.bull : col.bear, color: '#07080b', size: 10, weight: 600 });

    if (hudPrice) hudPrice.textContent = (5700 + cur[3]).toFixed(2);
  }

  const RANGES = caps.map((c) => [parseFloat(c.dataset.from), parseFloat(c.dataset.to)]);
  function ui(progress) {
    let stage = 0;
    caps.forEach((c, i) => {
      const [a, b] = RANGES[i];
      const last = i === caps.length - 1;
      let v = i === 0 ? 1 : clamp((idx - a) / 0.6);
      if (!last) v = Math.min(v, clamp((b - idx) / 0.6));
      if (idx >= a) stage = i;
      if (reduce) v = 1;
      c.style.opacity = v.toFixed(3);
      c.style.filter = v > 0.99 ? 'none' : `blur(${((1 - v) * 14).toFixed(1)}px)`;
      c.style.transform = `translateY(${((1 - v) * 22).toFixed(1)}px)`;
      c.style.visibility = v < 0.01 ? 'hidden' : 'visible';
      c.setAttribute('aria-hidden', v < 0.5 ? 'true' : 'false');
    });
    steps.forEach((s, i) => s.classList.toggle('on', i <= stage));
    if (hudStage) hudStage.textContent = `Stage 0${stage + 1} / 0${caps.length}`;
    if (bar) bar.style.transform = `scaleX(${progress.toFixed(4)})`;
    if (hudPnl) {
      if (idx >= TP_I + 0.55) hudPnl.textContent = `Closed +${RR.toFixed(2)}R · +$${((TP - ENTRY) * 5).toFixed(2)} / MES`;
      else if (idx >= ENTRY_I + 0.6) hudPnl.textContent = `Long 1 MES · risk $${((ENTRY - STOP) * 5).toFixed(2)}`;
      else hudPnl.textContent = 'Flat · waiting';
    }
  }

  let lastP = -1;
  function loop() {
    const r = wrap.getBoundingClientRect();
    const span = r.height - innerHeight;
    const p = reduce ? 1 : clamp(span > 0 ? -r.top / span : 0);
    if (p !== lastP) { target = mapP(p); lastP = p; }
    const d = target - idx;
    if (Math.abs(d) > 0.0005) { idx += d * 0.14; dirty = true; }
    if (dirty && r.bottom > 0 && r.top < innerHeight) { draw(); ui(p); dirty = false; }
    requestAnimationFrame(loop);
  }

  addEventListener('resize', resize);
  if (document.fonts) document.fonts.ready.then(() => { dirty = true; });
  resize();
  ui(0);
  loop();
})();
