import { Filesystem, Directory } from "@capacitor/filesystem";

const cache = new Map();
const percorso = (id, m) => `foto/${id}-${m}.jpg`;

function leggiFile(file) {
  return new Promise((ok, no) => {
    const r = new FileReader();
    r.onload = () => ok(r.result);
    r.onerror = no;
    r.readAsDataURL(file);
  });
}

function caricaImmagine(src) {
  return new Promise((ok, no) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = no;
    i.src = src;
  });
}

// Riduce la foto (max 1080 px sul lato lungo) per non occupare troppo spazio.
export async function ridimensiona(file, max = 1080) {
  const img = await caricaImmagine(await leggiFile(file));
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * k);
  c.height = Math.round(img.naturalHeight * k);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.82);
}

export async function salvaFoto(id, m, file) {
  const url = await ridimensiona(file);
  await Filesystem.writeFile({ path: percorso(id, m), data: url.split(",")[1], directory: Directory.Data, recursive: true });
  cache.set(`${id}-${m}`, url);
  return url;
}

export async function leggiFoto(id, m) {
  const k = `${id}-${m}`;
  if (cache.has(k)) return cache.get(k);
  try {
    const r = await Filesystem.readFile({ path: percorso(id, m), directory: Directory.Data });
    let d = r.data;
    if (typeof d !== "string") d = (await leggiFile(d)).split(",")[1];
    const url = "data:image/jpeg;base64," + d;
    cache.set(k, url);
    return url;
  } catch (e) {
    return null;
  }
}

export async function eliminaFoto(id, m) {
  cache.delete(`${id}-${m}`);
  try {
    await Filesystem.deleteFile({ path: percorso(id, m), directory: Directory.Data });
  } catch (e) {}
}

// Collage con le foto dei mesi disponibili.
export async function creaCollage(id, mesi, nome) {
  const foto = [];
  for (const m of mesi) {
    const u = await leggiFoto(id, m);
    if (u) foto.push({ m, img: await caricaImmagine(u) });
  }
  if (!foto.length) return null;
  const cols = foto.length <= 2 ? foto.length : foto.length <= 4 ? 2 : 3;
  const rows = Math.ceil(foto.length / cols);
  const T = 400, G = 16, TH = 500, TOP = 110;
  const W = cols * T + (cols + 1) * G, H = TOP + rows * TH + (rows + 1) * G;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = "#fff7ee";
  x.fillRect(0, 0, W, H);
  x.fillStyle = "#26244b";
  x.font = "700 52px sans-serif";
  x.textAlign = "center";
  x.fillText(`Il primo anno di ${nome}`, W / 2, 74);
  foto.forEach((f, i) => {
    const cx = G + (i % cols) * (T + G);
    const cy = TOP + G + Math.floor(i / cols) * (TH + G);
    x.save();
    x.beginPath();
    x.roundRect(cx, cy, T, TH, 24);
    x.clip();
    const k = Math.max(T / f.img.naturalWidth, TH / f.img.naturalHeight);
    const w = f.img.naturalWidth * k, h = f.img.naturalHeight * k;
    x.drawImage(f.img, cx + (T - w) / 2, cy + (TH - h) / 2, w, h);
    x.restore();
    const label = f.m === 0 ? "Appena nato" : f.m === 1 ? "1 mese" : `${f.m} mesi`;
    x.font = "800 30px sans-serif";
    const tw = x.measureText(label).width + 36;
    x.fillStyle = "rgba(38,36,75,0.8)";
    x.beginPath();
    x.roundRect(cx + 16, cy + TH - 62, tw, 44, 22);
    x.fill();
    x.fillStyle = "#fff";
    x.textAlign = "left";
    x.fillText(label, cx + 34, cy + TH - 31);
    x.textAlign = "center";
  });
  return c.toDataURL("image/jpeg", 0.88);
}
