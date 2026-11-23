// Guide pratiche per il primo anno. Informazioni generali: non sostituiscono il pediatra.
// Riferimenti: SIP (Società Italiana di Pediatria), Ministero della Salute (PNPV 2023-2025), OMS, AAP.

export const EMERGENZA =
  "In caso di emergenza chiama subito il 112. Queste informazioni sono generali e non sostituiscono il parere del pediatra.";

// Calendario vaccinale indicativo: mese di riferimento dalla nascita (età cronologica).
// Lo schema esatto e le date li decide l'ASL / il pediatra della tua Regione.
export const VACCINI = [
  { id: "esa1", mese: 3, nome: "Esavalente (1ª dose)", nota: "Difterite, tetano, pertosse, polio, epatite B, Hib" },
  { id: "pne1", mese: 3, nome: "Pneumococco (1ª dose)", nota: "Dal 61º giorno di vita" },
  { id: "menb1", mese: 3, nome: "Meningococco B (1ª dose)", nota: "Lo schema esatto dipende dalla Regione" },
  { id: "rota", mese: 2, nome: "Rotavirus (ciclo di 2-3 dosi)", nota: "Può iniziare già dalle 6 settimane di vita" },
  { id: "menb2", mese: 4, nome: "Meningococco B (richiamo)", nota: "Secondo lo schema indicato dall'ASL" },
  { id: "esa2", mese: 5, nome: "Esavalente (2ª dose)", nota: "" },
  { id: "pne2", mese: 5, nome: "Pneumococco (2ª dose)", nota: "" },
  { id: "esa3", mese: 11, nome: "Esavalente (3ª dose)", nota: "" },
  { id: "pne3", mese: 11, nome: "Pneumococco (3ª dose)", nota: "" },
  { id: "mprv", mese: 13, nome: "Morbillo-parotite-rosolia-varicella (MPRV)", nota: "Subito dopo il primo compleanno, tra i 13 e i 15 mesi" },
  { id: "menacwy", mese: 13, nome: "Meningococco ACWY", nota: "Tra i 13 e i 15 mesi, secondo la Regione" },
];

