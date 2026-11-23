import "@fontsource-variable/fredoka";
import "@fontsource-variable/nunito";
import "./style.css";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { percentile, valorePerc, PERC } from "./oms.js";
import { salvaFoto, leggiFoto, eliminaFoto, creaCollage } from "./foto.js";
import { nativo, chiediPermesso, riprogramma } from "./notifiche.js";
import {
  S, load, save, baby, newBaby, replaceAll, uid, isoDay, parseDay, todayISO,
  eta, etaTesto, fmtData, fmtOra, esc, fmtDur, refDate, etaMesiDec,
} from "./store.js";
import { MESI, AREE, NOTA_TAPPE } from "./tappe.js";
import { GUIDE, VACCINI, EMERGENZA, ALLERGENI, CIBI, REAZIONI } from "./guida.js";
import { I, openSheet, closeSheet, toast, confirmSheet } from "./ui.js";

const app = document.getElementById("app");
const V = { tab: "oggi", mese: null, giorno: todayISO(), grafico: "peso", guida: null, periodo: 14 };

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

const SESSI = { m: "Maschio", f: "Femmina" };
function percMisura(b, c, k) {
  if (!b.sesso || c[k] == null) return null;
  const x = etaMesiDec(b, c.data);
  if (x < 0 || x > 13) return null;
  return percentile(b.sesso, k, x, c[k]);
}
const ordinale = (p) => `${Math.round(p)}°`;

function eseguiOnSave() {
  clearTimeout(eseguiOnSave.t);
  eseguiOnSave.t = setTimeout(aggiornaPromemoria, 600);
}

// ---- promemoria: ricalcolati sempre dallo stato ----
function costruisciPromemoria() {
  const lista = [];
  let id = 1;
  const ora = Date.now();
  const alle = (d, h, m) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0).getTime();
  for (const b of S.babies) {
    if (S.settings.notifVacc !== false) {
      const perData = new Map();
      for (const v of vacciniStato(b)) {
        if (v.fatto) continue;
        const k = isoDay(v.due);
        if (!perData.has(k)) perData.set(k, { due: v.due, nomi: [] });
        perData.get(k).nomi.push(v.nome);
      }
      for (const { due, nomi } of perData.values()) {
        const t0 = alle(due, 9, 0);
        const t7 = t0 - 7 * 86400000;
        const corpo = `${nomi.join(", ")}. Le date sono indicative: controlla la convocazione dell'ASL.`;
        if (t7 > ora) lista.push({ id: id++, title: `Vaccini di ${b.nome} tra una settimana`, body: corpo, schedule: { at: new Date(t7), allowWhileIdle: true } });
        if (t0 > ora) lista.push({ id: id++, title: `Vaccini di ${b.nome}`, body: corpo, schedule: { at: new Date(t0), allowWhileIdle: true } });
      }
    }
    for (const v of b.visite || []) {
      const giorno = v.t - 86400000;
      const unora = v.t - 3600000;
      if (giorno > ora) lista.push({ id: id++, title: `Domani: ${v.titolo}`, body: `${b.nome}, alle ${fmtOra(v.t)}`, schedule: { at: new Date(giorno), allowWhileIdle: true } });
      if (unora > ora) lista.push({ id: id++, title: `Tra un'ora: ${v.titolo}`, body: `${b.nome}, alle ${fmtOra(v.t)}`, schedule: { at: new Date(unora), allowWhileIdle: true } });
    }
    if (b.vitd && b.vitd.on) {
      const [h, m] = (b.vitd.ora || "09:00").split(":").map(Number);
      lista.push({ id: id++, title: "Vitamina D", body: `È l'ora della vitamina D di ${b.nome}`, schedule: { on: { hour: h || 0, minute: m || 0 }, allowWhileIdle: true } });
    }
  }
  return lista.slice(0, 60);
}

function aggiornaPromemoria() {
  riprogramma(costruisciPromemoria());
}

function condividiTesto(testo, titolo) {
  if (nativo) return Share.share({ title: titolo, text: testo, dialogTitle: titolo }).catch(() => {});
  if (navigator.share) return navigator.share({ title: titolo, text: testo }).catch(() => {});
  return navigator.clipboard.writeText(testo).then(() => toast("Testo copiato"));
}

async function condividiImmagine(url, nome) {
  try {
    if (nativo) {
      const r = await Filesystem.writeFile({ path: nome, data: url.split(",")[1], directory: Directory.Cache });
      await Share.share({ title: nome, url: r.uri, dialogTitle: "Condividi" });
    } else {
      const a = document.createElement("a");
      a.href = url;
      a.download = nome;
      a.click();
    }
  } catch (e) {
    if (!String(e).includes("cancel")) toast("Non sono riuscito a condividere");
  }
}

