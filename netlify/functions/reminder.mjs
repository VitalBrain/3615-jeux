// POST /api/reminder — enregistre, met à jour ou supprime le rappel quotidien d'un appareil.
// Corps JSON : { action: "subscribe" | "unsubscribe", subscription, time: "HH:MM", tz, lang, silent }
import {
  reminderStore, keyFor, configureWebPush, confirmationPayload, isValidTimeZone
} from "../lib/reminders.mjs";

const json = (status, data) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "POST uniquement" });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: "JSON invalide" }); }

  const sub = body && body.subscription;
  const endpoint = sub && typeof sub.endpoint === "string" ? sub.endpoint : "";
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000) return json(400, { error: "abonnement invalide" });

  const store = reminderStore();
  const key = keyFor(endpoint);

  if (body.action === "unsubscribe") {
    await store.delete(key);
    return json(200, { ok: true });
  }

  if (body.action !== "subscribe") return json(400, { error: "action inconnue" });
  if (!sub.keys || typeof sub.keys.p256dh !== "string" || typeof sub.keys.auth !== "string") {
    return json(400, { error: "clés manquantes" });
  }
  const time = String(body.time || "");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return json(400, { error: "heure invalide" });
  const tz = isValidTimeZone(body.tz) ? body.tz : "Europe/Paris";
  const lang = body.lang === "en" ? "en" : "fr";

  const previous = await store.get(key, { type: "json" }).catch(() => null);
  const record = {
    subscription: { endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
    time, tz, lang,
    // Si l'heure change, le rappel peut de nouveau partir aujourd'hui.
    lastSent: previous && previous.time === time ? previous.lastSent || null : null,
    updatedAt: new Date().toISOString()
  };
  await store.setJSON(key, record);

  if (!body.silent) {
    try {
      const webpush = configureWebPush();
      await webpush.sendNotification(record.subscription, confirmationPayload(lang, time), { TTL: 3600 });
    } catch (e) {
      // L'abonnement est enregistré même si la notification de confirmation échoue.
      return json(200, { ok: true, confirmation: false, error: String(e && e.message || e) });
    }
  }
  return json(200, { ok: true, confirmation: !body.silent });
};

export const config = { path: "/api/reminder" };
