import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, collection, query, where, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";

// ─── Firebase Config ───
const app = initializeApp({
  apiKey: "AIzaSyB02eHA3ZtfLj6DEIk1oTOgkzXexHLn_kY",
  authDomain: "love-at-first-sight-8c6d3.firebaseapp.com",
  projectId: "love-at-first-sight-8c6d3",
});
const auth = getAuth(app);
const db = getFirestore(app);

const CLOUDINARY_CLOUD = "dgbcpuvgb";
const CLOUDINARY_PRESET = "blinddate_upload";
const CHAT_DURATION = 60;

// ─── Theme ───
const T = {
  bg: "#08080e", surface: "#111119", card: "#131320", border: "#1e1e33",
  input: "#0f0f1a", accent: "#f43f7a", accentGlow: "rgba(244,63,122,0.35)",
  accentGrad: "linear-gradient(135deg, #f43f7a 0%, #ff8a5c 100%)",
  secondary: "#7c5cff", secondaryGlow: "rgba(124,92,255,0.3)",
  success: "#10b981", danger: "#ef4444",
  text: "#eeeef5", textSec: "#9090aa", textDim: "#555570",
  overlay: "rgba(4,4,10,0.88)",
};

const INTERESTS = ["Cinéma","Musique","Sport","Voyages","Art","Tech","Cuisine","Lecture","Gaming","Photo","Nature","Mode"];

// ─── Components ───
function Btn({ children, variant = "primary", disabled, onClick, style: sx, fullWidth }) {
  const [h, setH] = useState(false);
  const vars = {
    primary: { bg: T.accentGrad, color: "#fff", border: "none", shadow: `0 4px 24px ${T.accentGlow}` },
    ghost: { bg: "transparent", color: T.textSec, border: `1px solid ${T.border}`, shadow: "none" },
  };
  const v = vars[variant] || vars.primary;
  return (
    <button disabled={disabled} onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        padding: "14px 28px", fontSize: 15, fontWeight: 700, fontFamily: "'Nunito',sans-serif",
        borderRadius: 16, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
        background: v.bg, color: v.color, border: v.border, boxShadow: v.shadow,
        width: fullWidth ? "100%" : "auto", letterSpacing: "0.3px",
        transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        transform: h && !disabled ? "translateY(-3px) scale(1.03)" : "none",
        filter: h && !disabled ? "brightness(1.1)" : "none", ...sx,
      }}>{children}</button>
  );
}

function Card({ children, style: sx }) {
  return <div style={{ background: T.card, borderRadius: 24, border: `1px solid ${T.border}`, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", ...sx }}>{children}</div>;
}

function Timer({ seconds, total }) {
  const pct = (seconds / total) * 100;
  const low = seconds <= 10;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 120, height: 6, borderRadius: 3, background: T.border, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: low ? T.danger : T.accentGrad, transition: "width 1s linear" }} />
      </div>
      <span style={{ fontFamily: "'Nunito'", fontWeight: 800, fontSize: 14, color: low ? T.danger : T.accent, fontVariantNumeric: "tabular-nums", animation: low ? "pulse 1s infinite" : "none" }}>{seconds}s</span>
    </div>
  );
}

