import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, collection, query, where, orderBy, onSnapshot, serverTimestamp, arrayUnion } from "firebase/firestore";

const app = initializeApp({ apiKey:"AIzaSyB02eHA3ZtfLj6DEIk1oTOgkzXexHLn_kY", authDomain:"love-at-first-sight-8c6d3.firebaseapp.com", projectId:"love-at-first-sight-8c6d3" });
const auth = getAuth(app); const db = getFirestore(app); const gProv = new GoogleAuthProvider();
const CLD={c:"dgbcpuvgb",p:"blinddate_upload"};
const CHAT_DUR=60;const DECISION_TIMEOUT=30;
const INTS=["Cinéma","Musique","Sport","Voyages","Art","Tech","Cuisine","Lecture","Gaming","Photo","Nature","Mode","Humour","Science"];
const ICEBREAKERS=["Tu préfères voyager dans le passé ou le futur ?","Guilty pleasure ?","Superpouvoir ?","Emoji préféré ?","Dernier truc qui t'a fait rire ?","Lieu de rêve pour un date ?","Chien ou chat ?","Chanson du moment ?"];
const BONUS_TYPES=[{id:"time",icon:"⏱️",name:"+30s"},{id:"city",icon:"📍",name:"Ville"},{id:"ice",icon:"🎲",name:"Brise-glace"},{id:"peek",icon:"👀",name:"Intérêt"},{id:"anon",icon:"🕶️",name:"Âge"}];
const DEF_BONUS={time:3,city:3,ice:3,peek:3,anon:3};
const XP_CHAT=5,XP_MATCH=20;
function getLv(xp){if(xp<50)return{lv:1,n:"Débutant",nx:50};if(xp<150)return{lv:2,n:"Curieux",nx:150};if(xp<300)return{lv:3,n:"Sociable",nx:300};if(xp<500)return{lv:4,n:"Charmeur",nx:500};return{lv:5,n:"Légende",nx:9999}}

const dark={name:"dark",bg:"#06060b",surface:"#0d0d15",surfAlt:"#12121c",card:"#10101a",border:"#1a1a30",borderL:"#252545",input:"#0b0b14",accent:"#ff2d6b",accentGlow:"rgba(255,45,107,0.3)",accentSoft:"rgba(255,45,107,0.08)",accentGrad:"linear-gradient(135deg,#ff2d6b,#ff6b3d)",sec:"#6c5ce7",gold:"#fbbf24",goldSoft:"rgba(251,191,36,0.1)",success:"#00d68f",danger:"#ff4757",text:"#f0f0f8",textS:"#8888a4",textD:"#4a4a65",overlay:"rgba(3,3,8,0.92)",toggle:"🌙",bgGrad:"radial-gradient(ellipse at 20% 0%,#12102a 0%,#06060b 50%),radial-gradient(ellipse at 80% 100%,#1a0a1e 0%,transparent 50%)",gBg:"rgba(255,255,255,0.06)",gC:"#fff",gB:"1px solid rgba(255,255,255,0.12)"};
const light={name:"light",bg:"#faf8f5",surface:"#ffffff",surfAlt:"#f5f2ee",card:"#ffffff",border:"#e8e2da",borderL:"#d8d2ca",input:"#f5f2ee",accent:"#e6295f",accentGlow:"rgba(230,41,95,0.2)",accentSoft:"rgba(230,41,95,0.06)",accentGrad:"linear-gradient(135deg,#e6295f,#ff6b3d)",sec:"#5b4cdb",gold:"#d97706",goldSoft:"rgba(217,119,6,0.08)",success:"#059669",danger:"#dc2626",text:"#1a1a2e",textS:"#6b6b80",textD:"#9b9baa",overlay:"rgba(250,248,245,0.92)",toggle:"☀️",bgGrad:"radial-gradient(ellipse at 30% 0%,#fde8f0 0%,#faf8f5 50%)",gBg:"#fff",gC:"#333",gB:"1px solid #ddd"};

const TC=createContext(dark);
function useT(){return useContext(TC)}
async function upImg(f){const fd=new FormData();fd.append("file",f);fd.append("upload_preset",CLD.p);fd.append("folder","blinddate");const r=await fetch(`https://api.cloudinary.com/v1_1/${CLD.c}/image/upload`,{method:"POST",body:fd});if(!r.ok)throw new Error("Upload failed");return(await r.json()).secure_url}

// ═══ SMALL UI ═══
function Btn({children,variant="primary",disabled,onClick,style:sx,full}){const[h,sH]=useState(false);const T=useT();const v={primary:{bg:T.accentGrad,c:"#fff",b:"none",s:`0 4px 24px ${T.accentGlow}`},ghost:{bg:"transparent",c:T.textS,b:`1px solid ${T.border}`,s:"none"},google:{bg:T.gBg,c:T.gC,b:T.gB,s:"none"},danger:{bg:`${T.danger}15`,c:T.danger,b:`1px solid ${T.danger}33`,s:"none"},sec:{bg:`linear-gradient(135deg,${T.sec},#a66bff)`,c:"#fff",b:"none",s:"none"}}[variant]||{bg:T.accentGrad,c:"#fff",b:"none",s:`0 4px 24px ${T.accentGlow}`};return<button disabled={disabled} onClick={onClick} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)} style={{padding:"14px 28px",fontSize:15,fontWeight:700,fontFamily:"'Nunito',sans-serif",borderRadius:16,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,background:v.bg,color:v.c,border:v.b,boxShadow:v.s,width:full?"100%":"auto",transition:"all .3s cubic-bezier(.34,1.56,.64,1)",transform:h&&!disabled?"translateY(-2px)":"none",...sx}}>{children}</button>}

function Card({children,style:sx}){const T=useT();return<div style={{background:T.card,borderRadius:24,border:`1px solid ${T.border}`,boxShadow:"0 4px 20px rgba(0,0,0,.15)",...sx}}>{children}</div>}

function Timer({sec,tot}){const T=useT();const p=Math.min((sec/Math.max(tot,1))*100,100),lo=sec<=10;return<div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:80,height:5,borderRadius:3,background:T.border,overflow:"hidden"}}><div style={{width:`${p}%`,height:"100%",borderRadius:3,background:lo?T.danger:T.accentGrad,transition:"width .5s"}}/></div><span style={{fontFamily:"'Nunito'",fontWeight:800,fontSize:13,color:lo?T.danger:T.accent,fontVariantNumeric:"tabular-nums",animation:lo?"pulse 1s infinite":"none",minWidth:30}}>{sec}s</span></div>}

