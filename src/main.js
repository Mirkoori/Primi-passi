import "@fontsource-variable/fredoka";
import "@fontsource-variable/nunito";
import "./style.css";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import {
  S, load, save, baby, newBaby, replaceAll, uid, isoDay, parseDay, todayISO,
  eta, etaTesto, fmtData, fmtOra, esc, fmtDur, refDate,
} from "./store.js";
import { MESI, AREE, NOTA_TAPPE } from "./tappe.js";
import { GUIDE, VACCINI, EMERGENZA } from "./guida.js";
import { I, openSheet, closeSheet, toast, confirmSheet } from "./ui.js";

const app = document.getElementById("app");
const V = { tab: "oggi", mese: null, giorno: todayISO(), grafico: "peso", guida: null };

/* =============================== utilità =============================== */

const toLocalInput = (ms) => {
  const d = new Date(ms);
  return `${isoDay(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const num = (v) => {
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const meseCorrente = (b) => Math.min(12, eta(b).use.m);
const chiave = (m, a, i) => `${m}-${a}-${i}`;

const COLORI = { giallo: "giallo/senape", verde: "verde", marrone: "marrone", arancio: "arancione", bianco: "bianco/grigio", rosso: "con sangue rosso", nero: "nero" };
const COL_HEX = { giallo: "#f2c230", verde: "#6aa84f", marrone: "#8b5a2b", arancio: "#f08a24", bianco: "#e9e6e1", rosso: "#d9363e", nero: "#2b2b2b" };
const CONSISTENZE = { liquida: "liquida", molle: "molle", normale: "normale", dura: "dura a pallini" };

// Avvisi gentili basati sul diario. Informativi, non diagnostici.
function segnali(b) {
  if (b.noAvvisi) return [];
  const out = [];
  const now = Date.now();
  const giorni = Math.floor((now - parseDay(b.nascita).getTime()) / 86400000);
  const nasc = b.logs.filter((l) => l.tipo === "pannolino" && l.cosa !== "pipi" && now - l.t < 3 * 86400000).sort((x, y) => y.t - x.t);

  const bianca = nasc.find((l) => l.colore === "bianco");
  if (bianca)
    out.push({ k: "bianco-" + bianca.id, liv: "alto", t: "Hai registrato una cacca bianca o grigiastra", d: "Un colore così pallido va fatto vedere presto al pediatra, soprattutto nei primi mesi di vita.", q: "Cacca bianca/grigiastra (" + fmtData(isoDay(new Date(bianca.t))) + "): da controllare" });
  const rossa = nasc.find((l) => l.colore === "rosso");
  if (rossa)
    out.push({ k: "rosso-" + rossa.id, liv: "alto", t: "Hai registrato una cacca con sangue", d: "Tracce di sangue vanno sempre segnalate al pediatra. Se ce n'è tanto o il bimbo sta male, chiama subito.", q: "Cacca con sangue (" + fmtData(isoDay(new Date(rossa.t))) + ")" });
  const nera = nasc.find((l) => l.colore === "nero");
  if (nera && giorni > 7)
    out.push({ k: "nero-" + nera.id, liv: "alto", t: "Hai registrato una cacca nera", d: "Dopo i primi giorni di vita (il meconio è nero ed è normale) è meglio chiedere al pediatra.", q: "Cacca nera (" + fmtData(isoDay(new Date(nera.t))) + ")" });
  const dure = nasc.filter((l) => l.cons === "dura");
  if (dure.length >= 2)
    out.push({ k: "dura-" + dure[0].id, liv: "basso", t: "Cacca dura più volte negli ultimi giorni", d: "Può essere stitichezza: se fa fatica, piange o ha la pancia dura, chiedi consiglio al pediatra (non dare rimedi da solo).", q: "Cacca dura e fatica a evacuare: cosa fare?" });

  // pannolini bagnati di ieri (solo se il diario è in uso e il bimbo è piccolo)
  if (giorni >= 5 && giorni <= 130) {
    const ieri = new Date();
    ieri.setDate(ieri.getDate() - 1);
    const iso = isoDay(ieri);
    const L = logsDelGiorno(b, iso).filter((l) => l.tipo === "pannolino");
    const bagnati = L.filter((l) => l.cosa === "pipi" || l.cosa === "misto").length;
    if (L.length >= 2 && bagnati < 5)
      out.push({ k: "bagnati-" + iso, liv: "basso", t: `Ieri hai registrato ${bagnati} pannolini bagnati`, d: "Di solito, da qualche giorno di vita, sono 5-6 o più al giorno. Se li hai registrati tutti ed è così da più giorni, parlane col pediatra: potrebbe non mangiare abbastanza.", q: "Pochi pannolini bagnati (" + bagnati + " in un giorno): è normale?" });
  }

  // troppo tempo dall'ultima poppata (solo neonati piccoli, solo se si registra)
  if (giorni < 56 && !b.sonnoInizio) {
    const pop = b.logs.filter((l) => l.tipo === "poppata").sort((x, y) => y.t - x.t)[0];
    if (pop && now - pop.t > 5 * 3600000 && now - pop.t < 12 * 3600000)
      out.push({ k: "pop-" + pop.id, liv: "basso", t: "Sono passate più di 5 ore dall'ultima poppata registrata", d: "Nei primi due mesi di solito mangia ogni 2-4 ore. Se non l'hai registrata ignora questo messaggio; se dorme molto e non si sveglia per mangiare, chiedi al pediatra come regolarti.", q: "Dorme molto e mangia poco: ogni quanto devo svegliarlo?" });
  }
  return out.filter((a) => !(b.avvisiOk || {})[a.k]);
}

function progresso(b, m) {
  let tot = 0, ok = 0;
  for (const a of Object.keys(MESI[m].tappe)) {
    MESI[m].tappe[a].forEach((_, i) => {
      tot++;
      if (b.fatte[chiave(m, a, i)]) ok++;
    });
  }
  return { tot, ok, pct: tot ? Math.round((ok / tot) * 100) : 0 };
}

const logsDelGiorno = (b, iso) => {
  const a = parseDay(iso).getTime();
  const z = a + 86400000;
  return b.logs.filter((l) => l.t >= a && l.t < z).sort((x, y) => y.t - x.t);
};

function descLog(l) {
  if (l.tipo === "poppata") {
    if (l.via === "bib") return { em: "🍼", bg: "var(--sun-soft)", t: "Biberon", d: l.ml ? `${l.ml} ml` : "" };
    return { em: "🤱", bg: "var(--sun-soft)", t: `Seno ${l.via === "sx" ? "sinistro" : "destro"}`, d: l.min ? `${l.min} min` : "" };
  }
  if (l.tipo === "pannolino") {
    const n = { pipi: "Pipì", cacca: "Cacca", misto: "Pipì e cacca" }[l.cosa] || "Pannolino";
    const det = [l.colore ? COLORI[l.colore] : "", l.cons ? CONSISTENZE[l.cons] : ""].filter(Boolean).join(", ");
    return { em: "💧", bg: "var(--mint-soft)", t: n, d: det };
  }
  if (l.tipo === "sonno") {
    const min = (l.a - l.t) / 60000;
    return { em: "😴", bg: "var(--pri-soft)", t: "Sonno", d: `${fmtDur(min)} (fino alle ${fmtOra(l.a)})` };
  }
  return { em: "📝", bg: "var(--peach-soft)", t: l.nota || "Nota", d: "" };
}

function riassunto(b, iso) {
  const L = logsDelGiorno(b, iso);
  const pop = L.filter((l) => l.tipo === "poppata").length;
  const pan = L.filter((l) => l.tipo === "pannolino").length;
  const son = L.filter((l) => l.tipo === "sonno").reduce((s, l) => s + (l.a - l.t) / 60000, 0);
  return { pop, pan, son, L };
}

function trascorso(ms) {
  const min = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (min < 1) return "adesso";
  if (min < 60) return `${min} min fa`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h} h ${min % 60 ? (min % 60) + " min " : ""}fa` : "più di un giorno fa";
}

