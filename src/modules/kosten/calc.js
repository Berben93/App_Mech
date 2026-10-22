// Fertigungszeit und Kosten nach REFA-Schema (vereinfacht).
//   Zeit je Einheit  te = (th + tn) · (1 + Verteilzeit)
//   Auftragszeit     T  = tr + m · te
//   Fertigungskosten = T / 60 · Stundensatz
//   Selbstkosten     = Fertigungskosten + m · (Material + Fremdleistung)
//   Angebotspreis    = Selbstkosten · (1 + Zuschlag)

/**
 * @param {object} o  m Losgröße, tr Rüstzeit min, th Hauptzeit min/Stk, tn Nebenzeit min/Stk,
 *                    z Verteilzeit %, rate Stundensatz €/h, mat Material €/Stk, ext Fremdleistung €/Stk, margin Zuschlag %
 */
export function jobCost({ m, tr = 0, th, tn = 0, z = 0, rate, mat = 0, ext = 0, margin = 0 }) {
  if (!(m >= 1) || !(th >= 0) || !(rate >= 0)) return null;
  const te = (th + tn) * (1 + z / 100);
  const T = tr + m * te;
  const production = (T / 60) * rate;
  const setupShare = (tr / 60) * rate;
  const material = m * (mat + ext);
  const cost = production + material;
  const price = cost * (1 + margin / 100);
  return { te, T, production, setupShare, material, cost, price, unitPrice: price / m, unitCost: cost / m };
}

/** Stückpreise für mehrere Losgrößen (für die Staffel). */
export function priceScale(input, sizes = [1, 5, 10, 25, 50, 100, 250, 500, 1000]) {
  return sizes.map((m) => ({ m, ...jobCost({ ...input, m }) }));
}

/** Minuten als „1 h 23 min“. */
export function formatDuration(min) {
  if (!Number.isFinite(min)) return '–';
  const h = Math.floor(min / 60);
  const r = Math.round(min - h * 60);
  return h ? `${h} h ${r} min` : `${(Math.round(min * 10) / 10).toLocaleString('de-DE')} min`;
}