function XPBar({xp}){const T=useT();const l=getLv(xp||0);return<div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:26,height:26,borderRadius:"50%",background:T.accentGrad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff",fontFamily:"'Nunito'"}}>{l.lv}</div><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontFamily:"'Nunito'",fontSize:11,fontWeight:700,color:T.text}}>{l.n}</span><span style={{fontFamily:"'Nunito'",fontSize:10,color:T.textD}}>{xp||0}/{l.nx}</span></div><div style={{height:4,borderRadius:2,background:T.border,overflow:"hidden"}}><div style={{width:`${Math.min(((xp||0)/l.nx)*100,100)}%`,height:"100%",background:T.accentGrad}}/></div></div></div>}

function NavBar({tab,setTab,n}){const T=useT();return<div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:50,background:T.surface,borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"space-around",padding:"8px 0 14px"}}>{[{id:"home",i:"🔮",l:"Accueil"},{id:"matches",i:"💬",l:"Matchs"},{id:"profile",i:"👤",l:"Profil"}].map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{background:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"6px 20px",transform:tab===t.id?"scale(1.1)":"none"}}><span style={{fontSize:20,filter:tab===t.id?"none":"grayscale(.5) opacity(.5)",position:"relative"}}>{t.i}{t.id==="matches"&&n>0&&<span style={{position:"absolute",top:-2,right:-6,width:8,height:8,borderRadius:"50%",background:T.accent}}/>}</span><span style={{fontFamily:"'Nunito'",fontSize:10,fontWeight:700,color:tab===t.id?T.accent:T.textD}}>{t.l}</span></button>)}</div>}

