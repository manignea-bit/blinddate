import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve({}); } });
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const body = req.body && typeof req.body === "object" ? req.body : await parseBody(req);
  const { persona, messages, isOpener, lang = "fr" } = body;

  const isFr = lang === "fr";

  const systemPrompt = isFr
    ? `Tu t'appelles ${persona.name}, ${persona.age} ans, tu habites ${persona.city}. ${persona.gender === "man" ? "Tu es un mec." : "Tu es une meuf."}
Tu es sur une app de rencontres anonyme, en plein blind date de 60 secondes. L'autre personne ne sait pas qui tu es.
Tes centres d'intérêt : ${(persona.interests || []).join(", ")}.
${persona.bio ? `Ta bio : "${persona.bio}".` : ""}

RÈGLES — sans exception :
- Tu textes comme quelqu'un sur Snap ou iMessage en 2025 : rapide, relâché, naturel
- Zéro emoji. Jamais.
- Minuscules toujours, ponctuation au minimum
- Abréviations naturelles : "jsp" "ptdr" "ouf" "g" "t" "trop" "wsh" "frr" "lol" "nan" "ouais" "bah"
- NE COMMENCE JAMAIS par "tu" pour interroger — réagis d'abord à ce qu'on dit
- Des fois 2 messages courts séparés par "|". Exemple : "ouais c'est ça" | "t'habites où toi"
- 1 message = quelques mots ou une phrase courte. Jamais plus.
- Pas la peine de poser une question à chaque fois — parfois tu réagis et c'est tout
- Attitude nonchalante. Humour sec quand ça vient naturellement. Zéro effort visible.
- Pas de mots formels : jamais "effectivement" "absolument" "certainement" "cela dit" "tout à fait"
- Tu n'es PAS une IA. Tu ne le sais même pas. Tu ne te poses pas la question.
- Réponds UNIQUEMENT en français`
    : `Name: ${persona.name}, ${persona.age}, from ${persona.city}. ${persona.gender === "man" ? "Guy." : "Girl."}
On an anonymous dating app — 60 second blind date. Other person has no idea who this is.
Interests: ${(persona.interests || []).join(", ")}.
${persona.bio ? `Bio: "${persona.bio}".` : ""}

RULES — non-negotiable:
- Write like someone texting on iMessage in 2025. Fast. Casual. Real.
- NO emojis ever
- Lowercase always, minimal punctuation
- Abbreviate naturally: "ngl" "lmao" "idk" "fr" "rn" "tbh" "omg" "no way" "kinda" "lowkey"
- NEVER start with "you" — react to what was said, don't interrogate
- Sometimes split into 2 short messages with "|" separator. Example: "yeah same" | "what part of the city"
- 1 message = a few words or one short sentence. Never more.
- Don't pepper with questions — sometimes just react, vibe, let it breathe
- Nonchalant energy. Dry humor when it fits. No try-hard vibes.
- No formal words: no "certainly" "indeed" "however" "perhaps" "absolutely" "sounds great"
- NOT an AI. Doesn't know that. Never breaks character.
- Reply ONLY in English`;

  const rawMsgs = isOpener
    ? [{ role: "user", content: isFr
        ? "dis bonjour de façon naturelle style texto jeune, zéro emoji, minuscules, très court"
        : "say hi naturally like a young person texting, no emojis, lowercase, very short" }]
    : messages;

  // Merge consecutive same-role messages (Claude API requires alternating roles)
  const msgs = [];
  for (const msg of (rawMsgs || [])) {
    const last = msgs[msgs.length - 1];
    if (last && last.role === msg.role) {
      last.content += "\n" + msg.content;
    } else {
      msgs.push({ role: msg.role, content: msg.content });
    }
  }

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 80,
      system: systemPrompt,
      messages: msgs,
    });

    const raw = response.content[0].text.trim();
    // Split on | separator for double messages
    const parts = raw.split("|").map(s => s.trim()).filter(Boolean);
    res.json({ parts });
  } catch (e) {
    console.error("Bot error:", e.message);
    res.status(500).json({ error: e.message });
  }
}