function addMonths(iso, m) {
  const d = parseDay(iso);
  if (m === 3) {
    d.setDate(d.getDate() + 61);
    return d;
  }
  const r = new Date(d.getFullYear(), d.getMonth() + m, d.getDate());
  return r;
}

function vacciniStato(b) {
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  return VACCINI.map((v) => {
    const due = addMonths(b.nascita, v.mese);
    const fatto = b.vaccini[v.id] || null;
    const giorni = Math.round((due - oggi) / 86400000);
    return { ...v, due, fatto, giorni };
  }).sort((x, y) => x.due - y.due || x.nome.localeCompare(y.nome));
}

/* =============================== render =============================== */

function render(keepScroll) {
  const b = baby();
  const y = window.scrollY;
  if (!b) {
    app.innerHTML = vBenvenuto();
    return;
  }
  const v = { oggi: vOggi, tappe: vTappe, diario: vDiario, crescita: vCrescita, guida: vGuida, impo: vImpo }[V.tab](b);
  app.innerHTML = `<div class="app">${header(b)}<main class="view">${v}</main></div>${nav()}`;
  if (keepScroll) window.scrollTo(0, y);
  if (V.tab === "tappe") {
    const on = app.querySelector(".mchip.on");
    if (on) on.scrollIntoView({ inline: "center", block: "nearest" });
  }
}

function header(b) {
  if (V.tab === "impo") {
    return `<header class="top"><button class="back" data-act="tab" data-v="oggi">${I.back}Indietro</button><span class="eyebrow">Impostazioni</span><span style="width:40px"></span></header>`;
  }
  return `<header class="top">
    <div class="brand"><span class="dot">${I.logo}</span>piccoli passi</div>
    <button class="icon-btn" data-act="tab" data-v="impo" aria-label="Impostazioni">${I.gear}</button>
  </header>`;
}

function nav() {
  if (V.tab === "impo") return "";
  const t = [
    ["oggi", "Oggi", I.home],
    ["tappe", "Tappe", I.steps],
    ["diario", "Diario", I.book],
    ["crescita", "Crescita", I.chart],
    ["guida", "Guida", I.guide],
  ];
  return `<nav class="nav"><div class="nav-in">${t
    .map(([k, n, ic]) => `<button class="${V.tab === k ? "on" : ""}" data-act="tab" data-v="${k}">${ic}${n}</button>`)
    .join("")}</div></nav>`;
}

/* =============================== benvenuto =============================== */

function formBimbo(b) {
  const sett = b ? b.settimane || 40 : 40;
  let opts = `<option value="40"${sett >= 37 ? " selected" : ""}>A termine (37 settimane o più)</option>`;
  for (let s = 36; s >= 24; s--) opts += `<option value="${s}"${sett === s ? " selected" : ""}>Nato alla ${s}ª settimana</option>`;
  return `
    <div class="field"><label for="f-nome">Come si chiama?</label><input id="f-nome" class="inp" maxlength="40" autocomplete="off" value="${esc(b ? b.nome : "")}" placeholder="Il suo nome"></div>
    <div class="field"><label for="f-nasc">Data di nascita</label><input id="f-nasc" class="inp" type="date" max="${todayISO()}" value="${b ? b.nascita : ""}"></div>
    <div class="field"><label for="f-sett">Settimana di nascita</label><select id="f-sett" class="inp">${opts}</select>
    <span class="small muted">Se è nato prima del termine, l'app usa l'età corretta per le tappe.</span></div>`;
}

function leggiFormBimbo(root) {
  const nome = root.querySelector("#f-nome").value.trim();
  const nascita = root.querySelector("#f-nasc").value;
  const settimane = parseInt(root.querySelector("#f-sett").value, 10) || 40;
  if (!nome) return toast("Scrivi il nome del bimbo"), null;
  if (!nascita) return toast("Scegli la data di nascita"), null;
  if (parseDay(nascita) > new Date()) return toast("La data non può essere nel futuro"), null;
  return { nome, nascita, settimane };
}

function vBenvenuto() {
  return `<div class="welcome" id="welcome">
    <div class="logo">${I.logo}</div>
    <div><h1>Piccoli passi</h1><p class="muted" style="margin-top:8px;font-size:17px">Le tappe del primo anno, mese per mese. Per capirle, aiutarlo a raggiungerle e vivere con più serenità i primi 12 mesi.</p></div>
    <div class="card">${formBimbo(null)}<button class="btn block" data-act="inizia">Iniziamo</button></div>
    <p class="foot">I dati restano solo su questo telefono: niente account, niente server.</p>
  </div>`;
}

/* =============================== OGGI =============================== */

