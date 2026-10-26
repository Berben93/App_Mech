// App-Shell: Routing über den URL-Hash, Startseite mit Kacheln, globale Suche, Theme.
//   #/                 Startseite
//   #/m/<id>?a=1&b=2   Modul mit Parametern (teilbarer Link)
//   #/suche?q=M12      Suche
import { MODULES, getModule } from './core/registry.js';
import { searchAll } from './core/search.js';
import { esc, $ } from './core/dom.js';
import { getSettings, setSetting, clearAll } from './core/store.js';
import { getFavorites, isFavorite, toggleFavorite, removeFavorite, getHistory, addHistory, clearHistory } from './core/favorites.js';
import { collectResults, resultsText, shareLink, renderImage, shareImage, printLabel } from './core/share.js';
import { enhanceLengthInputs } from './core/inchinput.js';
import { isInch } from './core/units.js';
import { LANGS, lang, initI18n, translateDocument, t, decimalSep } from './core/i18n.js';
import { accent } from './core/contrast.js';

const BRAND = '#1d4ed8';

const view = $('#view');
const titleEl = $('#title');
const backBtn = $('#back');
const searchInput = $('#search');
const header = $('#app-header');
let cleanup = null;
// Aktuelles Modul und seine Beschriftung (für Favoriten, Verlauf und Teilen)
let current = null;
// Module, in denen „Mehr anzeigen“ in dieser Sitzung aufgeklappt wurde
const expanded = new Set();

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = raw.split('?');
  return { parts: path.split('/').filter(Boolean), params: Object.fromEntries(new URLSearchParams(query)) };
}

function buildHash(parts, params = {}) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null));
  const qs = new URLSearchParams(clean).toString();
  return `#/${parts.join('/')}${qs ? `?${qs}` : ''}`;
}

export function navigate(parts, params, replace = false) {
  const hash = buildHash(parts, params);
  if (replace) history.replaceState(null, '', hash);
  else location.hash = hash;
  if (replace) route();
}

// Ändert nur die URL (für teilbare Links), ohne die Ansicht neu aufzubauen.
// `label` beschreibt den Stand kurz, z. B. "M12" oder "Ø 25 H7/g6" (für Favoriten und Verlauf).
let historyTimer;
function setParams(params, label) {
  const { parts } = parseHash();
  const hash = buildHash(parts, params);
  history.replaceState(null, '', hash);
  if (!current) return;
  current.hash = hash;
  if (label) current.label = label;
  updateFavButton();
  clearTimeout(historyTimer);
  const entry = { hash, module: current.mod.id, label: current.label };
  historyTimer = setTimeout(() => addHistory(entry), 800);
}

function setChrome({ title, color, back }) {
  titleEl.textContent = title;
  // Modulfarbe mit ausreichendem Kontrast für das aktuelle Design (WCAG AA, Werkstattmodus AAA)
  document.documentElement.style.setProperty('--accent', accent(color || BRAND));
  backBtn.hidden = !back;
  document.title = title === 'Tabellenbuch' ? t('Tabellenbuch') : `${t(title)} · ${t('Tabellenbuch')}`;
}