function PhotoSlot({url,onUp,onRm,idx}){const T=useT();const ref=useRef(null);const[h,sH]=useState(false);return<div onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)} onClick={()=>!url&&ref.current?.click()} style={{aspectRatio:"3/4",borderRadius:18,overflow:"hidden",position:"relative",cursor:"pointer",border:url?`2px solid ${T.border}`:`2px dashed ${T.borderL}`,background:T.surfAlt,transition:"all .3s",transform:h?"scale(1.03)":"none"}}>{url?<><img src={url} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>{h&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><button onClick={e=>{e.stopPropagation();ref.current?.click()}} style={{padding:"6px 12px",borderRadius:10,background:T.accentGrad,border:"none",color:"#fff",fontSize:11,fontFamily:"'Nunito'",fontWeight:700,cursor:"pointer"}}>📷</button><button onClick={e=>{e.stopPropagation();onRm(idx)}} style={{padding:"6px 12px",borderRadius:10,background:`${T.danger}44`,border:"none",color:T.danger,fontSize:11,fontFamily:"'Nunito'",fontWeight:700,cursor:"pointer"}}>✕</button></div>}</>:<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%"}}><span style={{fontSize:24,color:T.textD}}>＋</span></div>}<input ref={ref} type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f)onUp(idx,f)}} style={{display:"none"}}/></div>}

// ═══ AUTH ═══
function AuthScreen(){const T=useT();const[m,sM]=useState("login");const[e,sE]=useState("");const[p,sP]=useState("");const[n,sN]=useState("");const[err,sErr]=useState("");const[ld,sLd]=useState(false);
async function sub(){sErr("");sLd(true);try{if(m==="signup"){if(!n.trim()||p.length<6){sErr("Prénom + 6 car. min");sLd(false);return}const c=await createUserWithEmailAndPassword(auth,e,p);await updateProfile(c.user,{displayName:n.trim()});await setDoc(doc(db,"users",c.user.uid),{name:n.trim(),email:e,age:null,city:"",bio:"",photos:[],interests:[],profileComplete:false,bonuses:DEF_BONUS,xp:0,blocked:[],createdAt:serverTimestamp()})}else await signInWithEmailAndPassword(auth,e,p)}catch(er){sErr({"auth/email-already-in-use":"Email déjà utilisé","auth/user-not-found":"Aucun compte","auth/invalid-credential":"Email ou mdp incorrect"}[er.code]||er.message)}sLd(false)}
async function ggl(){sErr("");sLd(true);try{const r=await signInWithPopup(auth,gProv);const s=await getDoc(doc(db,"users",r.user.uid));if(!s.exists())await setDoc(doc(db,"users",r.user.uid),{name:r.user.displayName||"",email:r.user.email,age:null,city:"",bio:"",photos:r.user.photoURL?[r.user.photoURL]:[],interests:[],profileComplete:false,bonuses:DEF_BONUS,xp:0,blocked:[],createdAt:serverTimestamp()})}catch(er){sErr(er.message)}sLd(false)}
const inp={width:"100%",padding:"14px 18px",borderRadius:14,background:T.input,border:`1.5px solid ${T.border}`,color:T.text,fontSize:14,fontFamily:"'Nunito'",outline:"none",marginBottom:14};
return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}><div style={{width:"100%",maxWidth:400,animation:"fadeIn .6s"}}><div style={{textAlign:"center",marginBottom:40}}><div style={{fontSize:52,marginBottom:12,animation:"float 3s ease-in-out infinite"}}>🔮</div><h1 style={{fontFamily:"'Playfair Display',serif",fontSize:36,background:T.accentGrad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:"0 0 6px"}}>BlindDate</h1><p style={{fontFamily:"'Nunito'",fontSize:14,color:T.textD}}>60 secondes pour une connexion</p></div>
{err&&<div style={{padding:12,borderRadius:14,background:`${T.danger}10`,border:`1px solid ${T.danger}33`,color:T.danger,fontSize:13,fontFamily:"'Nunito'",marginBottom:16,textAlign:"center"}}>{err}</div>}
<Btn variant="google" full onClick={ggl} disabled={ld} style={{marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>Google</Btn>
<div style={{display:"flex",alignItems:"center",gap:12,margin:"16px 0"}}><div style={{flex:1,height:1,background:T.border}}/><span style={{fontFamily:"'Nunito'",fontSize:12,color:T.textD}}>ou</span><div style={{flex:1,height:1,background:T.border}}/></div>
<Card style={{padding:24,marginBottom:20}}>{m==="signup"&&<input value={n} onChange={x=>sN(x.target.value)} placeholder="Prénom" style={inp}/>}<input type="email" value={e} onChange={x=>sE(x.target.value)} placeholder="Email" style={inp}/><input type="password" value={p} onChange={x=>sP(x.target.value)} placeholder="Mot de passe" onKeyDown={x=>x.key==="Enter"&&sub()} style={{...inp,marginBottom:0}}/></Card>
<Btn full onClick={sub} disabled={ld}>{ld?"...":m==="login"?"Se connecter":"Créer mon compte 🚀"}</Btn>
<p style={{textAlign:"center",marginTop:20,fontFamily:"'Nunito'",fontSize:14,color:T.textS}}>{m==="login"?"Pas de compte ? ":"Déjà un compte ? "}<span onClick={()=>{sM(m==="login"?"signup":"login");sErr("")}} style={{color:T.accent,fontWeight:700,cursor:"pointer"}}>{m==="login"?"S'inscrire":"Se connecter"}</span></p></div></div>}

// ═══ SETUP ═══
function Setup({user,onDone}){const T=useT();const[st,sSt]=useState(0);const[age,sA]=useState("");const[city,sC]=useState("");const[bio,sB]=useState("");const[ints,sI]=useState([]);const[pf,sPf]=useState(null);const[pp,sPp]=useState(null);const[up,sUp]=useState(false);const[err,sErr]=useState("");const fr=useRef(null);
function val(){sErr("");if(st===0&&(!age||age<18||!city.trim())){sErr("Remplis tout (18+)");return false}if(st===1&&ints.length<2){sErr("Min 2");return false}if(st===2&&!bio.trim()){sErr("Écris ta bio");return false}if(st===3&&!pf){sErr("Photo requise");return false}return true}
async function fin(){if(!val())return;sUp(true);try{const url=await upImg(pf);const d={age:parseInt(age),city:city.trim(),bio:bio.trim(),interests:ints,photos:[url],profileComplete:true,bonuses:DEF_BONUS,xp:0};await updateDoc(doc(db,"users",user.uid),d);onDone({name:user.displayName,...d})}catch(e){sErr(e.message)}sUp(false)}
function nx(){if(val()){st===3?fin():sSt(s=>s+1)}}
const inp={width:"100%",padding:"14px 18px",borderRadius:14,background:T.input,border:`1.5px solid ${T.border}`,color:T.text,fontSize:14,fontFamily:"'Nunito'",outline:"none"};
return<div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",padding:20}}><div style={{width:"100%",maxWidth:420}}><div style={{textAlign:"center",marginBottom:24,paddingTop:20}}><h1 style={{fontFamily:"'Playfair Display',serif",fontSize:24,background:T.accentGrad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:0}}>Profil ({st+1}/4)</h1></div>
<div style={{width:"100%",height:4,borderRadius:2,background:T.border,marginBottom:20,overflow:"hidden"}}><div style={{width:`${((st+1)/4)*100}%`,height:"100%",background:T.accentGrad,transition:"width .4s"}}/></div>
{err&&<div style={{padding:10,borderRadius:12,background:`${T.danger}10`,color:T.danger,fontSize:13,fontFamily:"'Nunito'",marginBottom:14,textAlign:"center"}}>{err}</div>}
<Card style={{padding:24,marginBottom:20}}>
{st===0&&<><label style={{fontFamily:"'Nunito'",fontSize:13,fontWeight:600,color:T.textS,display:"block",marginBottom:6}}>Âge</label><input type="number" min={18} value={age} onChange={e=>sA(e.target.value)} style={{...inp,width:100,marginBottom:16}}/><label style={{fontFamily:"'Nunito'",fontSize:13,fontWeight:600,color:T.textS,display:"block",marginBottom:6}}>Ville</label><input value={city} onChange={e=>sC(e.target.value)} placeholder="Paris..." style={inp}/></>}
{st===1&&<><label style={{fontFamily:"'Nunito'",fontSize:13,fontWeight:600,color:T.textS,display:"block",marginBottom:10}}>Intérêts ({ints.length}/5)</label><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{INTS.map(t=>{const a=ints.includes(t);return<button key={t} onClick={()=>sI(p=>a?p.filter(x=>x!==t):p.length<5?[...p,t]:p)} style={{padding:"8px 16px",borderRadius:20,fontSize:13,fontFamily:"'Nunito'",fontWeight:600,cursor:"pointer",border:`1.5px solid ${a?T.accent:T.border}`,background:a?T.accentSoft:"transparent",color:a?T.accent:T.textS}}>{t}</button>})}</div></>}
{st===2&&<><label style={{fontFamily:"'Nunito'",fontSize:13,fontWeight:600,color:T.textS,display:"block",marginBottom:6}}>Bio</label><textarea value={bio} onChange={e=>sB(e.target.value.slice(0,150))} rows={4} style={{...inp,resize:"none",lineHeight:1.6}}/></>}
{st===3&&<><label style={{fontFamily:"'Nunito'",fontSize:13,fontWeight:600,color:T.textS,display:"block",marginBottom:10}}>Photo</label><div onClick={()=>fr.current?.click()} style={{border:`2px dashed ${T.borderL}`,borderRadius:18,padding:pp?0:36,textAlign:"center",cursor:"pointer",overflow:"hidden"}}>{pp?<img src={pp} style={{width:"100%",maxHeight:240,objectFit:"cover",display:"block",borderRadius:16}}/>:<div><span style={{fontSize:40}}>📸</span></div>}</div><input ref={fr} type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(!f)return;sPf(f);const r=new FileReader();r.onload=ev=>sPp(ev.target.result);r.readAsDataURL(f)}} style={{display:"none"}}/></>}
</Card>
<div style={{display:"flex",gap:10}}>{st>0&&<Btn variant="ghost" onClick={()=>sSt(s=>s-1)} style={{flex:1}}>←</Btn>}<Btn full onClick={nx} disabled={up} style={{flex:2}}>{up?"...":st===3?"Go 🚀":"Suivant →"}</Btn></div></div></div>}

// ═══ HOME ═══
function HomeTab({profile,onStart,bonuses}){const T=useT();return<div style={{padding:20,maxWidth:440,margin:"0 auto",paddingBottom:80}}>
<div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>{profile.photos?.[0]&&<img src={profile.photos[0]} style={{width:48,height:48,borderRadius:"50%",objectFit:"cover",border:`2px solid ${T.accent}`}}/>}<div><div style={{fontFamily:"'Nunito'",fontSize:16,fontWeight:800,color:T.text}}>{profile.name} 👋</div><div style={{fontFamily:"'Nunito'",fontSize:12,color:T.textD}}>{profile.city}</div></div></div>
<Card style={{padding:"12px 16px",marginBottom:14}}><XPBar xp={profile.xp||0}/></Card>
<Btn full onClick={onStart} style={{padding:20,fontSize:17,marginBottom:20,animation:"glow 2s ease-in-out infinite"}}>⚡ Conversation (60s)</Btn>
<Card style={{padding:18,marginBottom:16}}><div style={{fontFamily:"'Nunito'",fontSize:11,fontWeight:800,color:T.textD,marginBottom:10,textTransform:"uppercase",letterSpacing:1.5}}>🎁 Bonus</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{BONUS_TYPES.map(b=><div key={b.id} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:12,background:T.surfAlt,border:`1px solid ${T.border}`,fontSize:13}}><span>{b.icon}</span><span style={{fontFamily:"'Nunito'",fontWeight:700,color:T.text}}>{b.name}</span><span style={{fontFamily:"'Nunito'",fontWeight:800,color:(bonuses?.[b.id]||0)>0?T.gold:T.textD,marginLeft:2}}>{bonuses?.[b.id]||0}</span></div>)}</div></Card></div>}

