// Code partagé par les fonctions de rappel quotidien (3615 JEUX).
import webpush from "web-push";
import { getStore } from "@netlify/blobs";
import { createHash } from "node:crypto";

// Clé publique VAPID (la même que dans index.html). La clé privée n'est
// PAS dans le dépôt : elle se règle dans Netlify, variable VAPID_PRIVATE_KEY.
export const VAPID_PUBLIC_KEY =
  "BDTnrRPrkb8ex5x2P4Hza_5_unp4-6SBAr9ZWDmYjnXqVejzbzRCjdnFv64TCOnrQNWi7ETG8ObxLBpL6x-O338";

export const SITE_URL = "https://3615-jeux.com";

export function reminderStore() {
  return getStore({ name: "daily-reminders", consistency: "strong" });
}

export function keyFor(endpoint) {
  return createHash("sha256").update(endpoint).digest("hex");
}

export function configureWebPush() {
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!privateKey) throw new Error("VAPID_PRIVATE_KEY manquante dans les variables d'environnement Netlify");
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:contact@3615-jeux.com",
    process.env.VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY,
    privateKey
  );
  return webpush;
}

const MESSAGES = {
  fr: [
    "C'est l'heure de ta partie du jour ! 🧠",
    "Ta mémoire t'attend : 5 minutes de jeu ? 🎮",
    "Petit entraînement du jour : MEMO, SIMON ou RÉFLEXE ? ⚡",
    "Une partie avant de filer ? Bats ton record ! 🏆"
  ],
  en: [
    "Time for your daily game! 🧠",
    "Your memory is waiting: 5 minutes of play? 🎮",
    "Daily workout: MEMO, SIMON or REFLEX? ⚡",
    "One game before you go? Beat your record! 🏆"
  ]
};

export function reminderPayload(lang, dayIndex) {
  const list = MESSAGES[lang] || MESSAGES.fr;
  return JSON.stringify({
    title: "3615 JEUX",
    body: list[Math.abs(dayIndex) % list.length],
    url: SITE_URL + "/?source=rappel",
    tag: "daily-reminder"
  });
}

export function confirmationPayload(lang, time) {
  return JSON.stringify({
    title: "3615 JEUX",
    body: lang === "en"
      ? `🔔 Daily reminder set for ${time}. See you then!`
      : `🔔 Rappel quotidien activé à ${time}. À tout à l'heure !`,
    url: SITE_URL,
    tag: "reminder-confirm"
  });
}

// Heure et date locales ("HH:MM", "AAAA-MM-JJ") dans un fuseau donné.
export function localNow(timeZone, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    }).formatToParts(now).map(p => [p.type, p.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

export function minutesOf(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Le rappel part lors du premier passage (toutes les 15 min) dans l'heure qui
// suit l'heure choisie, et une seule fois par jour.
export function isDue(rec, now = new Date()) {
  const local = localNow(rec.tz, now);
  if (rec.lastSent === local.date) return false;
  const diff = minutesOf(local.time) - minutesOf(rec.time);
  return diff >= 0 && diff < 60;
}

export function isValidTimeZone(tz) {
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; }
}