// ─── AUTH ───
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(""); setLoading(true);
    try {
      if (mode === "signup") {
        if (!name.trim()) { setError("Entre ton prénom"); setLoading(false); return; }
        if (password.length < 6) { setError("6 caractères minimum"); setLoading(false); return; }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name.trim() });
        await setDoc(doc(db, "users", cred.user.uid), {
          name: name.trim(), email, age: null, city: "", bio: "", photoURL: "",
          interests: [], profileComplete: false, isOnline: true, lookingForChat: false,
          createdAt: serverTimestamp(),
        });
        onAuth(cred.user);
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        onAuth(cred.user);
      }
    } catch (err) {
      const msgs = {
        "auth/email-already-in-use": "Email déjà utilisé",
        "auth/user-not-found": "Aucun compte avec cet email",
        "auth/wrong-password": "Mot de passe incorrect",
        "auth/invalid-email": "Email invalide",
        "auth/invalid-credential": "Email ou mot de passe incorrect",
      };
      setError(msgs[err.code] || "Erreur : " + err.message);
    }
    setLoading(false);
  }

  const inp = { width: "100%", padding: "14px 18px", borderRadius: 14, background: T.input, border: `1.5px solid ${T.border}`, color: T.text, fontSize: 14, fontFamily: "'Nunito'", outline: "none", marginBottom: 14 };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380, animation: "fadeIn 0.5s" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔮</div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, background: T.accentGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: "0 0 6px" }}>BlindDate</h1>
          <p style={{ fontFamily: "'Nunito'", fontSize: 14, color: T.textDim }}>
            {mode === "login" ? "Connecte-toi pour commencer" : "Crée ton compte en 30 secondes"}
          </p>
        </div>
        {error && <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: T.danger, fontSize: 13, fontFamily: "'Nunito'", marginBottom: 16, textAlign: "center" }}>{error}</div>}
        <Card style={{ padding: 28, marginBottom: 20 }}>
          {mode === "signup" && <input value={name} onChange={e => setName(e.target.value)} placeholder="Prénom" style={inp} />}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={inp} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe"
            onKeyDown={e => e.key === "Enter" && handleSubmit()} style={{ ...inp, marginBottom: 0 }} />
        </Card>
        <Btn variant="primary" fullWidth onClick={handleSubmit} disabled={loading}>
          {loading ? "Chargement..." : mode === "login" ? "Se connecter" : "Créer mon compte 🚀"}
        </Btn>
        <p style={{ textAlign: "center", marginTop: 20, fontFamily: "'Nunito'", fontSize: 14, color: T.textSec }}>
          {mode === "login" ? "Pas encore de compte ? " : "Déjà un compte ? "}
          <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
            style={{ color: T.accent, fontWeight: 700, cursor: "pointer" }}>
            {mode === "login" ? "S'inscrire" : "Se connecter"}
          </span>
        </p>
      </div>
    </div>
  );
}

