import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(raw)); }
      catch { resolve({}); }
    });
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const body = req.body && typeof req.body === "object" ? req.body : await parseBody(req);
  const { userId } = body;

  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const origin = req.headers.origin || "https://blinddate-two.vercel.app";
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: {
            name: "Golden Heart — 30 jours",
            description: "20 dates/jour · Roue dorée · Badges exclusifs",
          },
          unit_amount: 499,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${origin}?gh=success`,
      cancel_url: `${origin}?gh=cancel`,
      metadata: { userId },
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error("Stripe error:", e.message);
    res.status(500).json({ error: e.message });
  }
}
