// Ergebnis teilen: als Link, als Bild (PNG) oder als Etikett zum Ausdrucken.
// Inhalt sind die Ergebniszeilen (.result) der aktuellen Ansicht.
import { esc } from './dom.js';

/** Ergebnisse der Ansicht: [{ heading, rows: [[Bezeichnung, Wert]] }] */
export function collectResults(root) {
  const groups = [];
  for (const box of root.querySelectorAll('.results')) {
    const card = box.closest('.card');
    const heading = card?.querySelector('h2, h3')?.textContent.trim() || '';
    const rows = [...box.querySelectorAll('.result')].map((r) => {
      const label = r.querySelector('.result-label')?.textContent.trim() || '';
      const valueEl = r.querySelector('.result-value')?.cloneNode(true);
      const alt = valueEl?.querySelector('.alt');
      if (alt) alt.textContent = ` (${alt.textContent.trim()})`;
      return [label, (valueEl?.textContent || '').replace(/\s+/g, ' ').trim()];
    }).filter(([l, v]) => l || v);
    if (rows.length) groups.push({ heading, rows });
  }
  return groups;
}

/** Ergebnisse als Text (für Zwischenablage oder Teilen-Dialog). */
export function resultsText(title, groups, url) {
  const lines = [title];
  for (const g of groups) {
    if (g.heading && g.heading !== title) lines.push('', g.heading);
    for (const [l, v] of g.rows) lines.push(`${l}: ${v}`);
  }
  if (url) lines.push('', url);
  return lines.join('\n');
}

export async function shareLink({ title, text, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'aborted';
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    window.prompt('Link kopieren:', url);
    return 'prompt';
  }
}

/** Zeichnet die Ergebnisse als PNG (Kopf in Modulfarbe, Werte rechtsbündig). */
export function renderImage({ title, groups, color, url, dark = false }) {
  const scale = 2;
  const W = 720;
  const pad = 28;
  const rowH = 40;
  const headH = 76;
  const groupH = 44;
  const rowsCount = groups.reduce((n, g) => n + g.rows.length, 0);
  const H = headH + pad + groups.length * groupH + rowsCount * rowH + 64;
  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const c = canvas.getContext('2d');
  c.scale(scale, scale);
  const bg = dark ? '#181b21' : '#ffffff';
  const fg = dark ? '#e8eaee' : '#15181d';
  const muted = dark ? '#9aa3b0' : '#5b6370';
  const line = dark ? '#2e333c' : '#d9dde3';
  const font = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);
  c.fillStyle = color;
  c.fillRect(0, 0, W, headH);
  c.fillStyle = '#fff';
  c.font = `700 28px ${font}`;
  c.textBaseline = 'middle';
  c.fillText(fitText(c, title, W - 2 * pad), pad, headH / 2);

  let y = headH + pad;
  for (const g of groups) {
    c.fillStyle = color;
    c.fillRect(pad, y + 10, 5, 20);
    c.fillStyle = fg;
    c.font = `700 20px ${font}`;
    c.fillText(fitText(c, g.heading || 'Ergebnis', W - 2 * pad - 14), pad + 14, y + 20);
    y += groupH;
    for (const [label, value] of g.rows) {
      c.font = `400 18px ${font}`;
      c.fillStyle = muted;
      c.textAlign = 'left';
      const valueWidth = Math.min(c.measureText(value).width + 20, W * 0.6);
      c.fillText(fitText(c, label, W - 2 * pad - valueWidth - 12), pad, y + rowH / 2);
      c.font = `700 19px ${font}`;
      c.fillStyle = fg;
      c.textAlign = 'right';
      c.fillText(fitText(c, value, W * 0.6), W - pad, y + rowH / 2);
      c.textAlign = 'left';
      c.strokeStyle = line;
      c.beginPath();
      c.moveTo(pad, y + rowH);
      c.lineTo(W - pad, y + rowH);
      c.stroke();
      y += rowH;
    }
  }
  c.font = `400 14px ${font}`;
  c.fillStyle = muted;
  const stamp = new Date().toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
  c.fillText(fitText(c, `Tabellenbuch · ${stamp}`, W - 2 * pad), pad, H - 40);
  c.fillText(fitText(c, url, W - 2 * pad), pad, H - 20);
  return canvas;
}

function fitText(c, text, max) {
  let t = String(text);
  if (c.measureText(t).width <= max) return t;
  while (t.length > 1 && c.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}

export async function shareImage(canvas, fileName, title) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return 'failed';
  const file = new File([blob], fileName, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'aborted';
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return 'downloaded';
}

/** Etikett (z. B. 62 mm breit) für Prüfprotokoll oder Werkstück; wird über den Druckdialog ausgegeben. */
export function printLabel({ title, groups, url, color }) {
  const stamp = new Date().toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
  let el = document.getElementById('print-label');
  if (!el) {
    el = document.createElement('div');
    el.id = 'print-label';
    document.body.append(el);
  }
  el.style.setProperty('--label', color);
  el.innerHTML = `<div class="label">
      <div class="label-head">${esc(title)}</div>
      ${groups.map((g) => `${g.heading && g.heading !== title ? `<div class="label-sub">${esc(g.heading)}</div>` : ''}
        <table>${g.rows.map(([l, v]) => `<tr><td>${esc(l)}</td><th>${esc(v)}</th></tr>`).join('')}</table>`).join('')}
      <div class="label-foot">${esc(stamp)} · Prüfer: ____________</div>
      <div class="label-url">${esc(url)}</div>
    </div>`;
  document.documentElement.classList.add('printing-label');
  const done = () => {
    document.documentElement.classList.remove('printing-label');
    window.removeEventListener('afterprint', done);
  };
  window.addEventListener('afterprint', done);
  window.print();
}