// ─── PROFILE SETUP ───
function ProfileSetup({ user, onComplete }) {
  const [step, setStep] = useState(0);
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  function handlePhoto(e) {
    const f = e.target.files?.[0]; if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Choisis une image"); return; }
    if (f.size > 5 * 1024 * 1024) { setError("Max 5 Mo"); return; }
    setPhotoFile(f); setError("");
    const r = new FileReader(); r.onload = ev => setPhotoPreview(ev.target.result); r.readAsDataURL(f);
  }

  function validate() {
    setError("");
    if (step === 0 && (!age || age < 18 || !city.trim())) { setError("Remplis tous les champs (18 ans min)"); return false; }
    if (step === 1 && interests.length < 2) { setError("Choisis au moins 2 intérêts"); return false; }
    if (step === 2 && !bio.trim()) { setError("Écris quelques mots"); return false; }
    if (step === 3 && !photoFile) { setError("Ajoute une photo"); return false; }
    return true;
  }

  async function finish() {
    if (!validate()) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", photoFile);
      formData.append("upload_preset", CLOUDINARY_PRESET);
      formData.append("folder", "blinddate");
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload échoué");
      const data = await res.json();
      await updateDoc(doc(db, "users", user.uid), {
        age: parseInt(age), city: city.trim(), bio: bio.trim(), interests, photoURL: data.secure_url, profileComplete: true,
      });
      onComplete({ name: user.displayName, age: parseInt(age), city: city.trim(), bio: bio.trim(), interests, photoURL: data.secure_url, profileComplete: true });
    } catch (err) { setError("Erreur : " + err.message); }
    setUploading(false);
  }

  function next() { if (validate()) { if (step === 3) finish(); else setStep(s => s + 1); } }
  const inp = { width: "100%", padding: "14px 18px", borderRadius: 14, background: T.input, border: `1.5px solid ${T.border}`, color: T.text, fontSize: 14, fontFamily: "'Nunito'", outline: "none" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420, animation: "fadeIn 0.5s" }}>
        <div style={{ textAlign: "center", marginBottom: 28, paddingTop: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔮</div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, background: T.accentGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: "0 0 4px" }}>Configure ton profil</h1>
          <p style={{ fontFamily: "'Nunito'", fontSize: 13, color: T.textDim }}>Étape {step + 1}/4</p>
        </div>
        <div style={{ width: "100%", height: 4, borderRadius: 2, background: T.border, marginBottom: 24, overflow: "hidden" }}>
          <div style={{ width: `${((step + 1) / 4) * 100}%`, height: "100%", background: T.accentGrad, transition: "width 0.4s" }} />
        </div>
        {error && <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: T.danger, fontSize: 13, fontFamily: "'Nunito'", marginBottom: 16, textAlign: "center" }}>{error}</div>}

        <Card style={{ padding: 28, marginBottom: 24 }}>
          {step === 0 && <>
            <label style={{ fontFamily: "'Nunito'", fontSize: 13, fontWeight: 600, color: T.textSec, display: "block", marginBottom: 8 }}>Âge</label>
            <input type="number" min={18} max={99} value={age} onChange={e => setAge(e.target.value)} placeholder="18" style={{ ...inp, width: 120, marginBottom: 18 }} />
            <label style={{ fontFamily: "'Nunito'", fontSize: 13, fontWeight: 600, color: T.textSec, display: "block", marginBottom: 8 }}>Ville</label>
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="Paris, Lyon..." style={inp} />
          </>}
          {step === 1 && <>
            <label style={{ fontFamily: "'Nunito'", fontSize: 13, fontWeight: 600, color: T.textSec, display: "block", marginBottom: 12 }}>Choisis 2 à 5 intérêts ({interests.length}/5)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {INTERESTS.map(tag => {
                const a = interests.includes(tag);
                return <button key={tag} onClick={() => setInterests(p => a ? p.filter(x => x !== tag) : p.length < 5 ? [...p, tag] : p)}
                  style={{ padding: "9px 18px", borderRadius: 24, fontSize: 13, fontFamily: "'Nunito'", fontWeight: 600, cursor: "pointer", border: `1.5px solid ${a ? T.accent : T.border}`, background: a ? "rgba(244,63,122,0.1)" : "transparent", color: a ? T.accent : T.textSec, transition: "all 0.2s" }}>{tag}</button>;
              })}
            </div>
          </>}
          {step === 2 && <>
            <label style={{ fontFamily: "'Nunito'", fontSize: 13, fontWeight: 600, color: T.textSec, display: "block", marginBottom: 8 }}>Ta bio (max 150)</label>
            <textarea value={bio} onChange={e => setBio(e.target.value.slice(0, 150))} placeholder="Décris-toi..." rows={4} style={{ ...inp, resize: "none", lineHeight: 1.6 }} />
            <div style={{ textAlign: "right", fontFamily: "'Nunito'", fontSize: 12, color: T.textDim, marginTop: 6 }}>{bio.length}/150</div>
          </>}
          {step === 3 && <>
            <label style={{ fontFamily: "'Nunito'", fontSize: 13, fontWeight: 600, color: T.textSec, display: "block", marginBottom: 14 }}>Ta photo de profil</label>
            <div onClick={() => fileRef.current?.click()} style={{ border: `2px dashed ${T.border}`, borderRadius: 20, padding: photoPreview ? 0 : 40, textAlign: "center", cursor: "pointer", overflow: "hidden" }}>
              {photoPreview ? <img src={photoPreview} alt="" style={{ width: "100%", maxHeight: 260, objectFit: "cover", display: "block", borderRadius: 18 }} />
                : <div><div style={{ fontSize: 48, marginBottom: 12 }}>📸</div><p style={{ fontFamily: "'Nunito'", fontSize: 14, fontWeight: 600, color: T.textSec }}>Clique pour choisir</p></div>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
          </>}
        </Card>

        <div style={{ display: "flex", gap: 12 }}>
          {step > 0 && <Btn variant="ghost" onClick={() => setStep(s => s - 1)} style={{ flex: 1 }}>← Retour</Btn>}
          <Btn variant="primary" fullWidth onClick={next} disabled={uploading} style={{ flex: 2 }}>
            {uploading ? "Upload..." : step === 3 ? "C'est parti 🚀" : "Suivant →"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── HOME ───
function HomeScreen({ profile, onStartChat, matches, onLogout }) {
  return (
    <div style={{ padding: "20px", maxWidth: 440, margin: "0 auto", animation: "fadeIn 0.5s" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, paddingTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {profile.photoURL && <img src={profile.photoURL} alt="" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: `2.5px solid ${T.accent}` }} />}
          <div>
            <div style={{ fontFamily: "'Nunito'", fontSize: 16, fontWeight: 800, color: T.text }}>Salut {profile.name} 👋</div>
            <div style={{ fontFamily: "'Nunito'", fontSize: 12, color: T.textDim }}>{profile.city} · {profile.age} ans</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 12, padding: "8px 14px", fontFamily: "'Nunito'", fontSize: 12, color: T.textSec, cursor: "pointer" }}>Déco</button>
      </div>

      <Btn variant="primary" fullWidth onClick={onStartChat} style={{ padding: "20px", fontSize: 18, marginBottom: 24 }}>⚡ Lancer une conversation</Btn>

      <Card style={{ padding: 22, marginBottom: 20 }}>
        <h3 style={{ fontFamily: "'Nunito'", fontSize: 12, fontWeight: 800, color: T.textDim, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: 1.5 }}>Comment ça marche</h3>
        {[{ icon: "🎭", title: "Chat anonyme", desc: "Pas de photo, pas de nom" },
          { icon: "⏱️", title: "60 secondes", desc: "Chrono pour briser la glace" },
          { icon: "💕", title: "Matcher", desc: "Si vous voulez tous les deux" }
        ].map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderTop: i ? `1px solid ${T.border}` : "none" }}>
            <span style={{ fontSize: 22 }}>{s.icon}</span>
            <div>
              <div style={{ fontFamily: "'Nunito'", fontSize: 14, fontWeight: 700, color: T.text }}>{s.title}</div>
              <div style={{ fontFamily: "'Nunito'", fontSize: 12, color: T.textDim }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </Card>

      {matches.length > 0 && (
        <Card style={{ padding: 22 }}>
          <h3 style={{ fontFamily: "'Nunito'", fontSize: 12, fontWeight: 800, color: T.textDim, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: 1.5 }}>Tes matchs ({matches.length})</h3>
          <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8 }}>
            {matches.map((m, i) => (
              <div key={i} style={{ textAlign: "center", flexShrink: 0 }}>
                <img src={m.photoURL || ""} alt="" style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover", border: `2.5px solid ${T.accent}` }} />
                <div style={{ fontFamily: "'Nunito'", fontSize: 12, color: T.text, marginTop: 6, fontWeight: 700 }}>{m.name}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── WAITING ───
function WaitingScreen({ onCancel }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", padding: 40, textAlign: "center", animation: "fadeIn 0.5s" }}>
      <div style={{ width: 60, height: 60, border: `3px solid ${T.border}`, borderTopColor: T.accent, borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: 24 }} />
      <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: T.text, margin: "0 0 8px" }}>Recherche en cours...</h2>
      <p style={{ fontFamily: "'Nunito'", fontSize: 14, color: T.textSec, marginBottom: 32 }}>On cherche quelqu'un pour toi !</p>
      <Btn variant="ghost" onClick={onCancel}>Annuler</Btn>
    </div>
  );
}

// ─── BLIND CHAT ───
function BlindChatScreen({ chatId, myUid, onTimeUp }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(CHAT_DURATION);
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, "blindChats", chatId, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [chatId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { clearInterval(timer); onTimeUp(); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, [onTimeUp]);

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages]);

  async function send() {
    if (!input.trim()) return;
    const text = input.trim(); setInput(""); inputRef.current?.focus();
    await addDoc(collection(db, "blindChats", chatId, "messages"), {
      senderId: myUid, text, createdAt: serverTimestamp(),
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", maxWidth: 440, margin: "0 auto" }}>
      <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.border}`, background: T.surface }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: T.accentGrad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", fontFamily: "'Nunito'" }}>?</div>
          <div>
            <div style={{ fontFamily: "'Nunito'", fontSize: 15, fontWeight: 700, color: T.text }}>Inconnu·e</div>
            <div style={{ fontFamily: "'Nunito'", fontSize: 11, color: T.success }}>● En ligne</div>
          </div>
        </div>
        <Timer seconds={timeLeft} total={CHAT_DURATION} />
      </div>
      <div style={{ padding: "8px 16px", textAlign: "center", background: "rgba(244,63,122,0.06)", borderBottom: `1px solid rgba(244,63,122,0.12)` }}>
        <span style={{ fontFamily: "'Nunito'", fontSize: 12, color: T.accent, fontWeight: 600 }}>🎭 Profils masqués — Faites connaissance !</span>
      </div>
      <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {messages.length === 0 && <div style={{ textAlign: "center", padding: "36px 20px", fontFamily: "'Nunito'", color: T.textDim }}><div style={{ fontSize: 32, marginBottom: 10 }}>👋</div>Brise la glace !</div>}
        {messages.map(msg => (
          <div key={msg.id} style={{ display: "flex", justifyContent: msg.senderId === myUid ? "flex-end" : "flex-start", marginBottom: 8, animation: "slideUp 0.3s" }}>
            <div style={{ maxWidth: "75%", padding: "10px 16px", borderRadius: 22, borderBottomRightRadius: msg.senderId === myUid ? 6 : 22, borderBottomLeftRadius: msg.senderId === myUid ? 22 : 6, background: msg.senderId === myUid ? T.accentGrad : T.surface, color: msg.senderId === myUid ? "#fff" : T.text, fontSize: 14, lineHeight: 1.5, fontFamily: "'Nunito'", boxShadow: msg.senderId === myUid ? `0 4px 16px ${T.accentGlow}` : "none" }}>{msg.text}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "10px 14px", borderTop: `1px solid ${T.border}`, background: T.surface, display: "flex", gap: 8 }}>
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Écris quelque chose..." autoFocus
          style={{ flex: 1, padding: "12px 18px", borderRadius: 16, background: T.input, border: `1.5px solid ${T.border}`, color: T.text, fontSize: 14, fontFamily: "'Nunito'", outline: "none" }} />
        <button onClick={send} style={{ width: 46, height: 46, borderRadius: 14, border: "none", background: input.trim() ? T.accentGrad : T.input, color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>↑</button>
      </div>
    </div>
  );
}

// ─── DECISION ───
function DecisionScreen({ onMatch, onPass }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", padding: 40, textAlign: "center", animation: "fadeIn 0.5s" }}>
      <div style={{ fontSize: 52, marginBottom: 20 }}>⏰</div>
      <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, color: T.text, margin: "0 0 8px" }}>Temps écoulé !</h2>
      <p style={{ fontFamily: "'Nunito'", fontSize: 15, color: T.textSec, marginBottom: 36, maxWidth: 280 }}>Tu veux découvrir qui se cache derrière ?</p>
      <div style={{ display: "flex", gap: 14 }}>
        <Btn variant="primary" onClick={onMatch} style={{ padding: "16px 36px", fontSize: 16 }}>💕 Matcher</Btn>
        <Btn variant="ghost" onClick={onPass} style={{ padding: "16px 36px", fontSize: 16 }}>Passer →</Btn>
      </div>
    </div>
  );
}

// ─── MATCH REVEAL ───
function MatchReveal({ otherProfile, onContinue }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: T.overlay, backdropFilter: "blur(24px)", display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.4s" }}>
      <div style={{ textAlign: "center", padding: 40, animation: "scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div style={{ fontSize: 64, marginBottom: 16, animation: "pulse 2s infinite" }}>💕</div>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 36, background: T.accentGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: "0 0 8px" }}>C'est un Match !</h2>
        <p style={{ fontFamily: "'Nunito'", fontSize: 16, color: T.textSec, marginBottom: 28 }}>Toi et <strong style={{ color: T.accent }}>{otherProfile.name}</strong></p>
        {otherProfile.photoURL && <img src={otherProfile.photoURL} alt="" style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", border: `3px solid ${T.accent}`, boxShadow: `0 0 50px ${T.accentGlow}`, marginBottom: 20 }} />}
        <p style={{ fontFamily: "'Nunito'", fontSize: 14, color: T.textSec, marginBottom: 28 }}>{otherProfile.city} · {otherProfile.age} ans<br />{otherProfile.bio}</p>
        <Btn variant="primary" onClick={onContinue}>Super ! 🎉</Btn>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState("loading");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [chatId, setChatId] = useState(null);
  const [otherUid, setOtherUid] = useState(null);
  const [otherProfile, setOtherProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const unsubWait = useRef(null);
  const unsubDecision = useRef(null);
  const unsubMatches = useRef(null);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
          const p = { id: u.uid, name: u.displayName || snap.data().name, ...snap.data() };
          setProfile(p);
          setScreen(p.profileComplete ? "home" : "setup");
          if (p.profileComplete) listenMatches(u.uid);
        } else {
          setScreen("setup");
        }
      } else {
        setUser(null); setProfile(null); setMatches([]);
        setScreen("auth");
      }
    });
    return unsub;
  }, []);

  async function listenMatches(uid) {
    unsubMatches.current?.();
    const q = query(collection(db, "matches"), where("users", "array-contains", uid));
    unsubMatches.current = onSnapshot(q, async (snap) => {
      const results = await Promise.all(snap.docs.map(async d => {
        const data = d.data();
        const otherId = data.users.find(id => id !== uid);
        const uSnap = await getDoc(doc(db, "users", otherId));
        return { matchId: d.id, ...data, ...(uSnap.exists() ? uSnap.data() : {}), otherId };
      }));
      setMatches(results);
    });
  }

  async function startChat() {
    setScreen("waiting");
    const myUid = user.uid;
    await setDoc(doc(db, "waitingRoom", myUid), { uid: myUid, joinedAt: serverTimestamp(), status: "waiting" });

    unsubWait.current?.();
    const q = query(collection(db, "waitingRoom"), where("status", "==", "waiting"));
    unsubWait.current = onSnapshot(q, async (snap) => {
      const waiters = snap.docs.map(d => d.data()).filter(w => w.uid !== myUid);
      if (waiters.length === 0) return;
      const partner = waiters[0];
      unsubWait.current?.();

      if (myUid < partner.uid) {
        const chatRef = await addDoc(collection(db, "blindChats"), {
          users: [myUid, partner.uid], status: "active",
          user1Decision: null, user2Decision: null, createdAt: serverTimestamp(),
        });
        await deleteDoc(doc(db, "waitingRoom", myUid)).catch(() => {});
        await deleteDoc(doc(db, "waitingRoom", partner.uid)).catch(() => {});
        setChatId(chatRef.id); setOtherUid(partner.uid); setScreen("chat");
      } else {
        // Wait for the other user to create the chat
        const chatQ = query(collection(db, "blindChats"), where("users", "array-contains", myUid), where("status", "==", "active"));
        const chatUnsub = onSnapshot(chatQ, (chatSnap) => {
          const found = chatSnap.docs.find(d => d.data().users.includes(partner.uid));
          if (found) { chatUnsub(); setChatId(found.id); setOtherUid(partner.uid); setScreen("chat"); }
        });
      }
    });
  }

  function cancelWaiting() {
    unsubWait.current?.();
    deleteDoc(doc(db, "waitingRoom", user.uid)).catch(() => {});
    setScreen("home");
  }

  const handleTimeUp = useCallback(() => setScreen("decision"), []);

  async function submitDecision(decision) {
    const chatSnap = await getDoc(doc(db, "blindChats", chatId));
    const data = chatSnap.data();
    const isUser1 = data.users[0] === user.uid;
    const myField = isUser1 ? "user1Decision" : "user2Decision";
    const otherField = isUser1 ? "user2Decision" : "user1Decision";
    await updateDoc(doc(db, "blindChats", chatId), { [myField]: decision });

    const updated = (await getDoc(doc(db, "blindChats", chatId))).data();
    if (updated[otherField]) {
      await resolve(decision, updated[otherField]);
    } else {
      setScreen("waitingDecision");
      unsubDecision.current?.();
      unsubDecision.current = onSnapshot(doc(db, "blindChats", chatId), async (snap) => {
        const d = snap.data();
        if (d?.[otherField]) { unsubDecision.current?.(); await resolve(decision, d[otherField]); }
      });
    }
  }

  async function resolve(mine, theirs) {
    if (mine === "match" && theirs === "match") {
      await addDoc(collection(db, "matches"), { users: [user.uid, otherUid], createdAt: serverTimestamp() });
      const snap = await getDoc(doc(db, "users", otherUid));
      setOtherProfile(snap.exists() ? snap.data() : { name: "?" });
      setScreen("matchReveal");
    } else {
      setScreen("noMatch");
    }
  }

  async function handleLogout() { await signOut(auth); }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, backgroundImage: "radial-gradient(ellipse at 20% 0%, #15122a 0%, #08080e 60%)", color: T.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Playfair+Display:wght@700&display=swap');
        *{box-sizing:border-box;margin:0}body{background:${T.bg}}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:${T.border};border-radius:4px}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes scaleIn{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes spin{to{transform:rotate(360deg)}}
        input::placeholder,textarea::placeholder{color:${T.textDim}}
      `}</style>

      {screen === "loading" && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}><div style={{ width: 40, height: 40, border: `3px solid ${T.border}`, borderTopColor: T.accent, borderRadius: "50%", animation: "spin .8s linear infinite" }} /></div>}
      {screen === "auth" && <AuthScreen onAuth={u => { setUser(u); }} />}
      {screen === "setup" && user && <ProfileSetup user={user} onComplete={p => { setProfile(p); listenMatches(user.uid); setScreen("home"); }} />}
      {screen === "home" && profile && <HomeScreen profile={profile} onStartChat={startChat} matches={matches} onLogout={handleLogout} />}
      {screen === "waiting" && <WaitingScreen onCancel={cancelWaiting} />}
      {screen === "chat" && chatId && <BlindChatScreen chatId={chatId} myUid={user.uid} onTimeUp={handleTimeUp} />}
      {screen === "decision" && <DecisionScreen onMatch={() => submitDecision("match")} onPass={() => submitDecision("pass")} />}
      {screen === "waitingDecision" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", padding: 40, textAlign: "center" }}>
          <div style={{ width: 50, height: 50, border: `3px solid ${T.border}`, borderTopColor: T.accent, borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: 24 }} />
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: T.text, margin: "0 0 8px" }}>En attente...</h2>
          <p style={{ fontFamily: "'Nunito'", fontSize: 14, color: T.textSec }}>L'autre personne décide</p>
        </div>
      )}
      {screen === "matchReveal" && otherProfile && <MatchReveal otherProfile={otherProfile} onContinue={() => { listenMatches(user.uid); setScreen("home"); }} />}
      {screen === "noMatch" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", padding: 40, textAlign: "center", animation: "fadeIn 0.5s" }}>
          <div style={{ fontSize: 52, marginBottom: 20 }}>😔</div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, color: T.text, margin: "0 0 8px" }}>Pas cette fois...</h2>
          <p style={{ fontFamily: "'Nunito'", fontSize: 15, color: T.textSec, marginBottom: 36 }}>La prochaine sera la bonne !</p>
          <Btn variant="primary" onClick={() => setScreen("home")}>Réessayer ⚡</Btn>
        </div>
      )}
    </div>
  );
}