function caricaFoto() {
  const b = baby();
  if (!b) return;
  document.querySelectorAll("img[data-foto]").forEach((img) => {
    if (img.getAttribute("src")) return;
    leggiFoto(b.id, img.dataset.foto).then((u) => {
      if (u) img.src = u;
    });
  });
}


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

  const forte = (b.cibi || []).find((c) => c.reaz === "forte" && now - parseDay(c.data).getTime() < 4 * 86400000);
  if (forte)
    out.push({ k: "cibo-" + forte.id, liv: "alto", t: `Reazione forte dopo ${forte.nome}`, d: "Non riproporre l'alimento finché non ne hai parlato col pediatra o con un allergologo. Se compaiono difficoltà a respirare, gonfiore al viso o alle labbra, sonnolenza improvvisa: chiama il 112.", q: `Reazione forte dopo ${forte.nome}: cosa fare?` });

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
  if (l.tipo === "vitd") return { em: "☀️", bg: "var(--sun-soft)", t: "Vitamina D", d: "" };
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
  caricaFoto();
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
    <div class="field"><label for="f-sesso">È un maschio o una femmina?</label><select id="f-sesso" class="inp"><option value="">Preferisco non indicarlo</option><option value="m"${b && b.sesso === "m" ? " selected" : ""}>Maschio</option><option value="f"${b && b.sesso === "f" ? " selected" : ""}>Femmina</option></select>
    <span class="small muted">Serve solo per i percentili di crescita dell'OMS.</span></div>
    <div class="field"><label for="f-sett">Settimana di nascita</label><select id="f-sett" class="inp">${opts}</select>
    <span class="small muted">Se è nato prima del termine, l'app usa l'età corretta per le tappe.</span></div>`;
}

function leggiFormBimbo(root) {
  const nome = root.querySelector("#f-nome").value.trim();
  const nascita = root.querySelector("#f-nasc").value;
  const settimane = parseInt(root.querySelector("#f-sett").value, 10) || 40;
  const sesso = root.querySelector("#f-sesso").value;
  if (!nome) return toast("Scrivi il nome del bimbo"), null;
  if (!nascita) return toast("Scegli la data di nascita"), null;
  if (parseDay(nascita) > new Date()) return toast("La data non può essere nel futuro"), null;
  return { nome, nascita, settimane, sesso };
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

  ${cardVitD(b)}
  ${cardVisita(b)}

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
  ${cardFoto(b, m)}
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
    .map((c) => ({ x: Math.max(0, etaMesiDec(b, c.data)), y: c[G.k], d: c.data, p: percMisura(b, c, G.k) }));
  const ult = pts[pts.length - 1];

  let nota = "";
  if (!b.sesso) {
    nota = `<section class="callout info"><h3>📈 Percentili OMS</h3><p style="margin:6px 0 10px">Per vedere come si colloca ${esc(b.nome)} rispetto alle curve di crescita dell'OMS, indica se è maschio o femmina.</p><button class="btn small" data-act="tab" data-v="impo">Vai alle impostazioni</button></section>`;
  } else if (ult && ult.p != null) {
    const fuori = ult.p < 3 || ult.p > 97;
    nota = `<section class="callout ${fuori ? "doc" : "help"}"><h3>${G.n}: ${ordinale(ult.p)} percentile</h3>
      <p style="margin:6px 0 0">L'ultima misura (${ult.y} ${G.u}, ${fmtData(ult.d)}) è al ${ordinale(ult.p)} percentile delle curve OMS per ${b.sesso === "m" ? "i maschi" : "le femmine"} della sua età${(b.settimane || 40) < 37 ? " corretta" : ""}.
      ${fuori ? "È fuori dalla fascia 3°-97°: parlane con il pediatra, che valuta anche l'andamento nel tempo." : "Tra il 3° e il 97° percentile rientra nella norma. Conta soprattutto che segua la sua curva nel tempo: se ne occupa il pediatra."}</p></section>`;
  }

  return `
  <div class="seg">${Object.entries(GRAF).map(([k, g]) => `<button class="${V.grafico === k ? "on" : ""}" data-act="grafico" data-g="${k}">${g.n}</button>`).join("")}</div>
  <section class="card">
    <div class="row between"><h2>${G.n} (${G.u})</h2><button class="btn soft small" data-act="nuovaMisura">+ Misura</button></div>
    ${grafico(pts, G, b)}
    ${b.sesso ? `<div class="legend"><span><i class="sw" style="background:var(--pri);opacity:.18"></i>3°-97°</span><span><i class="sw" style="background:var(--pri);opacity:.35"></i>15°-85°</span><span>- - mediana (50°)</span><span>Fonte: OMS</span></div>` : ""}
  </section>
  ${nota}
  <section class="card">
    <h2>Le misure</h2>
    ${
      b.crescita.length
        ? [...b.crescita].sort((x, y) => (x.data < y.data ? 1 : -1)).map((c) => {
            const parti = [["peso", c.peso, "kg"], ["lung", c.lung, "cm"], ["testa", c.testa, "cm"]].filter((q) => q[1] != null).map((q) => {
              const p = percMisura(b, c, q[0]);
              return `${q[0] === "testa" ? "testa " : ""}${q[1]} ${q[2]}${p != null ? ` (${ordinale(p)})` : ""}`;
            });
            return `<button class="log" data-act="misura" data-id="${c.id}"><span class="em" style="background:var(--peach-soft)">📏</span><span class="grow"><b>${fmtData(c.data)}</b><br><span class="small muted">${parti.join(" · ")}</span></span></button>`;
          }).join("")
        : `<p class="empty">Aggiungi il peso, la lunghezza e la circonferenza della testa dopo ogni visita o pesata.</p>`
    }
  </section>
  <p class="foot">Le curve sono gli standard di crescita OMS (2006). Il percentile è solo un riferimento: la crescita di ${esc(b.nome)} la valuta il pediatra, guardando l'insieme.</p>`;
}