function shortcut(entry, removable) {
  const mod = getModule(entry.module);
  // Nur App-interne Links (#/…) anzeigen, auch wenn der Speicher verändert wurde
  if (!mod || !/^#\/m\//.test(String(entry.hash))) return '';
  return `<li class="shortcut" style="--accent:${accent(mod.color)}">
      <a href="${esc(entry.hash)}"><span class="dot" aria-hidden="true"></span>
        <span><strong>${esc(entry.label || mod.title)}</strong><small>${esc(mod.title)}</small></span></a>
      ${removable ? `<button type="button" class="icon-btn small" data-unfav="${esc(entry.hash)}" aria-label="Favorit entfernen" title="Favorit entfernen">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>` : ''}
    </li>`;
}

function renderHome() {
  setChrome({ title: 'Tabellenbuch', back: false });
  const favs = getFavorites();
  const hist = getHistory().filter((h) => !favs.some((f) => f.hash === h.hash)).slice(0, 6);
  view.innerHTML = `
    ${favs.length ? `<section class="shortcuts" aria-label="Favoriten"><h2 class="section-title">★ Favoriten</h2>
      <ul>${favs.map((f) => shortcut(f, true)).join('')}</ul></section>` : ''}
    ${hist.length ? `<section class="shortcuts" aria-label="Zuletzt verwendet"><h2 class="section-title">Zuletzt verwendet</h2>
      <ul>${hist.map((h) => shortcut(h, false)).join('')}</ul></section>` : ''}
    <section class="tiles" aria-label="Module">
      ${MODULES.map((m) => `
        <a class="tile" href="#/m/${m.id}" style="--tile:${m.color}">
          <span class="tile-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${m.icon}</svg></span>
          <span class="tile-title">${esc(m.title)}</span>
          <span class="tile-sub">${esc(m.subtitle)}</span>
        </a>`).join('')}
    </section>
    <p class="hint">Tipp: In der Suche oben findet z. B. <a href="#/suche?q=M12">M12</a>,
      <a href="#/suche?q=25%20H7%2Fg6">25 H7/g6</a>, <a href="#/suche?q=1.4301">1.4301</a> oder <a href="#/suche?q=45%20HRC">45 HRC</a> direkt die passenden Werte.
      Mit ☆ in einem Modul landet die Rechnung oben als Favorit.</p>
    <p class="note">Alle Werte ohne Gewähr: vor der Verwendung mit Norm, Zeichnung und Herstellerangaben prüfen.</p>
    <nav class="legal-links" aria-label="Rechtliches">
      <a href="rechtliches.html#impressum">Impressum</a><a href="rechtliches.html#datenschutz">Datenschutz</a>
      <a href="rechtliches.html#haftung">Hinweis zu den Werten</a><a href="rechtliches.html#quellen">Quellen</a>
      <a href="rechtliches.html#barrierefreiheit">Barrierefreiheit</a>
    </nav>`;
  view.querySelectorAll('[data-unfav]').forEach((b) => b.addEventListener('click', () => {
    removeFavorite(b.dataset.unfav);
    renderHome();
  }));
}

function renderSearch(q) {
  setChrome({ title: 'Suche', back: true });
  if (document.activeElement !== searchInput) searchInput.value = q;
  const hits = searchAll(q);
  if (!q.trim()) {
    view.innerHTML = '<p class="empty">Suchbegriff eingeben, z. B. „M12“, „H7/g6“, „Ra 1,6“ oder „Aluminium“.</p>';
    return;
  }
  if (!hits.length) {
    view.innerHTML = `<p class="empty">Nichts gefunden zu „${esc(q)}“.</p>`;
    return;
  }
  const cards = hits.filter((h) => h.html);
  const list = hits.filter((h) => !h.html);
  view.innerHTML = `
    ${cards.map((h) => `<article class="card quick" style="--accent:${accent(h.module.color)}">
        <header class="quick-head"><span class="badge">${esc(h.module.title)}</span><h2>${esc(h.title)}</h2></header>
        ${h.html}
        <a class="more" href="${buildHash(['m', h.module.id], h.params)}">Im Modul öffnen →</a>
      </article>`).join('')}
    ${list.length ? `<ul class="hits">${list.map((h) => `
      <li><a href="${buildHash(['m', h.module.id], h.params)}" style="--accent:${accent(h.module.color)}">
        <span class="dot" aria-hidden="true"></span>
        <span><strong>${esc(h.title)}</strong><small>${esc(h.text || h.module.title)}</small></span>
      </a></li>`).join('')}</ul>` : ''}`;
}

function renderModule(id, params) {
  const mod = getModule(id);
  if (!mod) return renderHome();
  setChrome({ title: mod.title, color: mod.color, back: true });
  current = { mod, hash: location.hash, label: mod.title };
  view.innerHTML = `<div class="mod-tools">
      <button type="button" class="tool-btn" id="fav-btn" aria-pressed="false"><span class="star" aria-hidden="true">☆</span> <span>Favorit</span></button>
      <button type="button" class="tool-btn" id="share-btn">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg> <span>Teilen</span></button>
    </div>`;
  const el = document.createElement('div');
  el.className = 'module';
  el.style.setProperty('--accent', accent(mod.color));
  el.classList.toggle('show-adv', expanded.has(mod.id));
  view.append(el);
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'btn secondary more-btn';
  more.id = 'more-btn';
  view.append(more);
  more.addEventListener('click', () => {
    const on = !el.classList.contains('show-adv');
    el.classList.toggle('show-adv', on);
    if (on) expanded.add(mod.id);
    else expanded.delete(mod.id);
    updateMoreButton();
    if (!on) more.scrollIntoView({ block: 'nearest' });
  });
  $('#fav-btn').addEventListener('click', () => {
    const on = toggleFavorite({ hash: current.hash, module: mod.id, label: current.label });
    updateFavButton();
    toast(on ? `„${current.label}“ als Favorit gespeichert` : 'Favorit entfernt');
  });
  $('#share-btn').addEventListener('click', () => $('#share').showModal());
  cleanup = mod.render(el, params, { navigate, setParams, toast }) || null;
  current.hash = location.hash;
  updateFavButton();
  enhanceView();
}

/** „Mehr anzeigen“ nur in der einfachen Ansicht und nur, wenn das Modul Erweitertes enthält. */
function updateMoreButton() {
  const btn = document.getElementById('more-btn');
  const el = view.querySelector('.module');
  if (!btn || !el) return;
  const has = !!el.querySelector('.adv, details.steps');
  const open = el.classList.contains('show-adv');
  // Nur bei Änderung schreiben, sonst löst der MutationObserver endlos aus
  const hidden = getSettings().expert || !has;
  const text = open ? 'Weniger anzeigen' : 'Mehr anzeigen: Tabellen, Rechenweg, Sonderfälle';
  if (btn.hidden !== hidden) btn.hidden = hidden;
  if (btn.getAttribute('aria-expanded') !== String(open)) btn.setAttribute('aria-expanded', String(open));
  if (btn.dataset.text !== text) { btn.dataset.text = text; btn.textContent = text; }
}

// Neue Inhalte der Ansicht nachbearbeiten: Längenfelder (Zoll-Eingabe) und „Mehr anzeigen“
function enhanceView() {
  enhanceLengthInputs(view, isInch(), decimalSep());
  updateMoreButton();
}
new MutationObserver(enhanceView).observe(view, { childList: true, subtree: true });

function updateFavButton() {
  const btn = document.getElementById('fav-btn');
  if (!btn || !current) return;
  const on = isFavorite(current.hash);
  btn.setAttribute('aria-pressed', String(on));
  btn.querySelector('.star').textContent = on ? '★' : '☆';
  btn.title = on ? 'Favorit entfernen' : 'Als Favorit speichern';
}

let toastTimer;
function toast(text) {
  const t = $('#toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

let firstRoute = true;
// keepFocus: Ansicht nur neu aufbauen (z. B. nach einer Einstellung), Fokus bleibt, wo er ist
function route({ keepFocus = false } = {}) {
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  current = null;
  const { parts, params } = parseHash();
  header.dataset.view = parts[0] || 'home';
  if (parts[0] === 'm' && parts[1]) renderModule(parts[1], params);
  else if (parts[0] === 'suche') renderSearch(params.q || '');
  else renderHome();
  if (parts[0] !== 'suche') searchInput.value = '';
  window.scrollTo(0, 0);
  // Screenreader und Tastatur: nach dem Seitenwechsel auf die neue Überschrift, nicht ins Leere
  // (bei der Suche bleibt der Fokus im Suchfeld)
  if (!firstRoute && !keepFocus && parts[0] !== 'suche' && document.activeElement !== searchInput) titleEl.focus({ preventScroll: true });
  firstRoute = false;
}

// Suche: während der Eingabe live aktualisieren
let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const q = searchInput.value;
    const onSearch = parseHash().parts[0] === 'suche';
    if (q.trim() || onSearch) navigate(['suche'], { q }, onSearch);
  }, 150);
});
$('#search-form').addEventListener('submit', (e) => {
  e.preventDefault();
  navigate(['suche'], { q: searchInput.value }, parseHash().parts[0] === 'suche');
  searchInput.blur();
});

