import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, collection, query, where, orderBy, onSnapshot, serverTimestamp, arrayUnion, getDocs, increment } from "firebase/firestore";

const app = initializeApp({ apiKey:"AIzaSyB02eHA3ZtfLj6DEIk1oTOgkzXexHLn_kY", authDomain:"love-at-first-sight-8c6d3.firebaseapp.com", projectId:"love-at-first-sight-8c6d3" });
const auth = getAuth(app);
const db = getFirestore(app);
const gProv = new GoogleAuthProvider();
const CLD = { c:"dgbcpuvgb", p:"blinddate_upload" };
const CHAT_DUR = 60;
const WAIT_TIMEOUT = 60;
const DECISION_TIMEOUT = 30;
const XP_CHAT = 5;
const XP_MATCH = 20;
const XP_PERSONALITY = 10;
const DEF_BONUS = { city:3, ice:3, peek:3, anon:3 };
const STREAK_MILESTONES = {3:2, 7:5, 14:10, 30:20};

const INTS = {
  en: ["Cinema","Music","Sports","Travel","Art","Tech","Cooking","Reading","Gaming","Photography","Nature","Fashion","Humor","Science"],
  fr: ["Cinéma","Musique","Sport","Voyages","Art","Tech","Cuisine","Lecture","Gaming","Photo","Nature","Mode","Humour","Science"]
};
const ICEBREAKERS = {
  en: ["Would you rather travel to the past or future?","Guilty pleasure?","Superpower?","Favorite emoji?","Last time you laughed hard?","Dream date location?","Dog or cat?","Current song on repeat?"],
  fr: ["Tu préfères voyager dans le passé ou le futur ?","Guilty pleasure ?","Superpouvoir ?","Emoji préféré ?","Dernier fou rire ?","Lieu de rêve pour un date ?","Chien ou chat ?","Chanson du moment ?"]
};
const BONUS_TYPES = {
  en: [{id:"city",icon:"📍",name:"City"},{id:"ice",icon:"🎲",name:"Icebreaker"},{id:"peek",icon:"👀",name:"Interest"},{id:"anon",icon:"🕶️",name:"Age"}],
  fr: [{id:"city",icon:"📍",name:"Ville"},{id:"ice",icon:"🎲",name:"Brise-glace"},{id:"peek",icon:"👀",name:"Intérêt"},{id:"anon",icon:"🕶️",name:"Âge"}]
};
const PERSONALITY_Q = {
  en: [
    {q:"Ideal first date energy?",a:["☕ Deep convo over coffee","🎳 Fun activity & laughs"]},
    {q:"Do you catch feelings fast?",a:["💘 Way too fast","🧊 Takes a while"]},
    {q:"Your texting style?",a:["📱 Always online","😌 I reply when I feel like it"]},
    {q:"Jealousy in a relationship?",a:["🙅 Big red flag","😏 A little is kinda cute"]},
    {q:"What do you lead with?",a:["😂 Humor & vibes","🔥 Intensity & depth"]},
  ],
  fr: [
    {q:"Énergie idéale pour un premier date ?",a:["☕ Café et vraies discussions","🎳 Activité fun et rires"]},
    {q:"Tu tombes amoureux·se vite ?",a:["💘 Trop vite","🧊 Ça prend du temps"]},
    {q:"Ton style de textos ?",a:["📱 Toujours dispo","😌 Je réponds quand j'ai envie"]},
    {q:"La jalousie dans une relation ?",a:["🙅 Gros red flag","😏 Un peu c'est mignon"]},
    {q:"Tu joues sur quoi ?",a:["😂 L'humour et le fun","🔥 L'intensité et la profondeur"]},
  ]
};
const CHALLENGES = {
  en: [
    "Share one thing you've never told a stranger",
    "Describe your ideal Sunday in exactly 3 words",
    "What's the most spontaneous thing you've ever done?",
    "Your most embarrassing moment this year?",
    "If you were a movie genre, which one?",
    "What song plays when you walk into a room?",
    "Name your weirdest Google search this month",
    "Your most useless but favorite skill?",
    "Describe yourself as a Yelp review",
    "Your hottest take that no one agrees with?",
  ],
  fr: [
    "Dis quelque chose que tu n'as jamais dit à un inconnu",
    "Décris ton dimanche idéal en exactement 3 mots",
    "La chose la plus spontanée que tu aies jamais faite ?",
    "Ton moment le plus gênant cette année ?",
    "Si tu étais un genre de film, lequel ?",
    "Quelle chanson jouerait quand tu entres dans une pièce ?",
    "Ta recherche Google la plus bizarre ce mois-ci ?",
    "Ton talent le plus inutile mais préféré ?",
    "Décris-toi comme un avis Google",
    "Ton opinion impopulaire la plus chaude ?",
  ]
};
const SPECIAL_EVENTS = [
  {id:"launch",emoji:"🚀",months:[3,4,5],days:null,label:{en:"Grand Launch — Double XP!",fr:"Grand Lancement — XP ×2 !"},color:"#ff1f52",doubleXP:true},
  {id:"valentine",emoji:"💝",months:[2],days:[13,14,15],label:{en:"Valentine's Day 💕",fr:"Saint-Valentin 💕"},color:"#ff1f52"},
  {id:"halloween",emoji:"🎃",months:[10],days:[29,30,31],label:{en:"Spooky blind dates 🎃",fr:"Dates flippants 🎃"},color:"#ff5c30"},
  {id:"newyear",emoji:"🎆",months:[12,1],days:[31,1],label:{en:"New Year sparks ✨",fr:"Étincelles du Nouvel An ✨"},color:"#ff9e00"},
  {id:"summer",emoji:"☀️",months:[6,7,8],days:null,label:{en:"Summer vibes ☀️",fr:"Vibrations d'été ☀️"},color:"#ffbe0b"},
];
const DAILY_LIMIT = 7;

const TR = {
  en: {
    tagline:"Love, unseen.",or:"or",firstName:"First name",email:"Email",password:"Password",
    login:"Sign in",signupBtn:"Create account 🚀",noAccount:"No account? ",register:"Sign up",
    hasAccount:"Already have an account? ",signIn:"Sign in",
    errNamePass:"First name + 6 chars min",errEmailUsed:"Email already in use",errNoUser:"No account found",errBadCred:"Email or password incorrect",
    genderStep:"Your identity",genderLabel:"I am...",orientationLabel:"I'm attracted to...",man:"Man",woman:"Woman",nonbinary:"Non-binary",hetero:"Straight",gay:"Gay",bi:"Bisexual",lesb:"Lesbian",errGender:"Select your identity and orientation",
    profileStep:(s,total)=>`Profile (${s}/${total})`,age:"Age",city:"City",interests:(n)=>`Interests (${n}/5)`,bio:"Bio",
    clickToChoose:"Click to choose a photo",next:"Next →",finish:"Let's go 🚀",back:"←",
    errAgeCity:"Age (18+) and city required",errMinInterests:"Select at least 2",errBio:"Bio required",errPhoto:"Photo required",
    errPersonality:"Answer all 5 questions",errFace:"No face detected — use a clear photo of yourself",
    faceChecking:"Verifying photo…",
    personalityStep:"Your vibe",
    personalityHint:(txt)=>`💡 They lean: ${txt}`,
    bonusSection:"Boosts",startChat:"⚡ Start Blind Date",
    matches:"Matches",noMatches:"No matches yet",newMatch:"New match 👋",sendFirst:"💬 Say hello first!",
    reportTitle:"Report",cancel:"Cancel",inappropriate:"Inappropriate",spam:"Spam",fakeProfile:"Fake profile",harassment:"Harassment",other:"Other",
    photos:"Photos",infoSection:"Info",logout:"Sign out",save:"✓ Save",
    homeNav:"Home",matchesNav:"Matches",profileNav:"Profile",
    unknown:"Anonymous",iceBreak:"👋 Break the ice!",typeMessage:"Message...",
    searching:"Searching...",waitingPlayer:"Looking for someone...",cancelBtn:"Cancel",
    timeUp:"Time's up!",revealQ:"Want to know who's behind the mask?",matchBtn:"💕 Match",passBtn:"Pass →",
    waitingDec:"Waiting...",otherDecides:(n)=>`Waiting for their decision (${n}s)`,backBtn:"← Back",
    matchTitle:"It's a Match!",noMatchTitle:"Not this time",noMatchSub:"Keep going — next one might be it!",retry:"Try again ⚡",great:"Awesome 🎉",
    settings:"Settings",language:"Language",theme:"Theme",dark:"Dark",light:"Light",
    lv1:"Beginner",lv2:"Curious",lv3:"Social",lv4:"Charmer",lv5:"Legend",
    streakDays:(n)=>`${n}-day streak 🔥`,streakReward:(n)=>`+${n} bonus credits unlocked!`,
    streakNext:(n)=>`Next reward at day ${n}`,
    compatScore:(n)=>`${n}% compatible`,
    challengeTitle:"Challenge 🎯",challengeAccept:"Accept ✓",challengeSkip:"Skip →",
    referralTitle:"Invite a friend",referralDesc:"Share your code — you both get +3 bonus credits!",
    referralCopy:"Copy invite link",referralCopied:"Copied! 🎉",
    referralApplied:"Referral bonus applied 🎉",
    locDetect:"📍 Use my location",locDetecting:"Detecting…",locErr:"Couldn't detect city — type it manually",
    doubleXPNote:"✨ Double XP active on profile completion!",
    launchTitle:"We just launched 🚀",launchSub:"Complete your profile during launch to earn double XP",
    dailyLimitReached:`All ${DAILY_LIMIT} blind dates used for today. Come back tomorrow 🌙`,
    datesLeft:(n,total)=>`${n} / ${total} dates today`,
    superLikeBtn:"⚡ Super Like",superLikeUsed:"Used today",
    speedDatingLive:"🔥 Speed Dating — LIVE NOW",speedDatingBonus:"+2 bonus credits per chat until 10 PM!",
    matchExpires:(h)=>`Expires in ${h}h ⏳`,matchExpired:"No reply — expired 👻",
  },
  fr: {
    tagline:"L'amour à l'aveugle.",or:"ou",firstName:"Prénom",email:"Email",password:"Mot de passe",
    login:"Se connecter",signupBtn:"Créer mon compte 🚀",noAccount:"Pas de compte ? ",register:"S'inscrire",
    hasAccount:"Déjà un compte ? ",signIn:"Se connecter",
    errNamePass:"Prénom + 6 car. min",errEmailUsed:"Email déjà utilisé",errNoUser:"Aucun compte",errBadCred:"Email ou mdp incorrect",
    genderStep:"Ton identité",genderLabel:"Je suis...",orientationLabel:"Je suis attiré·e par...",man:"Homme",woman:"Femme",nonbinary:"Non-binaire",hetero:"Hétéro",gay:"Gay",bi:"Bi",lesb:"Lesbienne",errGender:"Sélectionne ton genre et ton orientation",
    profileStep:(s,total)=>`Profil (${s}/${total})`,age:"Âge",city:"Ville",interests:(n)=>`Intérêts (${n}/5)`,bio:"Bio",
    clickToChoose:"Clique pour choisir",next:"Suivant →",finish:"Go 🚀",back:"←",
    errAgeCity:"Âge (18+) et ville requis",errMinInterests:"Minimum 2",errBio:"Bio requise",errPhoto:"Photo requise",
    errPersonality:"Réponds aux 5 questions",errFace:"Aucun visage détecté — utilise une vraie photo de toi",
    faceChecking:"Vérification de la photo…",
    personalityStep:"Ta personnalité",
    personalityHint:(txt)=>`💡 Tendance : ${txt}`,
    bonusSection:"Bonus",startChat:"⚡ Conversation (60s)",
    matches:"Matchs",noMatches:"Pas encore de matchs",newMatch:"Nouveau match 👋",sendFirst:"💬 Envoie le premier message !",
    reportTitle:"Signaler",cancel:"Annuler",inappropriate:"Inapproprié",spam:"Spam",fakeProfile:"Faux profil",harassment:"Harcèlement",other:"Autre",
    photos:"Photos",infoSection:"Infos",logout:"Déconnexion",save:"✓ Sauver",
    homeNav:"Accueil",matchesNav:"Matchs",profileNav:"Profil",
    unknown:"Inconnu·e",iceBreak:"👋 Brise la glace !",typeMessage:"Écris...",
    searching:"Recherche...",waitingPlayer:"En attente d'un autre joueur",cancelBtn:"Annuler",
    timeUp:"Temps écoulé !",revealQ:"Découvrir qui se cache derrière ?",matchBtn:"💕 Matcher",passBtn:"Passer →",
    waitingDec:"En attente...",otherDecides:(n)=>`L'autre décide (max ${n}s)`,backBtn:"← Retour",
    matchTitle:"Match !",noMatchTitle:"Pas cette fois",noMatchSub:"La prochaine sera la bonne !",retry:"Réessayer ⚡",great:"Super 🎉",
    settings:"Paramètres",language:"Langue",theme:"Thème",dark:"Sombre",light:"Clair",
    lv1:"Débutant",lv2:"Curieux",lv3:"Sociable",lv4:"Charmeur",lv5:"Légende",
    streakDays:(n)=>`${n} jours de suite 🔥`,streakReward:(n)=>`+${n} crédits bonus débloqués !`,
    streakNext:(n)=>`Prochain reward au jour ${n}`,
    compatScore:(n)=>`${n}% compatible`,
    challengeTitle:"Défi 🎯",challengeAccept:"Accepter ✓",challengeSkip:"Passer →",
    referralTitle:"Inviter un ami",referralDesc:"Partage ton code — vous gagnez tous les deux +3 crédits !",
    referralCopy:"Copier le lien d'invitation",referralCopied:"Copié ! 🎉",
    referralApplied:"Bonus de parrainage appliqué 🎉",
    locDetect:"📍 Ma position",locDetecting:"Détection…",locErr:"Impossible de détecter — écris ta ville",
    doubleXPNote:"✨ Double XP actif sur la complétion du profil !",
    launchTitle:"On vient de lancer 🚀",launchSub:"Complète ton profil pendant le lancement pour gagner double XP",
    dailyLimitReached:`Tes ${DAILY_LIMIT} blind dates du jour sont épuisées. À demain 🌙`,
    datesLeft:(n,total)=>`${n} / ${total} dates aujourd'hui`,
    superLikeBtn:"⚡ Super Like",superLikeUsed:"Utilisé aujourd'hui",
    speedDatingLive:"🔥 Speed Dating — EN DIRECT",speedDatingBonus:"+2 crédits bonus par chat jusqu'à 22h !",
    matchExpires:(h)=>`Expire dans ${h}h ⏳`,matchExpired:"Sans réponse — expiré 👻",
  }
};