function grafico(pts, G, b) {
  const W = 340, H = 230, L = 38, R = 14, T = 14, B = 30;
  const maxX = pts.length ? Math.max(...pts.map((p) => p.x)) : 3;
  const x0 = 0;
  const x1 = Math.min(13, Math.max(4, Math.ceil(maxX) + 1));
  const C = b.sesso ? {} : null;
  if (C) {
    for (const p of PERC) {
      C[p] = [];
      for (let x = x0; x <= x1 + 1e-9; x += 0.25) {
        const v = valorePerc(b.sesso, G.k, x, p);
        if (v != null) C[p].push([x, v]);
      }
    }
  }
  if (!pts.length && !C) return `<p class="empty">Ancora nessuna misura di ${G.n.toLowerCase()}.</p>`;
  let ys = pts.map((p) => p.y);
  if (C) ys = ys.concat(C[3].map((a) => a[1]), C[97].map((a) => a[1]));
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = (y1 - y0) * 0.06 + 0.1;
  y0 = Math.max(0, y0 - pad);
  y1 += pad;
  const X = (x) => L + ((x - x0) / (x1 - x0)) * (W - L - R);
  const Y = (y) => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
  let g = "";
  for (let i = 0; i <= 4; i++) {
    const v = y0 + ((y1 - y0) * i) / 4;
    g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" style="stroke:var(--line)" stroke-width="1"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${v.toFixed(G.k === "peso" ? 1 : 0)}</text>`;
  }
  const step = x1 > 8 ? 2 : 1;
  for (let m = 0; m <= x1; m += step) g += `<text x="${X(m)}" y="${H - 10}" text-anchor="middle">${m}</text>`;
  g += `<text x="${W - R}" y="${H - 1}" text-anchor="end" style="font-size:10px">mesi</text>`;

  let bande = "";
  if (C) {
    const poly = (a, b2) => [...C[a], ...[...C[b2]].reverse()].map((q, i) => `${i ? "L" : "M"}${X(q[0]).toFixed(1)} ${Y(q[1]).toFixed(1)}`).join(" ") + " Z";
    const line = (p) => C[p].map((q, i) => `${i ? "L" : "M"}${X(q[0]).toFixed(1)} ${Y(q[1]).toFixed(1)}`).join(" ");
    bande =
      `<path d="${poly(3, 97)}" style="fill:var(--pri);opacity:.1"/>` +
      `<path d="${poly(15, 85)}" style="fill:var(--pri);opacity:.18"/>` +
      `<path d="${line(50)}" fill="none" style="stroke:var(--pri)" stroke-width="1.6" stroke-dasharray="5 4"/>` +
      [3, 50, 97].map((p) => { const e = C[p][C[p].length - 1]; return `<text x="${W - R + 1}" y="${Y(e[1]) + 3}" text-anchor="start" style="font-size:9px">${p}°</text>`; }).join("");
  }
  const path = pts.length > 1 ? pts.map((p, i) => `${i ? "L" : "M"}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(" ") : "";
  const dots = pts.map((p) => `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="5.5" style="fill:var(--card)" stroke="${G.col}" stroke-width="3"/>`).join("");
  const u = pts[pts.length - 1];
  const lab = u ? `<text x="${Math.min(X(u.x), W - 30)}" y="${Y(u.y) - 12}" text-anchor="middle" style="fill:var(--ink);font-size:12px;font-weight:800">${u.y}</text>` : "";
  return `<svg class="chart" viewBox="0 0 ${W + 12} ${H}" role="img" aria-label="Grafico ${G.n}">${g}${bande}${path ? `<path d="${path}" fill="none" stroke="${G.col}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>` : ""}${dots}${lab}</svg>${pts.length ? "" : `<p class="empty" style="padding-top:2px">Ancora nessuna misura: la curva mostra i valori di riferimento.</p>`}`;
}

/* =============================== VISITE =============================== */

function vVisite(b) {
  const now = Date.now();
  const L = [...b.visite].sort((x, y) => x.t - y.t);
  const futuri = L.filter((v) => v.t >= now);
  const passati = L.filter((v) => v.t < now).reverse().slice(0, 10);
  const riga = (v) => `<button class="log" data-act="visita" data-id="${v.id}"><time>${new Date(v.t).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}</time><span class="em" style="background:var(--rose-soft)">🩺</span><span class="grow"><b>${esc(v.titolo)}</b><br><span class="small muted">${fmtOra(v.t)}</span></span></button>`;
  return `
  <button class="back" data-act="guida" data-g="">${I.back}Guida</button>
  <h1 style="font-size:28px">📅 Visite</h1>
  <button class="btn block" data-act="nuovaVisita">+ Aggiungi una visita</button>
  <section class="card"><h2>In programma</h2>${futuri.length ? futuri.map(riga).join("") : '<p class="empty">Nessuna visita in programma.</p>'}</section>
  ${passati.length ? `<section class="card"><h2>Passate</h2>${passati.map(riga).join("")}</section>` : ""}
  <p class="foot">Ricevi una notifica il giorno prima e un'ora prima. ${nativo ? "" : "Le notifiche funzionano nell'app Android."}</p>`;
}

/* =============================== SVEZZAMENTO: ALIMENTI =============================== */

function vCibi(b) {
  const L = [...b.cibi].sort((x, y) => (x.data < y.data ? 1 : x.data > y.data ? -1 : 0));
  const prov = new Set(b.cibi.filter((c) => c.all).map((c) => c.all));
  const piccolo = eta(b).real.m < 4;
  return `
  <button class="back" data-act="guida" data-g="">${I.back}Guida</button>
  <h1 style="font-size:28px">🥣 Alimenti provati</h1>
  ${piccolo ? `<section class="callout info"><p style="margin:0">Di solito lo svezzamento inizia verso i 6 mesi, e non prima dei 4 mesi compiuti. Parlane con il pediatra prima di iniziare.</p></section>` : ""}
  <button class="btn block" data-act="nuovoCibo">+ Aggiungi un alimento</button>
  <section class="card">
    <div class="stats" style="grid-template-columns:1fr 1fr">
      <div class="stat" style="background:var(--mint-soft)"><b>${b.cibi.length}</b><span>alimenti provati</span></div>
      <div class="stat" style="background:var(--sun-soft)"><b>${prov.size}/${ALLERGENI.length}</b><span>allergeni comuni</span></div>
    </div>
    <p class="small muted" style="margin:10px 2px 0">Gli allergeni comuni (${ALLERGENI.join(", ").toLowerCase()}) si introducono con gradualità, uno alla volta e non vanno rimandati senza motivo. Se in famiglia ci sono allergie, chiedi prima al pediatra.</p>
  </section>
  <section class="card">
    ${
      L.length
        ? L.map((c) => `<button class="log" data-act="cibo" data-id="${c.id}"><span class="em" style="background:${c.reaz === "forte" ? "var(--rose-soft)" : c.reaz && c.reaz !== "ok" ? "var(--sun-soft)" : "var(--mint-soft)"}">${c.reaz === "forte" ? "⚠️" : "🥄"}</span><span class="grow"><b>${esc(c.nome)}</b>${c.all ? ` <span class="pill soon">${esc(c.all)}</span>` : ""}<br><span class="small muted">${fmtData(c.data)} · ${esc(REAZIONI[c.reaz || "ok"])}${c.nota ? " · " + esc(c.nota) : ""}</span></span></button>`).join("")
        : `<p class="empty">Segna qui ogni alimento nuovo con la data e come è andata: serve a capire a cosa reagisce e a rispondere al pediatra.</p>`
    }
  </section>`;
}

function sceltaReazione(sel) {
  return `<div class="choice">${Object.entries(REAZIONI).map(([k, n]) => `<button class="${k === sel ? "on" : ""}" data-act="sc" data-grp="reaz" data-val="${k}">${n}</button>`).join("")}</div>
  <div id="c-allarme" class="callout doc" style="margin-top:10px" ${sel === "forte" ? "" : "hidden"}><p style="margin:0"><b>Chiama subito il 112</b> se ci sono difficoltà a respirare, gonfiore di labbra o viso, orticaria diffusa, vomito ripetuto o sonnolenza improvvisa. Non riproporre l'alimento finché non ne hai parlato col pediatra.</p></div>`;
}

/* =============================== RIEPILOGO PER IL PEDIATRA =============================== */

function testoReport(b, N) {
  const oggi = new Date();
  const e = eta(b, oggi);
  const dal = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() - (N - 1));
  const righe = [];
  righe.push(`Riepilogo di ${b.nome} – ${fmtData(todayISO())}`);
  righe.push(`Nato il ${fmtData(b.nascita)} (${etaTesto(e.real)})${e.prem ? `, nato alla ${b.settimane}ª settimana, età corretta ${etaTesto(e.corr)}` : ""}${b.sesso ? ", " + SESSI[b.sesso].toLowerCase() : ""}.`);
  righe.push("");
  righe.push(`Diario degli ultimi ${N} giorni (dal ${fmtData(isoDay(dal))}):`);
  let giorni = 0, pop = 0, bag = 0, cac = 0, sonno = 0, giorniSonno = 0;
  const anomale = [];
  for (let i = 0; i < N; i++) {
    const d = new Date(dal.getFullYear(), dal.getMonth(), dal.getDate() + i);
    const iso = isoDay(d);
    const L = logsDelGiorno(b, iso);
    if (!L.length) continue;
    giorni++;
    pop += L.filter((l) => l.tipo === "poppata").length;
    const pan = L.filter((l) => l.tipo === "pannolino");
    bag += pan.filter((l) => l.cosa === "pipi" || l.cosa === "misto").length;
    const cc = pan.filter((l) => l.cosa === "cacca" || l.cosa === "misto");
    cac += cc.length;
    cc.forEach((l) => {
      if (l.colore && ["bianco", "rosso", "nero"].includes(l.colore)) anomale.push(`${d.toLocaleDateString("it-IT", { day: "numeric", month: "short" })}: ${COLORI[l.colore]}`);
      else if (l.cons === "dura") anomale.push(`${d.toLocaleDateString("it-IT", { day: "numeric", month: "short" })}: dura`);
    });
    const s = L.filter((l) => l.tipo === "sonno");
    if (s.length) {
      giorniSonno++;
      sonno += s.reduce((t, l) => t + (l.a - l.t) / 60000, 0);
    }
  }
  if (!giorni) {
    righe.push("• Nessuna registrazione in questo periodo.");
  } else {
    const med = (n) => (n / giorni).toFixed(1).replace(".", ",");
    righe.push(`• Calcolato sui ${giorni} ${giorni === 1 ? "giorno" : "giorni"} con registrazioni.`);
    righe.push(pop ? `• Poppate: ${med(pop)} al giorno.` : "• Poppate: non registrate.");
    righe.push(bag || cac ? `• Pannolini bagnati: ${med(bag)} al giorno. Cacche: ${med(cac)} al giorno.` : "• Pannolini: non registrati.");
    if (anomale.length) righe.push(`• Cacche da segnalare: ${anomale.join("; ")}.`);
    if (giorniSonno) righe.push(`• Sonno registrato: circa ${fmtDur(sonno / giorniSonno)} al giorno (solo quello registrato).`);
  }
  righe.push("");
  const mis = [...b.crescita].sort((x, y) => (x.data < y.data ? 1 : -1)).slice(0, 3);
  if (mis.length) {
    righe.push("Crescita (ultime misure):");
    for (const c of mis) {
      const parti = [["peso", c.peso, "kg"], ["lung", c.lung, "cm"], ["testa", c.testa, "cm"]].filter((q) => q[1] != null).map((q) => {
        const p = percMisura(b, c, q[0]);
        return `${q[0] === "testa" ? "testa " : ""}${String(q[1]).replace(".", ",")} ${q[2]}${p != null ? ` (${ordinale(p)} perc. OMS)` : ""}`;
      });
      righe.push(`• ${fmtData(c.data)}: ${parti.join(", ")}`);
    }
    const pesi = b.crescita.filter((c) => c.peso != null).sort((x, y) => (x.data > y.data ? 1 : -1));
    if (pesi.length >= 2) {
      const a = pesi[pesi.length - 2], z = pesi[pesi.length - 1];
      const g = Math.round((z.peso - a.peso) * 1000);
      righe.push(`• Variazione di peso tra le ultime due pesate: ${g > 0 ? "+" : ""}${g} g in ${Math.max(1, Math.round((parseDay(z.data) - parseDay(a.data)) / 86400000))} giorni.`);
    }
    righe.push("");
  }
  const cibi = b.cibi.filter((c) => parseDay(c.data) >= dal);
  if (cibi.length) {
    righe.push("Alimenti nuovi nel periodo:");
    cibi.forEach((c) => righe.push(`• ${c.nome} (${fmtData(c.data)}): ${REAZIONI[c.reaz || "ok"].toLowerCase()}${c.nota ? ", " + c.nota : ""}`));
    righe.push("");
  }
  const vd = b.logs.filter((l) => l.tipo === "vitd" && l.t >= dal.getTime());
  if (b.vitd && b.vitd.on) {
    { const nvd = new Set(vd.map((l) => isoDay(new Date(l.t)))).size; righe.push(`Vitamina D: segnata in ${nvd} ${nvd === 1 ? "giorno" : "giorni"} su ${N}.`); }
    righe.push("");
  }
  const note = b.logs.filter((l) => l.tipo === "nota" && l.t >= dal.getTime()).sort((x, y) => y.t - x.t).slice(0, 8);
  if (note.length) {
    righe.push("Note:");
    note.forEach((l) => righe.push(`• ${new Date(l.t).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}: ${l.nota}`));
    righe.push("");
  }
  const dom = b.domande.filter((d) => !d.fatta);
  righe.push("Domande per il pediatra:");
  if (dom.length) dom.forEach((d) => righe.push(`• ${d.testo}`));
  else righe.push("• (nessuna)");
  return righe.join("\n");
}

