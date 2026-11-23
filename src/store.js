import { Preferences } from "@capacitor/preferences";

const KEY = "piccolipassi.v1";

// Tutti i dati restano sul telefono (nessun account, nessun server).
export const S = { babies: [], active: null };

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export async function load() {
  try {
    const { value } = await Preferences.get({ key: KEY });
    if (value) {
      const d = JSON.parse(value);
      if (d && Array.isArray(d.babies)) {
        S.babies = d.babies;
        S.active = d.active;
      }
    }
  } catch (e) {
    console.warn("lettura dati", e);
  }
  if (!S.babies.find((b) => b.id === S.active)) S.active = S.babies[0] ? S.babies[0].id : null;
}

let t = null;
export function save() {
  clearTimeout(t);
  t = setTimeout(() => {
    Preferences.set({ key: KEY, value: JSON.stringify({ babies: S.babies, active: S.active }) }).catch(() => {});
  }, 150);
}

export function replaceAll(d) {
  S.babies = d.babies;
  S.active = d.active;
  if (!S.babies.find((b) => b.id === S.active)) S.active = S.babies[0] ? S.babies[0].id : null;
  save();
}

export function baby() {
  return S.babies.find((b) => b.id === S.active) || null;
}

export function newBaby({ nome, nascita, settimane }) {
  const b = {
    id: uid(),
    nome: nome.trim(),
    nascita,
    settimane: settimane || 40,
    logs: [],
    crescita: [],
    fatte: {},
    ricordi: [],
    vaccini: {},
    domande: [],
    sonnoInizio: null,
  };
  S.babies.push(b);
  S.active = b.id;
  save();
  return b;
}

// ---- Date ----
export const pad = (n) => String(n).padStart(2, "0");
export const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDay = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const todayISO = () => isoDay(new Date());

// Data di riferimento per l'età: se nato prima delle 37 settimane si usa l'età corretta (fino a 24 mesi).
export function refDate(b) {
  const n = parseDay(b.nascita);
  const sett = b.settimane || 40;
  if (sett < 37) {
    const r = new Date(n);
    r.setDate(r.getDate() + (40 - sett) * 7);
    return r;
  }
  return n;
}

export function diffMD(from, to) {
  let m = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  let anchor = new Date(from.getFullYear(), from.getMonth() + m, from.getDate());
  if (anchor > to) {
    m--;
    anchor = new Date(from.getFullYear(), from.getMonth() + m, from.getDate());
  }
  const days = Math.round((to - anchor) / 86400000);
  return { m: Math.max(0, m), d: Math.max(0, days), neg: to < from };
}

export function eta(b, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const real = diffMD(parseDay(b.nascita), today);
  const corr = diffMD(refDate(b), today);
  const prem = (b.settimane || 40) < 37;
  return { real, corr, prem, use: prem ? corr : real };
}

export function etaTesto({ m, d }) {
  const mm = m === 1 ? "1 mese" : `${m} mesi`;
  const dd = d === 1 ? "1 giorno" : `${d} giorni`;
  if (m === 0) return dd;
  return d ? `${mm} e ${dd}` : mm;
}

export function weeksOld(b, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((today - parseDay(b.nascita)) / 86400000 / 7);
}

export const fmtData = (iso) => parseDay(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
export const fmtOra = (ms) => new Date(ms).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function fmtDur(min) {
  min = Math.round(min);
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
