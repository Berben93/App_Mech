import { esc, fmt, num, options, result, formValues } from '../../core/dom.js';
import { load, save } from '../../core/store.js';
import { COINS, measure, matchThread, confidence } from './calc.js';

const COIN_KEY = 'photo-coin';
const dev = (v) => (Math.abs(v) < 0.005 ? '0' : `${v > 0 ? '+' : '−'}${fmt(Math.abs(v), 2)}`);
const MAX_SIDE = 2000;

// Messpaare: Münze, Gewinde-Ø, Steigung (über mehrere Gänge)
const PAIRS = [
  { key: 'ref', label: 'Münze', color: '#f59e0b', hint: 'Tippe auf den linken Rand der Münze, dann genau gegenüber auf den rechten Rand.' },
  { key: 'dia', label: 'Gewinde-Ø', color: '#2563eb', hint: 'Tippe quer zur Achse auf die äußersten Spitzen des Gewindes (Bolzen) bzw. den Innenrand (Mutter).' },
  { key: 'pitch', label: 'Steigung', color: '#16a34a', hint: 'Tippe entlang der Achse auf eine Gewindespitze und auf die Spitze einige Gänge weiter. Anzahl der Gänge dazwischen unten eintragen.' },
];

function render(el, params, ctx) {
  const pts = { ref: [], dia: [], pitch: [] };
  let active = 'ref';
  let img = null;
  let drag = null;
  let coin = COINS.find((c) => c.id === (params.c || load(COIN_KEY, 'eur2'))) || COINS[0];

  el.innerHTML = `
    <p class="lead">Gewinde aus einem Foto bestimmen: Eine Münze neben dem Gewinde dient als Maßstab. Das Foto bleibt auf diesem Gerät.</p>
    <details class="card pm-howto" open>
      <summary><strong>So gelingt das Foto</strong></summary>
      <ol class="list-plain">
        <li>Schraube oder Mutter und Münze flach nebeneinander auf eine helle, ebene Fläche legen, beide in gleicher Höhe.</li>
        <li>Handy parallel zur Fläche halten, gut 20 cm Abstand, lieber etwas zoomen als ganz nah heran (weniger Verzerrung).</li>
        <li>Gutes Licht, kein Schatten über den Rändern. Für die Steigung das Gewinde von der Seite fotografieren, damit die Gänge scharf sind.</li>
      </ol>
    </details>
    <div class="grid-2">
      <section class="card">
        <h2>Foto</h2>
        <div class="chips">
          <label class="btn pm-file">Foto aufnehmen<input type="file" accept="image/*" capture="environment" id="pm-cam" hidden></label>
          <label class="btn secondary pm-file">Bild wählen<input type="file" accept="image/*" id="pm-pick" hidden></label>
        </div>
        <div class="seg pm-pairs" role="group" aria-label="Was markierst du?" style="margin-top:12px">
          ${PAIRS.map((p) => `<button type="button" data-p="${p.key}" style="--pair:${p.color}"><span class="pm-dot"></span>${p.label}</button>`).join('')}
        </div>
        <p class="note" id="pm-hint"></p>
        <div class="pm-stage" id="pm-stage">
          <canvas id="pm-canvas" aria-label="Foto mit Messpunkten"></canvas>
          <canvas id="pm-loupe" class="pm-loupe" width="240" height="240" hidden></canvas>
          <p class="empty pm-empty" id="pm-empty">Noch kein Foto. Tippe auf „Foto aufnehmen“.</p>
        </div>
        <div class="chips" style="margin-top:10px">
          <button type="button" class="chip" id="pm-clear">Punkte dieser Messung löschen</button>
        </div>
      </section>
      <section class="card">
        <h2>Messung</h2>
        <form class="grid" id="pm-form" autocomplete="off">
          <label class="field" style="grid-column:1/-1"><span>Referenz-Münze</span><select name="c">${options(COINS.map((c) => [c.id, c.d ? `${c.name} · Ø ${fmt(c.d)} mm` : c.name]), coin.id)}</select></label>
          <label class="field" id="pm-own" hidden><span>Ø der Referenz (mm)</span><input name="own" inputmode="decimal" value="${esc(params.own || '')}"></label>
          <label class="field"><span>Gewinde ist</span><select name="k">${options([['ext', 'außen (Bolzen)'], ['int', 'innen (Mutter)']], params.k || 'ext')}</select></label>
          <label class="field"><span>Gänge zwischen den Steigungspunkten</span><input name="n" inputmode="numeric" value="${esc(params.n || '5')}"></label>
        </form>
        <div id="pm-out" aria-live="polite" style="margin-top:12px"></div>
      </section>
    </div>`;

  const canvas = el.querySelector('#pm-canvas');
  const loupe = el.querySelector('#pm-loupe');
  const cx = canvas.getContext('2d');
  const form = el.querySelector('#pm-form');
  const out = el.querySelector('#pm-out');

  /** Faktor Bildpixel → CSS-Pixel der Anzeige. */
  const viewScale = () => (img ? canvas.clientWidth / img.width : 1);

  function draw() {
    if (!img) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = Math.round((img.height / img.width) * w);
    canvas.style.height = `${h}px`;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const s = viewScale();
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.drawImage(img, 0, 0, w, h);
    for (const p of PAIRS) {
      const [a, b] = pts[p.key];
      cx.strokeStyle = p.color;
      cx.fillStyle = p.color;
      cx.lineWidth = p.key === active ? 3 : 2;
      if (a && b) {
        cx.beginPath();
        cx.moveTo(a.x * s, a.y * s);
        cx.lineTo(b.x * s, b.y * s);
        cx.stroke();
        // Endstriche quer zur Messlinie
        const ang = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
        for (const q of [a, b]) {
          cx.beginPath();
          cx.moveTo(q.x * s - Math.cos(ang) * 10, q.y * s - Math.sin(ang) * 10);
          cx.lineTo(q.x * s + Math.cos(ang) * 10, q.y * s + Math.sin(ang) * 10);
          cx.stroke();
        }
      }
      for (const q of [a, b].filter(Boolean)) {
        cx.beginPath();
        cx.arc(q.x * s, q.y * s, p.key === active ? 9 : 6, 0, Math.PI * 2);
        cx.globalAlpha = 0.35;
        cx.fill();
        cx.globalAlpha = 1;
        cx.stroke();
      }
    }
  }

  function drawLoupe(pt, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const size = 240;
    const zoom = 4;
    const srcR = size / 2 / zoom / viewScale();
    const lc = loupe.getContext('2d');
    lc.clearRect(0, 0, size, size);
    lc.save();
    lc.beginPath();
    lc.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    lc.clip();
    lc.drawImage(img, pt.x - srcR, pt.y - srcR, srcR * 2, srcR * 2, 0, 0, size, size);
    lc.strokeStyle = PAIRS.find((p) => p.key === active).color;
    lc.lineWidth = 2;
    lc.beginPath();
    lc.moveTo(size / 2, 20); lc.lineTo(size / 2, size - 20);
    lc.moveTo(20, size / 2); lc.lineTo(size - 20, size / 2);
    lc.stroke();
    lc.restore();
    lc.strokeStyle = '#fff';
    lc.lineWidth = 3;
    lc.beginPath();
    lc.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    lc.stroke();
    // Lupe auf die dem Finger abgewandte Seite
    const left = clientX - rect.left < rect.width / 2;
    loupe.style.left = left ? '' : '8px';
    loupe.style.right = left ? '8px' : '';
    loupe.style.top = `${Math.max(8, Math.min(clientY - rect.top - 140, rect.height - 128))}px`;
    loupe.hidden = false;
  }

  function toImage(e) {
    const rect = canvas.getBoundingClientRect();
    const s = viewScale();
    return {
      x: Math.min(Math.max((e.clientX - rect.left) / s, 0), img.width),
      y: Math.min(Math.max((e.clientY - rect.top) / s, 0), img.height),
    };
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (!img) return;
    e.preventDefault();
    const p = toImage(e);
    const s = viewScale();
    // Vorhandenen Punkt greifen (alle Messungen), sonst Punkt der aktiven Messung setzen
    let best = null;
    for (const pair of PAIRS) {
      pts[pair.key].forEach((q, i) => {
        const dist = Math.hypot(q.x - p.x, q.y - p.y) * s;
        if (dist < 28 && (!best || dist < best.dist)) best = { key: pair.key, i, dist };
      });
    }
    if (best) {
      active = best.key;
      drag = best;
    } else {
      const list = pts[active];
      if (list.length < 2) list.push(p);
      else {
        const i = Math.hypot(list[0].x - p.x, list[0].y - p.y) < Math.hypot(list[1].x - p.x, list[1].y - p.y) ? 0 : 1;
        list[i] = p;
      }
      drag = { key: active, i: pts[active].length - 1 };
      if (pts[active].length === 2 && !best) drag.i = pts[active].indexOf(p);
    }
    canvas.setPointerCapture(e.pointerId);
    drawLoupe(pts[drag.key][drag.i], e.clientX, e.clientY);
    syncPairs();
    draw();
    update();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = toImage(e);
    pts[drag.key][drag.i] = p;
    drawLoupe(p, e.clientX, e.clientY);
    draw();
    update();
  });
  const endDrag = () => {
    if (!drag) return;
    drag = null;
    loupe.hidden = true;
    // Nach zwei Münzpunkten automatisch zum Gewinde-Ø, danach zur Steigung
    const order = PAIRS.map((p) => p.key);
    if (pts[active].length === 2) {
      const next = order.find((k) => pts[k].length < 2);
      if (next) active = next;
    }
    syncPairs();
    draw();
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  function syncPairs() {
    el.querySelectorAll('[data-p]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.p === active));
      b.classList.toggle('done', pts[b.dataset.p].length === 2);
    });
    el.querySelector('#pm-hint').textContent = img ? PAIRS.find((p) => p.key === active).hint : '';
  }

  el.querySelector('.pm-pairs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-p]');
    if (!b) return;
    active = b.dataset.p;
    syncPairs();
    draw();
  });
  el.querySelector('#pm-clear').addEventListener('click', () => {
    pts[active] = [];
    syncPairs();
    draw();
    update();
  });

  async function loadFile(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.decoding = 'async';
    im.src = url;
    try {
      await im.decode();
    } catch {
      ctx.toast('Bild konnte nicht geladen werden.');
      URL.revokeObjectURL(url);
      return;
    }
    // Große Fotos verkleinern: schneller und genau genug
    const k = Math.min(1, MAX_SIDE / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * k);
    c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    img = c;
    pts.ref = []; pts.dia = []; pts.pitch = [];
    active = 'ref';
    el.querySelector('#pm-empty').hidden = true;
    syncPairs();
    draw();
    update();
  }
  el.querySelector('#pm-cam').addEventListener('change', (e) => loadFile(e.target.files[0]));
  el.querySelector('#pm-pick').addEventListener('change', (e) => loadFile(e.target.files[0]));

  function update() {
    const v = formValues(form);
    coin = COINS.find((c) => c.id === v.c) || COINS[0];
    el.querySelector('#pm-own').hidden = coin.d !== null;
    const refMm = coin.d ?? num(v.own);
    const internal = v.k === 'int';
    ctx.setParams({ c: coin.id, own: coin.d ? '' : v.own, k: v.k, n: v.n }, 'Gewinde aus Foto');
    if (!img) {
      out.innerHTML = '<p class="note">Foto aufnehmen, dann nacheinander Münze, Gewinde-Ø und Steigung markieren.</p>';
      return;
    }
    const m = measure({ ref: pts.ref, refMm, dia: pts.dia, pitch: pts.pitch, count: num(v.n) || 1, clickPx: 0.8 / Math.max(viewScale(), 0.25) });
    if (!Number.isFinite(m.mmPerPx)) {
      out.innerHTML = `<p class="warn-text">${refMm > 0 ? 'Erst die Münze markieren (zwei Punkte über den Durchmesser).' : 'Ø der Referenz eingeben.'}</p>`;
      return;
    }
    const hasD = Number.isFinite(m.d);
    const hasP = Number.isFinite(m.p) && m.p > 0;
    const hits = hasD ? matchThread({ d: m.d, p: hasP ? m.p : undefined, internal }) : [];
    const conf = confidence(hits[0], hits[1]);
    const confText = { good: 'passt gut', fair: 'wahrscheinlich, bitte nachmessen', poor: 'unsicher – Foto oder Punkte prüfen' }[conf];
    out.innerHTML = `<div class="results">
        ${hasD ? result(internal ? 'Gemessener Innen-Ø (≈ D₁)' : 'Gemessener Außen-Ø', `${fmt(m.d, 2)} ± ${fmt(m.dErr, 2)}`, 'mm', true) : ''}
        ${hasP ? result('Gemessene Steigung', `${fmt(m.p, 2)} ± ${fmt(m.pErr, 2)}`, 'mm') : ''}
        ${hasP ? result('Gänge je Zoll', fmt(25.4 / m.p, 1), 'tpi') : ''}
        <div class="adv">${result('Maßstab', fmt(m.mmPerPx * 1000, 1), 'µm/px')}</div>
      </div>
      ${hits.length ? `<h3 class="sub">Passende Gewinde <span class="pill ${conf === 'good' ? 'spiel' : conf === 'fair' ? 'uebergang' : 'uebermass'}">${confText}</span></h3>
        <ul class="hits">${hits.slice(0, hasP ? 4 : 5).map((h, i) => `<li><a href="#/m/gewinde?t=${encodeURIComponent(h.params.t)}&id=${encodeURIComponent(h.params.id)}">
          <span class="dot" aria-hidden="true"${i ? ' style="opacity:.4"' : ''}></span>
          <span><strong>${esc(h.name)}</strong><small>Ø ${fmt(internal ? h.D1 : h.d, 2)} mm · P ${fmt(h.p, 3)} mm${h.tpi ? ` (${h.tpi} tpi)` : ''} · Abweichung Ø ${dev(h.dd)}${hasP ? `, P ${dev(h.dp)}` : ''}</small></span></a></li>`).join('')}</ul>
        ${hasP ? '' : '<p class="note">Mit markierter Steigung wird das Ergebnis deutlich sicherer (Regel- oder Feingewinde, metrisch oder Zoll).</p>'}`
      : '<p class="note">Jetzt den Gewinde-Ø markieren.</p>'}
      <p class="note">Richtwert aus dem Foto. Vor dem Bestellen oder Nachschneiden mit Messschieber und Gewindelehre prüfen.</p>`;
  }

  form.addEventListener('input', update);
  form.addEventListener('change', (e) => {
    if (e.target.name === 'c') save(COIN_KEY, e.target.value);
    update();
  });
  const onResize = () => draw();
  window.addEventListener('resize', onResize);
  syncPairs();
  update();
  return () => window.removeEventListener('resize', onResize);
}

export default {
  id: 'fotomessung',
  title: 'Gewinde per Foto',
  subtitle: 'Kamera-Messung mit Münze als Maßstab',
  color: '#0e7490',
  icon: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  keywords: ['Foto', 'Kamera', 'Fotomessung', 'messen', 'Gewinde bestimmen', 'Gewinde erkennen', 'Münze', 'Steigung messen', 'unbekanntes Gewinde', 'Gewindelehre'],
  render,
};