export const GUIDE = [
  {
    id: "allattamento",
    titolo: "Allattamento e latte",
    icona: "🍼",
    sezioni: [
      {
        t: "Quante volte mangia",
        p: [
          "Nei primi mesi un neonato si attacca di solito 8-12 volte in 24 ore, anche di notte. Meglio «a richiesta»: segui i suoi segnali (si porta le mani alla bocca, cerca il seno, schiocca le labbra) senza aspettare il pianto.",
        ],
      },
      {
        t: "Come capire se mangia abbastanza",
        l: [
          "Dal quinto giorno circa almeno 5-6 pannolini ben bagnati al giorno",
          "Feci morbide e gialle, più volte al giorno nelle prime settimane",
          "Sembra sazio e rilassato dopo la poppata, ed è vigile tra una poppata e l'altra",
          "Cresce di peso con regolarità (il pediatra lo controlla)",
        ],
      },
      {
        t: "Latte artificiale",
        l: [
          "Prepara il biberon seguendo con precisione le dosi scritte sulla confezione: né più né meno polvere",
          "Lava bene le mani e sterilizza o lava con cura biberon e tettarelle",
          "Il latte preparato e avanzato dopo la poppata si butta, non si conserva",
        ],
      },
      {
        t: "Vitamina D",
        p: [
          "Di solito il pediatra consiglia la vitamina D nel primo anno di vita. Chiedi a lui il dosaggio.",
        ],
      },
    ],
  },
  {
    id: "svezzamento",
    titolo: "Svezzamento",
    icona: "🥣",
    sezioni: [
      {
        t: "Quando iniziare",
        p: [
          "Di solito verso i 6 mesi compiuti, e comunque non prima dei 4 mesi compiuti. Il bimbo è pronto se sta seduto con sostegno, regge bene la testa, si interessa al cibo e non spinge fuori il cucchiaino con la lingua.",
        ],
      },
      {
        t: "Come fare",
        l: [
          "Parti con piccoli assaggi, una novità alla volta, senza fretta: il latte resta la base fino a 12 mesi",
          "Puoi proporre fin da subito tutti i gruppi di alimenti: verdura, frutta, cereali, carne, pesce, legumi, uovo. Gli allergeni non vanno rimandati, ma introdotti con gradualità (chiedi al pediatra se in famiglia ci sono allergie)",
          "Il divezzamento può essere con crema, pezzetti morbidi o autosvezzamento: l'importante è che il cibo sia adatto all'età",
          "Mai mettere il bimbo davanti agli schermi mentre mangia",
        ],
      },
      {
        t: "Cosa evitare nel primo anno",
        l: [
          "Miele: mai prima dei 12 mesi (rischio di botulismo)",
          "Sale e zucchero aggiunti",
          "Latte vaccino come bevanda principale (si può usare nelle preparazioni, dai 12 mesi come bevanda)",
          "Cibi che possono soffocare: noccioline intere, uva e pomodorini interi, pezzi duri e rotondi, popcorn. Tagliali o schiacciali",
          "Pesci grandi con più mercurio (pesce spada, tonno fresco in grandi quantità)",
        ],
      },
    ],
  },
  {
    id: "sonno",
    titolo: "Sonno",
    icona: "🌙",
    sezioni: [
      {
        t: "Sonno sicuro",
        l: [
          "Sempre a pancia in su per dormire, sulla schiena",
          "Su un materasso rigido e piano, nel suo lettino, senza cuscini, paracolpi, coperte pesanti o peluche",
          "Nella stanza dei genitori, ma nel proprio lettino, almeno nei primi 6 mesi",
          "Mai fumo di sigaretta vicino al bambino; non sovra-coprirlo, la stanza non troppo calda",
          "Non addormentarti con lui sul divano o in poltrona",
        ],
      },
      {
        t: "Quanto dorme (in 24 ore, compresi i pisolini)",
        l: [
          "Neonato (0-3 mesi): 14-17 ore, a blocchi brevi",
          "4-12 mesi: 12-16 ore, con una notte sempre più lunga",
        ],
      },
      {
        t: "Quanto può stare sveglio tra un sonno e l'altro",
        l: [
          "0-1 mese: 45-60 minuti",
          "2-3 mesi: 60-90 minuti",
          "4-5 mesi: 90-120 minuti",
          "6-8 mesi: 2-3 ore",
          "9-12 mesi: 3-4 ore",
        ],
        n: "Sono medie: segui i segnali di stanchezza (occhi rossi, sguardo fisso, si strofina il viso).",
      },
      {
        t: "Qualche consiglio",
        l: [
          "Un rituale breve e sempre uguale (bagnetto, ninna nanna, luce bassa) aiuta a riconoscere la sera",
          "Distingui giorno e notte: di giorno luce e rumori normali, di notte buio e silenzio",
          "I risvegli notturni nel primo anno sono normali, e le «regressioni» (4, 8-10, 12 mesi) passano",
        ],
      },
    ],
  },
  {
    id: "salute",
    titolo: "Febbre e salute",
    icona: "🩺",
    sezioni: [
      {
        t: "Febbre",
        l: [
          "Sotto i 3 mesi: 38 °C o più è sempre un motivo per chiamare subito il pediatra o andare al pronto soccorso",
          "Dai 3 mesi in su: misura con un termometro affidabile. Chiama il pediatra se la febbre è alta (39 °C o più), dura da più di un giorno o due, o il bimbo ti sembra molto abbattuto",
          "Non dare farmaci senza indicazione del pediatra: il dosaggio dipende dal peso",
        ],
      },
      {
        t: "Chiama il 112 se",
        l: [
          "Respira con fatica, a scatti, o ha le labbra o il viso bluastri",
          "Ha convulsioni, o è molto difficile da svegliare o floscio",
          "Ha macchie sulla pelle che non scompaiono premendole",
          "Vomita verde, o non ha pannolini bagnati da 8 ore o più",
          "Si è soffocato o ha ingerito qualcosa di pericoloso",
        ],
      },
      {
        t: "Coliche",
        p: [
          "Pianto inconsolabile, di solito la sera, in un bimbo sano: è molto comune, ha un picco intorno alle 6 settimane e di solito passa entro i 3-4 mesi. Prova a tenerlo in braccio, cullarlo, un rumore di fondo costante, un massaggio dolce sulla pancia. Se il pianto è diverso dal solito o ci sono altri sintomi, chiama il pediatra. Se sei al limite, appoggialo in un posto sicuro (lettino) e fai una pausa di qualche minuto: non scuoterlo mai.",
        ],
      },
      {
        t: "Dentizione",
        p: [
          "I primi dentini spuntano di solito verso i 6 mesi (può essere prima o dopo). Possono dare bava, gengive gonfie, irritabilità. Un anello da dentizione fresco (non congelato) può dare sollievo.",
        ],
      },
    ],
  },
  {
    id: "cura",
    titolo: "Cura quotidiana",
    icona: "🛁",
    sezioni: [
      {
        t: "Cordone ombelicale",
        p: [
          "Tienilo pulito e asciutto, di solito cade da solo entro 1-3 settimane. Chiama il pediatra se la zona diventa rossa, secerne pus, ha cattivo odore, o se il bimbo ha la febbre.",
        ],
      },
      {
        t: "Bagnetto e pelle",
        l: [
          "Due o tre volte a settimana basta, con acqua tiepida (circa 37 °C) e un detergente delicato",
          "Non lasciarlo mai solo, nemmeno per un secondo",
          "Asciuga bene le pieghe e usa una crema emolliente se la pelle è secca",
        ],
      },
      {
        t: "Pannolino",
        l: [
          "Cambialo spesso, pulisci con acqua e un detergente delicato, asciuga bene",
          "Per l'arrossamento: crema all'ossido di zinco e più tempo senza pannolino",
        ],
      },
      {
        t: "In auto e in casa",
        l: [
          "Seggiolino omologato, contromarcia il più a lungo possibile, mai in braccio",
          "Mai lasciarlo da solo sul fasciatoio, sul divano o sul letto",
          "Tieni piccoli oggetti, batterie a bottone e detersivi fuori dalla sua portata",
        ],
      },
    ],
  },
  {
    id: "visite",
    titolo: "Visite e controlli",
    icona: "📅",
    sezioni: [
      {
        t: "Il pediatra",
        p: [
          "Nel primo anno ci sono controlli periodici (i «bilanci di salute»), di solito intorno a 1, 3, 6, 9 e 12 mesi, ma i tempi dipendono dal pediatra e dalla Regione. Ad ogni visita si controllano peso, lunghezza, circonferenza cranica e sviluppo.",
        ],
      },
      {
        t: "Cosa portare alla visita",
        l: [
          "Il libretto sanitario e il tesserino sanitario",
          "Le domande scritte (annotale nell'app!)",
          "Le informazioni su poppate, sonno e pannolini degli ultimi giorni",
        ],
      },
    ],
  },
];