const dark = {name:"dark",bg:"#07060c",surface:"#0e0d18",surfAlt:"#141326",card:"#0e0d18",border:"#1e1c33",borderL:"#2a2847",input:"#090817",accent:"#e8194b",accentGlow:"rgba(232,25,75,0.3)",accentSoft:"rgba(232,25,75,0.08)",accentGrad:"linear-gradient(135deg,#e8194b,#9d12d4)",sec:"#f59e0b",gold:"#f59e0b",goldSoft:"rgba(245,158,11,0.1)",danger:"#ff3838",text:"#ede9f8",textS:"#7a739e",textD:"#3d3665",overlay:"rgba(7,6,12,0.97)",bgGrad:"radial-gradient(ellipse at 80% 120%,#1d0a2e 0%,#07060c 55%)",gBg:"rgba(255,255,255,0.04)",gC:"#fff",gB:"1px solid rgba(255,255,255,0.1)"};
const light = {name:"light",bg:"#fdfbf7",surface:"#ffffff",surfAlt:"#f4f1f9",card:"#ffffff",border:"#e2ddef",borderL:"#d0cadf",input:"#f4f1f9",accent:"#c8155a",accentGlow:"rgba(200,21,90,0.18)",accentSoft:"rgba(200,21,90,0.06)",accentGrad:"linear-gradient(135deg,#c8155a,#7c1db0)",sec:"#d97706",gold:"#d97706",goldSoft:"rgba(217,119,6,0.08)",danger:"#dc2626",text:"#14102a",textS:"#5a547a",textD:"#9898b0",overlay:"rgba(253,251,247,0.97)",bgGrad:"radial-gradient(ellipse at 80% 115%,#f0e6ff 0%,#fdfbf7 60%)",gBg:"#fff",gC:"#222",gB:"1px solid #ddd"};

const TC = createContext(dark);
function useT() { return useContext(TC); }
const LC = createContext({ lang:"en", t:TR.en });
function useL() { return useContext(LC); }

// ── UTILS ──

function getAttractedTo(gender, orientation) {
  if (!orientation||!gender) return [null,'homme','femme','nonbinaire'];
  if (orientation==='bi') return [null,'homme','femme','nonbinaire'];
  if (orientation==='hetero') {
    if (gender==='homme') return ['femme'];
    if (gender==='femme') return ['homme'];
    return [null,'homme','femme'];
  }
  if (orientation==='gay') return gender==='homme'?['homme']:['femme'];
  if (orientation==='lesb') return ['femme'];
  return [null,'homme','femme','nonbinaire'];
}
function matchCompat(myG, myO, theirG, theirO) {
  if (!myG||!myO||!theirG||!theirO) return true; // legacy/anonymous → match everyone
  return getAttractedTo(myG,myO).includes(theirG) && getAttractedTo(theirG,theirO).includes(myG);
}