// ═══ MATCHES — COMPLETELY REWRITTEN ═══
function MatchesTab({myUid,matches,onBlock}){
const T=useT();
const[openChat,setOpenChat]=useState(null); // matchId or null
const[chatMsgs,setChatMsgs]=useState([]);
const[chatText,setChatText]=useState("");
const[showReport,setShowReport]=useState(false);
const scrollRef=useRef(null);
const inputRef=useRef(null);

// Listen to messages when a chat is open
useEffect(()=>{
  if(!openChat) { setChatMsgs([]); return; }
  const q = query(collection(db,"matches",openChat,"messages"), orderBy("createdAt","asc"));
  const unsub = onSnapshot(q, snap => {
    setChatMsgs(snap.docs.map(d=>({id:d.id,...d.data()})));
  });
  return () => unsub();
},[openChat]);

// Auto scroll
useEffect(()=>{
  if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
},[chatMsgs]);

// Send message
async function handleSend(){
  if(!chatText.trim()||!openChat) return;
  const t = chatText.trim();
  setChatText("");
  inputRef.current?.focus();
  try {
    await addDoc(collection(db,"matches",openChat,"messages"),{senderId:myUid,text:t,createdAt:serverTimestamp()});
    await updateDoc(doc(db,"matches",openChat),{lastMessage:t});
  } catch(e) { console.error("Send error:",e); }
}

// Get the match object for the open chat
const currentMatch = matches.find(m=>m.matchId===openChat);

// Report handler
async function handleReport(reason){
  if(!currentMatch) return;
  await addDoc(collection(db,"reports"),{reporter:myUid,reported:currentMatch.otherId,reason,createdAt:serverTimestamp()});
  setShowReport(false);
  if(confirm("Signalement envoyé. Voulez-vous aussi bloquer cette personne ?")){
    await onBlock(currentMatch.otherId);
    setOpenChat(null);
  }
}

// ── CHAT VIEW ──
if(openChat && currentMatch){
return <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:999,background:T.bg,display:"flex",flexDirection:"column"}}>

