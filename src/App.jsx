import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile, onAuthStateChanged, signOut, sendEmailVerification } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, collection, query, where, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove, getDocs, increment } from "firebase/firestore";

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
const DAILY_QUESTIONS = {
  en: ["Your most controversial hot take?","The skill you wish you had?","Describe your vibe in 3 words","Your biggest non-negotiable?","What are you oddly competitive about?","The most spontaneous thing you've done?","What's always in your fridge?","Your love language?","The thing you geek out about?","Best advice you've ever received?","What do people misunderstand about you?","Your guilty pleasure TV show?","Ideal Sunday morning?","What would your friends say about you?","The weirdest thing you find attractive?","What would you do with a free year?","Your most irrational fear?","Your most prized possession?","What's worth spending more on?","Dream dinner guest?","Last thing that made you cry laughing?","Your most embarrassing habit?","What song describes your life?","What are you currently obsessed with?","The thing you'll never apologize for?","A fact about yourself that sounds fake?","What would 10-year-old you think of you now?","Best moment of your life so far?","One thing you want to change about the world?","Your go-to karaoke song?"],
  fr: ["Ton opinion la plus impopulaire ?","Le talent que tu voudrais avoir ?","Décris ton mood en 3 mots","Ton plus grand non-négociable ?","À quoi es-tu bizarrement compétitif·ve ?","La chose la plus spontanée que tu aies faite ?","Qu'est-ce qu'il y a toujours dans ton frigo ?","Ton langage d'amour ?","Ce sur quoi tu peux parler des heures ?","Le meilleur conseil qu'on t'ait donné ?","Ce que les gens comprennent mal de toi ?","Ta série coupable ?","Dimanche matin idéal ?","Ce que tes amis diraient de toi ?","La chose la plus bizarre que tu trouves attirant·e ?","Que ferais-tu avec un an libre ?","Ta peur la plus irrationnelle ?","Ton objet le plus précieux ?","Sur quoi tu ne regrettes jamais de dépenser ?","Ton invité de rêve à dîner ?","La dernière chose qui t'a fait mourir de rire ?","Ton habitude la plus gênante ?","Quelle chanson décrit ta vie ?","Ce sur quoi tu es obsédé·e en ce moment ?","La chose dont tu ne t'excuseras jamais ?","Un fait sur toi qui semble inventé ?","Que penserait ton toi de 10 ans de toi maintenant ?","Le meilleur moment de ta vie jusqu'ici ?","Une chose que tu voudrais changer dans le monde ?","Ta chanson de karaoké préférée ?"]
};
function getDailyQuestion(lang){
  const qs=DAILY_QUESTIONS[lang]||DAILY_QUESTIONS.en;
  const start=new Date(new Date().getFullYear(),0,0);
  const day=Math.floor((Date.now()-start)/(1000*60*60*24));
  return qs[day%qs.length];
}

