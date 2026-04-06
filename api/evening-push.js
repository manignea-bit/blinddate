import webpush from "web-push";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
  initializeApp({ credential: cert(svc) });
}
const db = getFirestore();

webpush.setVapidDetails(
  "mailto:contact@blinddate.app",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const MESSAGES = [
  {
    fr: { title: "🔥 C'est l'heure des blind dates !", body: "Les gens se connectent maintenant — fais ta rencontre ce soir !" },
    en: { title: "🔥 Blind date hour!", body: "People are online now — make your move tonight!" },
  },
  {
    fr: { title: "🌙 Tu manques des rencontres", body: "Les blind dates sont au max ce soir. Reviens !" },
    en: { title: "🌙 You're missing out", body: "Peak blind date hours — come back now!" },
  },
  {
    fr: { title: "💘 Quelqu'un t'attend peut-être", body: "Lance un blind date ce soir, tu sais jamais…" },
    en: { title: "💘 Someone might be waiting", body: "Start a blind date tonight, you never know…" },
  },
];

export default async function handler(req, res) {
  // Vercel cron auth: only allow if CRON_SECRET matches (or if no secret set, allow)
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${secret}`) return res.status(401).end();
  }

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return res.status(500).json({ error: "VAPID keys not configured" });
  }

  const today = new Date().toISOString().slice(0, 10);
  const msg = MESSAGES[new Date().getDay() % MESSAGES.length];

  try {
    const snap = await db.collection("users")
      .where("pushSubscription", "!=", null)
      .get();

    let sent = 0, skipped = 0;

    for (const doc of snap.docs) {
      const data = doc.data();
      const sub = data.pushSubscription;
      if (!sub) { skipped++; continue; }

      // Respect 2/day limit
      const pt = data.pushToday || {};
      const todayCount = pt.date === today ? (pt.count || 0) : 0;
      if (todayCount >= 2) { skipped++; continue; }

      const lang = data.lang === "fr" ? "fr" : "en";
      const { title, body } = msg[lang];

      try {
        await webpush.sendNotification(sub, JSON.stringify({ title, body, url: "/" }));
        await doc.ref.update({ pushToday: { date: today, count: todayCount + 1 } });
        sent++;
      } catch (e) {
        if (e.statusCode === 410) await doc.ref.update({ pushSubscription: null }).catch(() => {});
        skipped++;
      }
    }

    res.json({ sent, skipped });
  } catch (e) {
    console.error("Evening push error:", e.message);
    res.status(500).json({ error: e.message });
  }
}
