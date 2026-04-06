import Stripe from "stripe";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}

const db = getFirestore();

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const rawBody = await getRawBody(req);
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;

    if (userId) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await db.collection("users").doc(userId).update({
        "goldenHeart.active": true,
        "goldenHeart.expiresAt": expiresAt,
        "goldenHeart.activatedAt": new Date(),
        superLikes: 2,
        "bonuses.city": FieldValue.increment(3),
        "bonuses.ice": FieldValue.increment(3),
        "bonuses.peek": FieldValue.increment(3),
        "bonuses.anon": FieldValue.increment(3),
      });

      console.log(`Golden Heart activé pour ${userId}, expire le ${expiresAt}`);
    }
  }

  res.json({ received: true });
}
