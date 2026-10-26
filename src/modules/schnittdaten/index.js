import { esc, fmt, num, options, formValues, smooth } from '../../core/dom.js';
import { t, decimalSep } from '../../core/i18n.js';
import { load, save } from '../../core/store.js';
import { shareFile, shareLink } from '../../core/share.js';
import { MATERIALS } from '../schnittwerte/data.js';
import { PROCS, normalizeEntry, derived, mergeEntries, sortEntries, toCSV, parseImport, encodeLink, decodeLink, newId, MAX_IMPORT_BYTES } from './calc.js';

const STORE_KEY = 'cutdata';
const AUTHOR_KEY = 'cutdata-author';

export function getEntries() {
  return sortEntries(load(STORE_KEY, []).map(normalizeEntry).filter(Boolean));
}

function setEntries(list) {
  save(STORE_KEY, sortEntries(list));
}

/** Link ins Modul Schnittwerte mit den Werten des Eintrags. */
function cuttingLink(e) {
  const mat = MATERIALS.find((m) => m.name === e.material || m.id === e.material);
  const p = { v: e.proc, ...(mat ? { w: mat.id } : {}), vc: e.vc };
  if (e.proc === 'turn') Object.assign(p, { d: e.d, f: e.f, ap: e.ap });
  else if (e.proc === 'mill') Object.assign(p, { D: e.d, z: e.z, fz: e.f, ap: e.ap, ae: e.ae });
  else Object.assign(p, { D: e.d, f: e.f });
  const qs = new URLSearchParams(Object.entries(p).filter(([, v]) => v !== null && v !== undefined && v !== '')).toString();
  return `#/m/schnittwerte?${qs}`;
}

const feedLabel = (proc) => (proc === 'mill' ? 'fz (mm)' : 'f (mm/U)');

function entryCard(e) {
  const d = derived(e);
  return `<article class="cd-entry" data-id="${esc(e.id)}">
    <header><strong>${esc(e.tool || 'Werkzeug')}</strong> <span class="pill cd-proc">${esc(PROCS[e.proc])}</span>
      <small>${esc([e.machine, e.material].filter(Boolean).join(' · '))}</small></header>
    <div class="cd-values">
      <span><small>vc</small>${fmt(e.vc)} <small>m/min</small></span>
      <span><small>n</small>${Number.isFinite(d.n) ? fmt(Math.round(d.n)) : '–'} <small>1/min</small></span>
      <span><small>${e.proc === 'mill' ? 'fz' : 'f'}</small>${e.f !== null ? fmt(e.f, undefined, 4) : '–'} <small>${e.proc === 'mill' ? 'mm' : 'mm/U'}</small></span>
      <span><small>vf</small>${Number.isFinite(d.vf) ? fmt(Math.round(d.vf)) : '–'} <small>mm/min</small></span>
    </div>
    <p class="note cd-meta">Ø ${fmt(e.d)} mm${e.proc === 'mill' && e.z ? ` · z ${fmt(e.z)}` : ''}${e.ap ? ` · ap ${fmt(e.ap)}` : ''}${e.ae ? ` · ae ${fmt(e.ae)}` : ''}${e.note ? ` · ${esc(e.note)}` : ''}${e.by ? ` · von ${esc(e.by)}` : ''}</p>
    <div class="chips">
      <a class="chip" href="${cuttingLink(e)}">In Schnittwerte öffnen →</a>
      <button type="button" class="chip" data-act="edit">Bearbeiten</button>
      <button type="button" class="chip" data-act="copy">Kopieren</button>
      <button type="button" class="chip" data-act="del">Löschen</button>
    </div>
  </article>`;
}

