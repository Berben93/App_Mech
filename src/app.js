// App-Shell: Routing über den URL-Hash, Startseite mit Kacheln, globale Suche, Theme.
//   #/                 Startseite
//   #/m/<id>?a=1&b=2   Modul mit Parametern (teilbarer Link)
//   #/suche?q=M12      Suche
import { MODULES, getModule } from './core/registry.js';
import { searchAll } from './core/search.js';
import { esc, $ } from './core/dom.js';
import { getSettings, setSetting } from './core/store.js';

const view = $('#view');
const titleEl = $('#title');
const backBtn = $('#back');
const searchInput = $('#search');
const header = $('#app-header');
let cleanup = null;

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
function setParams(params) {
  const { parts } = parseHash();
  history.replaceState(null, '', buildHash(parts, params));
}

function setChrome({ title, color, back }) {
  titleEl.textContent = title;
  document.documentElement.style.setProperty('--accent', color || 'var(--brand)');
  backBtn.hidden = !back;
  document.title = title === 'Tabellenbuch' ? 'Tabellenbuch' : `${title} · Tabellenbuch`;
}

function renderHome() {
  setChrome({ title: 'Tabellenbuch', back: false });
  view.innerHTML = `
    <section class="tiles" aria-label="Module">
      ${MODULES.map((m) => `
        <a class="tile" href="#/m/${m.id}" style="--tile:${m.color}">
          <span class="tile-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${m.icon}</svg></span>
          <span class="tile-title">${esc(m.title)}</span>
          <span class="tile-sub">${esc(m.subtitle)}</span>
        </a>`).join('')}
    </section>
    <p class="hint">Tipp: In der Suche oben findet z. B. <a href="#/suche?q=M12">M12</a>,
      <a href="#/suche?q=25%20H7%2Fg6">25 H7/g6</a> oder <a href="#/suche?q=1.4301">1.4301</a> direkt die passenden Werte.</p>`;
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
    ${cards.map((h) => `<article class="card quick" style="--accent:${h.module.color}">
        <header class="quick-head"><span class="badge">${esc(h.module.title)}</span><h2>${esc(h.title)}</h2></header>
        ${h.html}
        <a class="more" href="${buildHash(['m', h.module.id], h.params)}">Im Modul öffnen →</a>
      </article>`).join('')}
    ${list.length ? `<ul class="hits">${list.map((h) => `
      <li><a href="${buildHash(['m', h.module.id], h.params)}" style="--accent:${h.module.color}">
        <span class="dot" aria-hidden="true"></span>
        <span><strong>${esc(h.title)}</strong><small>${esc(h.text || h.module.title)}</small></span>
      </a></li>`).join('')}</ul>` : ''}`;
}

function renderModule(id, params) {
  const mod = getModule(id);
  if (!mod) return renderHome();
  setChrome({ title: mod.title, color: mod.color, back: true });
  view.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'module';
  el.style.setProperty('--accent', mod.color);
  view.append(el);
  cleanup = mod.render(el, params, { navigate, setParams }) || null;
}

function route() {
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  const { parts, params } = parseHash();
  header.dataset.view = parts[0] || 'home';
  if (parts[0] === 'm' && parts[1]) renderModule(parts[1], params);
  else if (parts[0] === 'suche') renderSearch(params.q || '');
  else renderHome();
  if (parts[0] !== 'suche') searchInput.value = '';
  window.scrollTo(0, 0);
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

// Zurück führt immer eine Ebene nach oben zur Startseite (vorhersehbar, auch nach geteiltem Link)
backBtn.addEventListener('click', () => { location.hash = '#/'; });
window.addEventListener('hashchange', route);

// Theme: auto → hell → dunkel
const THEMES = ['auto', 'light', 'dark'];
const THEME_LABEL = { auto: 'Design: automatisch', light: 'Design: hell', dark: 'Design: dunkel' };
function applyTheme(theme) {
  if (theme === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  const btn = $('#theme');
  btn.dataset.mode = theme;
  btn.title = THEME_LABEL[theme];
  btn.setAttribute('aria-label', THEME_LABEL[theme]);
  const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('meta[name="theme-color"]').setAttribute('content', dark ? '#0f1115' : '#ffffff');
}
$('#theme').addEventListener('click', () => {
  const next = THEMES[(THEMES.indexOf(getSettings().theme) + 1) % THEMES.length];
  applyTheme(setSetting('theme', next).theme);
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(getSettings().theme));
applyTheme(getSettings().theme);

// Offline: Service Worker registrieren (nur über http(s), nicht file://)
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Service Worker nicht registriert', err));
}

const offlineBadge = $('#offline');
function updateOnline() { offlineBadge.hidden = navigator.onLine; }
window.addEventListener('online', updateOnline);
window.addEventListener('offline', updateOnline);
updateOnline();

route();