function vOggi(b) {
  const e = eta(b);
  const m = meseCorrente(b);
  const mese = MESI[m];
  const p = progresso(b, m);
  const r = riassunto(b, todayISO());
  const ultimaPoppata = b.logs.filter((l) => l.tipo === "poppata").sort((x, y) => y.t - x.t)[0];
  const dormendo = !!b.sonnoInizio;
  const vac = vacciniStato(b).filter((v) => !v.fatto).slice(0, 2);
  const oltre = e.use.m >= 12;

  return `
  <section class="hero">
    <span class="eyebrow">${esc(b.nome)} ha</span>
    <h1>${e.real.m === 0 ? etaTesto(e.real) : e.real.m + (e.real.m === 1 ? " mese" : " mesi")}</h1>
    <div class="sub">${e.real.m === 0 ? "" : e.real.d ? `e ${e.real.d} ${e.real.d === 1 ? "giorno" : "giorni"}` : "compiuti oggi"}</div>
    ${e.prem ? `<span class="corr">Età corretta: ${etaTesto(e.corr)}</span>` : ""}
  </section>

  ${boxSegnali(b)}

  <section class="card tappa-card">
    <div class="tappa-head">
      <div class="mese-blob">${m}</div>
      <div class="grow"><span class="eyebrow">${oltre ? "Compie un anno" : "Tappe del mese " + m}</span><h2>${esc(mese.titolo)}</h2></div>
    </div>
    <p class="muted" style="margin:0">${esc(mese.intro)}</p>
    <div class="row"><div class="bar grow"><i style="width:${p.pct}%"></i></div><b class="small">${p.ok}/${p.tot}</b></div>
    <button class="btn soft block" data-act="vaiTappe" data-m="${m}">Guarda le tappe del mese</button>
  </section>

  <section class="quick">
    <button class="q" data-act="nuovaPoppata"><span class="em" style="background:var(--sun-soft)">🍼</span>Poppata</button>
    <button class="q" data-act="nuovoPannolino"><span class="em" style="background:var(--mint-soft)">💧</span>Pannolino</button>
    <button class="q ${dormendo ? "run" : ""}" data-act="sonno"><span class="em" style="background:var(--pri-soft)">😴</span>${dormendo ? "Sveglio" : "Sonno"}</button>
    <button class="q" data-act="nuovaMisura"><span class="em" style="background:var(--peach-soft)">📏</span>Misure</button>
  </section>
  ${dormendo ? `<p class="small muted" style="margin:-6px 4px 0">Sta dormendo dalle ${fmtOra(b.sonnoInizio)} (${trascorso(b.sonnoInizio).replace(" fa", "")}).</p>` : ""}

  <section class="card">
    <div class="row between"><h2>Oggi</h2><button class="btn soft small" data-act="tab" data-v="diario">Diario</button></div>
    <div class="stats" style="margin-top:10px">
      <div class="stat" style="background:var(--sun-soft)"><b>${r.pop}</b><span>poppate</span></div>
      <div class="stat" style="background:var(--mint-soft)"><b>${r.pan}</b><span>pannolini</span></div>
      <div class="stat" style="background:var(--pri-soft)"><b>${r.son ? fmtDur(r.son) : "0"}</b><span>sonno</span></div>
    </div>
    ${ultimaPoppata ? `<p class="small muted" style="margin:10px 2px 0">Ultima poppata: ${trascorso(ultimaPoppata.t)}</p>` : ""}
  </section>

  ${
    vac.length
      ? `<section class="card"><h2>Prossimi vaccini</h2><p class="small muted">Date indicative: l'ASL ti convoca con le date esatte.</p>
        ${vac.map((v) => rigaVaccino(v)).join("")}</section>`
      : ""
  }
  `;
}

function boxSegnali(b) {
  const L = segnali(b);
  if (!L.length) return "";
  return L.map((a) => `<section class="callout ${a.liv === "alto" ? "doc" : "info"}">
      <h3>${a.liv === "alto" ? "⚠️" : "👀"} ${esc(a.t)}</h3>
      <p style="margin:6px 0 10px">${esc(a.d)}</p>
      <div class="row"><button class="btn small" data-act="segnaleDomanda" data-k="${esc(a.k)}">Aggiungi alle domande</button><button class="btn ghost small" data-act="segnaleOk" data-k="${esc(a.k)}">Ho capito</button></div>
      <p class="small muted" style="margin:10px 0 0">Avviso informativo, non una diagnosi. Nei casi urgenti chiama il pediatra o il 112.</p>
    </section>`).join("");
}

function rigaVaccino(v) {
  let pill = `<span class="pill soon">Previsto ${v.due.toLocaleDateString("it-IT", { month: "short", year: "numeric" })}</span>`;
  if (v.fatto) pill = `<span class="pill ok">Fatto il ${fmtData(v.fatto)}</span>`;
  else if (v.giorni < -30) pill = `<span class="pill">Controlla con l’ASL</span>`;
  else if (v.giorni <= 30) pill = `<span class="pill soon">Tra poco · ${v.due.toLocaleDateString("it-IT", { day: "numeric", month: "short" })}</span>`;
  return `<button class="vac ${v.fatto ? "done" : ""}" data-act="vaccino" data-id="${v.id}">
    <span class="box" style="${v.fatto ? "background:var(--mint);border-color:var(--mint);color:#fff" : ""}">${I.check}</span>
    <span class="grow"><b class="tx">${esc(v.nome)}</b><br>${pill}</span></button>`;
}

/* =============================== TAPPE =============================== */