function vReport(b) {
  const N = V.periodo;
  return `
  <button class="back" data-act="guida" data-g="">${I.back}Guida</button>
  <h1 style="font-size:28px">📋 Riepilogo per la visita</h1>
  <div class="seg">${[7, 14, 30].map((n) => `<button class="${N === n ? "on" : ""}" data-act="periodo" data-n="${n}">${n} giorni</button>`).join("")}</div>
  <section class="card"><div class="report">${esc(testoReport(b, N))}</div></section>
  <button class="btn block" data-act="condividiReport">Condividi o copia</button>
  <p class="foot">Il riepilogo usa solo quello che hai registrato nell'app. Mostralo al pediatra o mandalo per messaggio.</p>`;
}

/* =============================== FOTO / ALBUM =============================== */

function cardFoto(b, m) {
  const ha = b.foto && b.foto[m];
  const nome = m === 0 ? "dei primi giorni" : m === 1 ? "di 1 mese" : `di ${m} mesi`;
  return `<section class="card">
    <div class="row between"><h2>📸 Foto del mese</h2>${ha ? `<button class="btn soft small" data-act="fotoNuova" data-m="${m}">Cambia</button>` : ""}</div>
    ${
      ha
        ? `<button class="fotobox" style="margin-top:10px" data-act="fotoVedi" data-m="${m}"><img class="foto" data-foto="${m}" alt="Foto ${nome}"></button>`
        : `<button class="fotoadd" style="margin-top:10px" data-act="fotoNuova" data-m="${m}"><span>📷</span><b>Aggiungi la foto ${nome}</b><span class="small muted">Scattala o scegli dalla galleria. Resta sul telefono.</span></button>`
    }
  </section>`;
}

