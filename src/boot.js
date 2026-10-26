// Theme vor dem ersten Zeichnen setzen, damit der Dunkelmodus nicht aufblitzt.
// Eigene Datei statt Inline-Skript, damit die Content-Security-Policy kein Inline-JavaScript erlauben muss.
try {
  var s = JSON.parse(localStorage.getItem('wtb:settings') || '{}');
  if (s.theme === 'light' || s.theme === 'dark') document.documentElement.dataset.theme = s.theme;
  if (s.workshop) document.documentElement.dataset.workshop = '';
  if (!s.expert) document.documentElement.dataset.simple = '';
} catch (e) {}
