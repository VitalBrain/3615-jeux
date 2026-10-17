// Fonction planifiée : toutes les 15 minutes, envoie le rappel du jour
// aux appareils dont l'heure choisie vient d'arriver (dans leur fuseau horaire).
import {
  reminderStore, configureWebPush, reminderPayload, isDue, localNow
} from "../lib/reminders.mjs";

export default async () => {
  const store = reminderStore();
  const webpush = configureWebPush();
  const now = new Date();
  const { blobs } = await store.list();

  let sent = 0, removed = 0, failed = 0;
  for (const { key } of blobs) {
    const rec = await store.get(key, { type: "json" }).catch(() => null);
    if (!rec || !rec.subscription || !rec.time || !rec.tz) continue;
    if (!isDue(rec, now)) continue;

    const today = localNow(rec.tz, now).date;
    const dayIndex = Math.floor(now.getTime() / 86400000);
    try {
      await webpush.sendNotification(rec.subscription, reminderPayload(rec.lang, dayIndex), { TTL: 3 * 3600 });
      await store.setJSON(key, { ...rec, lastSent: today });
      sent++;
    } catch (e) {
      // 404 / 410 : l'appareil s'est désabonné ou l'app a été désinstallée.
      if (e && (e.statusCode === 404 || e.statusCode === 410)) {
        await store.delete(key);
        removed++;
      } else {
        failed++;
      }
    }
  }
  console.log(`Rappels : ${sent} envoyé(s), ${removed} abonnement(s) supprimé(s), ${failed} échec(s)`);
};

export const config = { schedule: "*/15 * * * *" };