function vAlbum(b) {
  const n = Object.keys(b.foto || {}).length;
  return `
  <button class="back" data-act="guida" data-g="">${I.back}Guida</button>
  <h1 style="font-size:28px">📸 Album</h1>
  <p class="muted" style="margin:0">Una foto per ogni mese del primo anno. ${n ? `Ne hai ${n} su 13.` : "Aggiungi la prima dalla schermata Tappe."}</p>
  <div class="album">${MESI.map((x) => {
    const ha = b.foto && b.foto[x.m];
    return `<button class="tile" data-act="vaiTappe" data-m="${x.m}">${ha ? `<img data-foto="${x.m}" alt="">` : x.m}<b>${x.m === 0 ? "nascita" : x.m === 1 ? "1 mese" : x.m + " mesi"}</b></button>`;
  }).join("")}</div>
  ${n ? `<button class="btn soft block" data-act="collage">Crea e condividi il collage</button>` : ""}
  <p class="foot">Le foto restano sul telefono e non sono incluse nel backup dei dati.</p>`;
}

/* =============================== card per Oggi =============================== */

function cardVitD(b) {
  if (!b.vitd || !b.vitd.on) return "";
  const data = b.logs.some((l) => l.tipo === "vitd" && isoDay(new Date(l.t)) === todayISO());
  return `<section class="card"><div class="row between"><div><h3 style="margin:0">☀️ Vitamina D</h3><span class="small muted">${data ? "Data oggi" : "Non ancora data oggi"}</span></div>
    <button class="btn ${data ? "soft" : ""} small" data-act="vitdOggi">${data ? "Data ✓" : "Segna come data"}</button></div></section>`;
}