function vTappe(b) {
  const cur = meseCorrente(b);
  if (V.mese == null) V.mese = cur;
  const m = V.mese;
  const mese = MESI[m];
  const p = progresso(b, m);
  const ricordi = b.ricordi.filter((r) => r.m === m).sort((x, y) => (y.data > x.data ? 1 : -1));

  const chips = MESI.map(
    (x) => `<button class="mchip ${x.m === m ? "on" : ""} ${x.m === cur ? "now" : ""}" data-act="mese" data-m="${x.m}">${x.m}</button>`
  ).join("");

  const aree = Object.keys(mese.tappe)
    .map((a) => {
      const A = AREE[a];
      return `<section class="area">
        <div class="area-h"><span class="em" style="background:${A.colore}22">${A.emoji}</span><h3>${A.nome}</h3></div>
        ${mese.tappe[a]
          .map((t, i) => {
            const k = chiave(m, a, i);
            const on = !!b.fatte[k];
            return `<button class="chk ${on ? "on" : ""}" data-act="tappa" data-k="${k}"><span class="box">${I.check}</span><span class="tx">${esc(t)}</span></button>`;
          })
          .join("")}
      </section>`;
    })
    .join("");

  return `
  <div class="months" role="tablist" aria-label="Mese">${chips}</div>
  <section class="card tappa-card">
    <div class="tappa-head">
      <div class="mese-blob">${m}</div>
      <div class="grow"><span class="eyebrow">${m === 0 ? "Primo mese" : m === 12 ? "Un anno" : m + " mesi"}${m === cur ? " · ora" : ""}</span><h2>${esc(mese.titolo)}</h2></div>
    </div>
    <p style="margin:0">${esc(mese.intro)}</p>
    <div class="row"><div class="bar grow"><i style="width:${p.pct}%"></i></div><b class="small">${p.ok}/${p.tot}</b></div>
    <p class="small muted" style="margin:0">Tocca una tappa quando il bimbo ci arriva. Non c'è fretta.</p>
  </section>
  ${aree}
  <section class="callout help"><h3>🌱 Come aiutarlo</h3><ul>${mese.aiuto.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></section>
  <section class="callout doc"><h3>🩺 Parlane col pediatra se</h3><ul>${mese.pediatra.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
    <p class="small" style="margin:10px 0 0">In generale, se perde una capacità che aveva già acquisito, parlane sempre con il pediatra.</p></section>
  <section class="card">
    <div class="row between"><h2>Ricordi del mese</h2><button class="btn soft small" data-act="nuovoRicordo">+ Aggiungi</button></div>
    ${
      ricordi.length
        ? ricordi.map((r) => `<button class="log" data-act="ricordo" data-id="${r.id}"><span class="em" style="background:var(--sun-soft)">⭐</span><span class="grow"><b>${esc(r.testo)}</b><br><span class="small muted">${fmtData(r.data)}</span></span></button>`).join("")
        : `<p class="empty">Scrivi qui le prime volte: il primo sorriso, la prima risata, il primo passo.</p>`
    }
  </section>
  <p class="foot">${NOTA_TAPPE}</p>`;
}

/* =============================== DIARIO =============================== */

function vDiario(b) {
  const iso = V.giorno;
  const oggi = iso === todayISO();
  const r = riassunto(b, iso);
  const dormendo = !!b.sonnoInizio;
  const titolo = oggi ? "Oggi" : parseDay(iso).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  return `
  <div class="daynav">
    <button class="icon-btn" data-act="giorno" data-d="-1" aria-label="Giorno precedente">${I.back}</button>
    <b>${titolo}</b>
    <button class="icon-btn" data-act="giorno" data-d="1" aria-label="Giorno successivo" ${oggi ? "disabled style=\"opacity:.35\"" : ""}>${I.chev}</button>
  </div>
  <section class="quick">
    <button class="q" data-act="nuovaPoppata"><span class="em" style="background:var(--sun-soft)">🍼</span>Poppata</button>
    <button class="q" data-act="nuovoPannolino"><span class="em" style="background:var(--mint-soft)">💧</span>Pannolino</button>
    <button class="q ${dormendo ? "run" : ""}" data-act="sonno"><span class="em" style="background:var(--pri-soft)">😴</span>${dormendo ? "Sveglio" : "Sonno"}</button>
    <button class="q" data-act="nuovaNota"><span class="em" style="background:var(--peach-soft)">📝</span>Nota</button>
  </section>
  <div class="stats">
    <div class="stat" style="background:var(--sun-soft)"><b>${r.pop}</b><span>poppate</span></div>
    <div class="stat" style="background:var(--mint-soft)"><b>${r.pan}</b><span>pannolini</span></div>
    <div class="stat" style="background:var(--pri-soft)"><b>${r.son ? fmtDur(r.son) : "0"}</b><span>sonno</span></div>
  </div>
  <section class="card">
    ${
      r.L.length
        ? r.L.map((l) => {
            const d = descLog(l);
            return `<button class="log" data-act="log" data-id="${l.id}"><time>${fmtOra(l.t)}</time><span class="em" style="background:${d.bg}">${d.em}</span><span class="grow"><b>${esc(d.t)}</b>${d.d ? `<br><span class="small muted">${esc(d.d)}</span>` : ""}</span></button>`;
          }).join("")
        : `<p class="empty">Niente ancora${oggi ? " per oggi" : " in questo giorno"}. Usa i pulsanti qui sopra.</p>`
    }
  </section>
  <p class="foot">Tocca una voce per eliminarla.</p>`;
}

/* =============================== CRESCITA =============================== */

const GRAF = {
  peso: { n: "Peso", u: "kg", k: "peso", col: "#ff9a76", dec: 2 },
  lung: { n: "Lunghezza", u: "cm", k: "lung", col: "#3fc4a0", dec: 1 },
  testa: { n: "Testa", u: "cm", k: "testa", col: "#6b63f5", dec: 1 },
};

function vCrescita(b) {
  const G = GRAF[V.grafico];
  const pts = b.crescita
    .filter((c) => c[G.k] != null)
    .sort((x, y) => (x.data > y.data ? 1 : -1))
    .map((c) => ({ x: (parseDay(c.data) - parseDay(b.nascita)) / 86400000 / 30.44, y: c[G.k], d: c.data }));

  return `
  <div class="seg">${Object.entries(GRAF).map(([k, g]) => `<button class="${V.grafico === k ? "on" : ""}" data-act="grafico" data-g="${k}">${g.n}</button>`).join("")}</div>
  <section class="card">
    <div class="row between"><h2>${G.n} (${G.u})</h2><button class="btn soft small" data-act="nuovaMisura">+ Misura</button></div>
    ${grafico(pts, G)}
  </section>
  <section class="card">
    <h2>Le misure</h2>
    ${
      b.crescita.length
        ? [...b.crescita].sort((x, y) => (x.data < y.data ? 1 : -1)).map((c) => `<button class="log" data-act="misura" data-id="${c.id}"><span class="em" style="background:var(--peach-soft)">📏</span><span class="grow"><b>${fmtData(c.data)}</b><br><span class="small muted">${[c.peso != null ? `${c.peso} kg` : "", c.lung != null ? `${c.lung} cm` : "", c.testa != null ? `testa ${c.testa} cm` : ""].filter(Boolean).join(" · ")}</span></span></button>`).join("")
        : `<p class="empty">Aggiungi il peso, la lunghezza e la circonferenza della testa dopo ogni visita o pesata.</p>`
    }
  </section>
  <p class="foot">Il grafico mostra l'andamento di ${esc(baby().nome)}. Per sapere se la crescita è nella norma, confrontati con il pediatra, che usa le curve di crescita dell'OMS per età e sesso.</p>`;
}