function render(el, params, ctx) {
  let entries = getEntries();
  let machine = params.m || '';
  let filter = '';
  let editing = null;
  let pendingImport = null;

  el.innerHTML = `
    <p class="lead">Eigene, bewährte Schnittdaten je Maschine und Werkzeug. Sie bleiben auf diesem Gerät. Im Team teilt ihr sie als Datei (CSV) oder Link, ohne Konto und ohne Server.</p>
    <div id="cd-import" aria-live="polite"></div>
    <div class="cd-bar">
      <button type="button" class="btn" id="cd-new">+ Neuer Eintrag</button>
      <label class="field cd-search"><span>Suchen</span><input id="cd-filter" type="search" placeholder="Werkzeug, Werkstoff, Notiz"></label>
    </div>
    <div class="chips" id="cd-machines" style="margin:10px 0"></div>
    <form class="card" id="cd-form" autocomplete="off" hidden></form>
    <div id="cd-list"></div>
    <section class="card"><h2>Im Team teilen</h2>
      <div class="share-options">
        <button type="button" class="btn" id="cd-share-file">Datei teilen (CSV)</button>
        <button type="button" class="btn" id="cd-share-link">Link teilen</button>
        <button type="button" class="btn secondary" id="cd-csv">CSV speichern</button>
        <label class="btn secondary cd-file">Importieren<input type="file" id="cd-file" accept=".csv,.json,text/csv,application/json,text/plain" hidden></label>
      </div>
      <p class="note">Geteilt werden die gerade angezeigten Einträge (Filter nach Maschine und Suche gelten).
        Die CSV-Datei öffnet sich auch in Excel. Kollegen tippen hier auf „Importieren“ oder öffnen den Link:
        Neue Einträge kommen dazu, bei gleichen Einträgen gewinnt die neuere Änderung.</p>
      <label class="field" style="margin-top:12px;max-width:320px"><span>Dein Name im Team (optional)</span><input id="cd-author" value="${esc(load(AUTHOR_KEY, ''))}" placeholder="z. B. Max, Spätschicht"></label>
    </section>`;

  const list = el.querySelector('#cd-list');
  const form = el.querySelector('#cd-form');

  function visible() {
    const q = filter.trim().toLowerCase();
    return entries.filter((e) => (!machine || e.machine === machine)
      && (!q || [e.machine, e.tool, e.material, e.note, e.by, PROCS[e.proc]].join(' ').toLowerCase().includes(q)));
  }

  function draw() {
    const machines = [...new Set(entries.map((e) => e.machine).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));
    if (machine && !machines.includes(machine)) machine = '';
    el.querySelector('#cd-machines').innerHTML = machines.length
      ? `<button type="button" class="chip${machine ? '' : ' active'}" data-m="">Alle Maschinen</button>${machines.map((m) => `<button type="button" class="chip${m === machine ? ' active' : ''}" data-m="${esc(m)}">${esc(m)}</button>`).join('')}`
      : '';
    const rows = visible();
    list.innerHTML = rows.length
      ? `<div class="cd-grid">${rows.map(entryCard).join('')}</div>`
      : `<p class="empty">${entries.length ? 'Kein Eintrag passt zum Filter.' : 'Noch keine eigenen Schnittdaten. Tippe auf „+ Neuer Eintrag“ oder speichere eine Rechnung im Modul Schnittwerte.'}</p>`;
    ctx.setParams({ m: machine }, machine ? `Schnittdaten ${machine}` : `Schnittdaten (${entries.length})`);
  }

  function suggestions(key, extra = []) {
    return [...new Set([...entries.map((e) => e[key]).filter(Boolean), ...extra])].map((v) => `<option value="${esc(v)}">`).join('');
  }

  function openForm(e) {
    editing = e;
    const v = (k) => esc(e[k] ?? '');
    form.innerHTML = `<h2>${entries.some((x) => x.id === e.id) ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}</h2>
      <div class="grid">
        <label class="field"><span>Maschine</span><input name="machine" value="${v('machine')}" list="cd-l-machine" placeholder="z. B. DMG CTX 310"></label>
        <label class="field"><span>Werkzeug</span><input name="tool" value="${v('tool')}" list="cd-l-tool" placeholder="z. B. CNMG 120408 PM 4325"></label>
        <label class="field"><span>Werkstoff</span><input name="material" value="${v('material')}" list="cd-l-material" placeholder="z. B. 42CrMo4"></label>
        <label class="field"><span>Verfahren</span><select name="proc">${options(Object.entries(PROCS), e.proc || 'turn')}</select></label>
        <label class="field"><span>Ø d bzw. D (mm)</span><input name="d" inputmode="decimal" value="${v('d')}"></label>
        <label class="field cd-mill"><span>Schneiden z</span><input name="z" inputmode="decimal" value="${v('z')}"></label>
        <label class="field"><span>vc (m/min)</span><input name="vc" inputmode="decimal" value="${v('vc')}"></label>
        <label class="field"><span id="cd-f-label">${feedLabel(e.proc)}</span><input name="f" inputmode="decimal" value="${v('f')}"></label>
        <label class="field cd-nodrill"><span>Schnitttiefe ap (mm)</span><input name="ap" inputmode="decimal" value="${v('ap')}"></label>
        <label class="field cd-mill"><span>Eingriffsbreite ae (mm)</span><input name="ae" inputmode="decimal" value="${v('ae')}"></label>
        <label class="field" style="grid-column:1/-1"><span>Notiz</span><input name="note" value="${v('note')}" placeholder="z. B. mit IK 40 bar, Spannmittel, Standzeit"></label>
      </div>
      <datalist id="cd-l-machine">${suggestions('machine')}</datalist>
      <datalist id="cd-l-tool">${suggestions('tool')}</datalist>
      <datalist id="cd-l-material">${suggestions('material', MATERIALS.map((m) => m.name))}</datalist>
      <p class="note" id="cd-preview"></p>
      <div class="sheet-actions">
        <button type="button" class="btn secondary" id="cd-cancel">Abbrechen</button>
        <button type="submit" class="btn">Speichern</button>
      </div>`;
    form.hidden = false;
    syncForm();
    form.scrollIntoView({ behavior: smooth(), block: 'start' });
    form.elements.machine.focus({ preventScroll: true });
  }

  function syncForm() {
    const v = formValues(form);
    form.querySelectorAll('.cd-mill').forEach((x) => { x.hidden = v.proc !== 'mill'; });
    form.querySelectorAll('.cd-nodrill').forEach((x) => { x.hidden = v.proc === 'drill'; });
    form.querySelector('#cd-f-label').textContent = feedLabel(v.proc);
    const e = normalizeEntry({ ...v, machine: v.machine || '-' });
    const d = e ? derived(e) : null;
    form.querySelector('#cd-preview').textContent = d && Number.isFinite(d.n)
      ? `n = ${fmt(Math.round(d.n))} 1/min${Number.isFinite(d.vf) ? ` · vf = ${fmt(Math.round(d.vf))} mm/min` : ''}`
      : 'Ø und vc eingeben; dazu Maschine, Werkzeug oder Werkstoff.';
  }

  function closeForm() {
    form.hidden = true;
    form.innerHTML = '';
    editing = null;
  }

  form.addEventListener('input', syncForm);
  form.addEventListener('click', (e) => { if (e.target.id === 'cd-cancel') closeForm(); });
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const v = formValues(form);
    const e = normalizeEntry({ ...v, id: editing.id, by: editing.by || load(AUTHOR_KEY, ''), updated: new Date().toISOString() });
    if (!e) { ctx.toast('Ø und vc eingeben, dazu Maschine, Werkzeug oder Werkstoff.'); return; }
    entries = [...entries.filter((x) => x.id !== e.id), e];
    setEntries(entries);
    entries = getEntries();
    closeForm();
    draw();
    ctx.toast('Gespeichert');
  });

  el.querySelector('#cd-new').addEventListener('click', () => openForm({ id: newId(), proc: 'turn', machine: machine || '' }));
  el.querySelector('#cd-filter').addEventListener('input', (e) => { filter = e.target.value; draw(); });
  el.querySelector('#cd-machines').addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    machine = b.dataset.m;
    draw();
  });
  list.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const e = entries.find((x) => x.id === b.closest('[data-id]').dataset.id);
    if (!e) return;
    if (b.dataset.act === 'edit') openForm(e);
    else if (b.dataset.act === 'copy') openForm({ ...e, id: newId(), by: '' });
    else if (b.dataset.act === 'del' && window.confirm(t('Eintrag „{name}“ löschen?', { name: e.tool || e.material }))) {
      entries = entries.filter((x) => x.id !== e.id);
      setEntries(entries);
      draw();
    }
  });
  el.querySelector('#cd-author').addEventListener('input', (e) => save(AUTHOR_KEY, e.target.value.trim()));

  const stamp = () => new Date().toISOString().slice(0, 10);
  const csvBlob = () => new Blob([toCSV(visible(), decimalSep() === '.' ? { sep: ',', dec: '.' } : {})], { type: 'text/csv' });
  const nothing = () => { if (!visible().length) { ctx.toast('Keine Einträge zum Teilen.'); return true; } return false; };

  el.querySelector('#cd-share-file').addEventListener('click', async () => {
    if (nothing()) return;
    const r = await shareFile(csvBlob(), `schnittdaten-${machine ? `${machine.replace(/[^\w-]+/g, '_')}-` : ''}${stamp()}.csv`, 'Schnittdaten');
    if (r === 'downloaded') ctx.toast('CSV gespeichert – jetzt z. B. per Mail oder Messenger schicken');
  });
  el.querySelector('#cd-csv').addEventListener('click', async () => {
    if (nothing()) return;
    await shareFile(csvBlob(), `schnittdaten-${stamp()}.csv`, 'Schnittdaten', { share: false });
    ctx.toast('CSV gespeichert');
  });
  el.querySelector('#cd-share-link').addEventListener('click', async () => {
    if (nothing()) return;
    const code = await encodeLink(visible());
    const url = `${location.href.split('#')[0]}#/m/schnittdaten?import=${code}`;
    if (url.length > 30000) { ctx.toast('Zu viele Einträge für einen Link – bitte als Datei teilen.'); return; }
    const r = await shareLink({ title: 'Schnittdaten', text: `${visible().length} Schnittdaten aus dem Tabellenbuch`, url });
    if (r === 'copied') ctx.toast('Link kopiert');
  });

  function offerImport(found, source) {
    pendingImport = found;
    const box = el.querySelector('#cd-import');
    if (!found.length) { box.innerHTML = `<div class="card"><p class="warn-text">${esc(source)}: keine Schnittdaten gefunden.</p></div>`; return; }
    const known = new Set(entries.map((e) => e.id));
    const fresh = found.filter((e) => !known.has(e.id)).length;
    box.innerHTML = `<div class="card cd-offer"><h2>${found.length} Schnittdaten übernehmen?</h2>
      <p>${esc(source)}: ${fresh} neu, ${found.length - fresh} schon vorhanden (die neuere Änderung gewinnt).</p>
      <ul class="list-plain">${found.slice(0, 5).map((e) => `<li>${esc([e.tool, e.material, e.machine].filter(Boolean).join(' · '))}</li>`).join('')}${found.length > 5 ? `<li>… und ${found.length - 5} weitere</li>` : ''}</ul>
      <div class="sheet-actions"><button type="button" class="btn secondary" data-imp="no">Verwerfen</button><button type="button" class="btn" data-imp="yes">Übernehmen</button></div></div>`;
    box.scrollIntoView({ behavior: smooth(), block: 'start' });
  }

  el.querySelector('#cd-import').addEventListener('click', (e) => {
    const b = e.target.closest('[data-imp]');
    if (!b) return;
    if (b.dataset.imp === 'yes' && pendingImport) {
      const r = mergeEntries(entries, pendingImport);
      entries = r.list;
      setEntries(entries);
      ctx.toast(`${r.added} neu, ${r.changed} aktualisiert, ${r.same} unverändert`);
      draw();
    }
    pendingImport = null;
    el.querySelector('#cd-import').innerHTML = '';
  });

  el.querySelector('#cd-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) { offerImport([], `${file.name} (Datei zu groß)`); return; }
    try {
      offerImport(parseImport(await file.text()), file.name);
    } catch (err) {
      offerImport([], `${file.name} (${err.message})`);
    }
  });

  draw();

  // Aus dem Modul Schnittwerte: Formular mit der Rechnung vorbelegen
  if (params.neu) {
    const mat = MATERIALS.find((m) => m.id === params.w);
    const n = (x) => (Number.isFinite(num(x)) ? num(x) : '');
    openForm({ id: newId(), proc: PROCS[params.v] ? params.v : 'turn', machine: machine || entries[0]?.machine || '', material: mat?.name || '',
      d: n(params.d || params.D), z: n(params.z), vc: n(params.vc), f: n(params.f || params.fz), ap: n(params.ap), ae: n(params.ae) });
    ctx.setParams({ m: machine }, 'Schnittdaten');
  }
  // Geteilter Link: Einträge anbieten und den langen Parameter aus der Adresse nehmen
  if (params.import) {
    decodeLink(params.import).then((found) => offerImport(found, 'Geteilter Link')).catch(() => offerImport([], 'Geteilter Link'));
    ctx.setParams({ m: machine }, 'Schnittdaten');
  }
}

function search(q) {
  const s = q.trim().toLowerCase();
  if (s.length < 3) return [];
  return getEntries().filter((e) => [e.machine, e.tool, e.material, e.note].join(' ').toLowerCase().includes(s)).slice(0, 5).map((e) => {
    const d = derived(e);
    return {
      title: `${e.tool || e.material} · ${e.machine}`.replace(/ · $/, ''),
      text: `Eigene Schnittdaten: vc ${fmt(e.vc)} m/min · n ${fmt(Math.round(d.n))} 1/min${e.f ? ` · ${e.proc === 'mill' ? 'fz' : 'f'} ${fmt(e.f, undefined, 4)}` : ''}`,
      params: { m: e.machine },
      score: 75,
    };
  });
}

export default {
  id: 'schnittdaten',
  title: 'Meine Schnittdaten',
  subtitle: 'Je Maschine und Werkzeug speichern, im Team teilen, CSV',
  color: '#f59e0b',
  icon: '<path d="M5 3h11l3 3v15H5z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  keywords: ['Schnittdaten', 'eigene Werte', 'Maschine', 'Werkzeug', 'Team', 'teilen', 'CSV', 'Export', 'Import', 'Excel', 'Erfahrungswerte'],
  render,
  search,
};