const SPECIAL_EVENTS = [
  {id:"launch",emoji:"🚀",months:[3,4,5],days:null,label:{en:"Grand Launch — Double XP!",fr:"Grand Lancement — XP ×2 !"},color:"#ff1f52",doubleXP:true},
  {id:"valentine",emoji:"💝",months:[2],days:[13,14,15],label:{en:"Valentine's Day 💕",fr:"Saint-Valentin 💕"},color:"#ff1f52"},
  {id:"halloween",emoji:"🎃",months:[10],days:[29,30,31],label:{en:"Spooky blind dates 🎃",fr:"Dates flippants 🎃"},color:"#ff5c30"},
  {id:"newyear",emoji:"🎆",months:[12,1],days:[31,1],label:{en:"New Year sparks ✨",fr:"Étincelles du Nouvel An ✨"},color:"#ff9e00"},
  {id:"summer",emoji:"☀️",months:[6,7,8],days:null,label:{en:"Summer vibes ☀️",fr:"Vibrations d'été ☀️"},color:"#ffbe0b"},
];
const DAILY_LIMIT = 7;
const DAILY_LIMIT_GOLD = 20;
const DEF_PREF = {gender:"all",ageMin:18,ageMax:60,cityMatch:false};
const GH_BADGES = [
  {id:"none",emoji:"—",name:{en:"No badge",fr:"Aucun"},desc:{en:"Stay discreet — no badge shown",fr:"Reste discret·e — aucun badge affiché"}},
  {id:"crown",emoji:"👑",name:{en:"Royale",fr:"Royale"},desc:{en:"You rule the game",fr:"Tu règnes sur le jeu"}},
  {id:"fire",emoji:"🔥",name:{en:"Flame",fr:"Flamme"},desc:{en:"Intense & passionate",fr:"Intense & passionné·e"}},
  {id:"diamond",emoji:"💎",name:{en:"Diamond",fr:"Diamant"},desc:{en:"Rare, precious, unbreakable",fr:"Rare, précieux·se, indestructible"}},
  {id:"rose",emoji:"🌹",name:{en:"Romance",fr:"Romance"},desc:{en:"A hopeless romantic",fr:"Un·e romantique inconditionnel·le"}},
  {id:"moon",emoji:"🌙",name:{en:"Lunar",fr:"Lunaire"},desc:{en:"Mysterious & dreamy",fr:"Mystérieux·se & rêveur·se"}},
  {id:"star",emoji:"✨",name:{en:"Spark",fr:"Étincelle"},desc:{en:"You light up every conversation",fr:"Tu illumines chaque conversation"}},
  {id:"zap",emoji:"⚡",name:{en:"Electric",fr:"Électrique"},desc:{en:"Energy that can't be ignored",fr:"Une énergie impossible à ignorer"}},
  {id:"magic",emoji:"🎭",name:{en:"Mystery",fr:"Mystère"},desc:{en:"Nobody knows who you really are",fr:"Personne ne sait vraiment qui tu es"}},
];

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
    homeNav:"Home",matchesNav:"Matches",profileNav:"Profile",extrasNav:"Extras",
    unknown:"Anonymous",iceBreak:"👋 Break the ice!",typeMessage:"Message...",
    searching:"Searching...",waitingPlayer:"Looking for someone...",cancelBtn:"Cancel",
    timeUp:"Time's up!",revealQ:"Want to know who's behind the mask?",matchBtn:"💕 Match",passBtn:"Pass →",
    waitingDec:"Waiting...",otherDecides:(n)=>`Waiting for their decision (${n}s)`,backBtn:"← Back",
    matchTitle:"It's a Match!",noMatchTitle:"Not this time",noMatchSub:"Keep going — next one might be it!",retry:"Try again ⚡",great:"Awesome 🎉",viewProfile:"See their profile 👀",theirVibeAnswers:"Their vibe answers",yourVibeAnswers:"Your vibe answers",
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
    dailyQLabel:"Today's question 💬",dailyQPlaceholder:"Your answer...",dailyQSave:"Save",dailyQSaved:"Answered ✓",dailyQPartner:"Their question of the day",
    ghTitle:"Golden Heart",ghSub:"Unlock your full dating potential",ghActivate:"Start free 30-day trial",ghActive:"Active ✓",ghExpires:(d)=>`Expires in ${d} days`,ghBadgePick:"Choose your badge",ghBadgeActive:"Your active badge",ghBoost:"Boost",ghBoostDesc:"Push your profile to the top for 30 min",ghPerks:["20 blind dates per day","2 Super Likes every day","3 bonus credits per day","Exclusive profile badge","Boost × 1 per day","Early compatibility score"],
    prefTitle:"Matching preferences",prefGender:"Looking for",prefGenderAll:"Everyone",prefGenderMan:"Men",prefGenderWoman:"Women",prefAge:"Age range",prefCity:"City match (Golden Heart)",prefCityDesc:"Only match with people in your city",prefSave:"Save preferences",prefSaved:"Saved ✓",
    spinTitle:"Golden Wheel",spinDesc:"Spin once a day — we find your best match automatically",spinBtn:"🎡 Spin",spinUsed:"Already spun today — come back tomorrow",spinSearching:"Finding your match...",spinNoMatch:"No compatible match found today. Try tomorrow!",
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
    homeNav:"Accueil",matchesNav:"Matchs",profileNav:"Profil",extrasNav:"Extras",
    unknown:"Inconnu·e",iceBreak:"👋 Brise la glace !",typeMessage:"Écris...",
    searching:"Recherche...",waitingPlayer:"En attente d'un autre joueur",cancelBtn:"Annuler",
    timeUp:"Temps écoulé !",revealQ:"Découvrir qui se cache derrière ?",matchBtn:"💕 Matcher",passBtn:"Passer →",
    waitingDec:"En attente...",otherDecides:(n)=>`L'autre décide (max ${n}s)`,backBtn:"← Retour",
    matchTitle:"Match !",noMatchTitle:"Pas cette fois",noMatchSub:"La prochaine sera la bonne !",retry:"Réessayer ⚡",great:"Super 🎉",viewProfile:"Voir son profil 👀",theirVibeAnswers:"Ses réponses vibe",yourVibeAnswers:"Tes réponses vibe",
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
    dailyQLabel:"Question du jour 💬",dailyQPlaceholder:"Ta réponse...",dailyQSave:"Sauver",dailyQSaved:"Répondu ✓",dailyQPartner:"Sa question du jour",
    ghTitle:"Golden Heart",ghSub:"Libère ton plein potentiel de rencontre",ghActivate:"Essai gratuit 30 jours",ghActive:"Actif ✓",ghExpires:(d)=>`Expire dans ${d} jours`,ghBadgePick:"Choisir ton badge",ghBadgeActive:"Ton badge actif",ghBoost:"Boost",ghBoostDesc:"Remonte au top de la file pendant 30 min",ghPerks:["20 blind dates par jour","2 Super Likes chaque jour","3 crédits bonus par jour","Badge de profil exclusif","Boost × 1 par jour","Score de compatibilité débloqué tôt"],
    prefTitle:"Préférences de matching",prefGender:"Je cherche",prefGenderAll:"Tout le monde",prefGenderMan:"Des hommes",prefGenderWoman:"Des femmes",prefAge:"Tranche d'âge",prefCity:"Match par ville (Golden Heart)",prefCityDesc:"Ne matcher qu'avec des gens de ma ville",prefSave:"Sauvegarder",prefSaved:"Sauvegardé ✓",
    spinTitle:"Roue Dorée",spinDesc:"Lance une fois par jour — on trouve ton meilleur match automatiquement",spinBtn:"🎡 Lancer",spinUsed:"Déjà lancé aujourd'hui — reviens demain",spinSearching:"Recherche de ton match...",spinNoMatch:"Aucun match compatible trouvé aujourd'hui. Réessaie demain !",
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
  const ghActive = profile.goldenHeart?.active && profile.goldenHeart?.expiresAt?.toDate?.()>new Date();
  const ghBonus = ghActive ? 3 : 0;
  const totalBonus = bonusAwarded + ghBonus;
  const updates = {streak:newStreak,lastLoginDate:today};
  if (totalBonus>0) {
    updates["bonuses.city"]=increment(totalBonus);
    updates["bonuses.ice"]=increment(totalBonus);
    updates["bonuses.peek"]=increment(totalBonus);
    updates["bonuses.anon"]=increment(totalBonus);
  }
  if (newStreak>0 && newStreak%7===0 && !ghActive) updates.superLikes=increment(1);
  if (ghActive) updates.superLikes=2;
  await updateDoc(doc(db,"users",uid),updates);
  return {streak:newStreak,bonusAwarded:totalBonus};
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
  const StarIcon=()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
  const UserIcon=()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
  const items=[{id:"home",label:t.homeNav,Icon:HomeIcon},{id:"matches",label:t.matchesNav,Icon:ChatIcon},{id:"extras",label:t.extrasNav,Icon:StarIcon},{id:"profile",label:t.profileNav,Icon:UserIcon}];
  const pillBg = T.name==="dark" ? "rgba(12,9,16,0.88)" : "rgba(255,255,255,0.9)";
  const pillBorder = T.name==="dark" ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.08)";
  return <div style={{position:"fixed",bottom:"calc(18px + var(--sab))",left:"50%",transform:"translateX(-50%)",zIndex:50,background:pillBg,backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",borderRadius:32,border:pillBorder,display:"flex",padding:6,boxShadow:T.name==="dark"?"0 8px 40px rgba(0,0,0,0.55),inset 0 1px 0 rgba(255,255,255,0.04)":"0 8px 40px rgba(0,0,0,0.14)"}}>
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

// ── PHOTO CROPPER ──

function PhotoCropper({file,onCrop,onCancel}) {
  const T=useT();
  const S=Math.min(window.innerWidth-48,360);
  const [imgSrc,setImgSrc]=useState(null);
  const [nat,setNat]=useState({w:1,h:1});
  const [pos,setPos]=useState({x:0,y:0});
  const [zoom,setZoom]=useState(1);
  const imgElRef=useRef(null);
  const dragRef=useRef(null);
  const pinchRef=useRef(null);
  const containerRef=useRef(null);

  useEffect(()=>{
    const url=URL.createObjectURL(file);
    setImgSrc(url);
    return()=>URL.revokeObjectURL(url);
  },[file]);

  // Non-passive wheel listener (needed for preventDefault on Chrome/Safari)
  useEffect(()=>{
    const el=containerRef.current;if(!el)return;
    function onWheel(e){
      e.preventDefault();
      setZoom(z=>{
        const min=Math.max(S/nat.w,S/nat.h);
        const nz=Math.max(min,Math.min(5,z*(e.deltaY>0?0.92:1.09)));
        setPos(p=>clamp(p.x,p.y,nz));
        return nz;
      });
    }
    el.addEventListener('wheel',onWheel,{passive:false});
    return()=>el.removeEventListener('wheel',onWheel);
  },[nat,S]);

  function clamp(x,y,z){
    const mx=Math.max(0,(nat.w*z-S)/2);
    const my=Math.max(0,(nat.h*z-S)/2);
    return{x:Math.max(-mx,Math.min(mx,x)),y:Math.max(-my,Math.min(my,y))};
  }

  function onLoad(e){
    const w=e.target.naturalWidth,h=e.target.naturalHeight;
    setNat({w,h});
    const z=Math.max(S/w,S/h);
    setZoom(z);setPos({x:0,y:0});
  }

  function onMouseDown(e){e.preventDefault();dragRef.current={sx:e.clientX-pos.x,sy:e.clientY-pos.y};}
  function onMouseMove(e){
    if(!dragRef.current)return;
    setPos(clamp(e.clientX-dragRef.current.sx,e.clientY-dragRef.current.sy,zoom));
  }
  function onMouseUp(){dragRef.current=null;}

  function onTouchStart(e){
    if(e.touches.length===1){
      dragRef.current={sx:e.touches[0].clientX-pos.x,sy:e.touches[0].clientY-pos.y};
      pinchRef.current=null;
    } else if(e.touches.length===2){
      dragRef.current=null;
      pinchRef.current={dist:Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY),zoom};
    }
  }
  function onTouchMove(e){
    e.preventDefault();
    if(e.touches.length===1&&dragRef.current){
      setPos(clamp(e.touches[0].clientX-dragRef.current.sx,e.touches[0].clientY-dragRef.current.sy,zoom));
    } else if(e.touches.length===2&&pinchRef.current){
      const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
      const min=Math.max(S/nat.w,S/nat.h);
      const nz=Math.max(min,Math.min(5,pinchRef.current.zoom*d/pinchRef.current.dist));
      setZoom(nz);setPos(p=>clamp(p.x,p.y,nz));
    }
  }
  function onTouchEnd(){dragRef.current=null;pinchRef.current=null;}

  function handleCrop(){
    const img=imgElRef.current;if(!img)return;
    const canvas=document.createElement('canvas');
    canvas.width=S;canvas.height=S;
    const ctx=canvas.getContext('2d');
    ctx.drawImage(img,S/2+pos.x-nat.w*zoom/2,S/2+pos.y-nat.h*zoom/2,nat.w*zoom,nat.h*zoom);
    canvas.toBlob(blob=>onCrop(blob),'image/jpeg',0.92);
  }

  const imgLeft=S/2+pos.x-nat.w*zoom/2;
  const imgTop=S/2+pos.y-nat.h*zoom/2;

  return <div style={{position:"fixed",inset:0,zIndex:2000,background:"rgba(0,0,0,0.94)",backdropFilter:"blur(18px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
    <p style={{fontFamily:"'DM Sans'",fontWeight:800,color:"#fff",fontSize:16,marginBottom:18}}>Cadrer la photo</p>
    <div ref={containerRef} style={{position:"relative",width:S,height:S,borderRadius:20,overflow:"hidden",border:"2px solid rgba(255,255,255,0.2)",cursor:"grab",touchAction:"none",background:"#111",userSelect:"none"}}
      onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {imgSrc&&<img ref={imgElRef} src={imgSrc} onLoad={onLoad} draggable={false}
        style={{position:"absolute",left:imgLeft,top:imgTop,width:nat.w*zoom,height:nat.h*zoom,pointerEvents:"none",userSelect:"none",display:"block"}}/>}
      {!imgSrc&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{width:28,height:28,border:"3px solid rgba(255,255,255,0.2)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
      </div>}
      <div style={{position:"absolute",inset:0,pointerEvents:"none",backgroundImage:`linear-gradient(rgba(255,255,255,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.06) 1px,transparent 1px)`,backgroundSize:`${S/3}px ${S/3}px`}}/>
      <div style={{position:"absolute",inset:0,pointerEvents:"none",boxShadow:"inset 0 0 0 2px rgba(255,255,255,0.2)",borderRadius:18}}/>
    </div>
    <p style={{fontFamily:"'DM Sans'",fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:12,marginBottom:22}}>Glisse · Scroll ou pinch pour zoomer</p>
    <div style={{display:"flex",gap:12}}>
      <button onClick={onCancel} style={{padding:"13px 26px",borderRadius:14,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",color:"#fff",fontFamily:"'DM Sans'",fontSize:13,fontWeight:700,cursor:"pointer"}}>Annuler</button>
      <button onClick={handleCrop} disabled={!imgSrc} style={{padding:"13px 26px",borderRadius:14,background:T.accentGrad,border:"none",color:"#fff",fontFamily:"'DM Sans'",fontSize:13,fontWeight:800,cursor:"pointer",opacity:imgSrc?1:0.5}}>Utiliser ✓</button>
    </div>
  </div>;
}

// ── GOLDEN HEART ──

function GoldenHeartModal({user,profile,onClose,onActivated,lang}) {
  const T=useT();
  const {t}=useL();
  const gh=profile.goldenHeart;
  const isActive=gh?.active&&gh?.expiresAt?.toDate?.()>new Date();
  const daysLeft=isActive?Math.max(1,Math.ceil((gh.expiresAt.toDate()-new Date())/(1000*60*60*24))):0;
  const [activating,setActivating]=useState(false);
  const [payError,setPayError]=useState(null);
  const [badge,setBadge]=useState(gh?.badge||GH_BADGES[0].id);
  const perkIcons=["📅","⚡","🎁","🏅","🚀","💕"];

  async function activate(){
    setActivating(true);setPayError(null);
    try{
      const res=await fetch("/api/create-checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:user.uid})});
      const data=await res.json();
      if(!res.ok||!data.url){setPayError(data.error||"Erreur serveur");setActivating(false);return;}
      window.location.href=data.url;
    }catch(e){
      setPayError("Connexion impossible. Réessaie.");
      setActivating(false);
    }
  }

  async function pickBadge(id){
    setBadge(id);
    if(isActive)await updateDoc(doc(db,"users",user.uid),{"goldenHeart.badge":id});
  }

  return <div style={{position:"fixed",inset:0,zIndex:900,display:"flex",flexDirection:"column",animation:"fadeIn .25s"}}>
    <div style={{flex:1,background:"linear-gradient(180deg,#1a0a00 0%,#0c0602 100%)",overflowY:"auto",padding:"calc(28px + var(--sat)) 20px 140px"}}>
      {/* close */}
      <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,0.5)",cursor:"pointer",fontSize:22,lineHeight:1,marginBottom:20}}>✕</button>

      {/* Hero */}
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{width:80,height:80,borderRadius:28,background:"linear-gradient(135deg,#f59e0b,#fbbf24,#f97316)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,margin:"0 auto 18px",boxShadow:"0 10px 60px rgba(245,158,11,0.6)",animation:"float 3s ease-in-out infinite"}}>💛</div>
        <h1 style={{fontFamily:"'Fraunces',serif",fontSize:34,fontWeight:700,background:"linear-gradient(135deg,#f59e0b,#fbbf24)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:6,letterSpacing:"-0.5px"}}>{t.ghTitle}</h1>
        <p style={{fontFamily:"'DM Sans'",fontSize:13,color:"rgba(255,255,255,0.5)"}}>{t.ghSub}</p>
      </div>

      {/* Status badge */}
      {isActive&&<div style={{padding:"12px 20px",borderRadius:16,background:"rgba(245,158,11,0.12)",border:"1.5px solid rgba(245,158,11,0.35)",marginBottom:22,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontFamily:"'DM Sans'",fontSize:14,fontWeight:800,color:"#fbbf24"}}>{t.ghActive}</span>
        <span style={{fontFamily:"'DM Sans'",fontSize:12,color:"rgba(255,255,255,0.45)"}}>{t.ghExpires(daysLeft)}</span>
      </div>}

      {/* Perks */}
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:28}}>
        {t.ghPerks.map((p,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:16,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)"}}>
          <span style={{fontSize:20,flexShrink:0}}>{perkIcons[i]}</span>
          <span style={{fontFamily:"'DM Sans'",fontSize:14,fontWeight:600,color:"rgba(255,255,255,0.88)",flex:1}}>{p}</span>
          <span style={{fontSize:13,color:"#fbbf24",fontWeight:700}}>✓</span>
        </div>)}
      </div>

      {/* Badge picker */}
      <div>
        <p style={{fontFamily:"'DM Sans'",fontSize:11,fontWeight:800,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:1.2,marginBottom:12}}>{isActive?t.ghBadgeActive:t.ghBadgePick}</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {GH_BADGES.map(b=>{const sel=badge===b.id;return<button key={b.id} onClick={()=>pickBadge(b.id)} style={{padding:"12px 8px",borderRadius:16,border:`2px solid ${sel?"#f59e0b":"rgba(255,255,255,0.09)"}`,background:sel?"rgba(245,158,11,0.15)":"rgba(255,255,255,0.03)",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,transition:"all .15s",textAlign:"center"}}>
            <span style={{fontSize:24}}>{b.emoji}</span>
            <span style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:800,color:sel?"#fbbf24":"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:.5}}>{b.name[lang]||b.name.en}</span>
            <span style={{fontFamily:"'DM Sans'",fontSize:9,color:"rgba(255,255,255,0.28)",lineHeight:1.3}}>{b.desc[lang]||b.desc.en}</span>
          </button>;})}
        </div>
      </div>
    </div>

    {/* CTA */}
    {!isActive&&<div style={{position:"fixed",bottom:0,left:0,right:0,padding:"16px 20px 28px",background:"linear-gradient(to top,rgba(12,6,2,1) 60%,transparent)",paddingTop:32}}>
      <button onClick={activate} disabled={activating} style={{width:"100%",padding:"17px",borderRadius:20,border:"none",background:activating?"rgba(245,158,11,0.4)":"linear-gradient(135deg,#f59e0b,#fbbf24,#f97316)",color:"#000",fontFamily:"'DM Sans'",fontSize:16,fontWeight:900,cursor:activating?"default":"pointer",boxShadow:"0 8px 40px rgba(245,158,11,0.5)",letterSpacing:0.3}}>
        {activating?"Redirection…":`${t.ghActivate} — 4,99 € 💛`}
      </button>
      {payError&&<p style={{fontFamily:"'DM Sans'",fontSize:12,color:"#f87171",textAlign:"center",marginTop:8,fontWeight:700}}>{payError}</p>}
      <p style={{fontFamily:"'DM Sans'",fontSize:11,color:"rgba(255,255,255,0.3)",textAlign:"center",marginTop:8}}>Paiement sécurisé via Stripe · 30 jours</p>
    </div>}
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
  const [verifyScreen,setVerifyScreen]=useState(false);
  const [resent,setResent]=useState(false);
  const [checking,setChecking]=useState(false);

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
        if(urlRef){const ok=await applyReferral(c.user.uid,urlRef);if(ok)window.history.replaceState({},"",window.location.pathname);}
        await sendEmailVerification(c.user);
        setVerifyScreen(true);setLd(false);return;
      } else {
        const cred=await signInWithEmailAndPassword(auth,email,pass);
        if(!cred.user.emailVerified){
          await sendEmailVerification(cred.user).catch(()=>{});
          setVerifyScreen(true);setLd(false);return;
        }
      }
    } catch(e){
      setErr({"auth/email-already-in-use":t.errEmailUsed,"auth/user-not-found":t.errNoUser,"auth/invalid-credential":t.errBadCred}[e.code]||e.message);
    }
    setLd(false);
  }

  async function checkVerified(){
    setChecking(true);
    await auth.currentUser?.reload();
    if(auth.currentUser?.emailVerified){
      // onAuthStateChanged will fire and handle navigation
      setVerifyScreen(false);
    } else {
      setErr("Email pas encore vérifié. Vérifie ta boîte mail.");
    }
    setChecking(false);
  }

  async function resendEmail(){
    await sendEmailVerification(auth.currentUser).catch(()=>{});
    setResent(true);setTimeout(()=>setResent(false),4000);
  }

  if(verifyScreen){
    return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:380,textAlign:"center",animation:"fadeIn .5s"}}>
        <div style={{fontSize:56,marginBottom:20}}>📬</div>
        <h2 style={{fontFamily:"'Fraunces',serif",fontSize:26,fontWeight:700,color:T.text,marginBottom:10}}>Vérifie ton email</h2>
        <p style={{fontFamily:"'DM Sans'",fontSize:14,color:T.textS,marginBottom:8,lineHeight:1.6}}>On t'a envoyé un lien de vérification à</p>
        <p style={{fontFamily:"'DM Sans'",fontSize:14,fontWeight:800,color:T.accent,marginBottom:28}}>{email||auth.currentUser?.email}</p>
        {err&&<div style={{padding:"10px 16px",borderRadius:12,background:`${T.danger}12`,border:`1px solid ${T.danger}25`,color:T.danger,fontSize:13,fontFamily:"'DM Sans'",marginBottom:16}}>{err}</div>}
        <Btn full onClick={checkVerified} disabled={checking} style={{marginBottom:12}}>{checking?"Vérification…":"J'ai vérifié mon email ✓"}</Btn>
        <Btn full variant="ghost" onClick={resendEmail} disabled={resent}>{resent?"Email renvoyé ✓":"Renvoyer l'email"}</Btn>
        <button onClick={()=>{signOut(auth);setVerifyScreen(false);}} style={{marginTop:20,background:"none",border:"none",fontFamily:"'DM Sans'",fontSize:12,color:T.textD,cursor:"pointer"}}>← Retour</button>
      </div>
    </div>;
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
  const [cropSrc,setCropSrc]=useState(null);
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
          <input ref={fileRef} type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(!f)return;setCropSrc(f);e.target.value="";}} style={{display:"none"}}/>
          {uploading&&<p style={{fontFamily:"'DM Sans'",fontSize:12,color:T.textD,textAlign:"center",marginTop:10}}>{t.faceChecking}</p>}
          {cropSrc&&<PhotoCropper file={cropSrc} onCrop={blob=>{const f=new File([blob],"photo.jpg",{type:"image/jpeg"});setPhotoFile(f);setPreview(URL.createObjectURL(blob));setCropSrc(null);}} onCancel={()=>setCropSrc(null)}/>}
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

function ExtrasTab({profile,bonuses,referralCode,onCopyReferral,referralCopied,isGH,onOpenGH,onSpin,onSavePrefs,lang}) {
  const T=useT();
  const {t}=useL();
  const bonusTypes=BONUS_TYPES[lang];
  const BONUS_DESC={
    en:{city:"Unlock your partner's city for 30s after the chat",ice:"Get an icebreaker question suggestion",peek:"Reveal a hint about your partner's personality",anon:"Stay anonymous even after a mutual match"},
    fr:{city:"Révèle la ville de ton partenaire 30s après le chat",ice:"Obtiens une suggestion de brise-glace",peek:"Révèle un indice sur la personnalité de ton partenaire",anon:"Reste anonyme même après un match mutuel"},
  };
  const desc=BONUS_DESC[lang]||BONUS_DESC.en;

  // Pref state (loaded from profile)
  const initPref={...DEF_PREF,...(profile.pref||{})};
  const [prefGender,setPrefGender]=useState(initPref.gender);
  const [prefAgeMin,setPrefAgeMin]=useState(initPref.ageMin);
  const [prefAgeMax,setPrefAgeMax]=useState(initPref.ageMax);
  const [prefCity,setPrefCity]=useState(initPref.cityMatch);
  const [prefSaved,setPrefSaved]=useState(false);
  async function savePrefs(){
    const pref={gender:prefGender,ageMin:Number(prefAgeMin),ageMax:Number(prefAgeMax),cityMatch:prefCity&&isGH};
    await onSavePrefs(pref);
    setPrefSaved(true);setTimeout(()=>setPrefSaved(false),2000);
  }

  const today=getTodayStr();
  const spinUsed=profile.lastSpinDate===today;
  const [spinning,setSpinning]=useState(false);
  async function doSpin(){
    if(spinUsed){alert(t.spinUsed);return;}
    setSpinning(true);
    await onSpin();
    setSpinning(false);
  }

  const gOpts=[{v:"all",label:t.prefGenderAll},{v:"man",label:t.prefGenderMan},{v:"woman",label:t.prefGenderWoman}];

  return <div style={{padding:"20px 16px",maxWidth:440,margin:"0 auto",paddingBottom:100}}>
    {/* Golden Heart banner */}
    <button onClick={onOpenGH} style={{width:"100%",padding:"16px 18px",borderRadius:20,marginBottom:14,border:`1.5px solid ${isGH?"rgba(245,158,11,0.45)":"rgba(245,158,11,0.2)"}`,background:isGH?"linear-gradient(135deg,rgba(245,158,11,0.15),rgba(251,191,36,0.06))":"rgba(245,158,11,0.06)",cursor:"pointer",display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
      <div style={{width:44,height:44,borderRadius:14,background:"linear-gradient(135deg,#f59e0b,#fbbf24)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,boxShadow:"0 4px 16px rgba(245,158,11,0.4)"}}>💛</div>
      <div style={{flex:1}}>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:16,fontWeight:700,color:"#f59e0b",display:"flex",alignItems:"center",gap:6}}>
          {t.ghTitle}{isGH&&<span style={{fontSize:10,fontFamily:"'DM Sans'",fontWeight:800,padding:"2px 7px",borderRadius:6,background:"rgba(245,158,11,0.2)",color:"#fbbf24"}}>{t.ghActive}</span>}
        </div>
        <div style={{fontFamily:"'DM Sans'",fontSize:11,color:"rgba(245,158,11,0.65)",marginTop:2}}>{isGH?"20 dates · roue dorée · badges":"20 dates · badges · super likes →"}</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" opacity="0.6"><polyline points="9 18 15 12 9 6"/></svg>
    </button>

    {/* Golden Wheel — GH only */}
    {isGH&&<Card style={{padding:18,marginBottom:14,border:`1px solid rgba(245,158,11,0.25)`,background:"linear-gradient(135deg,rgba(245,158,11,0.06),transparent)"}}>
      <Label>🎡 {t.spinTitle}</Label>
      <p style={{fontFamily:"'DM Sans'",fontSize:12,color:T.textS,lineHeight:1.5,marginBottom:14}}>{t.spinDesc}</p>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <button onClick={doSpin} disabled={spinUsed||spinning} style={{flex:1,padding:"15px 20px",borderRadius:16,border:"none",background:spinUsed?"transparent":spinning?"rgba(245,158,11,0.2)":"linear-gradient(135deg,#f59e0b,#fbbf24)",color:spinUsed?T.textD:spinning?"#f59e0b":"#000",fontFamily:"'DM Sans'",fontSize:15,fontWeight:900,cursor:spinUsed||spinning?"default":"pointer",boxShadow:spinUsed||spinning?"none":"0 6px 24px rgba(245,158,11,0.35)",transition:"all .3s",border:spinUsed?`1px solid ${T.border}`:spinning?"1px solid rgba(245,158,11,0.4)":"none"}}>
          <span style={{display:"inline-block",animation:spinning?"spin 0.6s linear infinite":"none"}}>{spinning?"🎡":t.spinBtn}</span>
        </button>
        {spinUsed&&<div style={{fontFamily:"'DM Sans'",fontSize:11,color:T.textD,flex:1,lineHeight:1.4}}>✓ {t.spinUsed}</div>}
      </div>
    </Card>}

    {/* Matching prefs */}
    <Card style={{padding:18,marginBottom:14}}>
      <Label>🎯 {t.prefTitle}</Label>
      <div style={{marginBottom:12}}>
        <div style={{fontFamily:"'DM Sans'",fontSize:11,fontWeight:700,color:T.textS,marginBottom:7}}>{t.prefGender}</div>
        <div style={{display:"flex",gap:6}}>
          {gOpts.map(o=><button key={o.v} onClick={()=>setPrefGender(o.v)} style={{flex:1,padding:"9px 4px",borderRadius:12,border:`1.5px solid ${prefGender===o.v?T.accent:T.border}`,background:prefGender===o.v?T.accentSoft:"transparent",color:prefGender===o.v?T.accent:T.textS,fontFamily:"'DM Sans'",fontSize:12,fontWeight:700,cursor:"pointer",transition:"all .15s"}}>{o.label}</button>)}
        </div>
      </div>
      <div style={{marginBottom:12}}>
        <div style={{fontFamily:"'DM Sans'",fontSize:11,fontWeight:700,color:T.textS,marginBottom:7}}>{t.prefAge} — {prefAgeMin} → {prefAgeMax}</div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <input type="range" min={18} max={70} value={prefAgeMin} onChange={e=>setPrefAgeMin(Math.min(Number(e.target.value),prefAgeMax-1))} style={{flex:1,accentColor:T.accent}}/>
          <span style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:800,color:T.accent,minWidth:26,textAlign:"center"}}>{prefAgeMin}</span>
          <input type="range" min={18} max={70} value={prefAgeMax} onChange={e=>setPrefAgeMax(Math.max(Number(e.target.value),prefAgeMin+1))} style={{flex:1,accentColor:T.accent}}/>
          <span style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:800,color:T.accent,minWidth:26,textAlign:"center"}}>{prefAgeMax}</span>
        </div>
      </div>
      {isGH&&<div style={{marginBottom:14}}>
        <button onClick={()=>setPrefCity(v=>!v)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",background:prefCity?"rgba(245,158,11,0.1)":T.surfAlt,border:`1.5px solid ${prefCity?"rgba(245,158,11,0.4)":T.border}`,borderRadius:14,padding:"11px 14px",cursor:"pointer",transition:"all .2s"}}>
          <div style={{textAlign:"left"}}>
            <div style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:700,color:prefCity?"#f59e0b":T.text}}>📍 {t.prefCity}</div>
            <div style={{fontFamily:"'DM Sans'",fontSize:11,color:T.textS,marginTop:2}}>{t.prefCityDesc}</div>
          </div>
          <div style={{width:36,height:20,borderRadius:10,background:prefCity?"#f59e0b":T.border,position:"relative",transition:"background .2s",flexShrink:0}}>
            <div style={{position:"absolute",top:2,left:prefCity?16:2,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
          </div>
        </button>
      </div>}
      <Btn full onClick={savePrefs}>{prefSaved?t.prefSaved:t.prefSave}</Btn>
    </Card>

    {/* Bonuses */}
    <Card style={{padding:18,marginBottom:14}}>
      <Label>🎁 {t.bonusSection}</Label>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {bonusTypes.map(b=><div key={b.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:14,background:T.surfAlt,border:`1px solid ${T.border}`}}>
          <span style={{fontSize:22,flexShrink:0}}>{b.icon}</span>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:700,color:T.text}}>{b.name}</div>
            <div style={{fontFamily:"'DM Sans'",fontSize:11,color:T.textS,marginTop:1,lineHeight:1.4}}>{desc[b.id]}</div>
          </div>
          <div style={{fontFamily:"'DM Sans'",fontSize:22,fontWeight:900,color:(bonuses?.[b.id]||0)>0?T.gold:T.textD,minWidth:28,textAlign:"right"}}>{bonuses?.[b.id]||0}</div>
        </div>)}
      </div>
    </Card>

    {/* Referral */}
    <Card style={{padding:18}}>
      <Label>🔗 {t.referralTitle}</Label>
      <p style={{fontFamily:"'DM Sans'",fontSize:12,color:T.textS,marginBottom:12,lineHeight:1.5}}>{t.referralDesc}</p>
      <div style={{padding:"10px 14px",borderRadius:12,background:T.surfAlt,border:`1px solid ${T.border}`,fontFamily:"'DM Sans'",fontSize:14,fontWeight:900,color:T.text,letterSpacing:2,textAlign:"center",marginBottom:10}}>{referralCode}</div>
      <Btn full onClick={onCopyReferral} variant="ghost">{referralCopied?t.referralCopied:t.referralCopy}</Btn>
    </Card>
  </div>;
}