function grafico(pts, G) {
  if (!pts.length) return `<p class="empty">Ancora nessuna misura di ${G.n.toLowerCase()}.</p>`;
  const W = 340, H = 210, L = 38, R = 14, T = 16, B = 30;
  let xs0 = 0;
  let xs1 = Math.max(3, Math.ceil(Math.max(...pts.map((p) => p.x))) + 1);
  xs1 = Math.min(13, xs1);
  let y0 = Math.min(...pts.map((p) => p.y)), y1 = Math.max(...pts.map((p) => p.y));
  const pad = Math.max((y1 - y0) * 0.25, G.k === "peso" ? 0.5 : 2);
  y0 = Math.max(0, y0 - pad);
  y1 = y1 + pad;
  const X = (x) => L + ((x - xs0) / (xs1 - xs0)) * (W - L - R);
  const Y = (y) => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
  let g = "";
  for (let i = 0; i <= 3; i++) {
    const v = y0 + ((y1 - y0) * i) / 3;
    g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#efe5d8" stroke-width="1"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${v.toFixed(G.dec === 2 ? 1 : 0)}</text>`;
  }
  const step = xs1 > 8 ? 2 : 1;
  for (let m = 0; m <= xs1; m += step) g += `<text x="${X(m)}" y="${H - 10}" text-anchor="middle">${m}</text>`;
  g += `<text x="${W - R}" y="${H - 1}" text-anchor="end" style="font-size:10px">mesi</text>`;
  const path = pts.map((p, i) => `${i ? "L" : "M"}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(" ");
  const dots = pts.map((p) => `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="5.5" fill="#fff" stroke="${G.col}" stroke-width="3"/>`).join("");
  const ultimo = pts[pts.length - 1];
  const lab = `<text x="${Math.min(X(ultimo.x), W - 30)}" y="${Y(ultimo.y) - 12}" text-anchor="middle" style="fill:var(--ink);font-size:12px;font-weight:800">${ultimo.y}</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafico ${G.n}">${g}<path d="${path}" fill="none" stroke="${G.col}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>${dots}${lab}</svg>`;
}

/* =============================== GUIDA =============================== */

function vGuida(b) {
  const g = V.guida;
  if (g === "vaccini") return vVaccini(b);
  if (g === "domande") return vDomande(b);
  const guida = GUIDE.find((x) => x.id === g);
  if (guida) return vGuidaDettaglio(guida);
  const nDom = b.domande.filter((d) => !d.fatta).length;
  return `
  <h1 style="font-size:28px">Guida</h1>
  <section class="callout info"><h3>🚨 In caso di emergenza</h3><p style="margin:6px 0 0">${esc(EMERGENZA)}</p></section>
  <button class="gcard" data-act="guida" data-g="vaccini"><span class="em" style="background:var(--mint-soft)">💉</span><span class="grow"><h3>Vaccini</h3><span class="small muted">Calendario indicativo e date fatte</span></span><span class="chev">${I.chev}</span></button>
  <button class="gcard" data-act="guida" data-g="domande"><span class="em" style="background:var(--peach-soft)">💬</span><span class="grow"><h3>Domande per il pediatra</h3><span class="small muted">${nDom ? nDom + " da fare alla prossima visita" : "Annotale quando ti vengono in mente"}</span></span><span class="chev">${I.chev}</span></button>
  ${GUIDE.map((x) => `<button class="gcard" data-act="guida" data-g="${x.id}"><span class="em">${x.icona}</span><span class="grow"><h3>${esc(x.titolo)}</h3></span><span class="chev">${I.chev}</span></button>`).join("")}
  <p class="foot">${esc(EMERGENZA)}</p>`;
}

function vGuidaDettaglio(g) {
  return `
  <button class="back" data-act="guida" data-g="">${I.back}Guida</button>
  <h1 style="font-size:28px">${g.icona} ${esc(g.titolo)}</h1>
  <section class="card">
    ${g.sezioni
      .map(
        (s) => `<div class="sec"><h3>${esc(s.t)}</h3>
        ${(s.p || []).map((t) => `<p style="margin:4px 0 0">${esc(t)}</p>`).join("")}
        ${s.l ? `<ul>${s.l.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
        ${s.n ? `<p class="small muted" style="margin:6px 0 0">${esc(s.n)}</p>` : ""}</div>`
      )
      .join("")}
  </section>
  <p class="foot">${esc(EMERGENZA)}</p>`;
}

function vVaccini(b) {
  const L = vacciniStato(b);
  return `
  <button class="back" data-act="guida" data-g="">${I.back}Guida</button>
  <h1 style="font-size:28px">💉 Vaccini</h1>
  <section class="callout info"><p style="margin:0">Le date sono indicative, calcolate dalla data di nascita. Lo schema esatto e le convocazioni dipendono dalla tua ASL e Regione: segui quello che ti dice il pediatra. Tocca un vaccino per segnarlo come fatto.</p></section>
  <section class="card">${L.map((v) => rigaVaccino(v)).join("")}</section>`;
}

function vDomande(b) {
  const L = [...b.domande].sort((x, y) => Number(x.fatta) - Number(y.fatta));
  return `
  <button class="back" data-act="guida" data-g="">${I.back}Guida</button>
  <h1 style="font-size:28px">💬 Domande per il pediatra</h1>
  <section class="card">
    <div class="row"><input id="q-new" class="inp grow" maxlength="200" placeholder="Es. Quando passiamo a due pasti?" autocomplete="off"><button class="btn" data-act="addDomanda">Aggiungi</button></div>
  </section>
  <section class="card">
    ${
      L.length
        ? L.map((d) => `<div class="vac ${d.fatta ? "done" : ""}"><button class="box" style="${d.fatta ? "background:var(--mint);border-color:var(--mint);color:#fff" : ""}" data-act="domandaFatta" data-id="${d.id}" aria-label="Segna come chiesta">${I.check}</button><span class="grow tx">${esc(d.testo)}</span><button class="btn soft small" data-act="delDomanda" data-id="${d.id}" aria-label="Elimina">✕</button></div>`).join("")
        : `<p class="empty">Nessuna domanda. Annota qui i dubbi, così non li dimentichi alla visita.</p>`
    }
  </section>`;
}

/* =============================== IMPOSTAZIONI =============================== */

function vImpo(b) {
  return `
  <section class="card">
    <h2>${esc(b.nome)}</h2>
    ${formBimbo(b)}
    <button class="btn block" data-act="salvaBimbo">Salva</button>
  </section>
  ${
    S.babies.length > 1
      ? `<section class="card"><h2>I tuoi bimbi</h2><div class="choice" style="margin-top:8px">${S.babies.map((x) => `<button class="${x.id === b.id ? "on" : ""}" data-act="cambiaBimbo" data-id="${x.id}">${esc(x.nome)}</button>`).join("")}</div></section>`
      : ""
  }
  <button class="btn soft block" data-act="aggiungiBimbo">+ Aggiungi un altro bimbo (gemelli, fratellino)</button>
  <section class="card">
    <h2>Avvisi dal diario</h2>
    <p class="small muted">Messaggi gentili se registri una cacca di colore da controllare, pochi pannolini bagnati o una poppata lontana nei primissimi mesi. Sono solo informativi.</p>
    <button class="btn ${b.noAvvisi ? "soft" : "ghost"} block" style="margin-top:8px" data-act="avvisiToggle">${b.noAvvisi ? "Avvisi disattivati: riattiva" : "Avvisi attivi: disattiva"}</button>
  </section>
  <section class="card">
    <h2>Backup dei dati</h2>
    <p class="small muted">I dati sono solo su questo telefono. Se cambi telefono o disinstalli l'app, li perdi: salva un backup e conservalo (email, cloud).</p>
    <div class="row" style="margin-top:8px"><button class="btn soft grow" data-act="esporta">Salva backup</button><button class="btn ghost grow" data-act="importa">Ripristina</button></div>
    <input type="file" id="f-imp" accept="application/json,.json" hidden>
  </section>
  <section class="card">
    <h2>Privacy</h2>
    <p class="small muted">Piccoli Passi non richiede account e non invia nessun dato a server esterni: tutto quello che scrivi resta sul tuo dispositivo.</p>
  </section>
  <button class="btn danger block" data-act="eliminaBimbo">Elimina ${esc(b.nome)} e i suoi dati</button>
  <p class="foot">Piccoli Passi ha scopo informativo e non sostituisce il parere del pediatra.</p>`;
}

/* =============================== azioni =============================== */

const sheetRoot = () => document.querySelector("#sheet .sheet-in");

function sheetOra(label = "Quando") {
  return `<div class="field"><label for="s-ora">${label}</label><input id="s-ora" class="inp" type="datetime-local" max="${toLocalInput(Date.now() + 60000)}" value="${toLocalInput(Date.now())}"></div>`;
}
const leggiOra = () => {
  const v = sheetRoot().querySelector("#s-ora").value;
  const t = v ? new Date(v).getTime() : Date.now();
  return Number.isFinite(t) ? t : Date.now();
};

function scegli(root, group, val) {
  root.querySelectorAll(`[data-grp="${group}"]`).forEach((x) => x.classList.toggle("on", x.dataset.val === val));
  root.dataset[group] = val;
}

const acts = {
  tab(el) {
    V.tab = el.dataset.v;
    if (V.tab === "tappe") V.mese = null;
    if (V.tab === "guida") V.guida = null;
    if (V.tab === "diario") V.giorno = todayISO();
    render();
    window.scrollTo(0, 0);
  },
  inizia() {
    const f = leggiFormBimbo(document.getElementById("welcome"));
    if (!f) return;
    newBaby(f);
    V.tab = "oggi";
    render();
  },
  vaiTappe(el) {
    V.tab = "tappe";
    V.mese = +el.dataset.m;
    render();
    window.scrollTo(0, 0);
  },
  mese(el) {
    V.mese = +el.dataset.m;
    render();
    window.scrollTo(0, 0);
  },
  tappa(el) {
    const b = baby();
    const k = el.dataset.k;
    if (b.fatte[k]) delete b.fatte[k];
    else b.fatte[k] = todayISO();
    save();
    render(true);
  },
  giorno(el) {
    const d = parseDay(V.giorno);
    d.setDate(d.getDate() + +el.dataset.d);
    if (isoDay(d) > todayISO()) return;
    V.giorno = isoDay(d);
    render();
  },
  grafico(el) {
    V.grafico = el.dataset.g;
    render(true);
  },
  guida(el) {
    V.guida = el.dataset.g || null;
    render();
    window.scrollTo(0, 0);
  },

  /* --- poppata --- */
  nuovaPoppata() {
    openSheet(
      `<h2>🍼 Poppata</h2>
      <div class="choice" style="margin-bottom:12px"><button class="on" data-act="sc" data-grp="via" data-val="sx">Seno sx</button><button data-act="sc" data-grp="via" data-val="dx">Seno dx</button><button data-act="sc" data-grp="via" data-val="bib">Biberon</button></div>
      <div class="field"><label id="s-lab" for="s-q">Durata (minuti)</label><input id="s-q" class="inp" inputmode="numeric" placeholder="Facoltativo"></div>
      ${sheetOra()}
      <button class="btn block" data-act="salvaPoppata">Salva</button>`,
      (el) => (el.dataset.via = "sx")
    );
  },
  sc(el) {
    const root = sheetRoot();
    scegli(root, el.dataset.grp, el.dataset.val);
    if (el.dataset.grp === "via") root.querySelector("#s-lab").textContent = el.dataset.val === "bib" ? "Quantità (ml)" : "Durata (minuti)";
    if (el.dataset.grp === "cosa") {
      const c = root.querySelector("#s-cacca");
      if (c) c.hidden = el.dataset.val === "pipi";
    }
  },
  salvaPoppata() {
    const root = sheetRoot();
    const via = root.dataset.via || "sx";
    const q = num(root.querySelector("#s-q").value);
    const l = { id: uid(), tipo: "poppata", via, t: leggiOra() };
    if (q != null && q > 0) l[via === "bib" ? "ml" : "min"] = Math.round(q);
    baby().logs.push(l);
    save();
    closeSheet();
    render(true);
    toast("Poppata registrata");
  },

  /* --- pannolino --- */
  nuovoPannolino() {
    openSheet(
      `<h2>💧 Pannolino</h2>
      <div class="choice" style="margin-bottom:12px"><button class="on" data-act="sc" data-grp="cosa" data-val="pipi">Pipì</button><button data-act="sc" data-grp="cosa" data-val="cacca">Cacca</button><button data-act="sc" data-grp="cosa" data-val="misto">Entrambi</button></div>
      <div id="s-cacca" hidden>
        <div class="field"><label>Colore</label><div class="choice">${Object.entries(COLORI).map(([k, n]) => `<button data-act="sc" data-grp="colore" data-val="${k}"><i class="cdot" style="background:${COL_HEX[k]}"></i>${n}</button>`).join("")}</div></div>
        <div class="field"><label>Consistenza</label><div class="choice">${Object.entries(CONSISTENZE).map(([k, n]) => `<button data-act="sc" data-grp="cons" data-val="${k}">${n}</button>`).join("")}</div></div>
      </div>
      ${sheetOra()}
      <button class="btn block" data-act="salvaPannolino">Salva</button>`,
      (el) => (el.dataset.cosa = "pipi")
    );
  },
  salvaPannolino() {
    const root = sheetRoot();
    const cosa = root.dataset.cosa || "pipi";
    const l = { id: uid(), tipo: "pannolino", cosa, t: leggiOra() };
    if (cosa !== "pipi") {
      if (root.dataset.colore) l.colore = root.dataset.colore;
      if (root.dataset.cons) l.cons = root.dataset.cons;
    }
    baby().logs.push(l);
    save();
    closeSheet();
    render(true);
    toast("Pannolino registrato");
  },

  /* --- sonno --- */
  sonno() {
    const b = baby();
    if (b.sonnoInizio) {
      const a = Date.now();
      if (a - b.sonnoInizio < 60000) {
        b.sonnoInizio = null;
        toast("Troppo breve, non salvato");
      } else {
        b.logs.push({ id: uid(), tipo: "sonno", t: b.sonnoInizio, a });
        b.sonnoInizio = null;
        toast("Sonno registrato");
      }
    } else {
      b.sonnoInizio = Date.now();
      toast("Buon sonno!");
    }
    save();
    render(true);
  },

  /* --- nota --- */
  nuovaNota() {
    openSheet(
      `<h2>📝 Nota</h2>
      <div class="field"><label for="s-nota">Cosa vuoi annotare?</label><textarea id="s-nota" class="inp" maxlength="300" placeholder="Es. vitamina D, ha tossito, vaccino..."></textarea></div>
      ${sheetOra()}
      <button class="btn block" data-act="salvaNota">Salva</button>`
    );
  },
  salvaNota() {
    const t = sheetRoot().querySelector("#s-nota").value.trim();
    if (!t) return toast("Scrivi qualcosa");
    baby().logs.push({ id: uid(), tipo: "nota", nota: t, t: leggiOra() });
    save();
    closeSheet();
    render(true);
  },

  log(el) {
    const l = baby().logs.find((x) => x.id === el.dataset.id);
    if (!l) return;
    const d = descLog(l);
    confirmSheet(`${d.em} ${esc(d.t)}`, `${fmtOra(l.t)}${d.d ? " · " + esc(d.d) : ""}. Vuoi eliminare questa voce?`, "Elimina", () => {
      const b = baby();
      b.logs = b.logs.filter((x) => x.id !== l.id);
      save();
      render(true);
    });
  },

  /* --- misure --- */
  nuovaMisura() {
    openSheet(
      `<h2>📏 Misure</h2>
      <div class="field"><label for="m-data">Data</label><input id="m-data" class="inp" type="date" max="${todayISO()}" value="${todayISO()}"></div>
      <div class="grid2">
        <div class="field"><label for="m-peso">Peso (kg)</label><input id="m-peso" class="inp" inputmode="decimal" placeholder="es. 5,4"></div>
        <div class="field"><label for="m-lung">Lunghezza (cm)</label><input id="m-lung" class="inp" inputmode="decimal" placeholder="es. 60"></div>
      </div>
      <div class="field"><label for="m-testa">Circonferenza testa (cm)</label><input id="m-testa" class="inp" inputmode="decimal" placeholder="Facoltativo"></div>
      <button class="btn block" data-act="salvaMisura">Salva</button>`
    );
  },
  salvaMisura() {
    const r = sheetRoot();
    const peso = num(r.querySelector("#m-peso").value);
    const lung = num(r.querySelector("#m-lung").value);
    const testa = num(r.querySelector("#m-testa").value);
    const data = r.querySelector("#m-data").value || todayISO();
    if (peso == null && lung == null && testa == null) return toast("Inserisci almeno una misura");
    if ((peso != null && (peso < 1 || peso > 20)) || (lung != null && (lung < 30 || lung > 110)) || (testa != null && (testa < 25 || testa > 60)))
      return toast("Controlla i valori inseriti");
    baby().crescita.push({ id: uid(), data, peso, lung, testa });
    save();
    closeSheet();
    render(true);
    toast("Misure salvate");
  },
  misura(el) {
    const c = baby().crescita.find((x) => x.id === el.dataset.id);
    if (!c) return;
    confirmSheet("Elimina misura", `Misure del ${fmtData(c.data)}. Vuoi eliminarle?`, "Elimina", () => {
      const b = baby();
      b.crescita = b.crescita.filter((x) => x.id !== c.id);
      save();
      render(true);
    });
  },

  /* --- ricordi --- */
  nuovoRicordo() {
    openSheet(
      `<h2>⭐ Nuovo ricordo</h2>
      <div class="field"><label for="r-t">Cosa è successo?</label><textarea id="r-t" class="inp" maxlength="300" placeholder="Es. Prima risata a crepapelle!"></textarea></div>
      <div class="field"><label for="r-d">Data</label><input id="r-d" class="inp" type="date" max="${todayISO()}" value="${todayISO()}"></div>
      <button class="btn block" data-act="salvaRicordo">Salva</button>`
    );
  },
  salvaRicordo() {
    const r = sheetRoot();
    const testo = r.querySelector("#r-t").value.trim();
    if (!testo) return toast("Scrivi il ricordo");
    baby().ricordi.push({ id: uid(), m: V.mese, testo, data: r.querySelector("#r-d").value || todayISO() });
    save();
    closeSheet();
    render(true);
  },
  ricordo(el) {
    const r = baby().ricordi.find((x) => x.id === el.dataset.id);
    if (!r) return;
    confirmSheet("⭐ Ricordo", `${esc(r.testo)}<br><span class="small">${fmtData(r.data)}</span>`, "Elimina", () => {
      const b = baby();
      b.ricordi = b.ricordi.filter((x) => x.id !== r.id);
      save();
      render(true);
    });
  },

  /* --- vaccini --- */
  vaccino(el) {
    const b = baby();
    const v = vacciniStato(b).find((x) => x.id === el.dataset.id);
    if (!v) return;
    openSheet(
      `<h2>💉 ${esc(v.nome)}</h2>
      <p class="muted">${v.nota ? esc(v.nota) + ". " : ""}Previsto circa ${v.due.toLocaleDateString("it-IT", { month: "long", year: "numeric" })}.</p>
      <div class="field"><label for="v-d">Data in cui è stato fatto</label><input id="v-d" class="inp" type="date" max="${todayISO()}" value="${v.fatto || todayISO()}"></div>
      <button class="btn block" data-act="salvaVaccino" data-id="${v.id}">Segna come fatto</button>
      ${v.fatto ? `<button class="btn ghost block" style="margin-top:8px" data-act="annullaVaccino" data-id="${v.id}">Togli il segno</button>` : ""}`
    );
  },
  salvaVaccino(el) {
    baby().vaccini[el.dataset.id] = sheetRoot().querySelector("#v-d").value || todayISO();
    save();
    closeSheet();
    render(true);
  },
  annullaVaccino(el) {
    delete baby().vaccini[el.dataset.id];
    save();
    closeSheet();
    render(true);
  },

  /* --- avvisi --- */
  segnaleOk(el) {
    const b = baby();
    b.avvisiOk = b.avvisiOk || {};
    b.avvisiOk[el.dataset.k] = true;
    save();
    render(true);
  },
  segnaleDomanda(el) {
    const b = baby();
    const a = segnali(b).find((x) => x.k === el.dataset.k);
    if (a) {
      b.domande.push({ id: uid(), testo: a.q, fatta: false });
      b.avvisiOk = b.avvisiOk || {};
      b.avvisiOk[a.k] = true;
      save();
      render(true);
      toast("Aggiunta alle domande per il pediatra");
    }
  },
  avvisiToggle() {
    const b = baby();
    b.noAvvisi = !b.noAvvisi;
    save();
    render(true);
  },

  /* --- domande --- */
  addDomanda() {
    const i = document.getElementById("q-new");
    const t = i.value.trim();
    if (!t) return;
    baby().domande.push({ id: uid(), testo: t, fatta: false });
    save();
    render(true);
  },
  domandaFatta(el) {
    const d = baby().domande.find((x) => x.id === el.dataset.id);
    if (d) d.fatta = !d.fatta;
    save();
    render(true);
  },
  delDomanda(el) {
    const b = baby();
    b.domande = b.domande.filter((x) => x.id !== el.dataset.id);
    save();
    render(true);
  },

  /* --- impostazioni --- */
  salvaBimbo() {
    const f = leggiFormBimbo(app);
    if (!f) return;
    Object.assign(baby(), f);
    save();
    toast("Salvato");
    render(true);
  },
  cambiaBimbo(el) {
    S.active = el.dataset.id;
    save();
    V.mese = null;
    render();
  },
  aggiungiBimbo() {
    openSheet(
      `<h2>Un altro bimbo</h2>${formBimbo(null)}<button class="btn block" data-act="creaBimbo">Aggiungi</button>`
    );
  },
  creaBimbo() {
    const f = leggiFormBimbo(sheetRoot());
    if (!f) return;
    newBaby(f);
    closeSheet();
    V.tab = "oggi";
    V.mese = null;
    render();
    toast("Aggiunto");
  },
  eliminaBimbo() {
    const b = baby();
    confirmSheet(`Eliminare ${esc(b.nome)}?`, "Verranno cancellati tutti i suoi dati (diario, misure, tappe, ricordi). Non si può annullare.", "Elimina tutto", () => {
      S.babies = S.babies.filter((x) => x.id !== b.id);
      S.active = S.babies[0] ? S.babies[0].id : null;
      save();
      V.tab = "oggi";
      render();
    });
  },
  async esporta() {
    const json = JSON.stringify({ app: "piccoli-passi", v: 1, babies: S.babies, active: S.active }, null, 2);
    const name = `piccoli-passi-backup-${todayISO()}.json`;
    try {
      if (Capacitor.isNativePlatform()) {
        const r = await Filesystem.writeFile({ path: name, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 });
        await Share.share({ title: name, url: r.uri, dialogTitle: "Salva il backup" });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }
    } catch (e) {
      if (!String(e).includes("cancel")) toast("Non sono riuscito a salvare il backup");
    }
  },
  importa() {
    document.getElementById("f-imp").click();
  },
};

/* =============================== eventi =============================== */

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]");
  if (!el || el.disabled) return;
  const f = acts[el.dataset.act];
  if (f) f(el, e);
});

document.addEventListener("change", (e) => {
  if (e.target.id !== "f-imp") return;
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const d = JSON.parse(rd.result);
      if (!d || !Array.isArray(d.babies) || !d.babies.every((b) => b && b.id && b.nome && /^\d{4}-\d{2}-\d{2}$/.test(b.nascita || ""))) throw new Error("formato");
      d.babies.forEach((b) => {
        b.logs = Array.isArray(b.logs) ? b.logs : [];
        b.crescita = Array.isArray(b.crescita) ? b.crescita : [];
        b.ricordi = Array.isArray(b.ricordi) ? b.ricordi : [];
        b.domande = Array.isArray(b.domande) ? b.domande : [];
        b.fatte = b.fatte && typeof b.fatte === "object" ? b.fatte : {};
        b.vaccini = b.vaccini && typeof b.vaccini === "object" ? b.vaccini : {};
        b.settimane = b.settimane || 40;
        b.sonnoInizio = b.sonnoInizio || null;
      });
      confirmSheet("Ripristinare il backup?", `Il backup contiene ${d.babies.length} ${d.babies.length === 1 ? "bimbo" : "bimbi"}. I dati attuali verranno sostituiti.`, "Ripristina", () => {
        replaceAll(d);
        V.tab = "oggi";
        render();
        toast("Backup ripristinato");
      });
    } catch (err) {
      toast("File di backup non valido");
    }
    e.target.value = "";
  };
  rd.readAsText(file);
});

// Aggiorna i tempi ("X min fa", sonno in corso) quando l'app è aperta.
setInterval(() => {
  if (document.getElementById("sheet").hidden && ["oggi", "diario"].includes(V.tab) && baby()) render(true);
}, 60000);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && document.getElementById("sheet").hidden && baby()) render(true);
});

(async function avvia() {
  await load();
  render();
})();
