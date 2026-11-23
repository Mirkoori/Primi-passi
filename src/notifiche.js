import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

export const nativo = Capacitor.isNativePlatform();

export async function permessoNotifiche() {
  if (!nativo) return "web";
  try {
    const p = await LocalNotifications.checkPermissions();
    return p.display;
  } catch (e) {
    return "denied";
  }
}

export async function chiediPermesso() {
  if (!nativo) return false;
  try {
    const p = await LocalNotifications.checkPermissions();
    if (p.display === "granted") return true;
    const r = await LocalNotifications.requestPermissions();
    return r.display === "granted";
  } catch (e) {
    return false;
  }
}

// Cancella le notifiche programmate e programma di nuovo l'elenco (sempre ricalcolato dallo stato dell'app).
export async function riprogramma(lista) {
  if (!nativo) return;
  try {
    const p = await LocalNotifications.checkPermissions();
    const pend = await LocalNotifications.getPending();
    if (pend.notifications.length) await LocalNotifications.cancel({ notifications: pend.notifications });
    if (p.display !== "granted" || !lista.length) return;
    await LocalNotifications.schedule({ notifications: lista });
  } catch (e) {
    console.warn("notifiche", e);
  }
}