function HomeTab({profile,onStart,streak,isGH,dailyLimit,onOpenGH}) {
  const T=useT();
  const {lang,t}=useL();
  const event=getActiveEvent();
  const nextMilestone=Object.keys(STREAK_MILESTONES).map(Number).find(m=>m>streak);
  const dailyCount=getDailyCount(profile);
  const datesLeft=(dailyLimit||DAILY_LIMIT)-dailyCount;
  const speedDating=isSpeedDatingNow();
  const [countdownSecs,setCountdownSecs]=useState(0);
  useEffect(()=>{
    if(datesLeft>0){setCountdownSecs(0);return;}
    function calc(){const now=new Date();const mn=new Date(now);mn.setHours(24,0,0,0);return Math.max(0,Math.floor((mn-now)/1000));}
    setCountdownSecs(calc());
    const iv=setInterval(()=>setCountdownSecs(calc()),1000);
    return()=>clearInterval(iv);
  },[datesLeft]);
  const cdH=String(Math.floor(countdownSecs/3600)).padStart(2,'0');
  const cdM=String(Math.floor((countdownSecs%3600)/60)).padStart(2,'0');
  const cdS=String(countdownSecs%60).padStart(2,'0');
  const todayStr=new Date().toDateString();
  const todayQ=getDailyQuestion(lang);
  const savedAns=profile.dailyQ?.date===todayStr?profile.dailyQ.a:null;
  const [qAns,setQAns]=useState(savedAns||"");
  const [qSaved,setQSaved]=useState(!!savedAns);
  const [qSaving,setQSaving]=useState(false);
  async function saveDailyQ(){
    if(!qAns.trim())return;
    setQSaving(true);
    await updateDoc(doc(db,"users",profile.id),{dailyQ:{date:todayStr,q:todayQ,a:qAns.trim()}});
    setQSaved(true);setQSaving(false);
  }

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

    <Card style={{padding:18,marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <div style={{width:28,height:28,borderRadius:8,background:T.accentGrad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>💬</div>
        <Label style={{marginBottom:0}}>{t.dailyQLabel}</Label>
      </div>
      <p style={{fontFamily:"'DM Sans'",fontSize:13,color:T.text,fontWeight:700,lineHeight:1.5,marginBottom:10}}>{todayQ}</p>
      {qSaved
        ?<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
          <p style={{fontFamily:"'DM Sans'",fontSize:13,color:T.textS,fontStyle:"italic",flex:1,lineHeight:1.5}}>"{qAns}"</p>
          <button onClick={()=>setQSaved(false)} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:8,padding:"4px 10px",fontFamily:"'DM Sans'",fontSize:11,fontWeight:700,color:T.textD,cursor:"pointer",flexShrink:0}}>✏️</button>
        </div>
        :<div>
          <textarea value={qAns} onChange={e=>setQAns(e.target.value.slice(0,120))} placeholder={t.dailyQPlaceholder} rows={2} style={{width:"100%",padding:"10px 13px",borderRadius:12,background:T.input,border:`1.5px solid ${T.border}`,color:T.text,fontSize:13,fontFamily:"'DM Sans'",outline:"none",resize:"none",lineHeight:1.6,marginBottom:8}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontFamily:"'DM Sans'",fontSize:11,color:T.textD}}>{qAns.length}/120</span>
            <button onClick={saveDailyQ} disabled={!qAns.trim()||qSaving} style={{padding:"7px 18px",borderRadius:10,background:qAns.trim()?T.accentGrad:T.border,border:"none",color:"#fff",fontFamily:"'DM Sans'",fontSize:12,fontWeight:800,cursor:qAns.trim()?"pointer":"default",opacity:qAns.trim()?1:0.5}}>{qSaving?"…":t.dailyQSave}</button>
          </div>
        </div>}
    </Card>

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
    <div style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
        <span style={{fontFamily:"'DM Sans'",fontSize:11,fontWeight:700,color:T.textD}}>{(dailyLimit||DAILY_LIMIT)-datesLeft}/{dailyLimit||DAILY_LIMIT} dates utilisées</span>
        {datesLeft>0&&<span style={{fontFamily:"'DM Sans'",fontSize:11,fontWeight:700,color:T.accent}}>{datesLeft} restantes</span>}
      </div>
      <div style={{height:6,borderRadius:3,background:T.border,overflow:"hidden"}}>
        <div style={{width:`${(((dailyLimit||DAILY_LIMIT)-datesLeft)/(dailyLimit||DAILY_LIMIT))*100}%`,height:"100%",borderRadius:3,background:datesLeft===0?T.danger:T.accentGrad,transition:"width .8s cubic-bezier(.34,1.56,.64,1)"}}/>
      </div>
      {datesLeft===0&&<div style={{textAlign:"center",marginTop:12,padding:"12px 18px",borderRadius:16,background:T.surfAlt,border:`1px solid ${T.border}`}}>
        <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:800,color:T.textD,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Nouvelles dates dans</div>
        <div style={{fontFamily:"'DM Sans'",fontSize:28,fontWeight:900,color:T.accent,letterSpacing:3}}>{cdH}:{cdM}:{cdS}</div>
      </div>}
    </div>

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
    <div style={{position:"sticky",top:0,zIndex:10,padding:"calc(12px + var(--sat)) 16px 12px",display:"flex",alignItems:"center",gap:10,background:T.surface,borderBottom:`1px solid ${T.border}`}}>
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
  const [isPartnerTyping,setIsPartnerTyping]=useState(false);
  const [partnerLastRead,setPartnerLastRead]=useState(null);
  const scrollRef=useRef(null);
  const inputRef=useRef(null);
  const typingTimerRef=useRef(null);
  const current=matches.find(m=>m.matchId===openId);

  useEffect(()=>{
    if(!openId){setMsgs([]);return;}
    const q=query(collection(db,"matches",openId,"messages"),orderBy("createdAt","asc"));
    return onSnapshot(q,snap=>setMsgs(snap.docs.map(d=>({id:d.id,...d.data()}))));
  },[openId]);

  useEffect(()=>{
    if(!openId){setIsPartnerTyping(false);setPartnerLastRead(null);return;}
    updateDoc(doc(db,"matches",openId),{[`lastRead_${myUid}`]:serverTimestamp()}).catch(()=>{});
    const unsub=onSnapshot(doc(db,"matches",openId),snap=>{
      const data=snap.data();
      setIsPartnerTyping(!!(data?.typing&&data.typing!==myUid));
      const otherId=data?.users?.find(u=>u!==myUid);
      if(otherId)setPartnerLastRead(data?.[`lastRead_${otherId}`]?.toDate?.()??null);
    });
    return()=>unsub();
  },[openId,myUid]);

  useEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight;},[msgs,isPartnerTyping]);

  function handleMatchInput(e){
    setText(e.target.value);
    if(!openId)return;
    updateDoc(doc(db,"matches",openId),{typing:myUid}).catch(()=>{});
    if(typingTimerRef.current)clearTimeout(typingTimerRef.current);
    typingTimerRef.current=setTimeout(()=>updateDoc(doc(db,"matches",openId),{typing:null}).catch(()=>{}),2500);
  }

  async function send(){
    if(!text.trim()||!openId)return;
    const txt=text.trim();setText("");inputRef.current?.focus();
    if(typingTimerRef.current){clearTimeout(typingTimerRef.current);}
    updateDoc(doc(db,"matches",openId),{typing:null}).catch(()=>{});
    await addDoc(collection(db,"matches",openId,"messages"),{senderId:myUid,text:txt,createdAt:serverTimestamp()});
    await updateDoc(doc(db,"matches",openId),{lastMessage:txt,[`lastRead_${myUid}`]:serverTimestamp()});
    // Push notification to partner
    if(current?.otherId){
      sendPushToUser(current.otherId,"💬 Nouveau message","Tu as reçu un message sur BlindDate");
    }
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
      {msgs.map(m=>{
        const mine=m.senderId===myUid;
        const isRead=mine&&partnerLastRead&&m.createdAt?.toDate?.()&&m.createdAt.toDate()<=partnerLastRead;
        return<div key={m.id} style={{display:"flex",flexDirection:"column",alignItems:mine?"flex-end":"flex-start",marginBottom:8}}>
          <div style={{maxWidth:"72%",padding:"10px 15px",borderRadius:18,borderBottomRightRadius:mine?4:18,borderBottomLeftRadius:mine?18:4,background:mine?T.accentGrad:T.surfAlt,color:mine?"#fff":T.text,fontSize:14,lineHeight:1.5,fontFamily:"'DM Sans'",boxShadow:mine?`0 3px 12px ${T.accentGlow}`:"none"}}>{m.text}</div>
          {mine&&<span style={{fontFamily:"'DM Sans'",fontSize:10,color:isRead?T.accent:T.textD,marginTop:2,marginRight:2}}>{isRead?"✓✓":"✓"}</span>}
        </div>;
      })}
      {isPartnerTyping&&<div style={{display:"flex",justifyContent:"flex-start",marginBottom:8}}>
        <div style={{padding:"10px 14px",borderRadius:18,borderBottomLeftRadius:4,background:T.surfAlt,display:"flex",gap:5,alignItems:"center"}}>
          {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:T.textD,animation:`bounce 1s ${i*0.16}s ease-in-out infinite`}}/>)}
        </div>
      </div>}
    </div>
    <div style={{padding:"10px 12px",borderTop:`1px solid ${T.border}`,background:T.surface,display:"flex",gap:8,flexShrink:0}}>
      <input ref={inputRef} value={text} onChange={handleMatchInput} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();send();}}} placeholder={t.typeMessage} autoFocus style={{flex:1,padding:"11px 16px",borderRadius:14,background:T.input,border:`1.5px solid ${T.border}`,color:T.text,fontSize:14,fontFamily:"'DM Sans'",outline:"none"}}/>
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
  const [cropQueue,setCropQueue]=useState(null);
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

  function uploadPhoto(idx,file){setCropQueue({idx,file});}
  async function doUpload(idx,blob){
    setUpIdx(idx);
    try{const url=await upImg(blob);const np=[...ph];np[idx]=url;setPh(np);await updateDoc(doc(db,"users",user.uid),{photos:np});setProfile(p=>({...p,photos:np}));}catch(e){alert(e.message);}
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

  const pqs=PERSONALITY_Q[lang];

  const ghActive=profile?.goldenHeart?.active&&profile?.goldenHeart?.expiresAt?.toDate?.()>new Date();
  const myBadge=ghActive&&profile?.goldenHeart?.badge&&profile.goldenHeart.badge!=="none"?GH_BADGES.find(b=>b.id===profile.goldenHeart.badge):null;

  return <div style={{maxWidth:440,margin:"0 auto",paddingBottom:90}}>
    {/* Profile header card */}
    <div style={{padding:"16px 16px 0"}}>
      <Card style={{padding:16,marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:76,height:76,borderRadius:20,overflow:"hidden",flexShrink:0,border:`2.5px solid ${T.accent}`,background:T.surfAlt}}>
            {ph[0]?<img src={ph[0]} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
              :<div style={{width:"100%",height:"100%",background:T.accentGrad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,color:"#fff",fontWeight:900}}>{profile.name?.[0]||"?"}</div>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
              <span style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700,color:T.text}}>{profile.name}, {profile.age}</span>
              {myBadge&&<span style={{fontSize:14,padding:"2px 7px",borderRadius:8,background:"rgba(245,158,11,0.15)",border:"1px solid rgba(245,158,11,0.3)"}}>{myBadge.emoji}</span>}
            </div>
            {profile.city&&<div style={{fontFamily:"'DM Sans'",fontSize:12,color:T.textS,marginTop:2}}>📍 {profile.city}</div>}
            {ghActive&&<div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:800,color:"#f59e0b",marginTop:4,textTransform:"uppercase",letterSpacing:.8}}>💛 Golden Heart</div>}
          </div>
        </div>
        <div style={{marginTop:12}}><XPBar xp={profile.xp||0}/></div>
      </Card>
    </div>

    {/* Photos */}
    <div style={{padding:"0 16px",marginBottom:12}}>
      <Card style={{padding:16}}>
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
    </div>

    {/* Info */}
    <div style={{padding:"0 16px",marginBottom:12}}>
      <Card style={{padding:20}}>
        {!editing?<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <Label style={{marginBottom:0}}>{t.infoSection}</Label>
            <button onClick={()=>setEditing(true)} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:8,padding:"4px 12px",fontFamily:"'DM Sans'",fontSize:12,fontWeight:700,color:T.textS,cursor:"pointer"}}>✏️ Edit</button>
          </div>
          {profile.bio&&<p style={{fontFamily:"'DM Sans'",fontSize:13,color:T.textS,lineHeight:1.6,marginBottom:12}}>{profile.bio}</p>}
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
    </div>

    {/* Vibe answers */}
    {profile.personality&&<div style={{padding:"0 16px",marginBottom:12}}>
      <Card style={{padding:20}}>
        <Label>{t.yourVibeAnswers}</Label>
        {pqs.map((q,i)=>profile.personality[i]!==undefined&&<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:10,marginBottom:10,borderBottom:i<4?`1px solid ${T.border}`:"none"}}>
          <span style={{fontFamily:"'DM Sans'",fontSize:12,color:T.textS,flex:1,paddingRight:8}}>{q.q}</span>
          <span style={{fontFamily:"'DM Sans'",fontSize:12,fontWeight:700,color:T.accent,background:T.accentSoft,padding:"4px 10px",borderRadius:10,whiteSpace:"nowrap"}}>{q.a[profile.personality[i]]}</span>
        </div>)}
      </Card>
    </div>}

    {/* Settings */}
    <div style={{padding:"0 16px",marginBottom:12}}>
      <Card style={{padding:20}}>
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
    </div>
    <div style={{padding:"0 16px"}}><Btn variant="danger" full onClick={onLogout}>{t.logout}</Btn></div>
    {cropQueue&&<PhotoCropper file={cropQueue.file} onCrop={blob=>{doUpload(cropQueue.idx,blob);setCropQueue(null);}} onCancel={()=>setCropQueue(null)}/>}
  </div>;
}