async function upImg(f) {
  const fd = new FormData();
  fd.append("file",f); fd.append("upload_preset",CLD.p); fd.append("folder","blinddate");
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLD.c}/image/upload`,{method:"POST",body:fd});
  if (!r.ok) throw new Error("Upload failed");
  const json = await r.json();
  return json.secure_url;
}

function calcCompatibility(a=[], b=[]) {
  if (!a.length||!b.length) return 0;
  const shared = a.filter(i=>b.includes(i)).length;
  const union = new Set([...a,...b]).size;
  return Math.round((shared/union)*100);
}

function getActiveEvent() {
  const m=new Date().getMonth()+1, d=new Date().getDate();
  for (const ev of SPECIAL_EVENTS) {
    if (!ev.months.includes(m)) continue;
    if (ev.days===null||ev.days.includes(d)) return ev;
  }
  return null;
}

async function updateStreak(uid, profile) {
  const today = new Date().toDateString();
  if (profile.lastLoginDate===today) return {streak:profile.streak||1,bonusAwarded:0};
  const yesterday = new Date(Date.now()-86400000).toDateString();
  const newStreak = profile.lastLoginDate===yesterday ? (profile.streak||0)+1 : 1;
  const bonusAwarded = STREAK_MILESTONES[newStreak]||0;
  const updates = {streak:newStreak,lastLoginDate:today};
  if (bonusAwarded>0) {
    updates["bonuses.city"]=increment(bonusAwarded);
    updates["bonuses.ice"]=increment(bonusAwarded);
    updates["bonuses.peek"]=increment(bonusAwarded);
    updates["bonuses.anon"]=increment(bonusAwarded);
  }
  // +1 super like every 7 consecutive days
  if (newStreak>0 && newStreak%7===0) updates.superLikes=increment(1);
  await updateDoc(doc(db,"users",uid),updates);
  return {streak:newStreak,bonusAwarded};
}

async function applyReferral(newUid, code) {
  if (!code) return false;
  try {
    const snap = await getDocs(query(collection(db,"users"),where("referralCode","==",code.toUpperCase())));
    if (snap.empty||snap.docs[0].id===newUid) return false;
    const add = {"bonuses.city":increment(3),"bonuses.ice":increment(3),"bonuses.peek":increment(3),"bonuses.anon":increment(3)};
    await Promise.all([updateDoc(doc(db,"users",newUid),add),updateDoc(doc(db,"users",snap.docs[0].id),add)]);
    return true;
  } catch { return false; }
}

function getTodayStr() { return new Date().toDateString(); }
function getDailyCount(p) { if(!p?.dailyChats||p.dailyChats.date!==getTodayStr())return 0;return p.dailyChats.count||0; }
function canSuperLike(p) { return (p?.superLikes||0)>0; }
function isSpeedDatingNow() { const n=new Date();return n.getDay()===5&&n.getHours()>=20&&n.getHours()<22; }

// ── COMPONENTS ──

function Btn({children,variant="primary",disabled,onClick,style:sx,full}) {
  const [h,sH] = useState(false);
  const T = useT();
  const vs = {
    primary:{bg:T.accentGrad,c:"#fff",b:"none",s:`0 4px 20px ${T.accentGlow}`},
    ghost:{bg:"transparent",c:T.textS,b:`1px solid ${T.border}`,s:"none"},
    google:{bg:T.gBg,c:T.gC,b:T.gB,s:"none"},
    danger:{bg:`${T.danger}12`,c:T.danger,b:`1px solid ${T.danger}30`,s:"none"}
  };
  const v=vs[variant]||vs.primary;
  return <button disabled={disabled} onClick={onClick} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)}
    style={{padding:"13px 26px",fontSize:14,fontWeight:700,fontFamily:"'DM Sans',sans-serif",borderRadius:14,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,background:v.bg,color:v.c,border:v.b,boxShadow:v.s,width:full?"100%":"auto",transition:"all .2s ease",transform:h&&!disabled?"translateY(-1px)":"none",...sx}}>{children}</button>;
}

function Card({children,style:sx}) {
  const T = useT();
  return <div style={{background:T.card,borderRadius:20,border:`1px solid ${T.border}`,boxShadow:T.name==="dark"?"0 2px 24px rgba(0,0,0,.3)":"0 2px 16px rgba(0,0,0,.06)",...sx}}>{children}</div>;
}

function Label({children,style:sx}) {
  const T = useT();
  return <div style={{fontFamily:"'DM Sans'",fontSize:11,fontWeight:800,color:T.textD,textTransform:"uppercase",letterSpacing:1.3,marginBottom:10,...sx}}>{children}</div>;
}

function XPBar({xp}) {
  const T = useT();
  const {t} = useL();
  const levels=[{lv:1,n:t.lv1,nx:50},{lv:2,n:t.lv2,nx:150},{lv:3,n:t.lv3,nx:300},{lv:4,n:t.lv4,nx:500},{lv:5,n:t.lv5,nx:9999}];
  const l=levels.find(x=>(xp||0)<x.nx)||levels[4];
  const pct=Math.min(((xp||0)/l.nx)*100,100);
  return <div style={{display:"flex",alignItems:"center",gap:12}}>
    <div style={{width:32,height:32,borderRadius:10,background:T.accentGrad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:"#fff",fontFamily:"'DM Sans'",flexShrink:0}}>{l.lv}</div>
    <div style={{flex:1}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
        <span style={{fontFamily:"'DM Sans'",fontSize:12,fontWeight:700,color:T.text}}>{l.n}</span>
        <span style={{fontFamily:"'DM Sans'",fontSize:11,color:T.textD}}>{xp||0} / {l.nx} XP</span>
      </div>
      <div style={{height:5,borderRadius:3,background:T.border,overflow:"hidden"}}>
        <div style={{width:`${pct}%`,height:"100%",background:T.accentGrad,borderRadius:3,transition:"width .6s ease"}}/>
      </div>
    </div>
  </div>;
}

function NavBar({tab,setTab,n}) {
  const T = useT();
  const {t} = useL();
  const HomeIcon=()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
  const ChatIcon=()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
  const UserIcon=()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
  const items=[{id:"home",label:t.homeNav,Icon:HomeIcon},{id:"matches",label:t.matchesNav,Icon:ChatIcon},{id:"profile",label:t.profileNav,Icon:UserIcon}];
  const pillBg = T.name==="dark" ? "rgba(12,9,16,0.88)" : "rgba(255,255,255,0.9)";
  const pillBorder = T.name==="dark" ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.08)";
  return <div style={{position:"fixed",bottom:18,left:"50%",transform:"translateX(-50%)",zIndex:50,background:pillBg,backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",borderRadius:32,border:pillBorder,display:"flex",padding:6,boxShadow:T.name==="dark"?"0 8px 40px rgba(0,0,0,0.55),inset 0 1px 0 rgba(255,255,255,0.04)":"0 8px 40px rgba(0,0,0,0.14)"}}>
    {items.map(({id,label,Icon})=>{
      const active=tab===id;
      return <button key={id} onClick={()=>setTab(id)} style={{background:active?T.accentGrad:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:active?"8px 22px":"8px 16px",borderRadius:26,position:"relative",color:active?"#fff":T.textS,transition:"all .25s cubic-bezier(.34,1.56,.64,1)",boxShadow:active?`0 4px 18px ${T.accentGlow}`:"none"}}>
        {id==="matches"&&n>0&&<span style={{position:"absolute",top:6,right:active?14:10,width:7,height:7,borderRadius:"50%",background:active?"rgba(255,255,255,0.9)":T.accent,border:`2px solid ${active?T.accent:T.surface}`}}/>}
        <Icon/>
        <span style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:800,letterSpacing:.3}}>{label}</span>
      </button>;
    })}
  </div>;
}

function PhotoSlot({url,onUp,onRm,idx}) {
  const T=useT();
  const ref=useRef(null);
  const [h,sH]=useState(false);
  return <div onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)} onClick={()=>!url&&ref.current?.click()}
    style={{aspectRatio:"3/4",borderRadius:16,overflow:"hidden",position:"relative",cursor:url?"default":"pointer",border:url?`2px solid ${T.border}`:`2px dashed ${T.borderL}`,background:T.surfAlt,transition:"transform .2s",transform:h&&!url?"scale(1.02)":"none"}}>
    {url?<>
      <img src={url} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
      {h&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
        <button onClick={e=>{e.stopPropagation();ref.current?.click()}} style={{padding:"5px 10px",borderRadius:8,background:T.accentGrad,border:"none",color:"#fff",fontSize:11,fontFamily:"'DM Sans'",fontWeight:700,cursor:"pointer"}}>📷</button>
        <button onClick={e=>{e.stopPropagation();onRm(idx)}} style={{padding:"5px 10px",borderRadius:8,background:"rgba(255,71,87,.4)",border:"none",color:"#fff",fontSize:11,fontFamily:"'DM Sans'",fontWeight:700,cursor:"pointer"}}>✕</button>
      </div>}
    </>:<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%"}}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.textD} strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </div>}
    <input ref={ref} type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f)onUp(idx,f)}} style={{display:"none"}}/>
  </div>;
}

function ReportModal({title,reasons,cancel,onReport,onClose}) {
  const T=useT();
  return <div style={{position:"fixed",inset:0,zIndex:1000,background:T.overlay,backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <Card style={{padding:24,maxWidth:360,width:"100%",animation:"scaleIn .2s ease"}}>
      <h3 style={{fontFamily:"'DM Sans'",fontSize:16,fontWeight:800,color:T.text,marginBottom:16}}>🚩 {title}</h3>
      {reasons.map(r=><button key={r} onClick={()=>onReport(r)} style={{display:"block",width:"100%",padding:"11px 14px",marginBottom:8,borderRadius:12,border:`1px solid ${T.border}`,background:"transparent",color:T.textS,fontFamily:"'DM Sans'",fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left"}}>{r}</button>)}
      <button onClick={onClose} style={{marginTop:4,width:"100%",padding:"11px 14px",borderRadius:12,border:`1px solid ${T.border}`,background:"transparent",color:T.textD,fontFamily:"'DM Sans'",fontSize:13,cursor:"pointer"}}>{cancel}</button>
    </Card>
  </div>;
}

// ── AUTH ──

function AuthScreen() {
  const T=useT();
  const {t}=useL();
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [name,setName]=useState("");
  const [err,setErr]=useState("");
  const [ld,setLd]=useState(false);

  async function handleSubmit() {
    setErr(""); setLd(true);
    try {
      if (mode==="signup") {
        if (!name.trim()||pass.length<6){setErr(t.errNamePass);setLd(false);return;}
        const c=await createUserWithEmailAndPassword(auth,email,pass);
        await updateProfile(c.user,{displayName:name.trim()});
        const code=c.user.uid.slice(0,8).toUpperCase();
        await setDoc(doc(db,"users",c.user.uid),{name:name.trim(),email,age:null,city:"",bio:"",photos:[],interests:[],personality:{},profileComplete:false,bonuses:DEF_BONUS,xp:0,blocked:[],referralCode:code,superLikes:1,gender:null,orientation:null,createdAt:serverTimestamp()});
        const urlRef=new URLSearchParams(window.location.search).get("ref");
        if (urlRef) {
          const ok=await applyReferral(c.user.uid,urlRef);
          if (ok) window.history.replaceState({},"",window.location.pathname);
        }
      } else {
        await signInWithEmailAndPassword(auth,email,pass);
      }
    } catch(e){
      setErr({"auth/email-already-in-use":t.errEmailUsed,"auth/user-not-found":t.errNoUser,"auth/invalid-credential":t.errBadCred}[e.code]||e.message);
    }
    setLd(false);
  }

  async function handleGoogle() {
    setErr(""); setLd(true);
    try {
      const r=await signInWithPopup(auth,gProv);
      const s=await getDoc(doc(db,"users",r.user.uid));
      if (!s.exists()){
        const code=r.user.uid.slice(0,8).toUpperCase();
        await setDoc(doc(db,"users",r.user.uid),{name:r.user.displayName||"",email:r.user.email,age:null,city:"",bio:"",photos:r.user.photoURL?[r.user.photoURL]:[],interests:[],personality:{},profileComplete:false,bonuses:DEF_BONUS,xp:0,blocked:[],referralCode:code,superLikes:1,gender:null,orientation:null,createdAt:serverTimestamp()});
        const urlRef=new URLSearchParams(window.location.search).get("ref");
        if (urlRef){const ok=await applyReferral(r.user.uid,urlRef);if(ok)window.history.replaceState({},"",window.location.pathname);}
      }
    } catch(e){setErr(e.message);}
    setLd(false);
  }

  const inp={width:"100%",padding:"14px 18px",borderRadius:14,background:T.input,border:`1.5px solid ${T.border}`,color:T.text,fontSize:14,fontFamily:"'DM Sans'",outline:"none",marginBottom:12};
  return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
    <div style={{width:"100%",maxWidth:380,animation:"fadeIn .5s"}}>
      <div style={{textAlign:"center",marginBottom:44}}>
        <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:64,height:64,borderRadius:22,background:T.accentGrad,marginBottom:18,boxShadow:`0 10px 40px ${T.accentGlow}`}}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        </div>
        <h1 style={{fontFamily:"'Fraunces',serif",fontSize:36,background:T.accentGrad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:"0 0 8px",letterSpacing:"-0.5px"}}><em>Blind</em>Date</h1>
        <p style={{fontFamily:"'DM Sans'",fontSize:13,color:T.textD,letterSpacing:0.3}}>{t.tagline}</p>
      </div>
      {err&&<div style={{padding:"12px 16px",borderRadius:12,background:`${T.danger}10`,border:`1px solid ${T.danger}25`,color:T.danger,fontSize:13,fontFamily:"'DM Sans'",marginBottom:16,textAlign:"center"}}>{err}</div>}
      <Btn variant="google" full onClick={handleGoogle} disabled={ld} style={{marginBottom:14,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
        <svg width="17" height="17" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        Google
      </Btn>
      <div style={{display:"flex",alignItems:"center",gap:12,margin:"16px 0"}}>
        <div style={{flex:1,height:1,background:T.border}}/><span style={{fontFamily:"'DM Sans'",fontSize:12,color:T.textD}}>{t.or}</span><div style={{flex:1,height:1,background:T.border}}/>
      </div>
      <Card style={{padding:20,marginBottom:16}}>
        {mode==="signup"&&<input value={name} onChange={e=>setName(e.target.value)} placeholder={t.firstName} style={inp}/>}
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder={t.email} style={inp}/>
        <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder={t.password} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} style={{...inp,marginBottom:0}}/>
      </Card>
      <Btn full onClick={handleSubmit} disabled={ld}>{ld?"…":mode==="login"?t.login:t.signupBtn}</Btn>
      <p style={{textAlign:"center",marginTop:20,fontFamily:"'DM Sans'",fontSize:13,color:T.textS}}>
        {mode==="login"?t.noAccount:t.hasAccount}
        <span onClick={()=>{setMode(mode==="login"?"signup":"login");setErr("");}} style={{color:T.accent,fontWeight:700,cursor:"pointer"}}>{mode==="login"?t.register:t.signIn}</span>
      </p>
    </div>
  </div>;
}

// ── SETUP ──

function Setup({user,onDone}) {
  const T=useT();
  const {lang,t}=useL();
  const [step,setStep]=useState(0);
  const [gender,setGender]=useState("");
  const [orientation,setOrientation]=useState("");
  const [age,setAge]=useState("");
  const [city,setCity]=useState("");
  const [bio,setBio]=useState("");
  const [interests,setInterests]=useState([]);
  const [personality,setPersonality]=useState({});
  const [photoFile,setPhotoFile]=useState(null);
  const [preview,setPreview]=useState(null);
  const [uploading,setUploading]=useState(false);
  const [faceChecking,setFaceChecking]=useState(false);
  const [locating,setLocating]=useState(false);
  const [err,setErr]=useState("");
  const fileRef=useRef(null);
  const ints=INTS[lang];
  const pqs=PERSONALITY_Q[lang];
  const TOTAL=6;

  async function detectCity() {
    setLocating(true); setErr("");
    try {
      const pos = await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{timeout:8000}));
      const {latitude,longitude} = pos.coords;
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
      const d = await r.json();
      const name = d.address?.city||d.address?.town||d.address?.village||d.address?.county||"";
      if (name) setCity(name); else setErr(t.locErr);
    } catch { setErr(t.locErr); }
    setLocating(false);
  }

  function validate() {
    setErr("");
    if (step===0&&(!gender||!orientation)){setErr(t.errGender);return false;}
    if (step===1&&(!age||age<18)){setErr(t.errAgeCity);return false;}
    if (step===2&&interests.length<2){setErr(t.errMinInterests);return false;}
    if (step===3&&!bio.trim()){setErr(t.errBio);return false;}
    if (step===4&&Object.keys(personality).length<5){setErr(t.errPersonality);return false;}
    if (step===5&&!photoFile){setErr(t.errPhoto);return false;}
    return true;
  }

  async function finish() {
    if (!validate()) return;
    setUploading(true);
    try {
      const url = await upImg(photoFile);
      const activeEv=getActiveEvent();
      const xpGain=activeEv?.doubleXP ? XP_PERSONALITY*2 : XP_PERSONALITY;
      const data={age:parseInt(age),city:city.trim(),bio:bio.trim(),interests,personality,photos:[url],profileComplete:true,bonuses:DEF_BONUS,xp:xpGain,gender,orientation};
      await updateDoc(doc(db,"users",user.uid),data);
      onDone({name:user.displayName,...data});
    } catch(e){setFaceChecking(false);setErr(e.message);setUploading(false);}
  }

  function next(){if(validate()){step===5?finish():setStep(s=>s+1);}}
  const inp={width:"100%",padding:"13px 16px",borderRadius:13,background:T.input,border:`1.5px solid ${T.border}`,color:T.text,fontSize:14,fontFamily:"'DM Sans'",outline:"none"};

  return <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",padding:"24px 20px 48px"}}>
    <div style={{width:"100%",maxWidth:420}}>
      <div style={{textAlign:"center",marginBottom:24,paddingTop:16}}>
        <h1 style={{fontFamily:"'Fraunces',serif",fontSize:22,background:T.accentGrad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:"0 0 18px"}}>{t.profileStep(step+1,TOTAL)}</h1>
        <div style={{display:"flex",gap:6,justifyContent:"center"}}>
          {Array.from({length:TOTAL},(_,i)=><div key={i} style={{height:6,borderRadius:3,background:i<=step?T.accentGrad:T.border,transition:"all .4s ease",width:i===step?28:i<step?16:8}}/>)}
        </div>
      </div>
      {err&&<div style={{padding:10,borderRadius:12,background:`${T.danger}10`,color:T.danger,fontSize:13,fontFamily:"'DM Sans'",marginBottom:14,textAlign:"center"}}>{err}</div>}
      <Card style={{padding:22,marginBottom:18}}>
        {step===0&&<>
          <Label>{t.genderLabel}</Label>
          <div style={{display:"flex",gap:8,marginBottom:20}}>
            {[["homme",t.man],["femme",t.woman],["nonbinaire",t.nonbinary]].map(([g,lab])=>{const a=gender===g;return<button key={g} onClick={()=>setGender(g)} style={{flex:1,padding:"12px 6px",borderRadius:14,fontSize:13,fontFamily:"'DM Sans'",fontWeight:700,cursor:"pointer",border:`1.5px solid ${a?T.accent:T.border}`,background:a?T.accentSoft:"transparent",color:a?T.accent:T.textS,transition:"all .15s"}}>{lab}</button>;})}
          </div>
          <Label>{t.orientationLabel}</Label>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[["hetero",t.hetero],["gay",t.gay],["bi",t.bi],["lesb",t.lesb]].map(([o,lab])=>{const a=orientation===o;return<button key={o} onClick={()=>setOrientation(o)} style={{padding:"12px 8px",borderRadius:14,fontSize:13,fontFamily:"'DM Sans'",fontWeight:700,cursor:"pointer",border:`1.5px solid ${a?T.accent:T.border}`,background:a?T.accentSoft:"transparent",color:a?T.accent:T.textS,transition:"all .15s"}}>{lab}</button>;})}
          </div>
        </>}
        {step===1&&<>
          <Label>{t.age}</Label>
          <input type="number" min={18} value={age} onChange={e=>setAge(e.target.value)} style={{...inp,width:100,marginBottom:18}}/>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <Label style={{marginBottom:0}}>{t.city}</Label>
            <button onClick={detectCity} disabled={locating} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:8,padding:"4px 10px",fontFamily:"'DM Sans'",fontSize:11,fontWeight:700,color:T.textS,cursor:"pointer",opacity:locating?0.6:1}}>{locating?t.locDetecting:t.locDetect}</button>
          </div>
          <input value={city} onChange={e=>setCity(e.target.value)} placeholder="Paris..." style={inp}/>
        </>}
        {step===2&&<>
          <Label>{t.interests(interests.length)}</Label>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {ints.map(tag=>{const a=interests.includes(tag);return<button key={tag} onClick={()=>setInterests(p=>a?p.filter(x=>x!==tag):p.length<5?[...p,tag]:p)} style={{padding:"7px 16px",borderRadius:20,fontSize:13,fontFamily:"'DM Sans'",fontWeight:600,cursor:"pointer",border:`1.5px solid ${a?T.accent:T.border}`,background:a?T.accentSoft:"transparent",color:a?T.accent:T.textS,transition:"all .15s"}}>{tag}</button>;})}
          </div>
        </>}
        {step===3&&<>
          <Label>{t.bio}</Label>
          <textarea value={bio} onChange={e=>setBio(e.target.value.slice(0,150))} rows={4} style={{...inp,resize:"none",lineHeight:1.7,width:"100%"}}/>
          <div style={{textAlign:"right",marginTop:5,fontFamily:"'DM Sans'",fontSize:11,color:T.textD}}>{bio.length}/150</div>
        </>}
        {step===4&&<>
          <Label>{t.personalityStep}</Label>
          {pqs.map((item,qi)=><div key={qi} style={{marginBottom:16}}>
            <p style={{fontFamily:"'DM Sans'",fontSize:13,color:T.textS,marginBottom:8,lineHeight:1.5}}>{qi+1}. {item.q}</p>
            <div style={{display:"flex",gap:8}}>
              {item.a.map((label,ai)=>{const sel=personality[qi]===ai;return<button key={ai} onClick={()=>setPersonality(p=>({...p,[qi]:ai}))}
                style={{flex:1,padding:"10px 8px",borderRadius:12,fontSize:12,fontFamily:"'DM Sans'",fontWeight:700,cursor:"pointer",border:`1.5px solid ${sel?T.accent:T.border}`,background:sel?T.accentSoft:"transparent",color:sel?T.accent:T.textS,transition:"all .15s"}}>{label}</button>;})}
            </div>
          </div>)}
        </>}
        {step===5&&<>
          <div onClick={()=>fileRef.current?.click()} style={{border:`2px dashed ${T.borderL}`,borderRadius:16,padding:preview?0:40,textAlign:"center",cursor:"pointer",overflow:"hidden"}}>
            {preview?<img src={preview} style={{width:"100%",maxHeight:260,objectFit:"cover",display:"block",borderRadius:14}}/>
            :<div>
              <div style={{width:56,height:56,borderRadius:16,background:T.surfAlt,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.textD} strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </div>
              <p style={{fontFamily:"'DM Sans'",fontSize:13,color:T.textS}}>{t.clickToChoose}</p>
            </div>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(!f)return;setPhotoFile(f);const r=new FileReader();r.onload=ev=>setPreview(ev.target.result);r.readAsDataURL(f);}} style={{display:"none"}}/>
          {uploading&&<p style={{fontFamily:"'DM Sans'",fontSize:12,color:T.textD,textAlign:"center",marginTop:10}}>{t.faceChecking}</p>}
        </>}
      </Card>
      <div style={{display:"flex",gap:10}}>
        {step>0&&<Btn variant="ghost" onClick={()=>setStep(s=>s-1)} style={{flex:1}}>{t.back}</Btn>}
        <Btn full onClick={next} disabled={uploading} style={{flex:2}}>{uploading?"…":step===4?t.finish:t.next}</Btn>
      </div>
    </div>
  </div>;
}

// ── HOME ──

function HomeTab({profile,onStart,bonuses,streak,referralCode,onCopyReferral,referralCopied}) {
  const T=useT();
  const {lang,t}=useL();
  const bonusTypes=BONUS_TYPES[lang];
  const event=getActiveEvent();
  const nextMilestone=Object.keys(STREAK_MILESTONES).map(Number).find(m=>m>streak);
  const dailyCount=getDailyCount(profile);
  const datesLeft=DAILY_LIMIT-dailyCount;
  const speedDating=isSpeedDatingNow();

  return <div style={{padding:20,maxWidth:440,margin:"0 auto",paddingBottom:100}}>
    <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:18}}>
      {profile.photos?.[0]
        ?<img src={profile.photos[0]} style={{width:52,height:52,borderRadius:14,objectFit:"cover",border:`2.5px solid ${T.accent}`}}/>
        :<div style={{width:52,height:52,borderRadius:14,background:T.accentGrad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:"#fff",fontWeight:900}}>{profile.name?.[0]}</div>}
      <div style={{flex:1}}>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:700,color:T.text}}>{profile.name}</div>
        {profile.city&&<div style={{fontFamily:"'DM Sans'",fontSize:12,color:T.textD,marginTop:1}}>📍 {profile.city}</div>}
      </div>
    </div>

    {event&&(event.id==="launch"
      ?<div style={{padding:"18px 20px",borderRadius:20,marginBottom:16,background:`linear-gradient(135deg,${event.color}22,${event.color}08)`,border:`1.5px solid ${event.color}50`,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-18,right:-18,fontSize:80,opacity:.06,userSelect:"none",pointerEvents:"none"}}>🚀</div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
          <span style={{fontSize:28}}>🚀</span>
          <div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:15,fontWeight:700,color:event.color}}>{t.launchTitle}</div>
            <div style={{fontFamily:"'DM Sans'",fontSize:12,color:T.textS,marginTop:1}}>{t.launchSub}</div>
          </div>
        </div>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:20,background:`${event.color}18`,border:`1px solid ${event.color}40`}}>
          <span style={{fontSize:13}}>✨</span>
          <span style={{fontFamily:"'DM Sans'",fontSize:11,fontWeight:800,color:event.color}}>{t.doubleXPNote}</span>
        </div>
      </div>
      :<div style={{padding:"12px 18px",borderRadius:16,marginBottom:14,background:`${event.color}15`,border:`1.5px solid ${event.color}40`,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:22}}>{event.emoji}</span>
        <span style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:700,color:event.color}}>{event.label[lang]}</span>
      </div>
    )}

    {speedDating&&<div style={{padding:"14px 18px",borderRadius:18,marginBottom:14,background:"linear-gradient(135deg,rgba(255,31,82,0.15),rgba(255,92,48,0.08))",border:"1.5px solid rgba(255,31,82,0.4)",display:"flex",alignItems:"center",gap:12,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:-14,right:-14,fontSize:60,opacity:.07,userSelect:"none"}}>🔥</div>
      <span style={{fontSize:26,flexShrink:0}}>🔥</span>
      <div>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:14,fontWeight:700,color:T.accent}}>{t.speedDatingLive}</div>
        <div style={{fontFamily:"'DM Sans'",fontSize:11,color:T.textS,marginTop:2}}>{t.speedDatingBonus}</div>
      </div>
    </div>}

    <Card style={{padding:"14px 18px",marginBottom:14}}><XPBar xp={profile.xp||0}/></Card>

    {streak>0&&<Card style={{padding:"13px 18px",marginBottom:14,display:"flex",alignItems:"center",gap:12}}>
      <span style={{fontSize:24}}>🔥</span>
      <div style={{flex:1}}>
        <div style={{fontFamily:"'DM Sans'",fontSize:14,fontWeight:800,color:T.text}}>{t.streakDays(streak)}</div>
        {nextMilestone&&<div style={{fontFamily:"'DM Sans'",fontSize:11,color:T.textD,marginTop:2}}>{t.streakNext(nextMilestone)}</div>}
        {STREAK_MILESTONES[streak]&&<div style={{fontFamily:"'DM Sans'",fontSize:11,color:T.gold,marginTop:2}}>{t.streakReward(STREAK_MILESTONES[streak])}</div>}
      </div>
    </Card>}

    <button onClick={datesLeft>0?onStart:null} style={{width:"100%",padding:"22px 24px",borderRadius:22,border:"none",cursor:datesLeft>0?"pointer":"not-allowed",background:datesLeft>0?T.accentGrad:T.surfAlt,color:datesLeft>0?"#fff":T.textD,fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700,letterSpacing:"-0.3px",marginBottom:8,boxShadow:datesLeft>0?`0 10px 40px ${T.accentGlow}`:"none",animation:datesLeft>0?"glow 2.5s ease-in-out infinite":"none",position:"relative",overflow:"hidden",opacity:datesLeft>0?1:0.6,transition:"all .3s"}}>
      {datesLeft>0?t.startChat:"🌙 Come back tomorrow"}
      {datesLeft>0&&<div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(255,255,255,.12),transparent)",pointerEvents:"none"}}/>}
    </button>
    <div style={{textAlign:"center",marginBottom:16,fontFamily:"'DM Sans'",fontSize:11,color:T.textD,fontWeight:600}}>
      {datesLeft>0?`${datesLeft} / ${DAILY_LIMIT} blind dates remaining today`:"No more dates today — see you tomorrow 🌙"}
    </div>

    <Card style={{padding:18,marginBottom:14}}>
      <Label>🎁 {t.bonusSection}</Label>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {bonusTypes.map(b=><div key={b.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:14,background:T.surfAlt,border:`1px solid ${T.border}`}}>
          <span style={{fontSize:18}}>{b.icon}</span>
          <div>
            <div style={{fontFamily:"'DM Sans'",fontSize:11,fontWeight:700,color:T.textS}}>{b.name}</div>
            <div style={{fontFamily:"'DM Sans'",fontSize:18,fontWeight:900,color:(bonuses?.[b.id]||0)>0?T.gold:T.textD}}>{bonuses?.[b.id]||0}</div>
          </div>
        </div>)}
      </div>
    </Card>

    <Card style={{padding:18}}>
      <Label>🔗 {t.referralTitle}</Label>
      <p style={{fontFamily:"'DM Sans'",fontSize:12,color:T.textS,marginBottom:12,lineHeight:1.5}}>{t.referralDesc}</p>
      <div style={{padding:"10px 14px",borderRadius:12,background:T.surfAlt,border:`1px solid ${T.border}`,fontFamily:"'DM Sans'",fontSize:14,fontWeight:900,color:T.text,letterSpacing:2,textAlign:"center",marginBottom:10}}>{referralCode}</div>
      <Btn full onClick={onCopyReferral} variant="ghost">{referralCopied?t.referralCopied:t.referralCopy}</Btn>
    </Card>
  </div>;
}

// ── FULL PROFILE VIEW ──

function FullProfile({profile,onClose,superLikeContext}) {
  const T=useT();
  const {lang}=useL();
  const [idx,setIdx]=useState(0);
  const photos=profile.photos||[];
  const ints=profile.interests||[];

  return <div style={{position:"fixed",inset:0,zIndex:1000,background:T.bg,overflowY:"auto",animation:"fadeIn .2s"}}>
    <div style={{position:"sticky",top:0,zIndex:10,padding:"12px 16px",display:"flex",alignItems:"center",gap:10,background:T.surface,borderBottom:`1px solid ${T.border}`}}>
      <button onClick={onClose} style={{background:"none",border:"none",color:T.textS,cursor:"pointer",padding:4,display:"flex"}}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span style={{fontFamily:"'Fraunces',serif",fontSize:16,fontWeight:700,color:T.text}}>{profile.name}</span>
    </div>

    {photos.length>0&&<div style={{position:"relative",background:"#000"}}>
      <img src={photos[idx]} style={{width:"100%",height:400,objectFit:"cover",display:"block",opacity:.95}}/>
      {photos.length>1&&<>
        <div style={{position:"absolute",bottom:14,left:0,right:0,display:"flex",justifyContent:"center",gap:5}}>
          {photos.map((_,i)=><button key={i} onClick={()=>setIdx(i)} style={{width:i===idx?22:6,height:6,borderRadius:3,background:i===idx?"#fff":"rgba(255,255,255,0.45)",border:"none",cursor:"pointer",padding:0,transition:"width .2s"}}/>)}
        </div>
        {idx>0&&<button onClick={()=>setIdx(i=>i-1)} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,.4)",border:"none",borderRadius:"50%",width:36,height:36,color:"#fff",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>}
        {idx<photos.length-1&&<button onClick={()=>setIdx(i=>i+1)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,.4)",border:"none",borderRadius:"50%",width:36,height:36,color:"#fff",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>}
      </>}
    </div>}

    <div style={{padding:"20px 20px 40px"}}>
      {superLikeContext==="received"&&<div style={{padding:"10px 16px",borderRadius:14,background:"linear-gradient(135deg,rgba(255,190,11,0.14),rgba(255,92,48,0.08))",border:"1px solid rgba(255,190,11,0.4)",marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:18}}>⚡</span>
        <span style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:800,color:"#ffbe0b"}}>Tu as reçu un Super Like !</span>
      </div>}
      {superLikeContext==="sent"&&<div style={{padding:"10px 16px",borderRadius:14,background:"rgba(255,190,11,0.08)",border:"1px solid rgba(255,190,11,0.3)",marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:18}}>⚡</span>
        <span style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:800,color:"#ffbe0b"}}>Tu as Super Liké cette personne</span>
      </div>}

      <div style={{marginBottom:18}}>
        <h2 style={{fontFamily:"'Fraunces',serif",fontSize:26,fontWeight:700,color:T.text,margin:"0 0 4px"}}>{profile.name}{profile.age?`, ${profile.age}`:""}</h2>
        {profile.city&&<div style={{fontFamily:"'DM Sans'",fontSize:13,color:T.textD}}>📍 {profile.city}</div>}
      </div>

      {profile.bio&&<div style={{marginBottom:20,padding:"14px 16px",borderRadius:16,background:T.surfAlt,border:`1px solid ${T.border}`}}>
        <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:800,color:T.textD,textTransform:"uppercase",letterSpacing:1.4,marginBottom:8}}>Bio</div>
        <p style={{fontFamily:"'DM Sans'",fontSize:14,color:T.text,lineHeight:1.7,margin:0}}>{profile.bio}</p>
      </div>}

      {ints.length>0&&<div style={{marginBottom:20}}>
        <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:800,color:T.textD,textTransform:"uppercase",letterSpacing:1.4,marginBottom:10}}>Intérêts</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
          {ints.map(i=><span key={i} style={{padding:"6px 14px",borderRadius:20,background:T.accentSoft,border:`1px solid ${T.accent}30`,fontFamily:"'DM Sans'",fontSize:12,fontWeight:700,color:T.accent}}>{i}</span>)}
        </div>
      </div>}
    </div>
  </div>;
}

// ── MATCHES ──

function MatchesTab({myUid,matches,onBlock}) {
  const T=useT();
  const {t}=useL();
  const [openId,setOpenId]=useState(null);
  const [msgs,setMsgs]=useState([]);
  const [text,setText]=useState("");
  const [showReport,setShowReport]=useState(false);
  const scrollRef=useRef(null);
  const inputRef=useRef(null);
  const current=matches.find(m=>m.matchId===openId);

  useEffect(()=>{
    if(!openId){setMsgs([]);return;}
    const q=query(collection(db,"matches",openId,"messages"),orderBy("createdAt","asc"));
    return onSnapshot(q,snap=>setMsgs(snap.docs.map(d=>({id:d.id,...d.data()}))));
  },[openId]);

  useEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight;},[msgs]);

  async function send(){
    if(!text.trim()||!openId)return;
    const txt=text.trim();setText("");inputRef.current?.focus();
    await addDoc(collection(db,"matches",openId,"messages"),{senderId:myUid,text:txt,createdAt:serverTimestamp()});
    await updateDoc(doc(db,"matches",openId),{lastMessage:txt});
  }

  async function handleReport(reason){
    if(!current)return;
    await addDoc(collection(db,"reports"),{reporter:myUid,reported:current.otherId,reason,createdAt:serverTimestamp()});
    setShowReport(false);
    if(confirm("Report sent. Block?")) {await onBlock(current.otherId);setOpenId(null);}
  }

  const reasons=[t.inappropriate,t.spam,t.fakeProfile,t.harassment,t.other];

  if(openId&&current) return <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:999,background:T.bg,display:"flex",flexDirection:"column"}}>
    {showReport&&<ReportModal title={t.reportTitle} reasons={reasons} cancel={t.cancel} onReport={handleReport} onClose={()=>setShowReport(false)}/>}
    <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${T.border}`,background:T.surface,flexShrink:0}}>
      <button onClick={()=>setOpenId(null)} style={{background:"none",border:"none",color:T.textS,cursor:"pointer",padding:4,display:"flex"}}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      {current.photos?.[0]&&<img src={current.photos[0]} style={{width:36,height:36,borderRadius:10,objectFit:"cover",border:`2px solid ${T.accent}`}}/>}
      <span style={{fontFamily:"'DM Sans'",fontSize:15,fontWeight:700,color:T.text,flex:1}}>{current.name}</span>
      <button onClick={()=>setShowReport(true)} style={{background:"none",border:"none",fontSize:16,cursor:"pointer",color:T.textD}}>🚩</button>
    </div>
    <div ref={scrollRef} style={{flex:1,overflowY:"auto",padding:16}}>
      {msgs.length===0&&<div style={{textAlign:"center",padding:48,fontFamily:"'DM Sans'",color:T.textD,fontSize:14}}>{t.sendFirst}</div>}
      {msgs.map(m=>{const mine=m.senderId===myUid;return<div key={m.id} style={{display:"flex",justifyContent:mine?"flex-end":"flex-start",marginBottom:8}}>
        <div style={{maxWidth:"72%",padding:"10px 15px",borderRadius:18,borderBottomRightRadius:mine?4:18,borderBottomLeftRadius:mine?18:4,background:mine?T.accentGrad:T.surfAlt,color:mine?"#fff":T.text,fontSize:14,lineHeight:1.5,fontFamily:"'DM Sans'",boxShadow:mine?`0 3px 12px ${T.accentGlow}`:"none"}}>{m.text}</div>
      </div>;})}
    </div>
    <div style={{padding:"10px 12px",borderTop:`1px solid ${T.border}`,background:T.surface,display:"flex",gap:8,flexShrink:0}}>
      <input ref={inputRef} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();send();}}} placeholder={t.typeMessage} autoFocus style={{flex:1,padding:"11px 16px",borderRadius:14,background:T.input,border:`1.5px solid ${T.border}`,color:T.text,fontSize:14,fontFamily:"'DM Sans'",outline:"none"}}/>
      <button onClick={send} style={{width:44,height:44,borderRadius:12,border:"none",background:text.trim()?T.accentGrad:T.border,color:"#fff",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .2s"}}>↑</button>
    </div>
  </div>;

  function getMatchExpiry(m) {
    if(!m.matchedAt||m.lastMessage)return null;
    const expireAt=new Date(m.matchedAt).getTime()+24*60*60*1000;
    const now=Date.now();
    if(now>=expireAt)return "expired";
    return Math.ceil((expireAt-now)/(60*60*1000));
  }

  return <div style={{padding:20,maxWidth:440,margin:"0 auto",paddingBottom:100}}>
    <h2 style={{fontFamily:"'Fraunces',serif",fontSize:22,color:T.text,margin:"0 0 18px"}}>{t.matches}</h2>
    {matches.length===0&&<div style={{textAlign:"center",padding:"60px 20px"}}>
      <div style={{width:64,height:64,borderRadius:20,background:T.surfAlt,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.textD} strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </div>
      <p style={{fontFamily:"'DM Sans'",fontSize:14,color:T.textD}}>{t.noMatches}</p>
    </div>}
    {matches.map(m=>{
      const expiry=getMatchExpiry(m);
      const isExpired=expiry==="expired";
      return <div key={m.matchId} onClick={()=>!isExpired&&setOpenId(m.matchId)}
        style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",marginBottom:10,borderRadius:18,background:T.card,border:`1px solid ${isExpired?T.border:typeof expiry==="number"&&expiry<=6?T.accent+"33":T.border}`,cursor:isExpired?"default":"pointer",opacity:isExpired?0.45:1,transition:"transform .15s"}}
        onMouseEnter={e=>{if(!isExpired)e.currentTarget.style.transform="scale(1.01)";}}
        onMouseLeave={e=>e.currentTarget.style.transform="none"}>
        {m.photos?.[0]
          ?<img src={m.photos[0]} style={{width:50,height:50,borderRadius:14,objectFit:"cover",border:`2px solid ${isExpired?T.border:T.accent}`,filter:isExpired?"grayscale(1)":"none"}}/>
          :<div style={{width:50,height:50,borderRadius:14,background:isExpired?T.surfAlt:T.accentGrad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:isExpired?T.textD:"#fff"}}>{m.name?.[0]}</div>}
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'DM Sans'",fontSize:14,fontWeight:700,color:T.text,marginBottom:2}}>{m.name}{m.age?`, ${m.age}`:""}</div>
          <div style={{fontFamily:"'DM Sans'",fontSize:12,color:isExpired?T.danger:typeof expiry==="number"?T.sec:T.textD,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
            {isExpired?t.matchExpired:typeof expiry==="number"?t.matchExpires(expiry):m.lastMessage||t.newMatch}
          </div>
        </div>
        {!isExpired&&<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.textD} strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>}
      </div>;
    })}
  </div>;
}

// ── PROFILE ──

function ProfileTab({user,profile,setProfile,onLogout,lang,setLang,thm,setTheme}) {
  const T=useT();
  const {t}=useL();
  const [editing,setEditing]=useState(false);
  const [nm,setNm]=useState(profile.name||"");
  const [ag,setAg]=useState(profile.age||"");
  const [ct,setCt]=useState(profile.city||"");
  const [bi,setBi]=useState(profile.bio||"");
  const [it,setIt]=useState(profile.interests||[]);
  const [ph,setPh]=useState(profile.photos||[]);
  const [saving,setSaving]=useState(false);
  const [upIdx,setUpIdx]=useState(-1);
  const [locating,setLocating]=useState(false);
  const ints=INTS[lang];

  async function detectCity() {
    setLocating(true);
    try {
      const pos = await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{timeout:8000}));
      const {latitude,longitude}=pos.coords;
      const r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
      const d=await r.json();
      const name=d.address?.city||d.address?.town||d.address?.village||d.address?.county||"";
      if(name)setCt(name);
    } catch{}
    setLocating(false);
  }

  async function uploadPhoto(idx,file){
    setUpIdx(idx);
    try{const url=await upImg(file);const np=[...ph];np[idx]=url;setPh(np);await updateDoc(doc(db,"users",user.uid),{photos:np});setProfile(p=>({...p,photos:np}));}catch(e){alert(e.message);}
    setUpIdx(-1);
  }
  function removePhoto(idx){const np=ph.filter((_,i)=>i!==idx);setPh(np);updateDoc(doc(db,"users",user.uid),{photos:np});setProfile(p=>({...p,photos:np}));}
  async function save(){
    setSaving(true);
    try{const d={name:nm.trim(),age:parseInt(ag),city:ct.trim(),bio:bi.trim(),interests:it};await updateDoc(doc(db,"users",user.uid),d);setProfile(p=>({...p,...d}));setEditing(false);}catch(e){alert(e.message);}
    setSaving(false);
  }

  const inp={width:"100%",padding:"11px 14px",borderRadius:12,background:T.input,border:`1.5px solid ${T.border}`,color:T.text,fontSize:14,fontFamily:"'DM Sans'",outline:"none",marginBottom:10};
  const pill=(active)=>({padding:"6px 18px",borderRadius:10,border:"none",background:active?T.accentGrad:"transparent",color:active?"#fff":T.textS,fontFamily:"'DM Sans'",fontSize:13,fontWeight:700,cursor:"pointer",transition:"all .2s"});

  return <div style={{padding:20,maxWidth:440,margin:"0 auto",paddingBottom:90}}>
    <Card style={{padding:"14px 18px",marginBottom:14}}><XPBar xp={profile.xp||0}/></Card>
    <Card style={{padding:18,marginBottom:14}}>
      <Label>{t.photos} ({ph.length}/3)</Label>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {[0,1,2].map(i=><div key={i} style={{position:"relative"}}>
          <PhotoSlot url={ph[i]} onUp={uploadPhoto} onRm={removePhoto} idx={i}/>
          {upIdx===i&&<div style={{position:"absolute",inset:0,borderRadius:16,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{width:20,height:20,border:`2px solid ${T.border}`,borderTopColor:T.accent,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
          </div>}
        </div>)}
      </div>
    </Card>
    <Card style={{padding:20,marginBottom:14}}>
      {!editing?<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <Label style={{marginBottom:0}}>{t.infoSection}</Label>
          <button onClick={()=>setEditing(true)} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:8,padding:"4px 12px",fontFamily:"'DM Sans'",fontSize:12,fontWeight:700,color:T.textS,cursor:"pointer"}}>✏️ Edit</button>
        </div>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:19,color:T.text,marginBottom:4}}>{profile.name}, {profile.age}</div>
        <div style={{fontFamily:"'DM Sans'",fontSize:12,color:T.textD,marginBottom:10}}>📍 {profile.city}</div>
        <p style={{fontFamily:"'DM Sans'",fontSize:13,color:T.textS,lineHeight:1.6,marginBottom:12}}>{profile.bio}</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{profile.interests?.map(i=><span key={i} style={{padding:"5px 12px",borderRadius:20,fontSize:12,fontFamily:"'DM Sans'",fontWeight:600,background:T.accentSoft,color:T.accent}}>{i}</span>)}</div>
      </>:<>
        <input value={nm} onChange={e=>setNm(e.target.value)} placeholder={t.firstName} style={inp}/>
        <div style={{display:"flex",gap:8}}>
          <input type="number" value={ag} onChange={e=>setAg(e.target.value)} style={{...inp,width:80}}/>
          <div style={{flex:1,position:"relative"}}>
            <input value={ct} onChange={e=>setCt(e.target.value)} placeholder={t.city} style={{...inp,paddingRight:38,width:"100%"}}/>
            <button onClick={detectCity} disabled={locating} title={t.locDetect} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:15,opacity:locating?0.4:0.7,padding:2}}>{locating?"⏳":"📍"}</button>
          </div>
        </div>
        <textarea value={bi} onChange={e=>setBi(e.target.value.slice(0,150))} rows={3} style={{...inp,resize:"none"}}/>
        <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12}}>{ints.map(tag=>{const a=it.includes(tag);return<button key={tag} onClick={()=>setIt(p=>a?p.filter(x=>x!==tag):p.length<5?[...p,tag]:p)} style={{padding:"6px 12px",borderRadius:16,fontSize:12,fontFamily:"'DM Sans'",fontWeight:600,cursor:"pointer",border:`1px solid ${a?T.accent:T.border}`,background:a?T.accentSoft:"transparent",color:a?T.accent:T.textS}}>{tag}</button>;})}</div>
        <div style={{display:"flex",gap:8}}><Btn full onClick={save} disabled={saving}>{saving?"…":t.save}</Btn><Btn variant="ghost" onClick={()=>setEditing(false)}>✕</Btn></div>
      </>}
    </Card>
    <Card style={{padding:20,marginBottom:14}}>
      <Label>{t.settings}</Label>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <span style={{fontFamily:"'DM Sans'",fontSize:14,fontWeight:600,color:T.text}}>{t.language}</span>
        <div style={{display:"flex",background:T.surfAlt,borderRadius:12,padding:3,gap:2}}>
          {["en","fr"].map(l=><button key={l} onClick={()=>setLang(l)} style={pill(lang===l)}>{l.toUpperCase()}</button>)}
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontFamily:"'DM Sans'",fontSize:14,fontWeight:600,color:T.text}}>{t.theme}</span>
        <div style={{display:"flex",background:T.surfAlt,borderRadius:12,padding:3,gap:2}}>
          {[["dark","🌙"],["light","☀️"]].map(([v,icon])=><button key={v} onClick={()=>setTheme(v)} style={pill(thm===v)}>{icon}</button>)}
        </div>
      </div>
    </Card>
    <Btn variant="danger" full onClick={onLogout}>{t.logout}</Btn>
  </div>;
}