function cardVisita(b) {
  const v = [...(b.visite || [])].filter((x) => x.t >= Date.now()).sort((x, y) => x.t - y.t)[0];
  if (!v) return "";
  return `<section class="card"><div class="row"><span class="em" style="width:44px;height:44px;border-radius:15px;display:grid;place-items:center;font-size:22px;background:var(--rose-soft)">🩺</span><div class="grow"><span class="eyebrow">Prossima visita</span><br><b>${esc(v.titolo)}</b><br><span class="small muted">${new Date(v.t).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}, ${fmtOra(v.t)}</span></div><button class="btn soft small" data-act="vaiGuida" data-g="visite">Visite</button></div></section>`;
}

/* =============================== GUIDA =============================== */

function vGuida(b) {
  const g = V.guida;
  if (g === "vaccini") return vVaccini(b);
  if (g === "domande") return vDomande(b);
  if (g === "visite") return vVisite(b);
  if (g === "cibi") return vCibi(b);
  if (g === "report") return vReport(b);
  if (g === "album") return vAlbum(b);
  const guida = GUIDE.find((x) => x.id === g);
  if (guida) return vGuidaDettaglio(guida);
  const nDom = b.domande.filter((d) => !d.fatta).length;
  return `
  <h1 style="font-size:28px">Guida</h1>
  <section class="callout info"><h3>🚨 In caso di emergenza</h3><p style="margin:6px 0 0">${esc(EMERGENZA)}</p></section>
  <button class="gcard" data-act="guida" data-g="vaccini"><span class="em" style="background:var(--mint-soft)">💉</span><span class="grow"><h3>Vaccini</h3><span class="small muted">Calendario indicativo e date fatte</span></span><span class="chev">${I.chev}</span></button>
  <button class="gcard" data-act="guida" data-g="domande"><span class="em" style="background:var(--peach-soft)">💬</span><span class="grow"><h3>Domande per il pediatra</h3><span class="small muted">${nDom ? nDom + " da fare alla prossima visita" : "Annotale quando ti vengono in mente"}</span></span><span class="chev">${I.chev}</span></button>
  <button class="gcard" data-act="guida" data-g="visite"><span class="em" style="background:var(--rose-soft)">📅</span><span class="grow"><h3>Visite</h3><span class="small muted">Appuntamenti con promemoria</span></span><span class="chev">${I.chev}</span></button>
  <button class="gcard" data-act="guida" data-g="cibi"><span class="em" style="background:var(--sun-soft)">🥣</span><span class="grow"><h3>Alimenti provati</h3><span class="small muted">${b.cibi.length ? b.cibi.length + " alimenti segnati" : "Svezzamento: cosa ha mangiato e come è andata"}</span></span><span class="chev">${I.chev}</span></button>
  <button class="gcard" data-act="guida" data-g="report"><span class="em" style="background:var(--mint-soft)">📋</span><span class="grow"><h3>Riepilogo per la visita</h3><span class="small muted">Gli ultimi giorni, da mostrare al pediatra</span></span><span class="chev">${I.chev}</span></button>
  <button class="gcard" data-act="guida" data-g="album"><span class="em" style="background:var(--pri-soft)">📸</span><span class="grow"><h3>Album del primo anno</h3><span class="small muted">Una foto per ogni mese</span></span><span class="chev">${I.chev}</span></button>
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
    <h2>Aspetto</h2>
    <div class="choice" style="margin-top:8px">${[["auto", "Automatico"], ["light", "Chiaro"], ["dark", "Scuro (notte)"]].map(([k, n]) => `<button class="${(S.settings.theme || "auto") === k ? "on" : ""}" data-act="tema" data-v="${k}">${n}</button>`).join("")}</div>
  </section>
  <section class="card">
    <h2>Promemoria</h2>
    <p class="small muted">${nativo ? "Le notifiche ti avvisano di vaccini, visite e vitamina D." : "Le notifiche funzionano nell'app Android."}</p>
    <button class="btn soft block" style="margin:8px 0" data-act="permessoNotifiche">Consenti le notifiche</button>
    <div class="row between" style="margin-top:6px"><div><b>Vaccini</b><br><span class="small muted">Una settimana prima e nel giorno previsto</span></div><button class="btn ${S.settings.notifVacc === false ? "ghost" : "soft"} small" data-act="notifVaccToggle">${S.settings.notifVacc === false ? "Spento" : "Acceso"}</button></div>
    <div class="row between" style="margin-top:14px"><div><b>Vitamina D ogni giorno</b><br><span class="small muted">Quanta darne lo decide il pediatra</span></div><button class="btn ${b.vitd && b.vitd.on ? "soft" : "ghost"} small" data-act="vitdToggle">${b.vitd && b.vitd.on ? "Acceso" : "Spento"}</button></div>
    ${b.vitd && b.vitd.on ? `<div class="row" style="margin-top:10px"><input id="vd-ora" class="inp grow" type="time" value="${esc(b.vitd.ora || "09:00")}"><button class="btn soft" data-act="vitdOra">Salva orario</button></div>` : ""}
  </section>
  <section class="card">
    <h2>Avvisi dal diario</h2>
    <p class="small muted">Messaggi gentili se registri una cacca di colore da controllare, pochi pannolini bagnati o una poppata lontana nei primissimi mesi. Sono solo informativi.</p>
    <button class="btn ${b.noAvvisi ? "soft" : "ghost"} block" style="margin-top:8px" data-act="avvisiToggle">${b.noAvvisi ? "Avvisi disattivati: riattiva" : "Avvisi attivi: disattiva"}</button>
  </section>
  <section class="card">
    <h2>Backup dei dati</h2>
    <p class="small muted">I dati sono solo su questo telefono. Se cambi telefono o disinstalli l'app, li perdi: salva un backup e conservalo (email, cloud). Le foto non sono incluse nel backup.</p>
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
    if (el.dataset.grp === "reaz") {
      const a = root.querySelector("#c-allarme");
      if (a) a.hidden = el.dataset.val !== "forte";
    }
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

  vaiGuida(el) {
    V.tab = "guida";
    V.guida = el.dataset.g;
    render();
    window.scrollTo(0, 0);
  },
  tema(el) {
    S.settings.theme = el.dataset.v;
    save();
    applicaTema();
    render(true);
  },

  /* --- visite --- */
  nuovaVisita() {
    openSheet(
      `<h2>📅 Nuova visita</h2>
      <div class="field"><label>Che visita è?</label><div class="choice">${["Pediatra", "Bilancio di salute", "Vaccino", "Altro"].map((n, i) => `<button class="${i === 0 ? "on" : ""}" data-act="sc" data-grp="tipo" data-val="${n}">${n}</button>`).join("")}</div></div>
      <div class="field"><label for="v-note">Dettagli (facoltativo)</label><input id="v-note" class="inp" maxlength="80" placeholder="Es. dott.ssa Rossi, ambulatorio"></div>
      <div class="field"><label for="v-quando">Quando</label><input id="v-quando" class="inp" type="datetime-local" min="${toLocalInput(Date.now())}"></div>
      <button class="btn block" data-act="salvaVisita">Salva</button>`,
      (el) => (el.dataset.tipo = "Pediatra")
    );
  },
  async salvaVisita() {
    const r = sheetRoot();
    const q = r.querySelector("#v-quando").value;
    if (!q) return toast("Scegli la data e l'ora");
    const t = new Date(q).getTime();
    if (!Number.isFinite(t)) return toast("Data non valida");
    const note = r.querySelector("#v-note").value.trim();
    baby().visite.push({ id: uid(), titolo: (r.dataset.tipo || "Visita") + (note ? " · " + note : ""), t });
    save();
    closeSheet();
    render(true);
    if (nativo) {
      const ok = await chiediPermesso();
      toast(ok ? "Visita salvata, ti avviso io" : "Visita salvata (notifiche non consentite)");
      aggiornaPromemoria();
    } else toast("Visita salvata");
  },
  visita(el) {
    const v = baby().visite.find((x) => x.id === el.dataset.id);
    if (!v) return;
    confirmSheet(`🩺 ${esc(v.titolo)}`, `${new Date(v.t).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}, ${fmtOra(v.t)}. Vuoi eliminarla?`, "Elimina", () => {
      const b = baby();
      b.visite = b.visite.filter((x) => x.id !== v.id);
      save();
      render(true);
    });
  },

  /* --- alimenti --- */
  nuovoCibo() {
    openSheet(
      `<h2>🥣 Nuovo alimento</h2>
      <div class="field"><label>Scegli o scrivi</label>
        <div class="choice" style="max-height:150px;overflow-y:auto">${CIBI.map((c) => `<button data-act="chipCibo" data-n="${esc(c.n)}" data-a="${esc(c.a || "")}">${esc(c.n)}${c.a ? " ⚑" : ""}</button>`).join("")}</div>
        <input id="c-nome" class="inp" maxlength="50" placeholder="Altro alimento" autocomplete="off" style="margin-top:8px">
        <span class="small muted">⚑ = allergene comune: introducilo con gradualità.</span></div>
      <div class="field"><label for="c-data">Data</label><input id="c-data" class="inp" type="date" max="${todayISO()}" value="${todayISO()}"></div>
      <div class="field"><label>Come è andata?</label>${sceltaReazione("ok")}</div>
      <div class="field"><label for="c-nota">Note (facoltativo)</label><input id="c-nota" class="inp" maxlength="80" placeholder="Es. ha fatto la smorfia, ne ha mangiato poco"></div>
      <button class="btn block" data-act="salvaCibo">Salva</button>`,
      (el) => (el.dataset.reaz = "ok")
    );
  },
  chipCibo(el) {
    const r = sheetRoot();
    r.querySelector("#c-nome").value = el.dataset.n;
    r.dataset.chipN = el.dataset.n;
    r.dataset.all = el.dataset.a || "";
    r.querySelectorAll("[data-act=chipCibo]").forEach((x) => x.classList.toggle("on", x === el));
  },
  salvaCibo() {
    const r = sheetRoot();
    const nome = r.querySelector("#c-nome").value.trim();
    if (!nome) return toast("Scegli o scrivi un alimento");
    const c = { id: uid(), nome, data: r.querySelector("#c-data").value || todayISO(), reaz: r.dataset.reaz || "ok" };
    if (r.dataset.chipN === nome && r.dataset.all) c.all = r.dataset.all;
    const nota = r.querySelector("#c-nota").value.trim();
    if (nota) c.nota = nota;
    baby().cibi.push(c);
    save();
    closeSheet();
    render(true);
    toast("Alimento registrato");
  },
  cibo(el) {
    const c = baby().cibi.find((x) => x.id === el.dataset.id);
    if (!c) return;
    openSheet(
      `<h2>🥄 ${esc(c.nome)}</h2><p class="muted">${fmtData(c.data)}${c.all ? " · allergene comune: " + esc(c.all) : ""}</p>
      <div class="field"><label>Come è andata?</label>${sceltaReazione(c.reaz || "ok")}</div>
      <button class="btn block" data-act="salvaReazioneCibo" data-id="${c.id}">Salva</button>
      <button class="btn danger block" style="margin-top:8px" data-act="eliminaCibo" data-id="${c.id}">Elimina</button>`,
      (r) => (r.dataset.reaz = c.reaz || "ok")
    );
  },
  salvaReazioneCibo(el) {
    const c = baby().cibi.find((x) => x.id === el.dataset.id);
    if (c) c.reaz = sheetRoot().dataset.reaz || "ok";
    save();
    closeSheet();
    render(true);
  },
  eliminaCibo(el) {
    const b = baby();
    b.cibi = b.cibi.filter((x) => x.id !== el.dataset.id);
    save();
    closeSheet();
    render(true);
  },

  /* --- riepilogo --- */
  periodo(el) {
    V.periodo = +el.dataset.n;
    render(true);
  },
  condividiReport() {
    const b = baby();
    condividiTesto(testoReport(b, V.periodo), `Riepilogo di ${b.nome}`);
  },

  /* --- foto --- */
  fotoNuova(el) {
    const i = document.getElementById("f-foto");
    i.dataset.m = el.dataset.m;
    i.click();
  },
  fotoVedi(el) {
    const m = el.dataset.m;
    openSheet(
      `<h2>📸 ${m === "0" ? "Primi giorni" : m === "1" ? "1 mese" : m + " mesi"}</h2>
      <img class="foto" data-foto="${m}" alt="" style="margin-bottom:12px">
      <div class="row"><button class="btn soft grow" data-act="fotoCondividi" data-m="${m}">Condividi</button><button class="btn danger grow" data-act="fotoElimina" data-m="${m}">Elimina</button></div>`
    );
    caricaFoto();
  },
  async fotoCondividi(el) {
    const b = baby();
    const u = await leggiFoto(b.id, el.dataset.m);
    if (u) condividiImmagine(u, `${b.nome}-${el.dataset.m}-mesi.jpg`);
  },
  fotoElimina(el) {
    const m = el.dataset.m;
    confirmSheet("Eliminare la foto?", "La foto verrà cancellata dal telefono.", "Elimina", async () => {
      const b = baby();
      await eliminaFoto(b.id, m);
      delete b.foto[m];
      save();
      render(true);
    });
  },
  async collage() {
    const b = baby();
    toast("Preparo il collage…");
    const u = await creaCollage(b.id, Object.keys(b.foto || {}).map(Number).sort((x, y) => x - y), b.nome);
    if (u) condividiImmagine(u, `primo-anno-${b.nome}.jpg`);
  },

  /* --- vitamina D e notifiche --- */
  vitdOggi() {
    const b = baby();
    const oggi = todayISO();
    const ix = b.logs.findIndex((l) => l.tipo === "vitd" && isoDay(new Date(l.t)) === oggi);
    if (ix >= 0) b.logs.splice(ix, 1);
    else b.logs.push({ id: uid(), tipo: "vitd", t: Date.now() });
    save();
    render(true);
  },
  async vitdToggle() {
    const b = baby();
    b.vitd = b.vitd || { on: false, ora: "09:00" };
    b.vitd.on = !b.vitd.on;
    save();
    render(true);
    if (b.vitd.on && nativo) {
      const ok = await chiediPermesso();
      if (!ok) toast("Consenti le notifiche per ricevere il promemoria");
    }
  },
  vitdOra() {
    const v = document.getElementById("vd-ora").value;
    if (!/^\d{2}:\d{2}$/.test(v)) return toast("Scegli un orario");
    baby().vitd.ora = v;
    save();
    toast("Orario salvato");
  },
  notifVaccToggle() {
    S.settings.notifVacc = S.settings.notifVacc === false;
    save();
    render(true);
  },
  async permessoNotifiche() {
    if (!nativo) return toast("Le notifiche funzionano nell'app Android");
    const ok = await chiediPermesso();
    toast(ok ? "Notifiche attive" : "Notifiche non consentite: attivale dalle impostazioni del telefono");
    aggiornaPromemoria();
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
      Object.keys(b.foto || {}).forEach((m) => eliminaFoto(b.id, m));
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
        b.cibi = Array.isArray(b.cibi) ? b.cibi : [];
        b.visite = Array.isArray(b.visite) ? b.visite : [];
        b.foto = {};
        b.sesso = b.sesso || "";
        b.vitd = b.vitd && typeof b.vitd === "object" ? b.vitd : { on: false, ora: "09:00" };
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

document.addEventListener("change", (e) => {
  if (e.target.id !== "f-foto") return;
  const file = e.target.files && e.target.files[0];
  const m = +e.target.dataset.m;
  e.target.value = "";
  if (!file) return;
  const b = baby();
  salvaFoto(b.id, m, file)
    .then(() => {
      b.foto = b.foto || {};
      b.foto[m] = Date.now();
      save();
      render(true);
      toast("Foto salvata");
    })
    .catch(() => toast("Non sono riuscito a salvare la foto"));
});

function applicaTema() {
  const t = S.settings.theme || "auto";
  const scuro = t === "dark" || (t === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = scuro ? "dark" : "light";
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = scuro ? "#15142b" : "#6b63f5";
}
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applicaTema);

// Aggiorna i tempi ("X min fa", sonno in corso) quando l'app è aperta.
setInterval(() => {
  if (document.getElementById("sheet").hidden && ["oggi", "diario"].includes(V.tab) && baby()) render(true);
}, 60000);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && document.getElementById("sheet").hidden && baby()) render(true);
});

(async function avvia() {
  await load();
  applicaTema();
  S.onSave = eseguiOnSave;
  render();
  aggiornaPromemoria();
})();