{/* Report modal */}
{showReport&&<div style={{position:"fixed",inset:0,zIndex:1000,background:T.overlay,backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
<Card style={{padding:24,maxWidth:360,width:"100%"}}>
<h3 style={{fontFamily:"'Nunito'",fontSize:17,fontWeight:800,color:T.text,marginBottom:14}}>🚩 Signaler</h3>
{["Comportement inapproprié","Spam","Faux profil","Harcèlement","Autre"].map(r=>
<button key={r} onClick={()=>handleReport(r)} style={{display:"block",width:"100%",padding:"11px 14px",marginBottom:8,borderRadius:12,border:`1px solid ${T.border}`,background:"transparent",color:T.textS,fontFamily:"'Nunito'",fontSize:14,fontWeight:600,cursor:"pointer",textAlign:"left"}}>{r}</button>)}
<button onClick={()=>setShowReport(false)} style={{marginTop:8,width:"100%",padding:12,borderRadius:12,border:`1px solid ${T.border}`,background:"transparent",color:T.textD,fontFamily:"'Nunito'",fontSize:14,cursor:"pointer"}}>Annuler</button>
</Card></div>}

{/* Header */}
<div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${T.border}`,background:T.surface,flexShrink:0}}>
<button onClick={()=>setOpenChat(null)} style={{background:"none",border:"none",color:T.textS,fontSize:20,cursor:"pointer",padding:0}}>←</button>
{currentMatch.photos?.[0]&&<img src={currentMatch.photos[0]} style={{width:36,height:36,borderRadius:"50%",objectFit:"cover",border:`2px solid ${T.accent}`}}/>}
<span style={{fontFamily:"'Nunito'",fontSize:15,fontWeight:700,color:T.text,flex:1}}>{currentMatch.name}</span>
<button onClick={()=>setShowReport(true)} style={{background:"none",border:"none",fontSize:16,cursor:"pointer"}}>🚩</button>
</div>

{/* Messages */}
<div ref={scrollRef} style={{flex:1,overflowY:"auto",padding:14}}>
{chatMsgs.length===0&&<div style={{textAlign:"center",padding:40,fontFamily:"'Nunito'",color:T.textD}}>💬 Envoie le premier message !</div>}
{chatMsgs.map(m=>{
const mine=m.senderId===myUid;
return<div key={m.id} style={{display:"flex",justifyContent:mine?"flex-end":"flex-start",marginBottom:7}}>
<div style={{maxWidth:"75%",padding:"9px 15px",borderRadius:20,borderBottomRightRadius:mine?5:20,borderBottomLeftRadius:mine?20:5,background:mine?T.accentGrad:T.surfAlt,color:mine?"#fff":T.text,fontSize:14,lineHeight:1.5,fontFamily:"'Nunito'",boxShadow:mine?`0 3px 12px ${T.accentGlow}`:"none"}}>{m.text}</div>
</div>})}
</div>

{/* Input bar — ALWAYS at bottom */}
<div style={{padding:"10px 12px",borderTop:`1px solid ${T.border}`,background:T.surface,display:"flex",gap:8,flexShrink:0}}>
<input
  ref={inputRef}
  value={chatText}
  onChange={e=>setChatText(e.target.value)}
  onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();handleSend()}}}
  placeholder="Message..."
  autoFocus
  style={{flex:1,padding:"11px 16px",borderRadius:14,background:T.input,border:`1.5px solid ${T.border}`,color:T.text,fontSize:14,fontFamily:"'Nunito'",outline:"none"}}
/>
<button onClick={handleSend} style={{width:44,height:44,borderRadius:12,border:"none",background:chatText.trim()?T.accentGrad:T.input,color:"#fff",fontSize:17,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>↑</button>
</div>
</div>
}

// ── MATCH LIST ──
return<div style={{padding:20,maxWidth:440,margin:"0 auto",paddingBottom:80}}>
<h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:T.text,margin:"0 0 16px"}}>💬 Matchs</h2>
{matches.length===0&&<div style={{textAlign:"center",padding:"50px 20px"}}><div style={{fontSize:44,marginBottom:10}}>🔮</div><p style={{fontFamily:"'Nunito'",fontSize:14,color:T.textD}}>Pas encore de matchs</p></div>}
{matches.map(m=><div key={m.matchId} onClick={()=>setOpenChat(m.matchId)} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 18px",marginBottom:10,borderRadius:20,background:T.card,border:`1px solid ${T.border}`,cursor:"pointer"}}>
{m.photos?.[0]?<img src={m.photos[0]} style={{width:48,height:48,borderRadius:"50%",objectFit:"cover",border:`2px solid ${T.accent}`}}/>:<div style={{width:48,height:48,borderRadius:"50%",background:T.accentGrad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"#fff"}}>{m.name?.[0]}</div>}
<div style={{flex:1,minWidth:0}}><div style={{fontFamily:"'Nunito'",fontSize:14,fontWeight:700,color:T.text}}>{m.name}{m.age?`, ${m.age}`:""}</div><div style={{fontFamily:"'Nunito'",fontSize:12,color:T.textD,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.lastMessage||"Nouveau match 👋"}</div></div>
<span style={{color:T.textD}}>›</span>
</div>)}
</div>
}

// ═══ PROFILE ═══
function ProfileTab({user,profile,setProfile,onLogout}){const T=useT();const[ed,sEd]=useState(false);const[nm,sNm]=useState(profile.name||"");const[ag,sAg]=useState(profile.age||"");const[ct,sCt]=useState(profile.city||"");const[bi,sBi]=useState(profile.bio||"");const[it,sIt]=useState(profile.interests||[]);const[ph,sPh]=useState(profile.photos||[]);const[sv,sSv]=useState(false);const[ui,sUi]=useState(-1);
async function upPh(idx,f){sUi(idx);try{const url=await upImg(f);const np=[...ph];np[idx]=url;sPh(np);await updateDoc(doc(db,"users",user.uid),{photos:np});setProfile(p=>({...p,photos:np}))}catch(e){alert(e.message)}sUi(-1)}
function rmPh(idx){const np=ph.filter((_,i)=>i!==idx);sPh(np);updateDoc(doc(db,"users",user.uid),{photos:np});setProfile(p=>({...p,photos:np}))}
async function save(){sSv(true);try{const d={name:nm.trim(),age:parseInt(ag),city:ct.trim(),bio:bi.trim(),interests:it};await updateDoc(doc(db,"users",user.uid),d);setProfile(p=>({...p,...d}));sEd(false)}catch(e){alert(e.message)}sSv(false)}
const inp={width:"100%",padding:"11px 14px",borderRadius:12,background:T.input,border:`1.5px solid ${T.border}`,color:T.text,fontSize:14,fontFamily:"'Nunito'",outline:"none",marginBottom:12};
return<div style={{padding:20,maxWidth:440,margin:"0 auto",paddingBottom:80}}>
<Card style={{padding:"12px 16px",marginBottom:14}}><XPBar xp={profile.xp||0}/></Card>
<Card style={{padding:18,marginBottom:14}}><div style={{fontFamily:"'Nunito'",fontSize:11,fontWeight:800,color:T.textD,marginBottom:10,textTransform:"uppercase"}}>Photos ({ph.length}/3)</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>{[0,1,2].map(i=><div key={i} style={{position:"relative"}}><PhotoSlot url={ph[i]} onUp={upPh} onRm={rmPh} idx={i}/>{ui===i&&<div style={{position:"absolute",inset:0,borderRadius:18,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:20,height:20,border:`2px solid ${T.border}`,borderTopColor:T.accent,borderRadius:"50%",animation:"spin .8s linear infinite"}}/></div>}</div>)}</div></Card>
<Card style={{padding:20,marginBottom:14}}>{!ed?<><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><span style={{fontFamily:"'Nunito'",fontSize:11,fontWeight:800,color:T.textD,textTransform:"uppercase"}}>Infos</span><button onClick={()=>sEd(true)} style={{fontFamily:"'Nunito'",fontSize:12,fontWeight:700,color:T.accent,background:"none",border:"none",cursor:"pointer"}}>✏️</button></div><div style={{fontFamily:"'Nunito'",fontSize:15,fontWeight:700,color:T.text,marginBottom:3}}>{profile.name}, {profile.age}</div><div style={{fontFamily:"'Nunito'",fontSize:12,color:T.textD,marginBottom:10}}>📍 {profile.city}</div><p style={{fontFamily:"'Nunito'",fontSize:13,color:T.textS,lineHeight:1.5,marginBottom:12}}>{profile.bio}</p><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{profile.interests?.map(i=><span key={i} style={{padding:"5px 12px",borderRadius:16,fontSize:11,fontFamily:"'Nunito'",fontWeight:600,background:T.accentSoft,color:T.accent}}>{i}</span>)}</div></>:<><input value={nm} onChange={e=>sNm(e.target.value)} placeholder="Prénom" style={inp}/><div style={{display:"flex",gap:8}}><input type="number" value={ag} onChange={e=>sAg(e.target.value)} style={{...inp,width:80}}/><input value={ct} onChange={e=>sCt(e.target.value)} placeholder="Ville" style={{...inp,flex:1}}/></div><textarea value={bi} onChange={e=>sBi(e.target.value.slice(0,150))} rows={3} style={{...inp,resize:"none"}}/><div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:14}}>{INTS.map(t=>{const a=it.includes(t);return<button key={t} onClick={()=>sIt(p=>a?p.filter(x=>x!==t):p.length<5?[...p,t]:p)} style={{padding:"6px 12px",borderRadius:16,fontSize:11,fontFamily:"'Nunito'",fontWeight:600,cursor:"pointer",border:`1px solid ${a?T.accent:T.border}`,background:a?T.accentSoft:"transparent",color:a?T.accent:T.textS}}>{t}</button>})}</div><div style={{display:"flex",gap:8}}><Btn full onClick={save} disabled={sv}>{sv?"...":"✓ Sauver"}</Btn><Btn variant="ghost" onClick={()=>sEd(false)}>✕</Btn></div></>}</Card>
<Btn variant="danger" full onClick={onLogout}>Déconnexion</Btn></div>}

// ═══ BLIND CHAT ═══
function BlindChat({chatId,myUid,otherUid,partner,bonuses,onUseBonus,onTimeUp,onReport}){const T=useT();const[msgs,sM]=useState([]);const[text,sText]=useState("");const[tl,sTl]=useState(CHAT_DUR);const[reveals,sR]=useState([]);const[endTime,sET]=useState(null);const[showRep,sShowRep]=useState(false);const cr=useRef(null);const ir=useRef(null);const timedOut=useRef(false);

useEffect(()=>{const q=query(collection(db,"blindChats",chatId,"messages"),orderBy("createdAt","asc"));return onSnapshot(q,s=>sM(s.docs.map(d=>({id:d.id,...d.data()}))))},[chatId]);
useEffect(()=>{return onSnapshot(doc(db,"blindChats",chatId),sn=>{const d=sn.data();if(d?.endTime)sET(d.endTime)})},[chatId]);
useEffect(()=>{if(!endTime)return;const iv=setInterval(()=>{const left=Math.max(0,Math.round((new Date(endTime).getTime()-Date.now())/1000));sTl(left);if(left<=0&&!timedOut.current){timedOut.current=true;clearInterval(iv);onTimeUp()}},500);return()=>clearInterval(iv)},[endTime,onTimeUp]);
useEffect(()=>{if(cr.current)cr.current.scrollTop=cr.current.scrollHeight},[msgs,reveals]);

async function useBonus(id){const c=bonuses[id]||0;if(c<=0)return;onUseBonus(id);
if(id==="time"){const sn=await getDoc(doc(db,"blindChats",chatId));const cur=sn.data()?.endTime;if(cur)await updateDoc(doc(db,"blindChats",chatId),{endTime:new Date(new Date(cur).getTime()+30000).toISOString()});await addDoc(collection(db,"blindChats",chatId,"messages"),{senderId:"system",text:"⏱️ +30s !",createdAt:serverTimestamp()})}
if(id==="city"&&partner)sR(r=>[...r,`📍 ${partner.city||"?"}`]);
if(id==="peek"&&partner){const int=partner.interests?.[Math.floor(Math.random()*(partner.interests?.length||1))];sR(r=>[...r,`👀 ${int||"?"}`])}
if(id==="ice"){await addDoc(collection(db,"blindChats",chatId,"messages"),{senderId:"system",text:`🎲 ${ICEBREAKERS[Math.floor(Math.random()*ICEBREAKERS.length)]}`,createdAt:serverTimestamp()})}
if(id==="anon"&&partner){const a=partner.age;sR(r=>[...r,`🕶️ ${a?a<22?"18-21":a<25?"22-24":a<28?"25-27":"28+":"?"}`])}}

async function send(){if(!text.trim())return;const t=text.trim();sText("");ir.current?.focus();await addDoc(collection(db,"blindChats",chatId,"messages"),{senderId:myUid,text:t,createdAt:serverTimestamp()})}

async function handleReport(reason){await onReport(reason);sShowRep(false);if(confirm("Signalement envoyé. Bloquer cette personne ?")){onTimeUp()}}

return<div style={{display:"flex",flexDirection:"column",height:"100vh",maxWidth:440,margin:"0 auto"}}>
{showRep&&<div style={{position:"fixed",inset:0,zIndex:200,background:T.overlay,backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}><Card style={{padding:24,maxWidth:340,width:"100%"}}><h3 style={{fontFamily:"'Nunito'",fontSize:16,fontWeight:800,color:T.text,marginBottom:12}}>🚩 Signaler</h3>{["Inapproprié","Spam","Faux profil","Harcèlement","Autre"].map(r=><button key={r} onClick={()=>handleReport(r)} style={{display:"block",width:"100%",padding:10,marginBottom:6,borderRadius:10,border:`1px solid ${T.border}`,background:"transparent",color:T.textS,fontFamily:"'Nunito'",fontSize:13,cursor:"pointer",textAlign:"left"}}>{r}</button>)}<button onClick={()=>sShowRep(false)} style={{marginTop:6,width:"100%",padding:10,borderRadius:10,border:`1px solid ${T.border}`,background:"transparent",color:T.textD,fontFamily:"'Nunito'",fontSize:13,cursor:"pointer"}}>Annuler</button></Card></div>}

<div style={{padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${T.border}`,background:T.surface,flexShrink:0}}>
<div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:36,height:36,borderRadius:"50%",background:T.accentGrad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff",fontFamily:"'Nunito'"}}>?</div><div><div style={{fontFamily:"'Nunito'",fontSize:14,fontWeight:700,color:T.text}}>Inconnu·e</div></div></div>
<div style={{display:"flex",alignItems:"center",gap:6}}>
<button onClick={()=>sShowRep(true)} style={{background:"none",border:"none",fontSize:15,cursor:"pointer"}}>🚩</button>
<Timer sec={tl} tot={CHAT_DUR+120}/></div></div>

