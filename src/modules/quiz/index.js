import { esc } from '../../core/dom.js';
import { load, save } from '../../core/store.js';
import { CATEGORIES, makeRound } from './calc.js';

const STATS_KEY = 'quiz';
const ROUND = 10;

/** Gespeicherte Bilanz: { best: {key: Punkte}, answered, correct } */
function stats() {
  return { best: {}, answered: 0, correct: 0, ...load(STATS_KEY, {}) };
}

function render(el, params, ctx) {
  let cats = (params.t || '').split(',').filter((c) => CATEGORIES.some((x) => x.id === c));
  let round = [];
  let i = 0;
  let score = 0;
  let streak = 0;
  let answered = false;

  el.innerHTML = `
    <p class="lead">Lernmodus für Azubis und zum Auffrischen: ${ROUND} Fragen je Runde, erzeugt aus den Tabellen der App. Nach jeder Antwort gibt es die Erklärung und den Weg ins passende Modul.</p>
    <div class="chips" id="qz-cats" role="group" aria-label="Themen"></div>
    <section class="card qz-card" id="qz-box" aria-live="polite"></section>
    <p class="note" id="qz-stats"></p>`;

  const box = el.querySelector('#qz-box');
  const key = () => (cats.length ? [...cats].sort().join(',') : 'alle');

  function drawCats() {
    el.querySelector('#qz-cats').innerHTML = `<button type="button" class="chip${cats.length ? '' : ' active'}" data-c="">Alle Themen</button>`
      + CATEGORIES.map((c) => `<button type="button" class="chip${cats.includes(c.id) ? ' active' : ''}" data-c="${c.id}">${esc(c.name)}</button>`).join('');
    const s = stats();
    el.querySelector('#qz-stats').textContent = s.answered
      ? `Bisher ${s.answered} Fragen beantwortet, davon ${s.correct} richtig (${Math.round((s.correct / s.answered) * 100)} %). Beste Runde in dieser Auswahl: ${s.best[key()] ?? 0} von ${ROUND}.`
      : 'Deine Ergebnisse bleiben nur auf diesem Gerät.';
  }

  function start() {
    round = makeRound({ cats, count: ROUND });
    i = 0;
    score = 0;
    streak = 0;
    ctx.setParams({ t: cats.join(',') }, cats.length ? `Quiz ${cats.map((c) => CATEGORIES.find((x) => x.id === c).name).join(', ')}` : 'Quiz alle Themen');
    question();
  }

  function question() {
    const q = round[i];
    answered = false;
    const cat = CATEGORIES.find((c) => c.id === q.cat);
    box.innerHTML = `<div class="qz-head"><span class="badge">${esc(cat.name)}</span>
        <span class="qz-progress">Frage ${i + 1} von ${round.length}</span>
        <span class="qz-score">${score} richtig${streak >= 3 ? ` · ${streak} in Folge` : ''}</span></div>
      <div class="qz-bar"><span style="width:${(i / round.length) * 100}%"></span></div>
      ${q.svg ? `<svg class="qz-symbol" viewBox="0 0 24 24" aria-hidden="true">${q.svg}</svg>` : ''}
      <h2 class="qz-q">${esc(q.q)}</h2>
      <div class="qz-options">${q.options.map((o, k) => `<button type="button" class="qz-opt" data-k="${k}">${esc(o)}</button>`).join('')}</div>
      <div id="qz-after"></div>`;
  }

  function answer(k) {
    if (answered) return;
    answered = true;
    const q = round[i];
    const ok = k === q.answer;
    if (ok) { score++; streak++; } else streak = 0;
    const s = stats();
    s.answered++;
    if (ok) s.correct++;
    save(STATS_KEY, s);
    box.querySelectorAll('.qz-opt').forEach((b, n) => {
      b.disabled = true;
      if (n === q.answer) b.classList.add('right');
      else if (n === k) b.classList.add('wrong');
    });
    box.querySelector('.qz-score').textContent = `${score} richtig${streak >= 3 ? ` · ${streak} in Folge` : ''}`;
    box.querySelector('#qz-after').innerHTML = `<div class="qz-explain ${ok ? 'ok' : 'bad'}">
        <strong>${ok ? 'Richtig!' : `Leider falsch. Richtig ist: ${esc(q.options[q.answer])}`}</strong>
        <p>${esc(q.explain)}</p>
        <a href="${esc(q.link)}">Im Modul nachschlagen →</a>
      </div>
      <button type="button" class="btn qz-next" id="qz-next">${i + 1 < round.length ? 'Nächste Frage' : 'Auswertung'}</button>`;
    box.querySelector('#qz-next').focus({ preventScroll: true });
    box.querySelector('#qz-next').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function finish() {
    const s = stats();
    const k = key();
    const record = score > (s.best[k] ?? 0);
    if (record) { s.best[k] = score; save(STATS_KEY, s); }
    const grade = score >= 9 ? 'Sehr gut!' : score >= 7 ? 'Gut gemacht.' : score >= 5 ? 'Solide, da geht noch was.' : 'Weiter üben, die Erklärungen helfen.';
    box.innerHTML = `<h2>Ergebnis: ${score} von ${round.length}</h2>
      <div class="qz-bar"><span style="width:100%"></span></div>
      <p class="qz-final">${grade}${record ? ' Neue Bestleistung in dieser Auswahl.' : ''}</p>
      <button type="button" class="btn" id="qz-again">Neue Runde</button>`;
    drawCats();
  }

  box.addEventListener('click', (e) => {
    const opt = e.target.closest('.qz-opt');
    if (opt) { answer(Number(opt.dataset.k)); return; }
    if (e.target.id === 'qz-next') {
      i++;
      if (i < round.length) question();
      else finish();
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (e.target.id === 'qz-again') start();
  });
  el.querySelector('#qz-cats').addEventListener('click', (e) => {
    const b = e.target.closest('[data-c]');
    if (!b) return;
    const c = b.dataset.c;
    if (!c) cats = [];
    else cats = cats.includes(c) ? cats.filter((x) => x !== c) : [...cats, c];
    drawCats();
    start();
  });

  drawCats();
  start();
}

export default {
  id: 'quiz',
  title: 'Lernen & Quiz',
  subtitle: 'Fragen zu Gewinde, Passung, Zerspanung, Werkstoff',
  color: '#0284c7',
  icon: '<path d="M3 8l9-4 9 4-9 4z"/><path d="M7 10v5c0 1.5 2.5 3 5 3s5-1.5 5-3v-5"/><path d="M21 8v6"/>',
  keywords: ['Quiz', 'Lernen', 'Lernmodus', 'Azubi', 'Ausbildung', 'Prüfung', 'Üben', 'Fragen', 'Test', 'Prüfungsvorbereitung'],
  render,
};