// ── BLIND CHAT ──

function BlindChat({chatId,myUid,partner,partnerUid,bonuses,onUseBonus,onTimeUp,onReport,lang}) {
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
  const [showReport,setShowReport]=useState(false);
  const [isPartnerTyping,setIsPartnerTyping]=useState(false);
  const [selectedMsg,setSelectedMsg]=useState(null);
  const scrollRef=useRef(null);
  const inputRef=useRef(null);
  const doneRef=useRef(false);
  const typingTimerRef=useRef(null);
  const pressTimerRef=useRef(null);
  const pressMovedRef=useRef(false);
  const botBusyRef=useRef(false);
  const botReplyTimerRef=useRef(null);
  const msgsRef=useRef([]);
  const isBot=!!partner?.isBot;

  useEffect(()=>{
    const q=query(collection(db,"blindChats",chatId,"messages"),orderBy("createdAt","asc"));
    return onSnapshot(q,snap=>{
      const m=snap.docs.map(d=>({id:d.id,...d.data()}));
      setMsgs(m);
      msgsRef.current=m;
    });
  },[chatId]);

  useEffect(()=>{
    const start=Date.now();
    const iv=setInterval(()=>{
      const left=Math.max(0,CHAT_DUR-Math.floor((Date.now()-start)/1000));
      setTimeLeft(left);
      if(left<=0&&!doneRef.current){doneRef.current=true;clearInterval(iv);onTimeUp();}
    },500);
    return()=>clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // Challenge popup every 25s, 25% chance

  useEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight;},[msgs,reveals,isPartnerTyping]);

  useEffect(()=>{
    const unsub=onSnapshot(doc(db,"blindChats",chatId),snap=>{
      const data=snap.data();
      setIsPartnerTyping(!!(data?.typing&&data.typing!==myUid));
    });
    return()=>unsub();
  },[chatId,myUid]);

  // Bot: opening message after 3-6s
  useEffect(()=>{
    if(!isBot)return;
    const totalDelay=3000+Math.random()*3000;
    const typingDelay=totalDelay-1500-Math.random()*1000;
    let typingTimer,sendTimer;
    typingTimer=setTimeout(()=>{
      if(doneRef.current)return;
      setIsPartnerTyping(true);
    },typingDelay);
    sendTimer=setTimeout(async()=>{
      if(doneRef.current)return;
      setIsPartnerTyping(false);
      try{
        const res=await fetch("/api/bot-response",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({persona:{name:partner.name,age:partner.age,city:partner.city,interests:partner.interests,bio:partner.bio,gender:partner.gender},messages:[],isOpener:true,lang})});
        const {parts}=await res.json();
        if(!parts?.length||doneRef.current)return;
        await addDoc(collection(db,"blindChats",chatId,"messages"),{senderId:partnerUid,text:parts[0],createdAt:serverTimestamp()});
        if(parts[1]&&!doneRef.current){
          await new Promise(r=>setTimeout(r,800+Math.random()*700));
          setIsPartnerTyping(true);
          await new Promise(r=>setTimeout(r,700+Math.random()*600));
          setIsPartnerTyping(false);
          if(!doneRef.current)await addDoc(collection(db,"blindChats",chatId,"messages"),{senderId:partnerUid,text:parts[1],createdAt:serverTimestamp()});
        }
      }catch(e){console.error("Bot opener error:",e);setIsPartnerTyping(false);}
    },totalDelay);
    return()=>{clearTimeout(typingTimer);clearTimeout(sendTimer);setIsPartnerTyping(false);};
  },[isBot]);

  async function generateBotReply(conversationMsgs){
    if(botBusyRef.current||doneRef.current||timeLeft<8)return;
    botBusyRef.current=true;
    const lastMsg=conversationMsgs.filter(m=>m.senderId===myUid).slice(-1)[0];
    const msgLen=lastMsg?.text?.length||20;
    // Faster: 1-4s think time scaled to message length
    const thinkDelay=msgLen<20?1000+Math.random()*1500:msgLen<60?1500+Math.random()*2500:2500+Math.random()*2000;
    await new Promise(r=>setTimeout(r,thinkDelay));
    if(doneRef.current){botBusyRef.current=false;return;}
    setIsPartnerTyping(true);
    const typingDur=msgLen<20?600+Math.random()*700:msgLen<60?900+Math.random()*900:1200+Math.random()*1000;
    await new Promise(r=>setTimeout(r,typingDur));
    setIsPartnerTyping(false);
    if(doneRef.current){botBusyRef.current=false;return;}
    try{
      const history=conversationMsgs
        .filter(m=>m.senderId!=="system"&&m.text)
        .slice(-8)
        .map(m=>({role:m.senderId===myUid?"user":"assistant",content:m.text}));
      if(!history.length){botBusyRef.current=false;return;}
      const res=await fetch("/api/bot-response",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({persona:{name:partner.name,age:partner.age,city:partner.city,interests:partner.interests,bio:partner.bio,gender:partner.gender},messages:history,isOpener:false,lang})});
      const {parts}=await res.json();
      if(!parts?.length||doneRef.current){botBusyRef.current=false;return;}
      await addDoc(collection(db,"blindChats",chatId,"messages"),{senderId:partnerUid,text:parts[0],createdAt:serverTimestamp()});
      if(parts[1]&&!doneRef.current){
        await new Promise(r=>setTimeout(r,700+Math.random()*800));
        setIsPartnerTyping(true);
        await new Promise(r=>setTimeout(r,600+Math.random()*600));
        setIsPartnerTyping(false);
        if(!doneRef.current)await addDoc(collection(db,"blindChats",chatId,"messages"),{senderId:partnerUid,text:parts[1],createdAt:serverTimestamp()});
      }
    }catch(e){console.error("Bot reply error:",e);}
    botBusyRef.current=false;
  }

  async function useBonus(id){
    const c=bonuses[id]||0;if(c<=0)return;onUseBonus(id);
    if(id==="city"&&partner)setReveals(r=>[...r,`📍 ${partner.city||"?"}`]);
    if(id==="peek"&&partner){const int=partner.interests?.[Math.floor(Math.random()*(partner.interests?.length||1))];setReveals(r=>[...r,`👀 ${int||"?"}`]);}
    if(id==="ice"){const q=icebreakers[Math.floor(Math.random()*icebreakers.length)];await addDoc(collection(db,"blindChats",chatId,"messages"),{senderId:"system",text:`🎲 ${q}`,createdAt:serverTimestamp()});}
    if(id==="anon"&&partner){const a=partner.age;setReveals(r=>[...r,`🕶️ ${a?a<22?"18-21":a<25?"22-24":a<28?"25-27":"28+":"?"}`]);}
  }

  function handleInput(e){
    setText(e.target.value);
    updateDoc(doc(db,"blindChats",chatId),{typing:myUid}).catch(()=>{});
    if(typingTimerRef.current)clearTimeout(typingTimerRef.current);
    typingTimerRef.current=setTimeout(()=>updateDoc(doc(db,"blindChats",chatId),{typing:null}).catch(()=>{}),2500);
  }

  async function send(){
    if(!text.trim())return;
    const txt=text.trim();setText("");inputRef.current?.focus();
    if(typingTimerRef.current){clearTimeout(typingTimerRef.current);}
    updateDoc(doc(db,"blindChats",chatId),{typing:null}).catch(()=>{});
    await addDoc(collection(db,"blindChats",chatId,"messages"),{senderId:myUid,text:txt,createdAt:serverTimestamp()});
    if(isBot){
      // Debounce: wait 1.5s after the last message before replying (handles rapid multi-message sending)
      if(botReplyTimerRef.current) clearTimeout(botReplyTimerRef.current);
      botBusyRef.current=false; // reset so next reply can fire
      botReplyTimerRef.current=setTimeout(()=>generateBotReply(msgsRef.current),1500);
    }
  }

  async function addReaction(msgId,emoji){
    setSelectedMsg(null);
    const ref=doc(db,"blindChats",chatId,"messages",msgId);
    const snap=await getDoc(ref);
    const reactions=snap.data()?.reactions||{};
    const uids=reactions[emoji]||[];
    await updateDoc(ref,{reactions:{...reactions,[emoji]:uids.includes(myUid)?uids.filter(u=>u!==myUid):[...uids,myUid]}});
  }

  function startPress(msgId){
    pressMovedRef.current=false;
    pressTimerRef.current=setTimeout(()=>{if(!pressMovedRef.current)setSelectedMsg(msgId);},400);
  }
  function cancelPress(){if(pressTimerRef.current)clearTimeout(pressTimerRef.current);}
  function onMsgMove(){pressMovedRef.current=true;cancelPress();}


  async function handleReport(reason){
    await onReport(reason);setShowReport(false);
    if(confirm("Report sent. Block?")) {doneRef.current=true;onTimeUp();}
  }

  const reasons=[t.inappropriate,t.spam,t.fakeProfile,t.harassment,t.other];

  return <div style={{display:"flex",flexDirection:"column",height:"calc(100dvh - var(--sat))",maxWidth:440,margin:"0 auto"}}>
    {showReport&&<ReportModal title={t.reportTitle} reasons={reasons} cancel={t.cancel} onReport={handleReport} onClose={()=>setShowReport(false)}/>}
    {selectedMsg&&<div onClick={()=>setSelectedMsg(null)} style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.25)",backdropFilter:"blur(4px)"}}>
      <div onClick={e=>e.stopPropagation()} style={{display:"flex",gap:2,padding:"12px 14px",borderRadius:28,background:T.surface,border:`1px solid ${T.border}`,boxShadow:"0 12px 60px rgba(0,0,0,0.5)",animation:"scaleIn .15s ease"}}>
        {["❤️","😂","🔥","😮","👀","💀"].map(e=><button key={e} onClick={()=>addReaction(selectedMsg,e)} style={{background:"none",border:"none",fontSize:30,cursor:"pointer",padding:"6px 8px",borderRadius:14,lineHeight:1}}>{e}</button>)}
      </div>
    </div>}

    <div style={{padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${T.border}`,background:T.surface,flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:44,height:44,borderRadius:12,overflow:"hidden",flexShrink:0,position:"relative",border:`1.5px solid ${T.border}`}}>
          {partner?.photos?.[0]
            ?<img src={partner.photos[0]} style={{width:"100%",height:"100%",objectFit:"cover",filter:`blur(${Math.round(38*Math.min(1,timeLeft/10))}px)`,transform:"scale(1.2)",transition:"filter 1.4s ease"}}/>
            :<div style={{width:"100%",height:"100%",background:T.accentGrad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:"#fff"}}>?</div>}
        </div>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontFamily:"'DM Sans'",fontSize:14,fontWeight:700,color:T.text}}>{t.unknown}</span>
            {partner?.goldenHeart?.active&&partner?.goldenHeart?.badge&&partner.goldenHeart.badge!=="none"&&<span style={{fontSize:13,padding:"1px 6px",borderRadius:8,background:"rgba(245,158,11,0.18)",border:"1px solid rgba(245,158,11,0.35)"}}>
              {GH_BADGES.find(b=>b.id===partner.goldenHeart.badge)?.emoji||"💛"}
            </span>}
          </div>
          <span style={{fontFamily:"'DM Sans'",fontSize:10,color:timeLeft<=10&&timeLeft>0?T.accent:T.textD,fontWeight:timeLeft<=10?"800":"400",transition:"color .5s"}}>
            {partner?.photos?.[0]?(timeLeft<=10?`⚡ Révélation !`:`Révèle dans ${timeLeft}s`):""}
          </span>
        </div>
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


    <div ref={scrollRef} style={{flex:1,overflowY:"auto",padding:16}}>
      {msgs.length===0&&reveals.length===0&&<div style={{textAlign:"center",padding:40,fontFamily:"'DM Sans'",color:T.textD,fontSize:14}}>{t.iceBreak}</div>}
      {reveals.map((r,i)=><div key={"r"+i} style={{textAlign:"center",margin:"6px 0",padding:"8px 14px",borderRadius:14,background:T.goldSoft,border:`1px solid ${T.gold}33`,fontFamily:"'DM Sans'",fontSize:13,fontWeight:600,color:T.gold}}>{r}</div>)}
      {msgs.map(m=>{
        const mine=m.senderId===myUid;const sys=m.senderId==="system";
        if(sys)return<div key={m.id} style={{display:"flex",justifyContent:"center",marginBottom:8}}><div style={{padding:"8px 16px",borderRadius:14,background:`${T.sec}12`,border:`1px solid ${T.sec}22`,fontFamily:"'DM Sans'",fontSize:12,color:T.sec,fontWeight:600}}>{m.text}</div></div>;
        const rxns=Object.entries(m.reactions||{}).filter(([,u])=>u?.length>0);
        return<div key={m.id} style={{display:"flex",flexDirection:"column",alignItems:mine?"flex-end":"flex-start",marginBottom:8}}
          onMouseDown={()=>startPress(m.id)} onMouseUp={cancelPress} onMouseLeave={cancelPress}
          onTouchStart={()=>startPress(m.id)} onTouchEnd={cancelPress} onTouchMove={onMsgMove}>
          <div style={{maxWidth:"72%",padding:"10px 15px",borderRadius:18,borderBottomRightRadius:mine?4:18,borderBottomLeftRadius:mine?18:4,background:mine?T.accentGrad:T.surfAlt,color:mine?"#fff":T.text,fontSize:14,lineHeight:1.5,fontFamily:"'DM Sans'",boxShadow:mine?`0 3px 12px ${T.accentGlow}`:"none",userSelect:"none"}}>{m.text}</div>
          {rxns.length>0&&<div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap",justifyContent:mine?"flex-end":"flex-start"}}>
            {rxns.map(([e,u])=><button key={e} onClick={()=>addReaction(m.id,e)} style={{display:"flex",alignItems:"center",gap:3,padding:"3px 8px",borderRadius:20,border:`1px solid ${u.includes(myUid)?T.accent:T.border}`,background:u.includes(myUid)?T.accentSoft:"transparent",cursor:"pointer",fontFamily:"'DM Sans'",fontSize:12,fontWeight:700,color:T.text}}>
              <span>{e}</span>{u.length>1&&<span style={{color:T.textD,fontSize:11}}>{u.length}</span>}
            </button>)}
          </div>}
        </div>;
      })}
      {isPartnerTyping&&<div style={{display:"flex",justifyContent:"flex-start",marginBottom:8}}>
        <div style={{padding:"10px 14px",borderRadius:18,borderBottomLeftRadius:4,background:T.surfAlt,display:"flex",gap:5,alignItems:"center"}}>
          {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:T.textD,animation:`bounce 1s ${i*0.16}s ease-in-out infinite`}}/>)}
        </div>
      </div>}
    </div>

    <div style={{padding:"8px 12px",borderTop:`1px solid ${T.border}`,background:T.surface,display:"flex",gap:8,flexShrink:0}}>
      <input ref={inputRef} value={text} onChange={handleInput} onKeyDown={e=>e.key==="Enter"&&send()} placeholder={t.typeMessage} autoFocus style={{flex:1,padding:"11px 16px",borderRadius:14,background:T.input,border:`1.5px solid ${T.border}`,color:T.text,fontSize:14,fontFamily:"'DM Sans'",outline:"none"}}/>
      <button onClick={send} style={{width:44,height:44,borderRadius:12,border:"none",background:text.trim()?T.accentGrad:T.border,color:"#fff",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .2s"}}>↑</button>
    </div>
  </div>;
}

// ── LEGAL MODAL ──

function LegalModal({title,lastUpdate,children,onClose}){
  return <div style={{position:"fixed",inset:0,zIndex:3000,background:"#0d0710",overflowY:"auto",animation:"fadeIn .2s"}}>
    <div style={{maxWidth:680,margin:"0 auto",padding:"calc(24px + var(--sat)) 20px 80px"}}>
      <button onClick={onClose} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:"rgba(255,255,255,0.45)",cursor:"pointer",fontFamily:"'DM Sans'",fontSize:13,marginBottom:32,padding:0}}>← Retour</button>
      <h1 style={{fontFamily:"'Fraunces',serif",fontSize:28,fontWeight:700,color:"#fff",marginBottom:8}}>{title}</h1>
      <p style={{fontFamily:"'DM Sans'",fontSize:12,color:"rgba(255,255,255,0.25)",marginBottom:36}}>Dernière mise à jour : {lastUpdate}</p>
      <div style={{fontFamily:"'DM Sans'",fontSize:14,color:"rgba(255,255,255,0.6)",lineHeight:1.9}}>{children}</div>
    </div>
  </div>;
}

function PrivacyModal({onClose}){
  const s={h2:{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:700,color:"#fff",margin:"28px 0 10px"},p:{marginBottom:12},li:{marginBottom:6,marginLeft:16}};
  return <LegalModal title="Politique de confidentialité" lastUpdate="4 avril 2025" onClose={onClose}>
    <p style={s.p}>BlindDate (« nous ») accorde une importance capitale à la protection de vos données personnelles. Ce document vous informe sur la nature des données collectées, leur utilisation et vos droits.</p>
    <h2 style={s.h2}>1. Responsable du traitement</h2>
    <p style={s.p}>BlindDate est l'unique responsable du traitement des données collectées via l'application. Contact : <span style={{color:"rgba(255,100,100,0.8)"}}>contact@blinddate.app</span></p>
    <h2 style={s.h2}>2. Données collectées</h2>
    <p style={s.p}>Lors de votre utilisation de l'application, nous collectons :</p>
    <ul style={{paddingLeft:20,marginBottom:12}}>
      <li style={s.li}>Adresse e-mail et nom (inscription)</li>
      <li style={s.li}>Photos de profil (hébergées sur Cloudinary)</li>
      <li style={s.li}>Informations de profil : âge, ville, centres d'intérêt, bio</li>
      <li style={s.li}>Données d'activité : chats, matchs, XP, streaks</li>
      <li style={s.li}>Données de paiement (traitées par Stripe — nous ne stockons aucune donnée bancaire)</li>
    </ul>
    <h2 style={s.h2}>3. Finalités du traitement</h2>
    <p style={s.p}>Vos données sont utilisées exclusivement pour :</p>
    <ul style={{paddingLeft:20,marginBottom:12}}>
      <li style={s.li}>Fournir le service de mise en relation anonyme</li>
      <li style={s.li}>Gérer votre compte et votre abonnement</li>
      <li style={s.li}>Assurer la sécurité et prévenir les abus</li>
      <li style={s.li}>Améliorer l'expérience utilisateur</li>
    </ul>
    <h2 style={s.h2}>4. Conservation des données</h2>
    <p style={s.p}>Vos données sont conservées tant que votre compte est actif. En cas de suppression du compte, vos données sont effacées sous 30 jours, à l'exception des données légalement requises.</p>
    <h2 style={s.h2}>5. Vos droits (RGPD)</h2>
    <p style={s.p}>Conformément au Règlement Général sur la Protection des Données, vous disposez des droits suivants :</p>
    <ul style={{paddingLeft:20,marginBottom:12}}>
      <li style={s.li}><strong style={{color:"#fff"}}>Accès</strong> : obtenir une copie de vos données</li>
      <li style={s.li}><strong style={{color:"#fff"}}>Rectification</strong> : corriger des données inexactes</li>
      <li style={s.li}><strong style={{color:"#fff"}}>Suppression</strong> : demander l'effacement de vos données</li>
      <li style={s.li}><strong style={{color:"#fff"}}>Portabilité</strong> : recevoir vos données dans un format structuré</li>
      <li style={s.li}><strong style={{color:"#fff"}}>Opposition</strong> : vous opposer à certains traitements</li>
    </ul>
    <p style={s.p}>Pour exercer ces droits : <span style={{color:"rgba(255,100,100,0.8)"}}>contact@blinddate.app</span></p>
    <h2 style={s.h2}>6. Sous-traitants</h2>
    <p style={s.p}>Nous utilisons les services tiers suivants, chacun disposant de sa propre politique de confidentialité : Firebase (Google) pour l'authentification et la base de données, Cloudinary pour le stockage des photos, Stripe pour le traitement des paiements, Vercel pour l'hébergement.</p>
    <h2 style={s.h2}>7. Cookies</h2>
    <p style={s.p}>L'application utilise le stockage local (localStorage) pour mémoriser vos préférences de thème et de langue. Aucun cookie publicitaire n'est utilisé.</p>
    <h2 style={s.h2}>8. Mineurs</h2>
    <p style={s.p}>BlindDate est strictement réservé aux personnes de 18 ans et plus. Nous ne collectons pas sciemment de données concernant des mineurs.</p>
    <h2 style={s.h2}>9. Modifications</h2>
    <p style={s.p}>Cette politique peut être mise à jour. Toute modification significative vous sera notifiée via l'application.</p>
  </LegalModal>;
}

function CGUModal({onClose}){
  const s={h2:{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:700,color:"#fff",margin:"28px 0 10px"},p:{marginBottom:12},li:{marginBottom:6,marginLeft:16}};
  return <LegalModal title="Conditions Générales d'Utilisation" lastUpdate="4 avril 2025" onClose={onClose}>
    <p style={s.p}>En utilisant BlindDate, vous acceptez les présentes Conditions Générales d'Utilisation. Veuillez les lire attentivement.</p>
    <h2 style={s.h2}>1. Accès au service</h2>
    <p style={s.p}>BlindDate est un service de rencontres anonymes réservé aux personnes âgées de <strong style={{color:"#fff"}}>18 ans minimum</strong>. En vous inscrivant, vous certifiez avoir l'âge requis.</p>
    <h2 style={s.h2}>2. Compte utilisateur</h2>
    <p style={s.p}>Vous êtes responsable de la confidentialité de vos identifiants et de toute activité effectuée depuis votre compte. Vous vous engagez à fournir des informations exactes lors de l'inscription.</p>
    <h2 style={s.h2}>3. Comportements interdits</h2>
    <p style={s.p}>Il est strictement interdit de :</p>
    <ul style={{paddingLeft:20,marginBottom:12}}>
      <li style={s.li}>Harceler, menacer ou insulter d'autres utilisateurs</li>
      <li style={s.li}>Publier du contenu sexuellement explicite ou violent</li>
      <li style={s.li}>Usurper l'identité d'une autre personne</li>
      <li style={s.li}>Utiliser l'application à des fins commerciales ou de spam</li>
      <li style={s.li}>Tenter de contourner les mécanismes de sécurité</li>
      <li style={s.li}>Partager des données personnelles d'autres utilisateurs sans leur consentement</li>
    </ul>
    <h2 style={s.h2}>4. Contenu utilisateur</h2>
    <p style={s.p}>Vous conservez la propriété de vos photos et informations de profil. En les téléversant, vous nous accordez une licence d'utilisation limitée au fonctionnement du service.</p>
    <h2 style={s.h2}>5. Abonnement Golden Heart</h2>
    <p style={s.p}>L'abonnement Golden Heart est un paiement unique de <strong style={{color:"#fff"}}>4,99 € valable 30 jours</strong>. Il n'est pas renouvelé automatiquement. Aucun remboursement ne sera accordé après activation du service.</p>
    <h2 style={s.h2}>6. Modération</h2>
    <p style={s.p}>BlindDate se réserve le droit de suspendre ou supprimer tout compte qui violerait les présentes CGU, sans préavis ni remboursement.</p>
    <h2 style={s.h2}>7. Limitation de responsabilité</h2>
    <p style={s.p}>BlindDate est un outil de mise en relation. Nous ne sommes pas responsables des rencontres, relations ou incidents découlant de l'utilisation du service. L'application est fournie « en l'état », sans garantie de disponibilité permanente.</p>
    <h2 style={s.h2}>8. Droit applicable</h2>
    <p style={s.p}>Les présentes CGU sont soumises au droit français. Tout litige sera porté devant les tribunaux compétents français.</p>
    <h2 style={s.h2}>9. Contact</h2>
    <p style={s.p}>Pour toute question : <span style={{color:"rgba(255,100,100,0.8)"}}>contact@blinddate.app</span></p>
  </LegalModal>;
}

// ── INSTALL BANNER ──

function InstallBanner({uid,onClaim}){
  const T=useT();
  const [visible,setVisible]=useState(false);
  const [showSteps,setShowSteps]=useState(false);
  const [claimed,setClaimed]=useState(false);
  const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid=/android/i.test(navigator.userAgent);
  const isStandalone=window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone;

  useEffect(()=>{
    if(isStandalone)return;
    if(!(isIOS||isAndroid))return;
    if(localStorage.getItem("bd_install_dismissed"))return;
    const t=setTimeout(()=>setVisible(true),12000);
    return()=>clearTimeout(t);
  },[]);

  // Auto-detect when running as installed PWA for first time
  useEffect(()=>{
    if(!isStandalone)return;
    if(localStorage.getItem("bd_pwa_bonus_claimed"))return;
    localStorage.setItem("bd_pwa_bonus_claimed","1");
    onClaim();
  },[]);

  function dismiss(){localStorage.setItem("bd_install_dismissed","1");setVisible(false);}

  async function claim(){
    setClaimed(true);
    await onClaim();
    setTimeout(()=>{dismiss();},2200);
  }

  if(!visible)return null;

  const iosSteps=[
    {icon:"⬆️",text:'Appuie sur le bouton "Partager"'},
    {icon:"📲",text:'"Sur l\'écran d\'accueil"'},
    {icon:"✅",text:"Ajoute, puis reviens ici !"},
  ];
  const androidSteps=[
    {icon:"⋮",text:"Menu du navigateur (3 points)"},
    {icon:"📲",text:'"Ajouter à l\'écran d\'accueil"'},
    {icon:"✅",text:"Ajoute, puis reviens ici !"},
  ];
  const steps=isIOS?iosSteps:androidSteps;

  return <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:8000,padding:"0 12px 12px",animation:"slideUp .4s cubic-bezier(.34,1.56,.64,1)"}}>
    <div style={{borderRadius:22,background:"linear-gradient(135deg,#1a0a2e,#2d0a20)",border:"1px solid rgba(219,39,119,0.35)",padding:"18px 18px 16px",boxShadow:"0 -8px 60px rgba(109,40,217,0.3)"}}>
      <button onClick={dismiss} style={{position:"absolute",top:12,right:14,background:"none",border:"none",color:"rgba(255,255,255,0.35)",cursor:"pointer",fontSize:16,lineHeight:1}}>✕</button>
      {!showSteps
        ?<>
          <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:14}}>
            <div style={{width:46,height:46,borderRadius:13,overflow:"hidden",flexShrink:0}}>
              <img src="/icon.svg" style={{width:"100%",height:"100%"}} alt="BlindDate"/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:16,fontWeight:700,color:"#fff",marginBottom:3}}>Installe BlindDate 📲</div>
              <div style={{fontFamily:"'DM Sans'",fontSize:12,color:"rgba(255,255,255,0.5)",lineHeight:1.5}}>Ajoute l'app à ton écran d'accueil et reçois un <strong style={{color:"#fbbf24"}}>bonus gratuit sur tous tes items</strong> 🎁</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setShowSteps(true)} style={{flex:1,padding:"11px 16px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#7c3aed,#db2777)",color:"#fff",fontFamily:"'DM Sans'",fontSize:13,fontWeight:800,cursor:"pointer"}}>
              Comment faire →
            </button>
            {claimed
              ?<div style={{display:"flex",alignItems:"center",padding:"0 14px",borderRadius:12,background:"rgba(251,191,36,0.15)",border:"1px solid rgba(251,191,36,0.35)",fontFamily:"'DM Sans'",fontSize:13,fontWeight:800,color:"#fbbf24"}}>+3 bonus ✓</div>
              :<button onClick={claim} style={{padding:"11px 14px",borderRadius:12,border:"1px solid rgba(251,191,36,0.3)",background:"rgba(251,191,36,0.08)",color:"#fbbf24",fontFamily:"'DM Sans'",fontSize:12,fontWeight:800,cursor:"pointer",whiteSpace:"nowrap"}}>J'ai installé +2 🎁</button>}
          </div>
        </>
        :<>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:15,fontWeight:700,color:"#fff",marginBottom:14}}>{isIOS?"Sur iPhone :":"Sur Android :"}</div>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
            {steps.map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:32,height:32,borderRadius:10,background:"rgba(255,255,255,0.07)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{s.icon}</div>
              <span style={{fontFamily:"'DM Sans'",fontSize:13,color:"rgba(255,255,255,0.75)"}}>{s.text}</span>
            </div>)}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setShowSteps(false)} style={{padding:"10px 16px",borderRadius:12,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"rgba(255,255,255,0.5)",fontFamily:"'DM Sans'",fontSize:12,cursor:"pointer"}}>← Retour</button>
            {claimed
              ?<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:12,background:"rgba(251,191,36,0.15)",fontFamily:"'DM Sans'",fontSize:13,fontWeight:800,color:"#fbbf24"}}>+3 bonus reçus ✓</div>
              :<button onClick={claim} style={{flex:1,padding:"11px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#f59e0b,#fbbf24)",color:"#000",fontFamily:"'DM Sans'",fontSize:13,fontWeight:800,cursor:"pointer"}}>J'ai ajouté ! Réclamer +2 🎁</button>}
          </div>
        </>}
    </div>
  </div>;
}

// ── LANDING ──

function LandingScreen({onStart,onLogin,onPrivacy,onCGU}){
  const [scrolled,setScrolled]=useState(false);
  useEffect(()=>{
    const h=()=>setScrolled(window.scrollY>30);
    window.addEventListener("scroll",h,{passive:true});
    return()=>window.removeEventListener("scroll",h);
  },[]);

  const why=[
    {icon:"🎭",title:"Pas de photo. Pas de filtre.",desc:"Tu ne vois rien. L'autre ne voit rien. Juste deux voix dans le vide — et ça change tout."},
    {icon:"⏱️",title:"60 secondes, pas une de plus.",desc:"Pas le temps de se construire un personnage. Ce qui sort en 60s, c'est toi. Vraiment toi."},
    {icon:"💕",title:"La révélation si c'est mutuel.",desc:"Si vous vous aimez tous les deux, les masques tombent. Sinon, vous restez deux inconnus. Propre."},
    {icon:"💬",title:"Des vraies conversations.",desc:"Des questions brise-glace, des défis, des sujets qui font parler. Rien de superficiel."},
  ];

  const glow=(c,x,y,s=600)=>({position:"absolute",top:`${y}%`,left:`${x}%`,width:s,height:s,borderRadius:"50%",background:`radial-gradient(circle,${c} 0%,transparent 70%)`,pointerEvents:"none",transform:"translate(-50%,-50%)"});
  const W={fontFamily:"'DM Sans'",fontWeight:800};
  const F={fontFamily:"'Fraunces',serif"};

  return <div style={{minHeight:"100vh",background:"#0b0910",color:"#fff",overflowX:"hidden"}}>

    {/* Navbar */}
    <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:200,height:62,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 clamp(18px,5vw,56px)",background:scrolled?"rgba(11,9,16,0.92)":"transparent",backdropFilter:scrolled?"blur(18px)":"none",borderBottom:scrolled?"1px solid rgba(255,255,255,0.05)":"none",transition:"all .35s"}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:17}}>💛</span>
        <span style={{...F,fontSize:17,fontWeight:700,background:"linear-gradient(135deg,#ff1f52,#ff5c30)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>BlindDate</span>
      </div>
      <button onClick={onLogin} style={{padding:"8px 20px",borderRadius:10,border:"1px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.04)",color:"rgba(255,255,255,0.75)",fontFamily:"'DM Sans'",fontSize:13,fontWeight:700,cursor:"pointer",transition:"all .2s"}}>Se connecter</button>
    </nav>

    {/* Hero */}
    <section style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"110px clamp(20px,6vw,80px) 70px",textAlign:"center",position:"relative",overflow:"hidden"}}>
      <div style={glow("rgba(255,31,82,0.11)",50,25,800)}/>
      <div style={glow("rgba(120,40,200,0.07)",15,60,500)}/>
      <div style={{display:"inline-flex",alignItems:"center",gap:7,padding:"5px 14px",borderRadius:20,background:"rgba(255,31,82,0.09)",border:"1px solid rgba(255,31,82,0.2)",marginBottom:28}}>
        <span style={{width:5,height:5,borderRadius:"50%",background:"#ff4060",display:"inline-block",animation:"pulse 2s infinite"}}/>
        <span style={{...W,fontSize:11,color:"rgba(255,100,110,0.85)",letterSpacing:.8,textTransform:"uppercase"}}>Une rencontre différente</span>
      </div>
      <h1 style={{...F,fontSize:"clamp(40px,7.5vw,88px)",fontWeight:700,lineHeight:1.06,letterSpacing:"-2.5px",marginBottom:24}}>
        Tu ne les verras pas.<br/>
        <em style={{background:"linear-gradient(135deg,#ff1f52,#ff5c30)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontStyle:"normal"}}>Tu vas les sentir.</em>
      </h1>
      <p style={{fontFamily:"'DM Sans'",fontSize:"clamp(15px,2vw,18px)",color:"rgba(255,255,255,0.42)",maxWidth:520,lineHeight:1.8,marginBottom:14}}>
        BlindDate c'est l'opposé des apps de rencontres.<br/>Pas de photo. Pas de bio parfaite. Pas de swipe.
      </p>
      <p style={{fontFamily:"'DM Sans'",fontSize:"clamp(14px,1.7vw,16px)",color:"rgba(255,255,255,0.28)",maxWidth:460,lineHeight:1.7,marginBottom:42}}>
        Juste toi, quelqu'un d'autre, et 60 secondes pour sentir le vrai.
      </p>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
        <button onClick={onStart} style={{padding:"16px 34px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#ff1f52,#ff5c30)",color:"#fff",fontFamily:"'DM Sans'",fontSize:15,fontWeight:800,cursor:"pointer",boxShadow:"0 12px 44px rgba(255,31,82,0.3)",letterSpacing:.2,transition:"transform .15s"}} onMouseEnter={e=>e.target.style.transform="scale(1.03)"} onMouseLeave={e=>e.target.style.transform="scale(1)"}>
          Faire mon premier blind date →
        </button>
        <button onClick={onLogin} style={{padding:"16px 26px",borderRadius:14,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.04)",color:"rgba(255,255,255,0.65)",fontFamily:"'DM Sans'",fontSize:15,fontWeight:600,cursor:"pointer"}}>
          Se connecter
        </button>
      </div>
      <p style={{fontFamily:"'DM Sans'",fontSize:11,color:"rgba(255,255,255,0.17)",marginTop:20,letterSpacing:.3}}>Gratuit · Sans CB · Réservé aux +18 ans</p>
    </section>

    {/* Manifeste */}
    <section style={{padding:"80px clamp(20px,6vw,80px)",maxWidth:820,margin:"0 auto",textAlign:"center"}}>
      <div style={{padding:"48px 40px",borderRadius:28,background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.06)",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 0%,rgba(255,31,82,0.07) 0%,transparent 60%)",pointerEvents:"none"}}/>
        <div style={{...F,fontSize:"clamp(20px,3vw,28px)",fontWeight:700,lineHeight:1.5,color:"rgba(255,255,255,0.88)",marginBottom:20,letterSpacing:"-0.3px"}}>
          "Les vraies connexions ne naissent pas<br/>d'une photo bien choisie."
        </div>
        <p style={{fontFamily:"'DM Sans'",fontSize:"clamp(13px,1.6vw,15px)",color:"rgba(255,255,255,0.38)",lineHeight:1.8}}>
          Sur les autres apps, tu choisis sur l'apparence. Ici, tout ce que tu sais c'est ce que l'autre dit en 60 secondes.<br/>
          Ça rend chaque conversation plus honnête — et chaque match plus réel.
        </p>
      </div>
    </section>

    {/* Pourquoi */}
    <section style={{padding:"0 clamp(20px,6vw,80px) 80px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:52}}>
        <div style={{...W,fontSize:11,color:"rgba(255,31,82,0.6)",textTransform:"uppercase",letterSpacing:2.5,marginBottom:14}}>Comment ça marche</div>
        <h2 style={{...F,fontSize:"clamp(26px,4vw,46px)",fontWeight:700,letterSpacing:"-1px"}}>Différent, dès la première seconde.</h2>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:16}}>
        {why.map((w,i)=><div key={i} style={{padding:"30px 24px",borderRadius:22,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)"}}>
          <div style={{fontSize:32,marginBottom:14}}>{w.icon}</div>
          <div style={{...W,fontSize:10,color:"rgba(255,31,82,0.5)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:10}}>Étape {i+1}</div>
          <h3 style={{...F,fontSize:17,fontWeight:700,marginBottom:10,lineHeight:1.3}}>{w.title}</h3>
          <p style={{fontFamily:"'DM Sans'",fontSize:13,color:"rgba(255,255,255,0.38)",lineHeight:1.7}}>{w.desc}</p>
        </div>)}
      </div>
    </section>

    {/* CTA final */}
    <section style={{padding:"0 clamp(20px,6vw,80px) 100px",maxWidth:820,margin:"0 auto",textAlign:"center"}}>
      <h2 style={{...F,fontSize:"clamp(28px,4.5vw,52px)",fontWeight:700,letterSpacing:"-1px",marginBottom:16,lineHeight:1.15}}>
        Prêt·e à rencontrer<br/>
        <span style={{background:"linear-gradient(135deg,#ff1f52,#ff5c30)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>quelqu'un de vrai ?</span>
      </h2>
      <p style={{fontFamily:"'DM Sans'",fontSize:"clamp(13px,1.7vw,16px)",color:"rgba(255,255,255,0.35)",marginBottom:36,lineHeight:1.7}}>Aucun algorithme. Aucune photo. Juste un inconnu et 60 secondes pour voir si le feeling est là.</p>
      <button onClick={onStart} style={{padding:"17px 40px",borderRadius:16,border:"none",background:"linear-gradient(135deg,#ff1f52,#ff5c30)",color:"#fff",fontFamily:"'DM Sans'",fontSize:16,fontWeight:800,cursor:"pointer",boxShadow:"0 14px 50px rgba(255,31,82,0.28)",letterSpacing:.2}} onMouseEnter={e=>e.target.style.transform="scale(1.03)"} onMouseLeave={e=>e.target.style.transform="scale(1)"}>
        Commencer maintenant — c'est gratuit
      </button>
    </section>

    {/* Footer */}
    <footer style={{borderTop:"1px solid rgba(255,255,255,0.05)",padding:"26px clamp(20px,5vw,56px)"}}>
      <div style={{maxWidth:1100,margin:"0 auto",display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:14}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14}}>💛</span>
          <span style={{...F,fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.25)"}}>BlindDate</span>
          <span style={{fontFamily:"'DM Sans'",fontSize:12,color:"rgba(255,255,255,0.13)"}}>· © 2025 · +18 uniquement</span>
        </div>
        <div style={{display:"flex",gap:18,flexWrap:"wrap",alignItems:"center"}}>
          <button onClick={onCGU} style={{background:"none",border:"none",fontFamily:"'DM Sans'",fontSize:12,color:"rgba(255,255,255,0.28)",cursor:"pointer",padding:0}}>Conditions d'utilisation</button>
          <button onClick={onPrivacy} style={{background:"none",border:"none",fontFamily:"'DM Sans'",fontSize:12,color:"rgba(255,255,255,0.28)",cursor:"pointer",padding:0}}>Confidentialité</button>
          <span style={{fontFamily:"'DM Sans'",fontSize:12,color:"rgba(255,255,255,0.13)"}}>contact@blinddate.app</span>
        </div>
      </div>
    </footer>
  </div>;
}

// ── PUSH NOTIFICATIONS ──

const VAPID_PUBLIC_KEY = "BKXYvD7WKTuKJHquu8YKe-twPEfy0r76Na65lAtkvgAukAGLMnqdzNd9NqCebQuchh3VASHiuJHqvi16VBlG8IY";

function urlBase64ToUint8Array(b64) {
  const pad = '='.repeat((4 - b64.length % 4) % 4);
  const base64 = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

function sendPushToUser(userId, title, body, url) {
  if (!userId) return;
  fetch('/api/send-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, title, body, url: url || '/' }),
  }).catch(() => {});
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
  const [showPartnerProfile,setShowPartnerProfile]=useState(false);
  const [partner,setPartner]=useState(null);
  const [matches,setMatches]=useState([]);
  const [bonuses,setBonuses]=useState(DEF_BONUS);
  const [streak,setStreak]=useState(0);
  const [compatibility,setCompatibility]=useState(null);
  const [superLikeContext,setSuperLikeContext]=useState(null); // "sent"|"received"|null
  const [referralCopied,setReferralCopied]=useState(false);
  const [showGH,setShowGH]=useState(false);
  const [ghSuccess,setGhSuccess]=useState(false);
  const [showPrivacy,setShowPrivacy]=useState(false);
  const [showCGU,setShowCGU]=useState(false);
  const [installBonus,setInstallBonus]=useState(false);

  // Online count — time-of-day seeded, fluctuates naturally
  const [onlineCount,setOnlineCount]=useState(()=>{
    const h=new Date().getHours();
    const base=h>=19||h<=1?140:h>=12?75:30;
    return base+Math.floor(Math.random()*40);
  });
  useEffect(()=>{
    const iv=setInterval(()=>{
      setOnlineCount(c=>Math.max(12,c+Math.floor(Math.random()*9)-4));
    },12000);
    return()=>clearInterval(iv);
  },[]);

  const cleanup=useRef([]);

  function addCleanup(fn){cleanup.current.push(fn);}
  function runCleanup(){cleanup.current.forEach(fn=>fn());cleanup.current=[];}

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    if(params.get("gh")==="success"){setGhSuccess(true);window.history.replaceState({},"",window.location.pathname);}
  },[]);

  useEffect(()=>{
    return onAuthStateChanged(auth,async u=>{
      if(u){
        // Block access if email not verified (Google is always verified)
        const isGoogle=u.providerData?.some(p=>p.providerId==="google.com");
        if(!isGoogle&&!u.emailVerified){setScreen("auth");return;}
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
          if(p.profileComplete){setScreen("main");listenMatches(u.uid);setupPush(u.uid);}
          else setScreen("setup");
        } else setScreen("setup");
      } else {setUser(null);setProfile(null);setMatches([]);setScreen("landing");}
    });
  },[]);

  async function setupPush(userId) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      await updateDoc(doc(db, 'users', userId), {
        pushSubscription: JSON.parse(JSON.stringify(sub)),
      });
    } catch(e) { console.error('Push setup:', e); }
  }

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

  async function claimInstallBonus(){
    if(!user)return;
    const nb={city:(bonuses.city||0)+2,ice:(bonuses.ice||0)+2,peek:(bonuses.peek||0)+2,anon:(bonuses.anon||0)+2};
    setBonuses(nb);
    await updateDoc(doc(db,"users",user.uid),{bonuses:nb});
    setInstallBonus(true);setTimeout(()=>setInstallBonus(false),3000);
  }

  async function savePrefs(pref){
    await updateDoc(doc(db,"users",user.uid),{pref});
    setProfile(p=>({...p,pref}));
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
    if(count>=activeLimit){alert(t.dailyLimitReached);return;}
    setScreen("waiting");setCompatibility(null);
    const myUid=user.uid;let matched=false;
    let roomUnsub=()=>{};let tmout;let heartbeat;

    function handleVisibility(){
      if(document.visibilityState==='visible'&&!matched){
        setDoc(doc(db,"waitingRoom",myUid),{uid:myUid,status:"waiting",gender:profile.gender||null,orientation:profile.orientation||null,age:profile.age||null,city:profile.city||"",pref:{...DEF_PREF,...(profile.pref||{})},ts:Date.now(),createdAt:serverTimestamp()}).catch(()=>{});
      }
    }
    function done(){
      roomUnsub();clearTimeout(tmout);clearInterval(heartbeat);
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

    // Listen to the entire waitingRoom collection — no index needed, filter in JS
    function setupRoomListener(){
      const unsub=onSnapshot(
        collection(db,"waitingRoom"),
        async snap=>{
          if(matched)return;

          // Check if we were directly notified of a match via our own doc
          const myDoc=snap.docs.find(d=>d.id===myUid);
          if(myDoc&&myDoc.data().chatId&&myDoc.data().chatPartner){
            const {chatId:cid,chatPartner:pid}=myDoc.data();
            unsub();roomUnsub=()=>{};
            if(!matched)await goToChat(cid,pid);
            return;
          }

          const now=Date.now();
          const myPref={...DEF_PREF,...(profile.pref||{})};
          const others=snap.docs.filter(d=>{
            if(d.id===myUid)return false;
            const data=d.data();
            if(data.status!=="waiting")return false;
            if(data.ts&&now-data.ts>90000)return false;
            if(!matchCompat(profile.gender,profile.orientation,data.gender,data.orientation))return false;
            // Apply my pref filters
            if(myPref.gender!=="all"&&data.gender&&data.gender!==myPref.gender)return false;
            if(data.age&&(data.age<myPref.ageMin||data.age>myPref.ageMax))return false;
            // Apply their pref filters against me
            const theirPref={...DEF_PREF,...(data.pref||{})};
            if(theirPref.gender!=="all"&&profile.gender&&profile.gender!==theirPref.gender)return false;
            if(profile.age&&(profile.age<theirPref.ageMin||profile.age>theirPref.ageMax))return false;
            // City match (only enforce if BOTH sides opt in)
            if(theirPref.cityMatch&&profile.city&&data.city&&profile.city.toLowerCase()!==data.city.toLowerCase())return false;
            return true;
          });
          if(!others.length)return;
          const otherId=others[0].id;
          if(myUid>=otherId)return; // Only smaller UID creates the chat
          unsub();roomUnsub=()=>{};
          try{
            const chatRef=await addDoc(collection(db,"blindChats"),{users:[myUid,otherId],status:"active",user1Decision:null,user2Decision:null,createdAt:serverTimestamp()});
            // Notify partner directly via their waitingRoom doc — reliable on all devices
            await updateDoc(doc(db,"waitingRoom",otherId),{chatId:chatRef.id,chatPartner:myUid}).catch(e=>console.error("[blinddate] notify partner error:",e.code,e.message));
            if(!matched)await goToChat(chatRef.id,otherId);
          }catch(e){
            console.error("[blinddate] blindChat creation error:",e.code,e.message);
            if(!matched)setupRoomListener();
          }
        },
        err=>console.error("[blinddate] waitingRoom listener error:",err.code,err.message)
      );
      roomUnsub=unsub;
    }
    setupRoomListener();

    // After 20s no real match → fallback to bot
    tmout=setTimeout(async()=>{
      if(matched)return;
      try{
        const botsSnap=await getDocs(query(collection(db,"users"),where("isBot","==",true)));
        if(!botsSnap.empty){
          const bots=botsSnap.docs;
          const bot=bots[Math.floor(Math.random()*bots.length)];
          const chatRef=await addDoc(collection(db,"blindChats"),{users:[myUid,bot.id],status:"active",user1Decision:null,user2Decision:null,isBotChat:true,createdAt:serverTimestamp()});
          if(!matched)await goToChat(chatRef.id,bot.id);
        }else{done();deleteDoc(doc(db,"waitingRoom",myUid)).catch(()=>{});setScreen("main");alert(t.noMatches);}
      }catch(e){done();deleteDoc(doc(db,"waitingRoom",myUid)).catch(()=>{});setScreen("main");}
    },20000);

    addCleanup(()=>{done();deleteDoc(doc(db,"waitingRoom",myUid)).catch(()=>{});});
  }

  function cancelWaiting(){
    runCleanup();deleteDoc(doc(db,"waitingRoom",user.uid)).catch(()=>{});setScreen("main");
  }

  async function startSpinChat(){
    const today=getTodayStr();
    if(profile.lastSpinDate===today){alert(t.spinUsed);return;}
    await updateDoc(doc(db,"users",user.uid),{lastSpinDate:today});
    setProfile(p=>({...p,lastSpinDate:today}));

    const snap=await getDocs(query(collection(db,"users"),where("profileComplete","==",true)));
    const blocked=profile.blocked||[];
    const myPref={...DEF_PREF,...(profile.pref||{})};

    // Filter candidates by mutual preferences (same logic as regular matching)
    const candidates=snap.docs.filter(d=>{
      if(d.id===user.uid||blocked.includes(d.id))return false;
      const u=d.data();
      if(myPref.gender!=="all"&&u.gender&&u.gender!==myPref.gender)return false;
      if(u.age&&(u.age<myPref.ageMin||u.age>myPref.ageMax))return false;
      const theirPref={...DEF_PREF,...(u.pref||{})};
      if(theirPref.gender!=="all"&&profile.gender&&profile.gender!==theirPref.gender)return false;
      if(profile.age&&(profile.age<theirPref.ageMin||profile.age>theirPref.ageMax))return false;
      if(myPref.cityMatch&&profile.city&&u.city&&profile.city.toLowerCase()!==u.city.toLowerCase())return false;
      return true;
    });

    if(!candidates.length){alert(t.spinNoMatch);return;}

    const picked=candidates[Math.floor(Math.random()*candidates.length)];
    const otherId=picked.id;

    // Create a direct match — no chat needed, the spin is winning in advance
    const existQ=await getDocs(query(collection(db,"matches"),where("users","array-contains",user.uid)));
    const alreadyMatched=existQ.docs.some(d=>d.data().users.includes(otherId));
    if(!alreadyMatched){
      const ids=[user.uid,otherId].sort();
      await addDoc(collection(db,"matches"),{users:ids,createdAt:serverTimestamp(),matchedAt:serverTimestamp(),lastMessage:null,spinMatch:true});
    }

    await addXP(XP_MATCH);
    setOtherProfile(picked.data());
    setOtherUid(otherId);

    // Notify the matched person
    sendPushToUser(otherId,
      lang==="fr"?"🎡 La Roue Dorée t'a trouvé un match !":"🎡 Golden Wheel found you a match!",
      lang==="fr"?"Quelqu'un veut te rencontrer !":"Someone wants to meet you!"
    );

    setScreen("matchReveal");
  }

  const handleTimeUp=useCallback(()=>{
    if(partner?.interests&&profile?.interests) setCompatibility(calcCompatibility(profile.interests,partner.interests));
    setScreen("decision");
  },[partner,profile]);

  async function decide(decision){
    // Bot always passes — never a real match
    if(partner?.isBot){
      await updateDoc(doc(db,"blindChats",chatId),{status:"ended"}).catch(()=>{});
      setScreen("noMatch");
      return;
    }
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
      sendPushToUser(otherUid,
        lang==="fr"?"💘 Nouveau match !":"💘 New match!",
        lang==="fr"?"Vous avez matché — dites bonjour 👋":"You matched — say hello 👋"
      );
      setScreen("matchReveal");
    } else {setScreen("noMatch");}
  }

  async function reportBlind(reason){
    await addDoc(collection(db,"reports"),{reporter:user.uid,reported:otherUid,reason,chatId,createdAt:serverTimestamp()});
  }

  const isGH=profile?.goldenHeart?.active&&profile?.goldenHeart?.expiresAt?.toDate?.()>new Date();
  const activeLimit=isGH?DAILY_LIMIT_GOLD:DAILY_LIMIT;
  const center={display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"calc(100dvh - var(--sat))",padding:40,textAlign:"center"};
  const referralCode=user?user.uid.slice(0,8).toUpperCase():"";

  return <TC.Provider value={T}>
    <LC.Provider value={{lang,t}}>
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        :root{--sat:env(safe-area-inset-top,0px);--sab:env(safe-area-inset-bottom,0px);--sal:env(safe-area-inset-left,0px);--sar:env(safe-area-inset-right,0px)}
        body{background:${T.bg};-webkit-font-smoothing:antialiased}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes scaleIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes glow{0%,100%{box-shadow:0 10px 40px ${T.accentGlow}}50%{box-shadow:0 14px 60px ${T.accentGlow},0 0 100px ${T.accentGlow}}}
        @keyframes shimmer{0%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.008)}100%{opacity:.6;transform:scale(1)}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
        @keyframes slideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}
        @keyframes barFill{from{width:0}to{width:var(--w)}}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}
        .tab-enter{animation:slideUp .28s cubic-bezier(.34,1.36,.64,1)}
        input::placeholder,textarea::placeholder{color:${T.textD}}
        button:focus-visible{outline:2px solid ${T.accent};outline-offset:2px}
        .grain{position:fixed;inset:0;pointer-events:none;z-index:9998;opacity:${T.name==="dark"?"0.045":"0.025"};background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E");}
        @media(min-width:768px){
          .app-desktop{display:flex;justify-content:center;align-items:flex-start;background-image:radial-gradient(ellipse at 20% 20%,rgba(255,31,82,0.06) 0%,transparent 55%),radial-gradient(ellipse at 80% 80%,rgba(255,92,48,0.04) 0%,transparent 55%);}
          .app-frame{width:100%;max-width:500px;min-height:100vh;box-shadow:0 0 0 1px rgba(255,255,255,0.05),0 40px 120px rgba(0,0,0,0.55);position:relative;}
        }
      `}</style>
    {screen==="landing"
      ?<LandingScreen onStart={()=>setScreen("auth")} onLogin={()=>setScreen("auth")} onPrivacy={()=>setShowPrivacy(true)} onCGU={()=>setShowCGU(true)}/>
      :<div className="app-desktop" style={{minHeight:"100vh",background:T.bg,backgroundImage:T.bgGrad,color:T.text,transition:"background .4s,color .4s"}}>
       <div className="app-frame" style={{minHeight:"100vh",background:T.bg,backgroundImage:T.bgGrad,paddingTop:"var(--sat)",paddingBottom:"var(--sab)"}}>
      <div className="grain" aria-hidden="true"/>

      {ghSuccess&&<div style={{position:"fixed",top:"calc(16px + var(--sat))",left:"50%",transform:"translateX(-50%)",zIndex:9999,padding:"14px 22px",borderRadius:18,background:"linear-gradient(135deg,#f59e0b,#fbbf24)",color:"#000",fontFamily:"'DM Sans'",fontSize:14,fontWeight:800,boxShadow:"0 8px 40px rgba(245,158,11,0.5)",display:"flex",alignItems:"center",gap:10,animation:"slideUp .4s ease",whiteSpace:"nowrap"}}>
        <span style={{fontSize:20}}>💛</span>
        <span>Golden Heart activé ! 30 jours de premium.</span>
        <button onClick={()=>setGhSuccess(false)} style={{background:"none",border:"none",color:"rgba(0,0,0,0.4)",cursor:"pointer",fontSize:16,marginLeft:4,lineHeight:1}}>✕</button>
      </div>}

      {screen==="loading"&&<div style={center}><div style={{width:36,height:36,border:`3px solid ${T.border}`,borderTopColor:T.accent,borderRadius:"50%",animation:"spin .8s linear infinite"}}/></div>}
      {screen==="auth"&&<AuthScreen/>}
      {screen==="setup"&&user&&<Setup user={user} onDone={p=>{setProfile(p);setBonuses(p.bonuses||DEF_BONUS);listenMatches(user.uid);setScreen("main");}}/>}

      {screen==="main"&&profile&&<>
        {tab==="home"&&<div key="home" className="tab-enter"><HomeTab profile={profile} onStart={startChat} streak={streak} isGH={isGH} dailyLimit={activeLimit} onOpenGH={()=>setShowGH(true)}/></div>}
        {tab==="matches"&&<div key="matches" className="tab-enter"><MatchesTab myUid={user.uid} matches={matches} onBlock={blockUser}/></div>}
        {tab==="extras"&&<div key="extras" className="tab-enter"><ExtrasTab profile={profile} bonuses={bonuses} referralCode={referralCode} onCopyReferral={copyReferralLink} referralCopied={referralCopied} isGH={isGH} onOpenGH={()=>setShowGH(true)} onSpin={startSpinChat} onSavePrefs={savePrefs} lang={lang}/></div>}
        {tab==="profile"&&<div key="profile" className="tab-enter"><ProfileTab user={user} profile={profile} setProfile={setProfile} onLogout={()=>signOut(auth)} lang={lang} setLang={changeLang} thm={thm} setTheme={setTheme}/></div>}
        <NavBar tab={tab} setTab={setTab} n={matches.length}/>
      </>}

      {screen==="waiting"&&<div style={center}>
        <div style={{position:"relative",width:80,height:80,marginBottom:32}}>
          <div style={{position:"absolute",inset:0,border:`3px solid ${T.border}`,borderTopColor:T.accent,borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
          <div style={{position:"absolute",inset:8,border:`2px solid ${T.border}`,borderBottomColor:T.sec,borderRadius:"50%",animation:"spin 1.4s linear infinite reverse",opacity:.5}}/>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🔍</div>
        </div>
        <h2 style={{fontFamily:"'Fraunces',serif",fontSize:22,color:T.text,margin:"0 0 6px"}}>{t.searching}</h2>
        <p style={{fontFamily:"'DM Sans'",fontSize:13,color:T.textD,marginBottom:24}}>{t.waitingPlayer}</p>
        <div style={{display:"flex",gap:16,marginBottom:28}}>
          <div style={{padding:"10px 18px",borderRadius:14,background:T.card,border:`1px solid ${T.border}`,textAlign:"center"}}>
            <div style={{fontFamily:"'DM Sans'",fontSize:18,fontWeight:800,color:T.accent}}>{onlineCount}</div>
            <div style={{fontFamily:"'DM Sans'",fontSize:11,color:T.textD,marginTop:2}}>{lang==="fr"?"en ligne":"online"}</div>
          </div>
          <div style={{padding:"10px 18px",borderRadius:14,background:T.card,border:`1px solid ${T.border}`,textAlign:"center"}}>
            <div style={{fontFamily:"'DM Sans'",fontSize:18,fontWeight:800,color:T.sec}}>{Math.max(2,Math.floor(onlineCount*0.18+Math.random()*3|0))}</div>
            <div style={{fontFamily:"'DM Sans'",fontSize:11,color:T.textD,marginTop:2}}>{lang==="fr"?"cherchent":"searching"}</div>
          </div>
        </div>
        <Btn variant="ghost" onClick={cancelWaiting}>{t.cancelBtn}</Btn>
      </div>}

      {screen==="chat"&&chatId&&<BlindChat chatId={chatId} myUid={user.uid} partner={partner} partnerUid={otherUid} bonuses={bonuses} onUseBonus={consumeBonus} onTimeUp={handleTimeUp} onReport={reportBlind} lang={lang}/>}

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

      {screen==="matchReveal"&&otherProfile&&<>
        {showPartnerProfile&&<div style={{position:"fixed",inset:0,zIndex:200,background:T.bg,overflowY:"auto",animation:"fadeIn .25s"}}>
          <div style={{maxWidth:440,margin:"0 auto",paddingBottom:32}}>
            <div style={{position:"relative",height:260,background:T.surfAlt}}>
              {otherProfile.photos?.[0]&&<img src={otherProfile.photos[0]} style={{width:"100%",height:"100%",objectFit:"cover"}}/>}
              <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 50%)"}}/>
              <button onClick={()=>setShowPartnerProfile(false)} style={{position:"absolute",top:16,left:16,background:"rgba(0,0,0,0.4)",border:"none",borderRadius:10,padding:"6px 12px",color:"#fff",fontFamily:"'DM Sans'",fontSize:13,cursor:"pointer"}}>← Back</button>
              <div style={{position:"absolute",bottom:16,left:18}}>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:26,color:"#fff",fontWeight:700}}>{otherProfile.name}, {otherProfile.age}</div>
                {otherProfile.city&&<div style={{fontFamily:"'DM Sans'",fontSize:13,color:"rgba(255,255,255,0.75)"}}>📍 {otherProfile.city}</div>}
              </div>
            </div>
            {otherProfile.photos?.length>1&&<div style={{display:"flex",gap:6,padding:"12px 16px",overflowX:"auto"}}>
              {otherProfile.photos.slice(1).map((p,i)=><img key={i} src={p} style={{width:90,height:90,borderRadius:12,objectFit:"cover",flexShrink:0}}/>)}
            </div>}
            {compatibility!==null&&<div style={{margin:"12px 16px 0",padding:"10px 18px",borderRadius:14,background:T.accentSoft,border:`1px solid ${T.accent}33`,textAlign:"center",fontFamily:"'DM Sans'",fontSize:14,fontWeight:800,color:T.accent}}>{t.compatScore(compatibility)}</div>}
            {otherProfile.bio&&<div style={{margin:"14px 16px 0",padding:"14px 16px",borderRadius:14,background:T.card,border:`1px solid ${T.border}`}}>
              <div style={{fontFamily:"'DM Sans'",fontSize:11,fontWeight:700,color:T.textD,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Bio</div>
              <p style={{fontFamily:"'DM Sans'",fontSize:14,color:T.text,lineHeight:1.6,margin:0}}>{otherProfile.bio}</p>
            </div>}
            {otherProfile.interests?.length>0&&<div style={{margin:"12px 16px 0",padding:"14px 16px",borderRadius:14,background:T.card,border:`1px solid ${T.border}`}}>
              <div style={{fontFamily:"'DM Sans'",fontSize:11,fontWeight:700,color:T.textD,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Intérêts</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:7}}>{otherProfile.interests.map(i=><span key={i} style={{padding:"5px 14px",borderRadius:20,fontSize:12,fontFamily:"'DM Sans'",fontWeight:600,background:T.accentSoft,color:T.accent}}>{i}</span>)}</div>
            </div>}
            {otherProfile.dailyQ?.a&&<div style={{margin:"12px 16px 0",padding:"16px",borderRadius:14,background:T.card,border:`1px solid ${T.accent}22`}}>
              <div style={{fontFamily:"'DM Sans'",fontSize:11,fontWeight:800,color:T.accent,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>💬 {t.dailyQPartner}</div>
              <p style={{fontFamily:"'DM Sans'",fontSize:13,color:T.textS,marginBottom:6,lineHeight:1.5}}>{otherProfile.dailyQ.q}</p>
              <p style={{fontFamily:"'DM Sans'",fontSize:14,fontWeight:700,color:T.text,fontStyle:"italic",lineHeight:1.5}}>"{otherProfile.dailyQ.a}"</p>
            </div>}
            {otherProfile.personality&&<div style={{margin:"12px 16px 0",padding:"14px 16px",borderRadius:14,background:T.card,border:`1px solid ${T.border}`}}>
              <div style={{fontFamily:"'DM Sans'",fontSize:11,fontWeight:700,color:T.textD,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>{t.theirVibeAnswers}</div>
              {PERSONALITY_Q[lang].map((q,i)=>otherProfile.personality[i]!==undefined&&<div key={i} style={{marginBottom:10}}>
                <div style={{fontFamily:"'DM Sans'",fontSize:12,color:T.textS,marginBottom:3}}>{q.q}</div>
                <div style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:700,color:T.text,padding:"6px 12px",borderRadius:10,background:T.accentSoft,display:"inline-block"}}>{q.a[otherProfile.personality[i]]}</div>
              </div>)}
            </div>}
          </div>
        </div>}
        <div style={{position:"fixed",inset:0,zIndex:100,background:T.overlay,backdropFilter:"blur(24px)",display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeIn .3s",overflowY:"auto"}}>
          <div style={{textAlign:"center",padding:"32px 28px",animation:"scaleIn .4s cubic-bezier(.34,1.56,.64,1)",width:"100%",maxWidth:360}}>
            {/* Floating hearts */}
            <div style={{position:"relative",height:64,marginBottom:8}}>
              {["💕","✨","💫"].map((e,i)=><span key={i} style={{position:"absolute",fontSize:i===0?40:20,left:`${30+i*22}%`,animation:`float ${1.8+i*0.4}s ease-in-out ${i*0.3}s infinite`}}>{e}</span>)}
            </div>
            <h2 style={{fontFamily:"'Fraunces',serif",fontSize:38,background:T.accentGrad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:"0 0 4px",letterSpacing:"-0.5px"}}>{t.matchTitle}</h2>
            <p style={{fontFamily:"'DM Sans'",fontSize:12,color:T.gold,marginBottom:16,fontWeight:700}}>+{XP_MATCH} XP</p>
            {otherProfile.photos?.[0]&&<img src={otherProfile.photos[0]} style={{width:100,height:100,borderRadius:"50%",objectFit:"cover",border:`3px solid ${T.accent}`,boxShadow:`0 0 50px ${T.accentGlow}`,display:"block",margin:"0 auto 12px"}}/>}
            <p style={{fontFamily:"'Fraunces',serif",fontSize:20,color:T.text,marginBottom:2}}>{otherProfile.name}, {otherProfile.age}</p>
            <p style={{fontFamily:"'DM Sans'",fontSize:12,color:T.textD,marginBottom:16}}>📍 {otherProfile.city}</p>
            {compatibility!==null&&<div style={{display:"inline-block",padding:"5px 16px",borderRadius:20,background:T.accentSoft,fontFamily:"'DM Sans'",fontSize:12,fontWeight:800,color:T.accent,marginBottom:16}}>{t.compatScore(compatibility)}</div>}
            {/* Common interests */}
            {(()=>{const common=(profile?.interests||[]).filter(i=>otherProfile.interests?.includes(i));return common.length>0&&<div style={{marginBottom:18}}>
              <p style={{fontFamily:"'DM Sans'",fontSize:11,color:T.textD,marginBottom:8,fontWeight:700,textTransform:"uppercase",letterSpacing:.8}}>{lang==="fr"?"En commun":"In common"}</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center"}}>
                {common.map(i=><span key={i} style={{padding:"5px 13px",borderRadius:20,fontSize:12,fontFamily:"'DM Sans'",fontWeight:700,background:`${T.accent}22`,color:T.accent,border:`1px solid ${T.accent}44`}}>{i}</span>)}
              </div>
            </div>;})()}
            <div style={{display:"flex",flexDirection:"column",gap:10,maxWidth:240,margin:"0 auto"}}>
              <Btn onClick={()=>{listenMatches(user.uid);setScreen("main");setTab("matches");}}>{lang==="fr"?"💬 Envoyer un message":"💬 Send a message"}</Btn>
              <Btn variant="ghost" onClick={()=>setShowPartnerProfile(true)}>{t.viewProfile}</Btn>
              <button onClick={()=>{setShowPartnerProfile(false);setScreen("main");}} style={{background:"none",border:"none",fontFamily:"'DM Sans'",fontSize:13,color:T.textD,cursor:"pointer",padding:"4px 0"}}>{t.great}</button>
            </div>
          </div>
        </div>
      </>}

      {screen==="noMatch"&&<div style={{...center,animation:"fadeIn .4s",padding:"0 32px"}}>
        <div style={{fontSize:52,marginBottom:20,animation:"float 2s ease-in-out infinite",filter:"grayscale(.3)"}}>🌙</div>
        <h2 style={{fontFamily:"'Fraunces',serif",fontSize:28,color:T.text,margin:"0 0 10px"}}>{t.noMatchTitle}</h2>
        <p style={{fontFamily:"'DM Sans'",fontSize:14,color:T.textS,marginBottom:28,lineHeight:1.6,textAlign:"center"}}>{t.noMatchSub}</p>
        <div style={{padding:"14px 20px",borderRadius:16,background:T.card,border:`1px solid ${T.border}`,marginBottom:28,width:"100%",maxWidth:280,boxSizing:"border-box"}}>
          <p style={{fontFamily:"'DM Sans'",fontSize:13,color:T.textD,textAlign:"center",margin:0,lineHeight:1.6}}>
            {lang==="fr"
              ?<>{onlineCount} personnes en ligne<br/><span style={{color:T.text,fontWeight:700}}>Le prochain match t'attend</span></>
              :<>{onlineCount} people online<br/><span style={{color:T.text,fontWeight:700}}>The next one is waiting</span></>}
          </p>
        </div>
        <Btn onClick={()=>setScreen("main")} style={{minWidth:180}}>{t.retry}</Btn>
      </div>}

      {showGH&&user&&profile&&<GoldenHeartModal user={user} profile={profile} lang={lang} onClose={()=>setShowGH(false)} onActivated={()=>{const snap=getDoc(doc(db,"users",user.uid)).then(s=>{if(s.exists())setProfile(p=>({...p,...s.data()}));});}}/>}
      </div>
      </div>}
    {screen==="main"&&user&&<InstallBanner uid={user.uid} onClaim={claimInstallBonus}/>}
    {installBonus&&<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:9999,padding:"13px 20px",borderRadius:16,background:"linear-gradient(135deg,#7c3aed,#db2777)",color:"#fff",fontFamily:"'DM Sans'",fontSize:13,fontWeight:800,boxShadow:"0 8px 40px rgba(109,40,217,0.45)",display:"flex",alignItems:"center",gap:8,animation:"slideUp .4s ease",whiteSpace:"nowrap"}}>
      <span>🎁</span><span>+2 bonus sur tous tes items !</span>
    </div>}
    {showPrivacy&&<PrivacyModal onClose={()=>setShowPrivacy(false)}/>}
    {showCGU&&<CGUModal onClose={()=>setShowCGU(false)}/>}
    </LC.Provider>
  </TC.Provider>;
}