<div style={{display:"flex",gap:5,padding:"6px 10px",overflowX:"auto",borderBottom:`1px solid ${T.border}`,background:T.surfAlt,flexShrink:0}}>
{BONUS_TYPES.map(b=>{const c=bonuses[b.id]||0;return<button key={b.id} disabled={c<=0} onClick={()=>useBonus(b.id)} style={{display:"flex",alignItems:"center",gap:3,padding:"5px 10px",borderRadius:10,border:`1px solid ${c>0?T.gold+"44":T.border}`,background:c>0?T.goldSoft:"transparent",cursor:c>0?"pointer":"not-allowed",opacity:c>0?1:.4,whiteSpace:"nowrap",flexShrink:0,fontSize:12}}><span>{b.icon}</span><span style={{fontFamily:"'Nunito'",fontSize:10,fontWeight:700,color:c>0?T.gold:T.textD}}>{c}</span></button>})}</div>

<div ref={cr} style={{flex:1,overflowY:"auto",padding:14}}>
{msgs.length===0&&reveals.length===0&&<div style={{textAlign:"center",padding:30,fontFamily:"'Nunito'",color:T.textD}}>👋 Brise la glace !</div>}
{reveals.map((r,i)=><div key={"r"+i} style={{textAlign:"center",margin:"6px 0",padding:"8px 14px",borderRadius:14,background:T.goldSoft,border:`1px solid ${T.gold}33`,fontFamily:"'Nunito'",fontSize:12,fontWeight:600,color:T.gold}}>{r}</div>)}
{msgs.map(m=>{const mine=m.senderId===myUid;const sys=m.senderId==="system";
return<div key={m.id} style={{display:"flex",justifyContent:sys?"center":mine?"flex-end":"flex-start",marginBottom:7}}>
{sys?<div style={{padding:"8px 14px",borderRadius:14,background:`${T.sec}12`,border:`1px solid ${T.sec}22`,fontFamily:"'Nunito'",fontSize:12,color:T.sec,fontWeight:600}}>{m.text}</div>
:<div style={{maxWidth:"75%",padding:"9px 14px",borderRadius:20,borderBottomRightRadius:mine?5:20,borderBottomLeftRadius:mine?20:5,background:mine?T.accentGrad:T.surfAlt,color:mine?"#fff":T.text,fontSize:14,lineHeight:1.5,fontFamily:"'Nunito'"}}>{m.text}</div>}
</div>})}</div>