// ── BLIND CHAT ──

function BlindChat({chatId,myUid,partner,bonuses,onUseBonus,onTimeUp,onReport,lang}) {
  const T=useT();
  const {t}=useL();
  const bonusTypes=BONUS_TYPES[lang];
  const icebreakers=ICEBREAKERS[lang];
  const challenges=CHALLENGES[lang];
  const pqs=PERSONALITY_Q[lang];
  const [msgs,setMsgs]=useState([]);
  const [text,setText]=useState("");
  const [timeLeft,setTimeLeft]=useState(CHAT_DUR);
  const [reveals,setReveals]=useState([]);
  const [endTime,setEndTime]=useState(null);
  const [showReport,setShowReport]=useState(false);
  const [challenge,setChallenge]=useState(null);
  const scrollRef=useRef(null);
  const inputRef=useRef(null);
  const doneRef=useRef(false);
  const hintShownRef=useRef(false);

  useEffect(()=>{
    const q=query(collection(db,"blindChats",chatId,"messages"),orderBy("createdAt","asc"));
    return onSnapshot(q,snap=>setMsgs(snap.docs.map(d=>({id:d.id,...d.data()}))));
  },[chatId]);

  useEffect(()=>{
    return onSnapshot(doc(db,"blindChats",chatId),snap=>{const d=snap.data();if(d?.endTime)setEndTime(d.endTime);});
  },[chatId]);

  useEffect(()=>{
    if(!endTime)return;
    const iv=setInterval(()=>{
      const left=Math.max(0,Math.round((new Date(endTime).getTime()-Date.now())/1000));
      setTimeLeft(left);
      if(left<=0&&!doneRef.current){doneRef.current=true;clearInterval(iv);onTimeUp();}
    },500);
    return()=>clearInterval(iv);
  },[endTime,onTimeUp]);

  // Personality hint after 15s
  useEffect(()=>{
    if(!partner?.personality||hintShownRef.current)return;
    const tid=setTimeout(()=>{
      const qi=Math.floor(Math.random()*5);
      const ans=partner.personality[qi];
      if(ans===undefined)return;
      const hintText=pqs[qi]?.a[ans];
      if(hintText){setReveals(r=>[...r,t.personalityHint(hintText)]);hintShownRef.current=true;}
    },15000);
    return()=>clearTimeout(tid);
  },[partner,pqs,t]);

  // Challenge popup every 25s, 25% chance
  useEffect(()=>{
    const iv=setInterval(()=>{
      setChallenge(c=>{if(c)return c;return Math.random()<0.25?challenges[Math.floor(Math.random()*challenges.length)]:null;});
    },25000);
    return()=>clearInterval(iv);
  },[challenges]);

  useEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight;},[msgs,reveals]);

  async function useBonus(id){
    const c=bonuses[id]||0;if(c<=0)return;onUseBonus(id);
    if(id==="city"&&partner)setReveals(r=>[...r,`📍 ${partner.city||"?"}`]);
    if(id==="peek"&&partner){const int=partner.interests?.[Math.floor(Math.random()*(partner.interests?.length||1))];setReveals(r=>[...r,`👀 ${int||"?"}`]);}
    if(id==="ice"){const q=icebreakers[Math.floor(Math.random()*icebreakers.length)];await addDoc(collection(db,"blindChats",chatId,"messages"),{senderId:"system",text:`🎲 ${q}`,createdAt:serverTimestamp()});}
    if(id==="anon"&&partner){const a=partner.age;setReveals(r=>[...r,`🕶️ ${a?a<22?"18-21":a<25?"22-24":a<28?"25-27":"28+":"?"}`]);}
  }

  async function send(){
    if(!text.trim())return;
    const txt=text.trim();setText("");inputRef.current?.focus();
    await addDoc(collection(db,"blindChats",chatId,"messages"),{senderId:myUid,text:txt,createdAt:serverTimestamp()});
  }

  async function acceptChallenge(){
    if(!challenge)return;
    await addDoc(collection(db,"blindChats",chatId,"messages"),{senderId:"system",text:`🎯 ${challenge}`,createdAt:serverTimestamp()});
    setChallenge(null);
  }

  async function handleReport(reason){
    await onReport(reason);setShowReport(false);
    if(confirm("Report sent. Block?")) {doneRef.current=true;onTimeUp();}
  }

  const reasons=[t.inappropriate,t.spam,t.fakeProfile,t.harassment,t.other];

  return <div style={{display:"flex",flexDirection:"column",height:"100vh",maxWidth:440,margin:"0 auto"}}>
    {showReport&&<ReportModal title={t.reportTitle} reasons={reasons} cancel={t.cancel} onReport={handleReport} onClose={()=>setShowReport(false)}/>}

    <div style={{padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${T.border}`,background:T.surface,flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:38,height:38,borderRadius:12,background:T.accentGrad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:"#fff",fontFamily:"'DM Sans'"}}>?</div>
        <span style={{fontFamily:"'DM Sans'",fontSize:14,fontWeight:700,color:T.text}}>{t.unknown}</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <button onClick={()=>setShowReport(true)} style={{background:"none",border:"none",fontSize:14,cursor:"pointer",color:T.textD}}>🚩</button>
        <div style={{width:72,height:5,borderRadius:3,background:T.border,overflow:"hidden"}}>
          <div style={{width:`${Math.min((timeLeft/CHAT_DUR)*100,100)}%`,height:"100%",borderRadius:3,background:timeLeft<=10?T.danger:T.accentGrad,transition:"width .5s"}}/>
        </div>
        <span style={{fontFamily:"'DM Sans'",fontWeight:800,fontSize:13,color:timeLeft<=10?T.danger:T.accent,minWidth:28,textAlign:"right"}}>{timeLeft}s</span>
      </div>
    </div>

    <div style={{display:"flex",gap:6,padding:"8px 12px",overflowX:"auto",borderBottom:`1px solid ${T.border}`,background:T.surfAlt,flexShrink:0}}>
      {bonusTypes.map(b=>{const c=bonuses[b.id]||0;return<button key={b.id} disabled={c<=0} onClick={()=>useBonus(b.id)} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:10,border:`1px solid ${c>0?T.gold+"44":T.border}`,background:c>0?T.goldSoft:"transparent",cursor:c>0?"pointer":"default",opacity:c>0?1:0.35,whiteSpace:"nowrap",flexShrink:0,fontFamily:"'DM Sans'",fontSize:12,fontWeight:700,color:c>0?T.gold:T.textD}}>
        <span>{b.icon}</span><span>{b.name}</span><span style={{marginLeft:3,opacity:.7}}>{c}</span>
      </button>;})}
    </div>

    {challenge&&<div style={{margin:"8px 12px",padding:"14px 16px",borderRadius:16,background:`${T.sec}10`,border:`1.5px solid ${T.sec}30`,animation:"scaleIn .2s ease",flexShrink:0}}>
      <div style={{fontFamily:"'DM Sans'",fontSize:11,fontWeight:800,color:T.sec,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>{t.challengeTitle}</div>
      <p style={{fontFamily:"'DM Sans'",fontSize:13,color:T.text,lineHeight:1.5,marginBottom:12}}>{challenge}</p>
      <div style={{display:"flex",gap:8}}>
        <Btn onClick={acceptChallenge} style={{flex:1,padding:"9px 14px",fontSize:12}}>{t.challengeAccept}</Btn>
        <Btn variant="ghost" onClick={()=>setChallenge(null)} style={{flex:1,padding:"9px 14px",fontSize:12}}>{t.challengeSkip}</Btn>
      </div>
    </div>}

    <div ref={scrollRef} style={{flex:1,overflowY:"auto",padding:16}}>
      {msgs.length===0&&reveals.length===0&&<div style={{textAlign:"center",padding:40,fontFamily:"'DM Sans'",color:T.textD,fontSize:14}}>{t.iceBreak}</div>}
      {reveals.map((r,i)=><div key={"r"+i} style={{textAlign:"center",margin:"6px 0",padding:"8px 14px",borderRadius:14,background:T.goldSoft,border:`1px solid ${T.gold}33`,fontFamily:"'DM Sans'",fontSize:13,fontWeight:600,color:T.gold}}>{r}</div>)}
      {msgs.map(m=>{
        const mine=m.senderId===myUid;const sys=m.senderId==="system";
        if(sys)return<div key={m.id} style={{display:"flex",justifyContent:"center",marginBottom:8}}><div style={{padding:"8px 16px",borderRadius:14,background:`${T.sec}12`,border:`1px solid ${T.sec}22`,fontFamily:"'DM Sans'",fontSize:12,color:T.sec,fontWeight:600}}>{m.text}</div></div>;
        return<div key={m.id} style={{display:"flex",justifyContent:mine?"flex-end":"flex-start",marginBottom:8}}>
          <div style={{maxWidth:"72%",padding:"10px 15px",borderRadius:18,borderBottomRightRadius:mine?4:18,borderBottomLeftRadius:mine?18:4,background:mine?T.accentGrad:T.surfAlt,color:mine?"#fff":T.text,fontSize:14,lineHeight:1.5,fontFamily:"'DM Sans'",boxShadow:mine?`0 3px 12px ${T.accentGlow}`:"none"}}>{m.text}</div>
        </div>;
      })}
    </div>

    <div style={{padding:"8px 12px",borderTop:`1px solid ${T.border}`,background:T.surface,display:"flex",gap:8,flexShrink:0}}>
      <input ref={inputRef} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder={t.typeMessage} autoFocus style={{flex:1,padding:"11px 16px",borderRadius:14,background:T.input,border:`1.5px solid ${T.border}`,color:T.text,fontSize:14,fontFamily:"'DM Sans'",outline:"none"}}/>
      <button onClick={send} style={{width:44,height:44,borderRadius:12,border:"none",background:text.trim()?T.accentGrad:T.border,color:"#fff",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .2s"}}>↑</button>
    </div>
  </div>;
}

// ── MAIN APP ──

export default function App() {
  const [thm,setThm]=useState(()=>{try{return localStorage.getItem("bd_theme")||(window.matchMedia?.("(prefers-color-scheme:light)").matches?"light":"dark");}catch{return"dark";}});
  const [lang,setLang]=useState(()=>{try{return localStorage.getItem("bd_lang")||"en";}catch{return"en";}});
  const T=thm==="dark"?dark:light;
  const t=TR[lang];

  function setTheme(v){setThm(v);try{localStorage.setItem("bd_theme",v);}catch{}}
  function changeLang(l){setLang(l);try{localStorage.setItem("bd_lang",l);}catch{}}

  const [screen,setScreen]=useState("loading");
  const [tab,setTab]=useState("home");
  const [user,setUser]=useState(null);
  const [profile,setProfile]=useState(null);
  const [chatId,setChatId]=useState(null);
  const [otherUid,setOtherUid]=useState(null);
  const [otherProfile,setOtherProfile]=useState(null);
  const [partner,setPartner]=useState(null);
  const [matches,setMatches]=useState([]);
  const [bonuses,setBonuses]=useState(DEF_BONUS);
  const [streak,setStreak]=useState(0);
  const [compatibility,setCompatibility]=useState(null);
  const [superLikeContext,setSuperLikeContext]=useState(null); // "sent"|"received"|null
  const [referralCopied,setReferralCopied]=useState(false);
  const cleanup=useRef([]);

  function addCleanup(fn){cleanup.current.push(fn);}
  function runCleanup(){cleanup.current.forEach(fn=>fn());cleanup.current=[];}

  useEffect(()=>{
    return onAuthStateChanged(auth,async u=>{
      if(u){
        setUser(u);
        const snap=await getDoc(doc(db,"users",u.uid));
        if(snap.exists()){
          const p={id:u.uid,name:u.displayName||snap.data().name,...snap.data()};
          const {streak:newStreak,bonusAwarded}=await updateStreak(u.uid,p);
          setStreak(newStreak);
          setProfile(p);
          const updBonuses=bonusAwarded>0
            ?{city:(p.bonuses?.city||0)+bonusAwarded,ice:(p.bonuses?.ice||0)+bonusAwarded,peek:(p.bonuses?.peek||0)+bonusAwarded,anon:(p.bonuses?.anon||0)+bonusAwarded}
            :p.bonuses||DEF_BONUS;
          setBonuses(updBonuses);
          if(p.profileComplete){setScreen("main");listenMatches(u.uid);}
          else setScreen("setup");
        } else setScreen("setup");
      } else {setUser(null);setProfile(null);setMatches([]);setScreen("auth");}
    });
  },[]);

  function listenMatches(uid){
    const q=query(collection(db,"matches"),where("users","array-contains",uid));
    const unsub=onSnapshot(q,async snap=>{
      const seen=new Set();const results=[];
      for(const d of snap.docs){
        const data=d.data();
        const otherId=data.users.find(id=>id!==uid);
        const key=[uid,otherId].sort().join("-");
        if(seen.has(key))continue;seen.add(key);
        const uSnap=await getDoc(doc(db,"users",otherId));
        const uData=uSnap.exists()?uSnap.data():{};
        if(uData.blocked?.includes(uid))continue;
        const matchedAt=data.matchedAt?.toDate?.()?.toISOString()||data.createdAt?.toDate?.()?.toISOString()||null;
        results.push({matchId:d.id,...data,...uData,otherId,matchedAt});
      }
      setMatches(results);
    });
    addCleanup(unsub);
  }

  async function blockUser(otherId){
    await updateDoc(doc(db,"users",user.uid),{blocked:arrayUnion(otherId)});
    runCleanup();listenMatches(user.uid);
  }

  async function addXP(amount){
    const newXP=(profile?.xp||0)+amount;
    setProfile(p=>({...p,xp:newXP}));
    await updateDoc(doc(db,"users",user.uid),{xp:newXP});
  }

  async function consumeBonus(id){
    const nb={...bonuses,[id]:Math.max(0,(bonuses[id]||0)-1)};
    setBonuses(nb);
    await updateDoc(doc(db,"users",user.uid),{bonuses:nb});
  }

  function copyReferralLink(){
    const code=user.uid.slice(0,8).toUpperCase();
    const link=`${window.location.origin}${window.location.pathname}?ref=${code}`;
    navigator.clipboard.writeText(link).catch(()=>{});
    setReferralCopied(true);
    setTimeout(()=>setReferralCopied(false),2500);
  }

  async function startChat(){
    const count=getDailyCount(profile);
    if(count>=DAILY_LIMIT){alert(t.dailyLimitReached);return;}
    setScreen("waiting");setCompatibility(null);
    const myUid=user.uid;let matched=false;
    let roomUnsub=()=>{};let selfUnsub=()=>{};let tmout;let heartbeat;

    function handleVisibility(){
      if(document.visibilityState==='visible'&&!matched){
        setDoc(doc(db,"waitingRoom",myUid),{uid:myUid,status:"waiting",gender:profile.gender||null,orientation:profile.orientation||null,ts:Date.now(),createdAt:serverTimestamp()}).catch(()=>{});
      }
    }
    function done(){
      roomUnsub();selfUnsub();clearTimeout(tmout);clearInterval(heartbeat);
      document.removeEventListener('visibilitychange',handleVisibility);
    }

    async function goToChat(chatDocId,otherId){
      if(matched)return;matched=true;done();
      await deleteDoc(doc(db,"waitingRoom",myUid)).catch(()=>{});
      const pSnap=await getDoc(doc(db,"users",otherId));
      setPartner(pSnap.exists()?pSnap.data():null);
      await addXP(XP_CHAT);
      const today=getTodayStr();
      const curCount=profile?.dailyChats?.date===today?(profile.dailyChats.count||0):0;
      const newDailyChats={date:today,count:curCount+1};
      await updateDoc(doc(db,"users",myUid),{dailyChats:newDailyChats});
      setProfile(p=>({...p,dailyChats:newDailyChats}));
      if(isSpeedDatingNow()){
        const bonus2={city:(bonuses.city||0)+2,ice:(bonuses.ice||0)+2,peek:(bonuses.peek||0)+2,anon:(bonuses.anon||0)+2};
        setBonuses(bonus2);await updateDoc(doc(db,"users",myUid),{bonuses:bonus2});
      }
      setChatId(chatDocId);setOtherUid(otherId);setScreen("chat");
    }

    await deleteDoc(doc(db,"waitingRoom",myUid)).catch(()=>{});
    await setDoc(doc(db,"waitingRoom",myUid),{uid:myUid,status:"waiting",gender:profile.gender||null,orientation:profile.orientation||null,ts:Date.now(),createdAt:serverTimestamp()});

    // Heartbeat: refresh timestamp every 15s so mobile users stay "fresh"
    heartbeat=setInterval(async()=>{
      if(matched)return;
      await updateDoc(doc(db,"waitingRoom",myUid),{ts:Date.now()}).catch(()=>{});
    },15000);
    // Re-enter room if user comes back from background (mobile fix)
    document.addEventListener('visibilitychange',handleVisibility);

    // Both users listen for a blindChat that includes them — no cross-user write needed
    selfUnsub=onSnapshot(
      query(collection(db,"blindChats"),where("users","array-contains",myUid)),
      async snap=>{
        if(matched)return;
        const active=snap.docs.find(d=>{
          const data=d.data();
          return data.status==="active"&&data.endTime&&new Date(data.endTime)>new Date();
        });
        if(active){
          const otherId=active.data().users.find(id=>id!==myUid);
          if(otherId) await goToChat(active.id,otherId);
        }
      },
      err=>console.error("[blinddate] blindChats listener error:",err.code,err.message)
    );

    // Only the user with smaller UID creates the chat doc, then notifies the other user
    // directly via their waitingRoom doc (more reliable than array-contains query on mobile)
    function setupRoomListener(){
      const unsub=onSnapshot(
        query(collection(db,"waitingRoom"),where("status","==","waiting")),
        async snap=>{
          if(matched)return;

          // Check if we were directly notified of a match via our own waitingRoom doc
          const myDoc=snap.docs.find(d=>d.id===myUid);
          if(myDoc&&myDoc.data().chatId&&myDoc.data().chatPartner){
            const {chatId:cid,chatPartner:pid}=myDoc.data();
            unsub();roomUnsub=()=>{};
            if(!matched)await goToChat(cid,pid);
            return;
          }

          const now=Date.now();
          const others=snap.docs.filter(d=>{
            if(d.id===myUid)return false;
            const data=d.data();
            if(data.status!=="waiting")return false;
            if(data.ts&&now-data.ts>90000)return false; // ignore stale/offline entries
            if(!matchCompat(profile.gender,profile.orientation,data.gender,data.orientation))return false;
            return true;
          });
          if(!others.length)return;
          const otherId=others[0].id;
          if(myUid>=otherId)return; // Only smaller UID creates the chat
          unsub();roomUnsub=()=>{};
          try{
            const endTime=new Date(Date.now()+CHAT_DUR*1000).toISOString();
            const chatRef=await addDoc(collection(db,"blindChats"),{users:[myUid,otherId],status:"active",user1Decision:null,user2Decision:null,endTime,createdAt:serverTimestamp()});
            // Notify the other user directly via their waitingRoom doc
            await updateDoc(doc(db,"waitingRoom",otherId),{chatId:chatRef.id,chatPartner:myUid}).catch(e=>console.error("[blinddate] notify partner error:",e.code,e.message));
            // Also go to chat directly without waiting for selfUnsub
            if(!matched)await goToChat(chatRef.id,otherId);
          }catch(e){
            console.error("[blinddate] blindChat creation error:",e.code,e.message);
            if(!matched)setupRoomListener(); // re-listen and retry on failure
          }
        },
        err=>console.error("[blinddate] waitingRoom listener error:",err.code,err.message)
      );
      roomUnsub=unsub;
    }
    setupRoomListener();

    tmout=setTimeout(()=>{
      if(matched)return;done();
      deleteDoc(doc(db,"waitingRoom",myUid)).catch(()=>{});
      setScreen("main");alert(t.noMatches);
    },WAIT_TIMEOUT*1000);

    addCleanup(()=>{done();deleteDoc(doc(db,"waitingRoom",myUid)).catch(()=>{});});
  }

  function cancelWaiting(){
    runCleanup();deleteDoc(doc(db,"waitingRoom",user.uid)).catch(()=>{});setScreen("main");
  }

  const handleTimeUp=useCallback(()=>{
    if(partner?.interests&&profile?.interests) setCompatibility(calcCompatibility(profile.interests,partner.interests));
    setScreen("decision");
  },[partner,profile]);

  async function decide(decision){
    if(decision==="superlike"){
      const newSL=Math.max(0,(profile.superLikes||0)-1);
      await updateDoc(doc(db,"users",user.uid),{superLikes:newSL});
      setProfile(p=>({...p,superLikes:newSL}));
      setSuperLikeContext("sent");
      await updateDoc(doc(db,"blindChats",chatId),{user1Decision:"match",user2Decision:"match",superLikedBy:user.uid});
      await resolveMatch("match","match");
      return;
    }
    const chatSnap=await getDoc(doc(db,"blindChats",chatId));
    const data=chatSnap.data();
    // If other user already super liked, force match regardless
    if(data.superLikedBy&&data.superLikedBy!==user.uid){setSuperLikeContext("received");await resolveMatch("match","match");return;}
    const isUser1=data.users[0]===user.uid;
    const myField=isUser1?"user1Decision":"user2Decision";
    const otherField=isUser1?"user2Decision":"user1Decision";
    await updateDoc(doc(db,"blindChats",chatId),{[myField]:decision});
    const updated=(await getDoc(doc(db,"blindChats",chatId))).data();
    if(updated[otherField]){
      await resolveMatch(decision,updated[otherField]);
    } else {
      setScreen("waitDec");
      const timeout=setTimeout(()=>{updateDoc(doc(db,"blindChats",chatId),{status:"ended"}).catch(()=>{});setScreen("noMatch");},DECISION_TIMEOUT*1000);
      const unsub=onSnapshot(doc(db,"blindChats",chatId),async snap=>{
        const d=snap.data();if(d?.[otherField]){unsub();clearTimeout(timeout);await resolveMatch(decision,d[otherField]);}
      });
      addCleanup(()=>{unsub();clearTimeout(timeout);});
    }
  }

  async function resolveMatch(mine,theirs){
    await updateDoc(doc(db,"blindChats",chatId),{status:"ended"}).catch(()=>{});
    const isMatch=(mine==="match"||mine==="superlike")&&(theirs==="match"||theirs==="superlike");
    if(isMatch){
      if(user.uid<otherUid)await addDoc(collection(db,"matches"),{users:[user.uid,otherUid],createdAt:serverTimestamp(),matchedAt:serverTimestamp(),lastMessage:null});
      await addXP(XP_MATCH);
      const snap=await getDoc(doc(db,"users",otherUid));
      setOtherProfile(snap.exists()?snap.data():{name:"?"});
      setScreen("matchReveal");
    } else {setScreen("noMatch");}
  }

  async function reportBlind(reason){
    await addDoc(collection(db,"reports"),{reporter:user.uid,reported:otherUid,reason,chatId,createdAt:serverTimestamp()});
  }

  const center={display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",padding:40,textAlign:"center"};
  const referralCode=user?user.uid.slice(0,8).toUpperCase():"";

  return <TC.Provider value={T}>
    <LC.Provider value={{lang,t}}>
    <div style={{minHeight:"100vh",background:T.bg,backgroundImage:T.bgGrad,color:T.text,transition:"background .4s,color .4s"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${T.bg};-webkit-font-smoothing:antialiased}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes scaleIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes glow{0%,100%{box-shadow:0 10px 40px ${T.accentGlow}}50%{box-shadow:0 14px 60px ${T.accentGlow},0 0 100px ${T.accentGlow}}}
        @keyframes shimmer{0%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.008)}100%{opacity:.6;transform:scale(1)}}
        input::placeholder,textarea::placeholder{color:${T.textD}}
        button:focus-visible{outline:2px solid ${T.accent};outline-offset:2px}
        .grain{position:fixed;inset:0;pointer-events:none;z-index:9998;opacity:${T.name==="dark"?"0.045":"0.025"};background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E");}
      `}</style>
      <div className="grain" aria-hidden="true"/>

      {screen==="loading"&&<div style={center}><div style={{width:36,height:36,border:`3px solid ${T.border}`,borderTopColor:T.accent,borderRadius:"50%",animation:"spin .8s linear infinite"}}/></div>}
      {screen==="auth"&&<AuthScreen/>}
      {screen==="setup"&&user&&<Setup user={user} onDone={p=>{setProfile(p);setBonuses(p.bonuses||DEF_BONUS);listenMatches(user.uid);setScreen("main");}}/>}

      {screen==="main"&&profile&&<>
        {tab==="home"&&<HomeTab profile={profile} onStart={startChat} bonuses={bonuses} streak={streak} referralCode={referralCode} onCopyReferral={copyReferralLink} referralCopied={referralCopied}/>}
        {tab==="matches"&&<MatchesTab myUid={user.uid} matches={matches} onBlock={blockUser}/>}
        {tab==="profile"&&<ProfileTab user={user} profile={profile} setProfile={setProfile} onLogout={()=>signOut(auth)} lang={lang} setLang={changeLang} thm={thm} setTheme={setTheme}/>}
        <NavBar tab={tab} setTab={setTab} n={matches.length}/>
      </>}

      {screen==="waiting"&&<div style={center}>
        <div style={{width:56,height:56,border:`3px solid ${T.border}`,borderTopColor:T.accent,borderRadius:"50%",animation:"spin 1s linear infinite",marginBottom:28}}/>
        <h2 style={{fontFamily:"'Fraunces',serif",fontSize:22,color:T.text,margin:"0 0 8px"}}>{t.searching}</h2>
        <p style={{fontFamily:"'DM Sans'",fontSize:13,color:T.textD,marginBottom:4}}>{t.waitingPlayer}</p>
        <Btn variant="ghost" onClick={cancelWaiting} style={{marginTop:24}}>{t.cancelBtn}</Btn>
      </div>}

      {screen==="chat"&&chatId&&<BlindChat chatId={chatId} myUid={user.uid} partner={partner} bonuses={bonuses} onUseBonus={consumeBonus} onTimeUp={handleTimeUp} onReport={reportBlind} lang={lang}/>}

      {screen==="decision"&&<div style={{...center,animation:"fadeIn .4s"}}>
        <div style={{width:72,height:72,borderRadius:24,background:T.accentGrad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,marginBottom:24,boxShadow:`0 8px 36px ${T.accentGlow}`,animation:"float 2s ease-in-out infinite"}}>⏰</div>
        <h2 style={{fontFamily:"'Fraunces',serif",fontSize:28,color:T.text,margin:"0 0 10px"}}>{t.timeUp}</h2>
        <p style={{fontFamily:"'DM Sans'",fontSize:14,color:T.textS,marginBottom:16}}>{t.revealQ}</p>
        {compatibility!==null&&<div style={{padding:"8px 22px",borderRadius:20,background:T.accentSoft,border:`1px solid ${T.accent}33`,fontFamily:"'DM Sans'",fontSize:13,fontWeight:800,color:T.accent,marginBottom:28}}>{t.compatScore(compatibility)}</div>}
        {compatibility===null&&<div style={{marginBottom:28}}/>}
        <div style={{display:"flex",gap:14,marginBottom:16}}>
          <Btn onClick={()=>decide("match")} style={{padding:"15px 32px",fontSize:15}}>{t.matchBtn}</Btn>
          <Btn variant="ghost" onClick={()=>decide("pass")} style={{padding:"15px 32px",fontSize:15}}>{t.passBtn}</Btn>
        </div>
        {canSuperLike(profile)
          ?<button onClick={()=>decide("superlike")} style={{background:`linear-gradient(135deg,#ff9e00,#ffbe0b)`,border:"none",borderRadius:16,padding:"12px 28px",fontFamily:"'DM Sans'",fontSize:14,fontWeight:800,color:"#000",cursor:"pointer",boxShadow:"0 6px 24px rgba(255,190,11,0.4)",letterSpacing:.3}}>⚡ {t.superLikeBtn} — Match garanti</button>
          :<div style={{fontFamily:"'DM Sans'",fontSize:12,color:T.textD}}>{t.superLikeUsed}</div>}
      </div>}

      {screen==="waitDec"&&<div style={center}>
        <div style={{width:44,height:44,border:`3px solid ${T.border}`,borderTopColor:T.accent,borderRadius:"50%",animation:"spin 1s linear infinite",marginBottom:24}}/>
        <h2 style={{fontFamily:"'Fraunces',serif",fontSize:20,color:T.text,margin:"0 0 8px"}}>{t.waitingDec}</h2>
        <p style={{fontFamily:"'DM Sans'",fontSize:13,color:T.textD,marginBottom:24}}>{t.otherDecides(DECISION_TIMEOUT)}</p>
        <Btn variant="ghost" onClick={()=>{runCleanup();setScreen("main");}}>{t.backBtn}</Btn>
      </div>}

      {screen==="matchReveal"&&otherProfile&&<div style={{position:"fixed",inset:0,zIndex:100,background:T.overlay,backdropFilter:"blur(24px)",display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeIn .3s"}}>
        <div style={{textAlign:"center",padding:36,animation:"scaleIn .4s cubic-bezier(.34,1.56,.64,1)"}}>
          <div style={{fontSize:56,marginBottom:20,animation:"float 2s ease-in-out infinite"}}>💕</div>
          <h2 style={{fontFamily:"'Fraunces',serif",fontSize:36,background:T.accentGrad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:"0 0 8px",letterSpacing:"-0.5px"}}>{t.matchTitle}</h2>
          <p style={{fontFamily:"'DM Sans'",fontSize:13,color:T.gold,marginBottom:12,fontWeight:700}}>+{XP_MATCH} XP</p>
          {compatibility!==null&&<div style={{display:"inline-block",padding:"6px 18px",borderRadius:20,background:T.accentSoft,fontFamily:"'DM Sans'",fontSize:13,fontWeight:800,color:T.accent,marginBottom:16}}>{t.compatScore(compatibility)}</div>}
          {otherProfile.photos?.[0]&&<img src={otherProfile.photos[0]} style={{width:110,height:110,borderRadius:"50%",objectFit:"cover",border:`3px solid ${T.accent}`,boxShadow:`0 0 60px ${T.accentGlow}`,marginBottom:14,display:"block",margin:"0 auto 14px"}}/>}
          <p style={{fontFamily:"'Fraunces',serif",fontSize:18,color:T.text,marginBottom:4}}>{otherProfile.name}, {otherProfile.age}</p>
          <p style={{fontFamily:"'DM Sans'",fontSize:13,color:T.textD,marginBottom:28}}>📍 {otherProfile.city}</p>
          <Btn onClick={()=>{listenMatches(user.uid);setScreen("main");setTab("matches");}}>{t.great}</Btn>
        </div>
      </div>}

      {screen==="noMatch"&&<div style={{...center,animation:"fadeIn .4s"}}>
        <div style={{width:72,height:72,borderRadius:24,background:T.surfAlt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,marginBottom:24}}>😔</div>
        <h2 style={{fontFamily:"'Fraunces',serif",fontSize:26,color:T.text,margin:"0 0 10px"}}>{t.noMatchTitle}</h2>
        <p style={{fontFamily:"'DM Sans'",fontSize:14,color:T.textS,marginBottom:32}}>{t.noMatchSub}</p>
        <Btn onClick={()=>setScreen("main")}>{t.retry}</Btn>
      </div>}
    </div>
    </LC.Provider>
  </TC.Provider>;
}
