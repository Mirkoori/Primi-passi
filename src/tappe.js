// Tappe dello sviluppo, mese per mese (0-12 mesi).
// Fonti di riferimento: OMS (Multicentre Growth Reference Study, finestre di acquisizione motoria),
// CDC "Learn the Signs. Act Early" (2022), Società Italiana di Pediatria.
// Sono indicazioni generali: ogni bambino ha i suoi tempi, il pediatra resta il riferimento.

export const AREE = {
  mov: { nome: "Movimento", emoji: "🤸", colore: "#FF9A76" },
  mani: { nome: "Mani e sguardo", emoji: "👀", colore: "#5ED1B1" },
  voce: { nome: "Voce e ascolto", emoji: "🗣️", colore: "#6B63F5" },
  rel: { nome: "Emozioni e relazione", emoji: "💛", colore: "#FFB703" },
};

export const MESI = [
  {
    m: 0,
    titolo: "Il benvenuto",
    intro:
      "Il primo mese è fatto di sonno, poppate e scoperta reciproca. Il tuo bimbo vede bene solo a 20-30 cm: la distanza giusta per guardarti in faccia mentre lo allatti o lo tieni in braccio.",
    tappe: {
      mov: [
        "Ha i riflessi primitivi: suzione, presa della manina, sobbalzo (Moro)",
        "Tiene le braccia e le gambe piegate, le mani spesso chiuse a pugno",
        "A pancia in giù solleva la testa per un istante e la gira di lato",
      ],
      mani: [
        "Mette a fuoco volti e contrasti forti (bianco e nero) a circa 20-30 cm",
        "Per qualche secondo segue con lo sguardo un volto o un oggetto",
      ],
      voce: [
        "Si sveglia o sobbalza davanti a un rumore forte",
        "Si calma sentendo la tua voce",
        "Comunica piangendo: fame, sonno, pannolino, bisogno di coccole",
      ],
      rel: [
        "Riconosce il tuo odore e la tua voce",
        "Si calma quando lo prendi in braccio e lo culli",
      ],
    },
    aiuto: [
      "Contatto pelle a pelle e tante coccole: non si vizia, si rassicura",
      "Parlagli e cantagli anche se non risponde: sta imparando la voce di mamma e papà",
      "Qualche minuto al giorno a pancia in giù da sveglio, sempre sotto sorveglianza",
    ],
    pediatra: [
      "Fa fatica a succhiare o a mangiare, o è molto difficile da svegliare per le poppate",
      "Non reagisce ai rumori forti",
      "Febbre (38 °C o più): chiama subito il pediatra o vai al pronto soccorso",
    ],
  },
  {
    m: 1,
    titolo: "Più sveglio e curioso",
    intro:
      "Stai conoscendo il suo carattere. Verso le 6-8 settimane arriva spesso il primo vero sorriso, quello rivolto a te: il premio più bello per le notti difficili.",
    tappe: {
      mov: [
        "A pancia in giù solleva la testa per alcuni secondi",
        "I movimenti diventano meno a scatti",
      ],
      mani: [
        "Segue con lo sguardo un oggetto o un volto per un breve tratto",
        "Fissa i volti con attenzione",
      ],
      voce: [
        "Emette i primi piccoli suoni gutturali",
        "Gira la testa verso una voce conosciuta",
      ],
      rel: [
        "Può comparire il primo sorriso sociale (6-8 settimane)",
        "Guarda negli occhi mentre lo allatti o gli parli",
      ],
    },
    aiuto: [
      "Rispondi ai suoi suoni: fai una pausa, aspetta, rispondi. È il primo dialogo",
      "Fagli vedere facce, giochi in bianco e nero, un mobile colorato a distanza",
      "Cambia spesso posizione e ambiente: braccio, passeggino, marsupio",
    ],
    pediatra: [
      "Non reagisce ai suoni forti o alla luce",
      "Non guarda i volti",
      "Si mostra molto rigido o molto molle quando lo prendi in braccio",
    ],
  },
  {
    m: 2,
    titolo: "Il primo sorriso e i primi suoni",
    intro:
      "A 2 mesi il bimbo è un interlocutore: ti sorride, ti guarda e tubando ti risponde. Spesso è anche il momento dei primi colpi di coliche, che di solito migliorano verso i 3-4 mesi.",
    tappe: {
      mov: [
        "A pancia in giù tiene la testa sollevata per qualche momento",
        "Muove entrambe le braccia e le gambe",
        "Apre per un attimo le mani",
      ],
      mani: [
        "Ti guarda in faccia e segue i movimenti",
        "Osserva un giocattolo per qualche secondo",
      ],
      voce: [
        "Fa suoni diversi dal pianto: «ah», «eh», «uuu» (il tubare)",
        "Si calma quando ti sente parlare",
      ],
      rel: [
        "Sorride in risposta alla tua voce o al tuo viso",
        "Ti guarda e sembra riconoscerti",
      ],
    },
    aiuto: [
      "Faccia a faccia: sorridi, fai smorfie lente, imita i suoi suoni",
      "Tummy time più volte al giorno, pochi minuti per volta",
      "Canta le stesse ninne nanne: la ripetizione lo rassicura",
    ],
    pediatra: [
      "Non sorride a nessuno e non guarda i volti",
      "Non segue con lo sguardo e non reagisce ai suoni",
      "Non muove una delle braccia o delle gambe, o tiene sempre i pugni stretti",
    ],
  },
  {
    m: 3,
    titolo: "Testa su e mani in gioco",
    intro:
      "Il controllo della testa migliora molto e le mani diventano un giocattolo. È anche l'età dei primi vaccini del ciclo del primo anno: segnati la data con il pediatra.",
    tappe: {
      mov: [
        "A pancia in giù si solleva sugli avambracci e tiene su testa e torace",
        "Tiene la testa abbastanza ferma se lo sostieni seduto",
        "Spinge sulle gambe quando i piedi toccano una superficie",
      ],
      mani: [
        "Guarda le proprie mani e le porta alla bocca",
        "Segue un oggetto che si sposta davanti a lui da un lato all'altro",
        "Tiene un sonaglio se glielo metti in mano",
      ],
      voce: [
        "Tuba e fa versetti per attirare l'attenzione",
        "Gira la testa verso i suoni",
      ],
      rel: [
        "Sorride spontaneamente e a volte ride",
        "Mostra interesse per volti e persone familiari",
      ],
    },
    aiuto: [
      "Appendi o tieni un giocattolo vivace poco sopra di lui: allenare la vista e il sollevarsi",
      "Mettigli in mano oggetti sicuri con consistenze diverse",
      "Parla di quello che fai: «ora ti cambio, ora ti metto la tutina»",
    ],
    pediatra: [
      "Non regge la testa quando è a pancia in giù o seduto con sostegno",
      "Non segue gli oggetti con lo sguardo",
      "Non porta mai le mani alla bocca e non sorride alle persone",
    ],
  },
  {
    m: 4,
    titolo: "Le risate",
    intro:
      "Arrivano le prime risate vere e il bambino inizia a cercare il contatto con le mani. Spesso iniziano anche i primi rotolamenti, da pancia a schiena.",
    tappe: {
      mov: [
        "Tiene la testa ferma senza sostegno",
        "A pancia in giù si spinge sui gomiti o sugli avambracci",
        "Può rotolare dalla pancia alla schiena",
      ],
      mani: [
        "Allunga la mano verso un giocattolo e cerca di afferrarlo",
        "Porta le mani e gli oggetti alla bocca",
        "Segue un oggetto che si muove in tutte le direzioni",
      ],
      voce: [
        "Ride e fa risatine",
        "Fa «ba», «ga», «ma»: i primi versetti con le consonanti",
      ],
      rel: [
        "Sorride per attirare la tua attenzione",
        "Si diverte con i giochi di faccia: «cucù», smorfie",
      ],
    },
    aiuto: [
      "Giochi di vicinanza: solletico leggero, bolle di sapone, canzoncine con i gesti",
      "Spazio sicuro a terra su un tappeto: più libertà di muoversi",
      "Offrigli giochi da afferrare e portare alla bocca, facili da lavare",
    ],
    pediatra: [
      "Non tiene la testa ferma",
      "Non si porta le mani alla bocca",
      "Non fa versetti e non sorride mai",
      "Non spinge con le gambe quando è con i piedi appoggiati",
    ],
  },
  {
    m: 5,
    titolo: "Esploratore a terra",
    intro:
      "La curiosità cresce e il bimbo diventa più attivo. Si rotola, afferra, si guarda i piedi. Tra poco sarà il momento di pensare allo svezzamento: parlane con il pediatra.",
    tappe: {
      mov: [
        "Rotola dalla pancia alla schiena e prova anche il contrario",
        "Se lo tieni seduto, sta su con poco sostegno",
        "A pancia in giù spinge con le braccia stese",
      ],
      mani: [
        "Afferra un oggetto e lo passa da una mano all'altra",
        "Si guarda e si prende i piedi",
        "Afferra con tutta la mano",
      ],
      voce: [
        "Ride forte e fa versi diversi, anche urlando per gioco",
        "Risponde al suo nome girandosi, a volte",
      ],
      rel: [
        "Riconosce i volti familiari e distingue gli sconosciuti",
        "Ti guarda e cerca la tua reazione",
      ],
    },
    aiuto: [
      "Metti i giochi appena fuori portata per incoraggiarlo a muoversi",
      "Dagli tempo a terra senza troppi supporti (seggiolini, altalene)",
      "Leggigli libri cartonati con immagini grandi e semplici",
    ],
    pediatra: [
      "Non cerca di afferrare gli oggetti",
      "Non rotola e ha le gambe molto rigide",
      "Non emette suoni e non reagisce ai rumori",
    ],
  },
  {
    m: 6,
    titolo: "Mezzo anno: arriva la pappa",
    intro:
      "A 6 mesi di solito inizia lo svezzamento (l'alimentazione complementare). Il bimbo siede con appoggio, si interessa al cibo e spesso spunta il primo dentino.",
    tappe: {
      mov: [
        "Rotola in entrambe le direzioni",
        "Sta seduto con appoggio e si regge sulle mani",
        "A pancia in giù spinge con le braccia stese",
      ],
      mani: [
        "Prende un oggetto e lo porta alla bocca",
        "Allunga le mani per farsi prendere in braccio",
        "Guarda gli oggetti a distanza e si guarda allo specchio",
      ],
      voce: [
        "Ripete sillabe: «ba-ba», «da-da»",
        "Fa la pernacchia, alterna i suoni con te come in una conversazione",
      ],
      rel: [
        "Riconosce le persone care e inizia a distinguere gli estranei",
        "Ride volentieri, sa mostrare quando non vuole più mangiare (chiude le labbra)",
      ],
    },
    aiuto: [
      "Seggiolone e cibo: lascia che tocchi, assaggi, si sporchi. Il cibo è anche gioco",
      "Cestino dei tesori con oggetti sicuri di materiali diversi da esplorare",
      "Rispondi ai suoi versetti come in una vera conversazione",
    ],
    pediatra: [
      "Non cerca di prendere gli oggetti a portata di mano",
      "Non porta gli oggetti alla bocca",
      "Non emette vocali («aaa», «ooo») e non risponde ai suoni",
      "Sembra molto rigido o molto molle",
    ],
  },
  {
    m: 7,
    titolo: "Seduto e curioso",
    intro:
      "Il bimbo sta sempre meglio seduto, passa gli oggetti da una mano all'altra e comincia ad essere più attaccato ai genitori: è normale e sano.",
    tappe: {
      mov: [
        "Sta seduto con poco o nessun appoggio per qualche istante",
        "Si dondola a carponi o striscia per muoversi",
        "Regge il peso sulle gambe quando lo tieni in piedi",
      ],
      mani: [
        "Passa gli oggetti da una mano all'altra senza difficoltà",
        "Raccoglie piccoli oggetti con tutta la mano",
        "Batte un giocattolo contro una superficie",
      ],
      voce: [
        "Balbetta con più consonanti: «ma-ma-ma», «ba-ba-ba»",
        "Si gira quando lo chiami per nome",
      ],
      rel: [
        "Può mostrare timore degli sconosciuti",
        "Ride per i giochi di «cucù» e li ripete",
      ],
    },
    aiuto: [
      "Giochi di «sparisce e ricompare»: cucù, nascondi un giocattolo sotto un panno",
      "Metti la casa in sicurezza: tappi alle prese, copri gli spigoli, cancelletti per le scale",
      "Quando ti allontani, salutalo sempre: gli insegni che ritornerai",
    ],
    pediatra: [
      "Non sta seduto nemmeno con appoggio",
      "Non passa gli oggetti da una mano all'altra",
      "Non risponde al nome o ai suoni intorno",
    ],
  },
  {
    m: 8,
    titolo: "Le prime paure",
    intro:
      "Molti bambini attraversano ora l'ansia da separazione e quella verso gli estranei. È un segno di crescita: ha capito che esisti anche quando non ti vede, e che può perderti.",
    tappe: {
      mov: [
        "Sta seduto da solo senza appoggio",
        "Striscia, gattona o prova a muoversi in avanti",
        "Si tira a sedere da solo, o quasi",
      ],
      mani: [
        "Cerca un oggetto che cade o che hai nascosto",
        "Inizia a usare pollice e indice per raccogliere piccoli pezzi di cibo",
        "Passa gli oggetti con facilità e li batte insieme",
      ],
      voce: [
        "Balbetta catene di sillabe («mamama», «bababa»)",
        "Capisce il tono di voce: dolce, fermo, allegro",
      ],
      rel: [
        "Piange quando ti allontani o arriva un estraneo",
        "Ha giochi e persone preferite",
      ],
    },
    aiuto: [
      "Rituali di distacco brevi e sereni: un saluto, un bacio, e vai via senza fughe",
      "Pasti con pezzetti morbidi da afferrare: è l'allenamento del pollice e dell'indice",
      "Lascia che gattoni su tappeti e pavimenti puliti, a piedi nudi o con calzini antiscivolo",
    ],
    pediatra: [
      "Non sta seduto con minimo appoggio",
      "Non balbetta e non reagisce al nome",
      "Non cerca oggetti che vede cadere",
    ],
  },
  {
    m: 9,
    titolo: "Si muove e capisce",
    intro:
      "Verso i 9 mesi molti bimbi gattonano o si spostano in qualche modo, e capiscono più di quanto riescano a dire. Spesso arrivano anche il «cucù» e i primi saluti con la mano.",
    tappe: {
      mov: [
        "Sta seduto senza appoggio e si siede da solo",
        "Gattona, striscia o si sposta in modo suo",
        "Si tiene in piedi aggrappandosi ai mobili",
      ],
      mani: [
        "Usa le dita per raccogliere il cibo (presa a rastrello o a pinza)",
        "Cerca gli oggetti nascosti o caduti",
        "Sposta gli oggetti da una mano all'altra",
      ],
      voce: [
        "Balbetta con suoni diversi: «mamama», «babababa»",
        "Gira la testa quando lo chiami per nome",
      ],
      rel: [
        "Alza le braccia per farsi prendere in braccio",
        "Ride nei giochi di «cucù»",
        "Mostra espressioni diverse del viso",
      ],
    },
    aiuto: [
      "Dagli piccoli oggetti sicuri da mettere dentro e tirare fuori da una scatola",
      "Nomina le cose che usa: «il cucchiaio», «la palla», «il biberon»",
      "Casa a prova di bimbo: da questa età si muove veloce",
    ],
    pediatra: [
      "Non sta seduto senza appoggio",
      "Non porta il peso sulle gambe quando lo sostieni in piedi",
      "Non balbetta con suoni come «mama» o «baba»",
      "Non cerca gli oggetti che vede nascondere",
      "Ha perso un'abilità che aveva già acquisito",
    ],
  },
  {
    m: 10,
    titolo: "In piedi e in cammino",
    intro:
      "Il bimbo vuole stare in piedi. Si tira su, cammina tenendosi ai mobili e saluta con la mano. Il pavimento è ancora il suo posto preferito.",
    tappe: {
      mov: [
        "Si tira in piedi appoggiandosi a un mobile",
        "Cammina lateralmente tenendosi ai mobili",
        "Gattona bene e velocemente",
      ],
      mani: [
        "Prende i piccoli pezzi di cibo con pollice e indice (presa a pinza)",
        "Mette dentro e tira fuori gli oggetti da un contenitore",
      ],
      voce: [
        "Dice «mamma» o «papà» ma non sempre in modo mirato",
        "Imita i suoni che senti dire e fa il gesto del «ciao»",
      ],
      rel: [
        "Capisce «no» (anche se non sempre obbedisce)",
        "Ti porta oggetti, li mostra, li offre",
      ],
    },
    aiuto: [
      "Mobili stabili da usare come appoggio; in casa meglio piedi nudi o calzini antiscivolo, le scarpe servono solo fuori",
      "Giochi con scatole e contenitori: riempire e svuotare è fondamentale",
      "Dai nome ai gesti e agli oggetti: «ciao», «dammi», «apri»",
    ],
    pediatra: [
      "Non gattona e non si sposta in nessun modo",
      "Non si tira in piedi con appoggio",
      "Non indica né gesticola, non risponde al nome",
      "Ha perso un'abilità che aveva",
    ],
  },
  {
    m: 11,
    titolo: "Quasi un passo",
    intro:
      "Sta in piedi con appoggio, qualcuno fa i primi passi senza aiuto. Il linguaggio si arricchisce di gesti e di versi che hanno un significato.",
    tappe: {
      mov: [
        "Cammina tenendosi ai mobili o per mano",
        "Sta in piedi per qualche istante da solo",
        "Si siede da in piedi senza cadere",
      ],
      mani: [
        "Indica con l'indice per mostrare o chiedere",
        "Presa a pinza precisa con pollice e indice",
        "Batte due oggetti tra loro",
      ],
      voce: [
        "Dice «mamma» e «papà» in modo più mirato",
        "Capisce parole semplici come «no», «dai», «ciao»",
      ],
      rel: [
        "Imita i gesti: saluta, manda i bacetti, applaude",
        "Ti guarda per capire come reagisci davanti a qualcosa di nuovo",
      ],
    },
    aiuto: [
      "Lascialo camminare con un trainabile stabile da spingere, evitando il girello",
      "Leggi ogni giorno: indica le immagini e dai il nome",
      "Quando indica, rispondi: «Sì, è un cane!»",
    ],
    pediatra: [
      "Non indica né fa gesti per farsi capire",
      "Non cerca oggetti nascosti davanti ai suoi occhi",
      "Non si regge in piedi con appoggio",
      "Ha perso un'abilità che aveva",
    ],
  },
  {
    m: 12,
    titolo: "Un anno!",
    intro:
      "Compleanno! Da qui in poi lo sviluppo è ancora più vario: alcuni bimbi camminano già, altri lo faranno nei mesi successivi (tra 9 e 18 mesi è la norma). Cambia l'alimentazione: si può introdurre il latte vaccino come bevanda.",
    tappe: {
      mov: [
        "Si tira in piedi e cammina tenendosi ai mobili",
        "Può muovere i primi passi da solo (non tutti, e va bene)",
        "Si sposta in autonomia: gattonando, strisciando o camminando",
      ],
      mani: [
        "Prende le cose tra pollice e indice",
        "Mette un oggetto in un contenitore",
        "Beve da una tazza che gli tieni",
      ],
      voce: [
        "Dice «mamma» o «papà» o un'altra parola speciale, a volte mirata",
        "Capisce il «no» e si ferma (a volte)",
        "Saluta con la mano e fa gesti per farsi capire",
      ],
      rel: [
        "Gioca a «cucù» e a giochi di scambio",
        "Cerca gli oggetti che vede nascondere",
        "Mostra affetto e preferenza per le persone familiari",
      ],
    },
    aiuto: [
      "Festeggia con calma: per lui il giorno speciale è fatto di routine e di voi",
      "Giochi con palline, cubi da impilare, libri, giochi di imitazione",
      "Parla molto, dai il nome a tutto, aspetta la risposta anche se è un versetto",
    ],
    pediatra: [
      "Non gattona né si sposta in nessun modo, non si tira in piedi con appoggio",
      "Non indica, non fa gesti come salutare, non dice nessuna parola",
      "Non risponde al nome o non cerca oggetti nascosti",
      "Ha perso un'abilità che aveva già acquisito",
    ],
  },
];

export const NOTA_TAPPE =
  "Le tappe sono indicazioni generali sul periodo in cui la maggior parte dei bambini acquisisce una capacità. Un bimbo può arrivarci prima o dopo senza che ci sia un problema. Se hai un dubbio, parlane con il pediatra: fidarsi del proprio istinto di genitore è importante. Per i nati prematuri, l'app usa l'età corretta.";