// „Zum Inhalt springen“: Fokus in den Hauptbereich, ohne die Route (#…) zu ändern
document.querySelector('.skip-link').addEventListener('click', (e) => {
  e.preventDefault();
  view.focus();
});

// Zurück führt immer eine Ebene nach oben zur Startseite (vorhersehbar, auch nach geteiltem Link)
backBtn.addEventListener('click', () => { location.hash = '#/'; });
window.addEventListener('hashchange', () => route());

// Einstellungen: Design, Einheiten, Werkstattmodus, Rechenweg
function applySettings() {
  const st = getSettings();
  const root = document.documentElement;
  if (st.theme === 'auto') delete root.dataset.theme;
  else root.dataset.theme = st.theme;
  if (st.workshop) root.dataset.workshop = '';
  else delete root.dataset.workshop;
  if (st.expert) delete root.dataset.simple;
  else root.dataset.simple = '';
  if (st.steps) root.dataset.stepsOpen = '';
  else delete root.dataset.stepsOpen;
  const dark = st.theme === 'dark' || (st.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('meta[name="theme-color"]').setAttribute('content', dark ? '#0f1115' : '#ffffff');
  const units = $('#units');
  units.textContent = st.units === 'inch' ? 'in' : 'mm';
  units.setAttribute('aria-pressed', String(st.units === 'inch'));
  units.title = st.units === 'inch' ? 'Zoll aktiv – auf Metrisch umschalten' : 'Metrisch aktiv – auf Zoll umschalten';
  const dlg = $('#settings');
  dlg.querySelectorAll('.seg[data-setting] button').forEach((b) => {
    b.setAttribute('aria-pressed', String(String(st[b.parentElement.dataset.setting]) === b.dataset.value));
  });
  dlg.querySelectorAll('input[data-setting]').forEach((i) => { i.checked = !!st[i.dataset.setting]; });
  updateMoreButton();
}

function changeSetting(name, value) {
  const before = getSettings()[name];
  setSetting(name, value);
  applySettings();
  // Einheiten und Rechenweg wirken auf die Ergebnisse: Ansicht neu aufbauen (Eingaben stehen in der URL)
  // Neue Sprache: neu laden, damit alle Texte und Zahlen im neuen Format erscheinen
  if (name === 'lang' && before !== value) { location.reload(); return; }
  // Design und Werkstattmodus ändern die Modulfarben (Kontrast), daher auch neu aufbauen
  if (['units', 'steps', 'theme', 'workshop'].includes(name) && before !== value) {
    const y = window.scrollY;
    route({ keepFocus: true });
    window.scrollTo(0, y);
  }
}

$('#units').addEventListener('click', () => {
  const next = getSettings().units === 'inch' ? 'metric' : 'inch';
  changeSetting('units', next);
  toast(next === 'inch' ? 'Zoll: Längen in Zoll eingeben, Ergebnisse in Zoll (metrisch klein darunter)' : 'Metrisch: Eingaben und Ergebnisse in mm');
});
$('#settings-btn').addEventListener('click', () => $('#settings').showModal());
$('#settings').addEventListener('click', (e) => {
  const b = e.target.closest('.seg[data-setting] button');
  if (b) {
    const raw = b.dataset.value;
    changeSetting(b.parentElement.dataset.setting, raw === 'true' ? true : raw === 'false' ? false : raw);
  }
  if (e.target === e.currentTarget) e.currentTarget.close();
});
$('#settings').addEventListener('change', (e) => {
  if (e.target.dataset.setting) changeSetting(e.target.dataset.setting, e.target.checked);
});
// Datenschutz: alles löschen, was die App auf diesem Gerät gespeichert hat
$('#clear-all').addEventListener('click', () => {
  if (!window.confirm(t('Alle gespeicherten Daten löschen? Einstellungen, Favoriten, Verlauf, eigene Schnittdaten, eigene Werkstoffe und Quiz-Ergebnisse gehen verloren.'))) return;
  clearAll();
  location.hash = '#/';
  location.reload();
});
$('#clear-history').addEventListener('click', () => {
  clearHistory();
  toast('Verlauf gelöscht');
  if (!current && parseHash().parts.length === 0) renderHome();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  applySettings();
  if (getSettings().theme === 'auto') route({ keepFocus: true });
});
applySettings();
// Sprachauswahl (Namen der Sprachen bleiben in ihrer eigenen Sprache)
document.querySelector('.seg[data-setting="lang"]').innerHTML = [['auto', 'Auto'], ...LANGS]
  .map(([k, l]) => `<button type="button" data-value="${k}" translate="no"${k === 'auto' ? '' : ` lang="${k}"`}>${l}</button>`).join('');
applySettings();

// Rechenweg auf-/zuklappen merkt sich die App für alle Module
view.addEventListener('toggle', (e) => {
  if (e.target.matches?.('details.steps') && e.isTrusted) setSetting('steps', e.target.open);
}, true);

// Teilen
$('#share').addEventListener('click', async (e) => {
  if (e.target === e.currentTarget) { e.currentTarget.close(); return; }
  const b = e.target.closest('[data-share]');
  if (!b || !current) return;
  const dlg = $('#share');
  const url = location.href;
  const title = current.label && current.label !== current.mod.title ? `${current.mod.title}: ${current.label}` : current.mod.title;
  const groups = collectResults(view);
  const kind = b.dataset.share;
  if (kind !== 'link' && !groups.length) { toast('Hier gibt es noch kein Ergebnis zum Teilen.'); return; }
  dlg.close();
  if (kind === 'link') {
    const r = await shareLink({ title, text: title, url });
    if (r === 'copied') toast('Link kopiert');
  } else if (kind === 'text') {
    const text = resultsText(title, groups, url);
    try {
      if (navigator.share) await navigator.share({ title, text });
      else { await navigator.clipboard.writeText(text); toast('Ergebnis als Text kopiert'); }
    } catch (err) {
      if (err?.name !== 'AbortError') toast('Teilen nicht möglich');
    }
  } else if (kind === 'image') {
    const dark = document.documentElement.dataset.theme === 'dark';
    const canvas = renderImage({ title, groups, color: current.mod.color, url, dark });
    const r = await shareImage(canvas, `${current.mod.id}.png`, title);
    if (r === 'downloaded') toast('Bild gespeichert');
  } else if (kind === 'label') {
    printLabel({ title, groups, url, color: current.mod.color });
  }
});

// Offline: Service Worker registrieren (nur über http(s), nicht file://)
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Service Worker nicht registriert', err));
}

const offlineBadge = $('#offline');
function updateOnline() { offlineBadge.hidden = navigator.onLine; }
window.addEventListener('online', updateOnline);
window.addEventListener('offline', updateOnline);
updateOnline();

await initI18n();
translateDocument();
route();