<div style={{padding:"8px 12px",borderTop:`1px solid ${T.border}`,background:T.surface,display:"flex",gap:8,flexShrink:0}}>
<input ref={ir} value={text} onChange={e=>sText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Écris..." autoFocus style={{flex:1,padding:"11px 16px",borderRadius:14,background:T.input,border:`1.5px solid ${T.border}`,color:T.text,fontSize:14,fontFamily:"'Nunito'",outline:"none"}}/>
<button onClick={send} style={{width:44,height:44,borderRadius:12,border:"none",background:text.trim()?T.accentGrad:T.input,color:"#fff",fontSize:17,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>↑</button></div></div>}

// ═══ MAIN ═══
export default function App(){const[thm,sThm]=useState(()=>{try{return window.matchMedia?.("(prefers-color-scheme:light)").matches?"light":"dark"}catch{return"dark"}});
const T2=thm==="dark"?dark:light;
const[scr,sScr]=useState("loading");const[tab,sTab]=useState("home");const[user,sUser]=useState(null);const[prof,sProf]=useState(null);const[cid,sCid]=useState(null);const[ouid,sOuid]=useState(null);const[oprof,sOprof]=useState(null);const[opartner,sOp]=useState(null);const[matches,sMatches]=useState([]);const[bonuses,sBonuses]=useState(DEF_BONUS);
const uw=useRef(null);const ud=useRef(null);const um=useRef(null);

useEffect(()=>onAuthStateChanged(auth,async u=>{if(u){sUser(u);const s=await getDoc(doc(db,"users",u.uid));if(s.exists()){const p={id:u.uid,name:u.displayName||s.data().name,...s.data()};sProf(p);sBonuses(p.bonuses||DEF_BONUS);sScr(p.profileComplete?"main":"setup");if(p.profileComplete)lm(u.uid)}else sScr("setup")}else{sUser(null);sProf(null);sMatches([]);sScr("auth")}}),[]);

function lm(uid){um.current?.();const q=query(collection(db,"matches"),where("users","array-contains",uid));um.current=onSnapshot(q,async s=>{const seen=new Set();const r=[];for(const d of s.docs){const dt=d.data();const oid=dt.users.find(id=>id!==uid);const key=[uid,oid].sort().join("-");if(seen.has(key))continue;seen.add(key);const us=await getDoc(doc(db,"users",oid));const ud2=us.exists()?us.data():{};if(ud2.blocked?.includes(uid))continue;r.push({matchId:d.id,...dt,...ud2,otherId:oid})}sMatches(r)})}
async function blockUser(oid){await updateDoc(doc(db,"users",user.uid),{blocked:arrayUnion(oid)});lm(user.uid)}
async function addXP(amt){const nx=(prof?.xp||0)+amt;sProf(p=>({...p,xp:nx}));await updateDoc(doc(db,"users",user.uid),{xp:nx})}

async function startChat(){sScr("waiting");const myUid=user.uid;
await setDoc(doc(db,"waitingRoom",myUid),{uid:myUid,joinedAt:serverTimestamp(),status:"waiting"});
uw.current?.();const q=query(collection(db,"waitingRoom"),where("status","==","waiting"));
uw.current=onSnapshot(q,async s=>{const w=s.docs.map(d=>d.data()).filter(x=>x.uid!==myUid);
if(!w.length)return;const p=w[0];uw.current?.();
const ps=await getDoc(doc(db,"users",p.uid));sOp(ps.exists()?ps.data():null);

if(myUid<p.uid){
// FIX: endTime is set NOW (when both are found), not before
const endTime=new Date(Date.now()+CHAT_DUR*1000).toISOString();
const ref=await addDoc(collection(db,"blindChats"),{users:[myUid,p.uid],status:"active",user1Decision:null,user2Decision:null,endTime,createdAt:serverTimestamp()});
await deleteDoc(doc(db,"waitingRoom",myUid)).catch(()=>{});
await deleteDoc(doc(db,"waitingRoom",p.uid)).catch(()=>{});
await addXP(XP_CHAT);sCid(ref.id);sOuid(p.uid);sScr("chat");
}else{
// Player 2: wait for the chat document to appear, THEN update endTime to now
const cq=query(collection(db,"blindChats"),where("users","array-contains",myUid),where("status","==","active"));
const cu=onSnapshot(cq,async cs=>{
const f=cs.docs.find(d=>d.data().users.includes(p.uid));
if(f){
cu();
// FIX: Reset endTime so player 2 starts with full duration
const freshEnd=new Date(Date.now()+CHAT_DUR*1000).toISOString();
await updateDoc(doc(db,"blindChats",f.id),{endTime:freshEnd});
await addXP(XP_CHAT);sCid(f.id);sOuid(p.uid);sScr("chat");
}});
setTimeout(()=>cu(),20000);
}})}

function cancelW(){uw.current?.();deleteDoc(doc(db,"waitingRoom",user.uid)).catch(()=>{});sScr("main")}
const onTU=useCallback(()=>sScr("decision"),[]);
async function consumeBonus(id){const nb={...bonuses,[id]:Math.max(0,(bonuses[id]||0)-1)};sBonuses(nb);await updateDoc(doc(db,"users",user.uid),{bonuses:nb})}

async function decide(d){const s=await getDoc(doc(db,"blindChats",cid));const dt=s.data();const is1=dt.users[0]===user.uid;const mf=is1?"user1Decision":"user2Decision";const of2=is1?"user2Decision":"user1Decision";
await updateDoc(doc(db,"blindChats",cid),{[mf]:d});const u2=(await getDoc(doc(db,"blindChats",cid))).data();
if(u2[of2])await resolve(d,u2[of2]);
else{sScr("waitDec");ud.current?.();
const timeout=setTimeout(()=>{ud.current?.();sScr("noMatch")},DECISION_TIMEOUT*1000);
ud.current=onSnapshot(doc(db,"blindChats",cid),async sn=>{const dd=sn.data();if(dd?.[of2]){ud.current?.();clearTimeout(timeout);await resolve(d,dd[of2])}})}}

async function resolve(mine,theirs){if(mine==="match"&&theirs==="match"){if(user.uid<ouid)await addDoc(collection(db,"matches"),{users:[user.uid,ouid],createdAt:serverTimestamp(),lastMessage:null});await addXP(XP_MATCH);const s=await getDoc(doc(db,"users",ouid));sOprof(s.exists()?s.data():{name:"?"});sScr("matchReveal")}else sScr("noMatch")}
async function reportBlind(reason){await addDoc(collection(db,"reports"),{reporter:user.uid,reported:ouid,reason,chatId:cid,createdAt:serverTimestamp()})}

return<TC.Provider value={T2}><div style={{minHeight:"100vh",background:T2.bg,backgroundImage:T2.bgGrad,color:T2.text,transition:"background .5s"}}>
<style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Playfair+Display:wght@700&display=swap');*{box-sizing:border-box;margin:0}body{background:${T2.bg}}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:${T2.border};border-radius:3px}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}@keyframes scaleIn{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:none}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}@keyframes glow{0%,100%{box-shadow:0 4px 24px ${T2.accentGlow}}50%{box-shadow:0 4px 36px ${T2.accentGlow},0 0 50px ${T2.accentGlow}}}input::placeholder,textarea::placeholder{color:${T2.textD}}`}</style>
<button onClick={()=>sThm(m=>m==="dark"?"light":"dark")} style={{position:"fixed",top:14,right:14,zIndex:60,width:40,height:40,borderRadius:12,background:T2.card,border:`1px solid ${T2.border}`,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{T2.toggle}</button>

{scr==="loading"&&<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh"}}><div style={{width:40,height:40,border:`3px solid ${T2.border}`,borderTopColor:T2.accent,borderRadius:"50%",animation:"spin .8s linear infinite"}}/></div>}
{scr==="auth"&&<AuthScreen/>}
{scr==="setup"&&user&&<Setup user={user} onDone={p=>{sProf(p);sBonuses(p.bonuses||DEF_BONUS);lm(user.uid);sScr("main")}}/>}
{scr==="main"&&prof&&<>{tab==="home"&&<HomeTab profile={prof} onStart={startChat} bonuses={bonuses}/>}{tab==="matches"&&<MatchesTab myUid={user.uid} matches={matches} onBlock={blockUser}/>}{tab==="profile"&&<ProfileTab user={user} profile={prof} setProfile={sProf} onLogout={()=>signOut(auth)}/>}<NavBar tab={tab} setTab={sTab} n={matches.length}/></>}
{scr==="waiting"&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",padding:40,textAlign:"center"}}><div style={{width:56,height:56,border:`3px solid ${T2.border}`,borderTopColor:T2.accent,borderRadius:"50%",animation:"spin 1s linear infinite",marginBottom:24}}/><h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:T2.text,margin:"0 0 8px"}}>Recherche...</h2><Btn variant="ghost" onClick={cancelW} style={{marginTop:24}}>Annuler</Btn></div>}
{scr==="chat"&&cid&&<BlindChat chatId={cid} myUid={user.uid} otherUid={ouid} partner={opartner} bonuses={bonuses} onUseBonus={consumeBonus} onTimeUp={onTU} onReport={reportBlind}/>}
{scr==="decision"&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",padding:40,textAlign:"center",animation:"fadeIn .5s"}}><div style={{fontSize:52,marginBottom:20,animation:"float 2s ease-in-out infinite"}}>⏰</div><h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:T2.text,margin:"0 0 8px"}}>Temps écoulé !</h2><p style={{fontFamily:"'Nunito'",fontSize:14,color:T2.textS,marginBottom:32}}>Découvrir qui se cache derrière ?</p><div style={{display:"flex",gap:14}}><Btn onClick={()=>decide("match")} style={{padding:"16px 36px",fontSize:16}}>💕 Matcher</Btn><Btn variant="ghost" onClick={()=>decide("pass")} style={{padding:"16px 36px",fontSize:16}}>Passer →</Btn></div></div>}
{scr==="waitDec"&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",padding:40,textAlign:"center"}}><div style={{width:44,height:44,border:`3px solid ${T2.border}`,borderTopColor:T2.accent,borderRadius:"50%",animation:"spin 1s linear infinite",marginBottom:20}}/><h2 style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:T2.text,margin:"0 0 6px"}}>En attente...</h2><p style={{fontFamily:"'Nunito'",fontSize:13,color:T2.textD,marginBottom:24}}>L'autre décide (max {DECISION_TIMEOUT}s)</p><Btn variant="ghost" onClick={()=>{ud.current?.();sScr("main")}}>← Retour à l'accueil</Btn></div>}
{scr==="matchReveal"&&oprof&&<div style={{position:"fixed",inset:0,zIndex:100,background:T2.overlay,backdropFilter:"blur(20px)",display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeIn .4s"}}><div style={{textAlign:"center",padding:36,animation:"scaleIn .5s cubic-bezier(.34,1.56,.64,1)"}}><div style={{fontSize:64,marginBottom:16,animation:"float 2s ease-in-out infinite"}}>💕</div><h2 style={{fontFamily:"'Playfair Display',serif",fontSize:34,background:T2.accentGrad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:"0 0 10px"}}>Match !</h2><p style={{fontFamily:"'Nunito'",fontSize:13,color:T2.gold,marginBottom:16}}>+{XP_MATCH} XP</p>{oprof.photos?.[0]&&<img src={oprof.photos[0]} style={{width:110,height:110,borderRadius:"50%",objectFit:"cover",border:`3px solid ${T2.accent}`,boxShadow:`0 0 50px ${T2.accentGlow}`,marginBottom:12}}/>}<p style={{fontFamily:"'Nunito'",fontSize:15,fontWeight:700,color:T2.text,marginBottom:4}}>{oprof.name}, {oprof.age}</p><p style={{fontFamily:"'Nunito'",fontSize:13,color:T2.textD,marginBottom:24}}>📍 {oprof.city}</p><Btn onClick={()=>{lm(user.uid);sScr("main");sTab("matches")}}>Super 🎉</Btn></div></div>}
{scr==="noMatch"&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",padding:40,textAlign:"center",animation:"fadeIn .5s"}}><div style={{fontSize:48,marginBottom:20}}>😔</div><h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:T2.text,margin:"0 0 8px"}}>Pas cette fois</h2><p style={{fontFamily:"'Nunito'",fontSize:14,color:T2.textS,marginBottom:28}}>La prochaine sera la bonne !</p><Btn onClick={()=>sScr("main")}>Réessayer ⚡</Btn></div>}
</div></TC.Provider>}