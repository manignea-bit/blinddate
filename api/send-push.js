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

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", c => (raw += c));
    req.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve({}); } });
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return res.status(500).json({ error: "VAPID keys not configured" });
  }
  const body = req.body && typeof req.body === "object" ? req.body : await parseBody(req);
  const { userId, title, body: msgBody, url, tag } = body;
  if (!userId) return res.status(400).json({ error: "userId required" });

  try {
    const snap = await db.collection("users").doc(userId).get();
    const pushSub = snap.data()?.pushSubscription;
    if (!pushSub) return res.json({ sent: false, reason: "no subscription" });

    await webpush.sendNotification(pushSub, JSON.stringify({
      title: title || "BlindDate",
      body: msgBody || "",
      url: url || "/",
      tag: tag || "blinddate",
    }));
    res.json({ sent: true });
  } catch (e) {
    // 410 Gone = subscription expired, clean it up
    if (e.statusCode === 410) {
      await db.collection("users").doc(userId).update({ pushSubscription: null }).catch(() => {});
    }
    console.error("Push error:", e.message);
    res.json({ sent: false, error: e.message });
  }
}
