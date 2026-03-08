import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, collection, query, where, orderBy, onSnapshot, serverTimestamp, arrayUnion } from "firebase/firestore";

const app = initializeApp({ apiKey:"AIzaSyB02eHA3ZtfLj6DEIk1oTOgkzXexHLn_kY", authDomain:"love-at-first-sight-8c6d3.firebaseapp.com", projectId:"love-at-first-sight-8c6d3" });
const auth = getAuth(app); const db = getFirestore(app); const gProv = new GoogleAuthProvider();
const CLD={c:"dgbcpuvgb",p:"blinddate_upload"};
const CHAT_DUR=60; const SPEED_DUR=30; const SPEED_ROUNDS=3;
const INTS=["Cinéma","Musique","Sport","Voyages","Art","Tech","Cuisine","Lecture","Gaming","Photo","Nature","Mode","Humour","Science"];
const ICEBREAKERS=["Tu préfères voyager dans le passé ou le futur ?","C'est quoi ton guilty pleasure ?","Si t'avais un superpouvoir ?","Ton emoji préféré et pourquoi ?","Le dernier truc qui t'a fait rire ?","Un lieu de rêve pour un premier date ?","Chien ou chat ?","Ta chanson du moment ?"];
const BONUS_TYPES=[{id:"time",icon:"⏱️",name:"+30s"},{id:"city",icon:"📍",name:"Ville"},{id:"ice",icon:"🎲",name:"Brise-glace"},{id:"peek",icon:"👀",name:"Intérêt"},{id:"anon",icon:"🕶️",name:"Âge"}];
const DEF_BONUS={time:3,city:3,ice:3,peek:3,anon:3};
const XP_CHAT=5,XP_MATCH=20;
function getLevel(xp){if(xp<50)return{lv:1,n:"Débutant",nx:50};if(xp<150)return{lv:2,n:"Curieux",nx:150};if(xp<300)return{lv:3,n:"Sociable",nx:300};if(xp<500)return{lv:4,n:"Charmeur",nx:500};if(xp<800)return{lv:5,n:"Séducteur",nx:800};if(xp<1200)return{lv:6,n:"Expert",nx:1200};return{lv:7,n:"Légende",nx:99999}}

const dark={name:"dark",bg:"#06060b",surface:"#0d0d15",surfAlt:"#12121c",card:"#10101a",border:"#1a1a30",borderL:"#252545",input:"#0b0b14",accent:"#ff2d6b",accentGlow:"rgba(255,45,107,0.3)",accentSoft:"rgba(255,45,107,0.08)",accentGrad:"linear-gradient(135deg,#ff2d6b,#ff6b3d)",sec:"#6c5ce7",secGlow:"rgba(108,92,231,0.25)",gold:"#fbbf24",goldSoft:"rgba(251,191,36,0.1)",success:"#00d68f",danger:"#ff4757",text:"#f0f0f8",textS:"#8888a4",textD:"#4a4a65",overlay:"rgba(3,3,8,0.92)",toggle:"🌙",bgGrad:"radial-gradient(ellipse at 20% 0%,#12102a 0%,#06060b 50%),radial-gradient(ellipse at 80% 100%,#1a0a1e 0%,transparent 50%)",gBg:"rgba(255,255,255,0.06)",gC:"#fff",gB:"1px solid rgba(255,255,255,0.12)"};
const light={name:"light",bg:"#faf8f5",surface:"#ffffff",surfAlt:"#f5f2ee",card:"#ffffff",border:"#e8e2da",borderL:"#d8d2ca",input:"#f5f2ee",accent:"#e6295f",accentGlow:"rgba(230,41,95,0.2)",accentSoft:"rgba(230,41,95,0.06)",accentGrad:"linear-gradient(135deg,#e6295f,#ff6b3d)",sec:"#5b4cdb",secGlow:"rgba(91,76,219,0.15)",gold:"#d97706",goldSoft:"rgba(217,119,6,0.08)",success:"#059669",danger:"#dc2626",text:"#1a1a2e",textS:"#6b6b80",textD:"#9b9baa",overlay:"rgba(250,248,245,0.92)",toggle:"☀️",bgGrad:"radial-gradient(ellipse at 30% 0%,#fde8f0 0%,#faf8f5 50%)",gBg:"#fff",gC:"#333",gB:"1px solid #ddd"};

const TC=createContext();function useT(){return useContext(TC)}
async function upImg(f){const fd=new FormData();fd.append("file",f);fd.append("upload_preset",CLD.p);fd.append("folder","blinddate");const r=await fetch(`https://api.cloudinary.com/v1_1/${CLD.c}/image/upload`,{method:"POST",body:fd});if(!r.ok)throw new Error("Upload failed");return(await r.json()).secure_url}

// ═══ UI ═══
function Btn({children,variant="primary",disabled,onClick,style:sx,full}){const[h,sH]=useState(false);const T=useT();const v={primary:{bg:T.accentGrad,c:"#fff",b:"none",s:`0 4px 28px ${T.accentGlow}`},ghost:{bg:"transparent",c:T.textS,b:`1px solid ${T.border}`,s:"none"},google:{bg:T.gBg,c:T.gC,b:T.gB,s:"0 2px 8px rgba(0,0,0,0.06)"},danger:{bg:`${T.danger}15`,c:T.danger,b:`1px solid ${T.danger}33`,s:"none"},gold:{bg:`linear-gradient(135deg,${T.gold},#f59e0b)`,c:"#fff",b:"none",s:"0 4px 20px rgba(251,191,36,0.3)"},sec:{bg:`linear-gradient(135deg,${T.sec},#a66bff)`,c:"#fff",b:"none",s:`0 4px 20px ${T.secGlow}`}}[variant]||{bg:T.accentGrad,c:"#fff",b:"none",s:`0 4px 28px ${T.accentGlow}`};return<button disabled={disabled} onClick={onClick} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)} style={{padding:"14px 28px",fontSize:15,fontWeight:700,fontFamily:"'Nunito',sans-serif",borderRadius:16,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,background:v.bg,color:v.c,border:v.b,boxShadow:v.s,width:full?"100%":"auto",transition:"all .35s cubic-bezier(.34,1.56,.64,1)",transform:h&&!disabled?"translateY(-3px) scale(1.04)":"none",filter:h&&!disabled?"brightness(1.1)":"none",...sx}}>{children}</button>}
function Card({children,style:sx,hover,glow}){const[h,sH]=useState(false);const T=useT();return<div onMouseEnter={()=>hover&&sH(true)} onMouseLeave={()=>hover&&sH(false)} style={{background:T.card,borderRadius:24,border:`1px solid ${T.border}`,boxShadow:h?`0 12px 40px rgba(0,0,0,${T.name==="dark"?.5:.1}),0 0 20px ${glow||T.accentGlow}`:`0 4px 20px rgba(0,0,0,${T.name==="dark"?.4:.06})`,transition:"all .35s cubic-bezier(.34,1.56,.64,1)",transform:h?"translateY(-4px)":"none",...sx}}>{children}</div>}
function Timer({sec,tot}){const T=useT();const p=Math.min((sec/Math.max(tot,1))*100,100),lo=sec<=10;return<div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:120,height:6,borderRadius:3,background:T.border,overflow:"hidden"}}><div style={{width:`${p}%`,height:"100%",borderRadius:3,background:lo?T.danger:T.accentGrad,transition:"width .5s"}}/></div><span style={{fontFamily:"'Nunito'",fontWeight:800,fontSize:14,color:lo?T.danger:T.accent,fontVariantNumeric:"tabular-nums",animation:lo?"pulse 1s infinite":"none"}}>{sec}s</span></div>}
function XPBar({xp}){const T=useT();const l=getLevel(xp||0);const p=((xp||0)/l.nx)*100;return<div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:28,height:28,borderRadius:"50%",background:T.accentGrad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#fff",fontFamily:"'Nunito'"}}>{l.lv}</div><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontFamily:"'Nunito'",fontSize:11,fontWeight:700,color:T.text}}>{l.n}</span><span style={{fontFamily:"'Nunito'",fontSize:10,color:T.textD}}>{xp||0}/{l.nx}</span></div><div style={{height:4,borderRadius:2,background:T.border,overflow:"hidden"}}><div style={{width:`${Math.min(p,100)}%`,height:"100%",background:T.accentGrad,transition:"width .5s"}}/></div></div></div>}
function NavBar({tab,setTab,n}){const T=useT();return<div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:50,background:T.surface,borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"space-around",padding:"8px 0 14px"}}>{[{id:"home",i:"🔮",l:"Accueil"},{id:"matches",i:"💬",l:"Matchs"},{id:"profile",i:"👤",l:"Profil"}].map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{background:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"6px 20px",transition:"all .3s",transform:tab===t.id?"scale(1.12)":"none"}}><span style={{fontSize:22,filter:tab===t.id?"none":"grayscale(.5) opacity(.5)",position:"relative"}}>{t.i}{t.id==="matches"&&n>0&&<span style={{position:"absolute",top:-2,right:-6,width:10,height:10,borderRadius:"50%",background:T.accent,border:`2px solid ${T.surface}`}}/>}</span><span style={{fontFamily:"'Nunito'",fontSize:10,fontWeight:700,color:tab===t.id?T.accent:T.textD}}>{t.l}</span></button>)}</div>}
function PhotoSlot({url,onUp,onRm,idx}){const T=useT();const ref=useRef(null);const[h,sH]=useState(false);return<div onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)} style={{aspectRatio:"3/4",borderRadius:20,overflow:"hidden",position:"relative",cursor:"pointer",border:url?`2px solid ${T.border}`:`2px dashed ${T.borderL}`,background:url?"transparent":T.surfAlt,transition:"all .3s",transform:h?"scale(1.03)":"none"}} onClick={()=>!url&&ref.current?.click()}>{url?<><img src={url} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>{h&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><button onClick={e=>{e.stopPropagation();ref.current?.click()}} style={{padding:"8px 14px",borderRadius:12,background:T.accentGrad,border:"none",color:"#fff",fontSize:12,fontFamily:"'Nunito'",fontWeight:700,cursor:"pointer"}}>📷</button><button onClick={e=>{e.stopPropagation();onRm(idx)}} style={{padding:"8px 14px",borderRadius:12,background:`${T.danger}33`,border:"none",color:T.danger,fontSize:12,fontFamily:"'Nunito'",fontWeight:700,cursor:"pointer"}}>✕</button></div>}</>:<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%"}}><span style={{fontSize:28,color:T.textD}}>＋</span><span style={{fontFamily:"'Nunito'",fontSize:11,color:T.textD}}>Photo {idx+1}</span></div>}<input ref={ref} type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f){if(f.size>5e6){alert("Max 5Mo");return}onUp(idx,f)}}} style={{display:"none"}}/></div>}
function ReportModal({onClose,onReport}){const T=useT();const[r,sR]=useState("");const reasons=["Comportement inapproprié","Spam","Faux profil","Harcèlement","Contenu offensant","Autre"];return<div style={{position:"fixed",inset:0,zIndex:200,background:T.overlay,backdropFilter:"blur(16px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,animation:"fadeIn .3s"}}><Card style={{padding:28,maxWidth:380,width:"100%"}}><h3 style={{fontFamily:"'Nunito'",fontSize:18,fontWeight:800,color:T.text,marginBottom:16}}>🚩 Signaler</h3><div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>{reasons.map(x=><button key={x} onClick={()=>sR(x)} style={{padding:"12px 16px",borderRadius:14,border:`1.5px solid ${r===x?T.danger:T.border}`,background:r===x?`${T.danger}10`:"transparent",color:r===x?T.danger:T.textS,fontFamily:"'Nunito'",fontSize:14,fontWeight:600,cursor:"pointer",textAlign:"left"}}>{x}</button>)}</div><div style={{display:"flex",gap:10}}><Btn variant="danger" full onClick={()=>{if(r)onReport(r)}} disabled={!r}>Signaler</Btn><Btn variant="ghost" onClick={onClose}>Annuler</Btn></div></Card></div>}

// ═══ CHAT INPUT BAR (reusable) ═══
function ChatInput({onSend}){const T=useT();const[inp,sI]=useState("");const ir=useRef(null);
function send(){if(!inp.trim())return;onSend(inp.trim());sI("");ir.current?.focus()}
return<div style={{padding:"10px 14px",borderTop:`1px solid ${T.border}`,background:T.surface,display:"flex",gap:8}}>
<input ref={ir} value={inp} onChange={e=>sI(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Message..." autoFocus style={{flex:1,padding:"12px 18px",borderRadius:16,background:T.input,border:`1.5px solid ${T.border}`,color:T.text,fontSize:14,fontFamily:"'Nunito'",outline:"none"}}/>
<button onClick={send} style={{width:46,height:46,borderRadius:14,border:"none",background:inp.trim()?T.accentGrad:T.input,color:"#fff",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .3s",boxShadow:inp.trim()?`0 4px 16px ${T.accentGlow}`:"none",flexShrink:0}}>↑</button></div>}

// ═══ AUTH ═══
function AuthScreen({onAuth}){const T=useT();const[m,sM]=useState("login");const[e,sE]=useState("");const[p,sP]=useState("");const[n,sN]=useState("");const[err,sErr]=useState("");const[ld,sLd]=useState(false);
async function sub(){sErr("");sLd(true);try{if(m==="signup"){if(!n.trim()){sErr("Prénom requis");sLd(false);return}if(p.length<6){sErr("6 car. min");sLd(false);return}const c=await createUserWithEmailAndPassword(auth,e,p);await updateProfile(c.user,{displayName:n.trim()});await setDoc(doc(db,"users",c.user.uid),{name:n.trim(),email:e,age:null,city:"",bio:"",photos:[],interests:[],profileComplete:false,bonuses:DEF_BONUS,xp:0,blocked:[],createdAt:serverTimestamp()})}else{await signInWithEmailAndPassword(auth,e,p)}}catch(er){const ms={"auth/email-already-in-use":"Email déjà utilisé","auth/user-not-found":"Aucun compte","auth/wrong-password":"Mauvais mdp","auth/invalid-credential":"Email ou mdp incorrect"};sErr(ms[er.code]||er.message)}sLd(false)}
async function ggl(){sErr("");sLd(true);try{const r=await signInWithPopup(auth,gProv);const u=r.user;const s=await getDoc(doc(db,"users",u.uid));if(!s.exists())await setDoc(doc(db,"users",u.uid),{name:u.displayName||"",email:u.email,age:null,city:"",bio:"",photos:u.photoURL?[u.photoURL]:[],interests:[],profileComplete:false,bonuses:DEF_BONUS,xp:0,blocked:[],createdAt:serverTimestamp()})}catch(er){sErr(er.message)}sLd(false)}
const inp={width:"100%",padding:"14px 18px",borderRadius:14,background:T.input,border:`1.5px solid ${T.border}`,color:T.text,fontSize:14,fontFamily:"'Nunito'",outline:"none",marginBottom:14};
return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}><div style={{width:"100%",maxWidth:400,animation:"fadeIn .6s"}}><div style={{textAlign:"center",marginBottom:40}}><div style={{fontSize:56,marginBottom:14,animation:"float 3s ease-in-out infinite"}}>🔮</div><h1 style={{fontFamily:"'Playfair Display',serif",fontSize:38,background:T.accentGrad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:"0 0 8px"}}>BlindDate</h1><p style={{fontFamily:"'Nunito'",fontSize:15,color:T.textD}}>60 secondes pour créer une connexion</p></div>
{err&&<div style={{padding:"12px",borderRadius:14,background:`${T.danger}10`,border:`1px solid ${T.danger}33`,color:T.danger,fontSize:13,fontFamily:"'Nunito'",marginBottom:16,textAlign:"center"}}>{err}</div>}
<Btn variant="google" full onClick={ggl} disabled={ld} style={{marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>Continuer avec Google</Btn>
<div style={{display:"flex",alignItems:"center",gap:14,margin:"20px 0"}}><div style={{flex:1,height:1,background:T.border}}/><span style={{fontFamily:"'Nunito'",fontSize:12,color:T.textD}}>ou par email</span><div style={{flex:1,height:1,background:T.border}}/></div>
<Card style={{padding:28,marginBottom:20}}>{m==="signup"&&<input value={n} onChange={x=>sN(x.target.value)} placeholder="Prénom" style={inp}/>}<input type="email" value={e} onChange={x=>sE(x.target.value)} placeholder="Email" style={inp}/><input type="password" value={p} onChange={x=>sP(x.target.value)} placeholder="Mot de passe" onKeyDown={x=>x.key==="Enter"&&sub()} style={{...inp,marginBottom:0}}/></Card>
<Btn full onClick={sub} disabled={ld}>{ld?"...":m==="login"?"Se connecter":"Créer mon compte 🚀"}</Btn>
<p style={{textAlign:"center",marginTop:20,fontFamily:"'Nunito'",fontSize:14,color:T.textS}}>{m==="login"?"Pas de compte ? ":"Déjà un compte ? "}<span onClick={()=>{sM(m==="login"?"signup":"login");sErr("")}} style={{color:T.accent,fontWeight:700,cursor:"pointer"}}>{m==="login"?"S'inscrire":"Se connecter"}</span></p></div></div>}

// ═══ SETUP ═══
function Setup({user,onDone}){const T=useT();const[st,sSt]=useState(0);const[age,sA]=useState("");const[city,sC]=useState("");const[bio,sB]=useState("");const[ints,sI]=useState([]);const[pf,sPf]=useState(null);const[pp,sPp]=useState(null);const[up,sUp]=useState(false);const[err,sErr]=useState("");const fr=useRef(null);
async function detectCity(){try{const pos=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{timeout:10000}));const{latitude:lat,longitude:lng}=pos.coords;const r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);const d=await r.json();const c=d.address?.city||d.address?.town||d.address?.village||"";if(c)sC(c);await updateDoc(doc(db,"users",user.uid),{location:{lat,lng}})}catch{}}
function val(){sErr("");if(st===0&&(!age||age<18||!city.trim())){sErr("Remplis tout (18+)");return false}if(st===1&&ints.length<2){sErr("Min 2");return false}if(st===2&&!bio.trim()){sErr("Écris ta bio");return false}if(st===3&&!pf){sErr("Ajoute une photo");return false}return true}
async function fin(){if(!val())return;sUp(true);try{const url=await upImg(pf);const d={age:parseInt(age),city:city.trim(),bio:bio.trim(),interests:ints,photos:[url],profileComplete:true,bonuses:DEF_BONUS,xp:0};await updateDoc(doc(db,"users",user.uid),d);onDone({name:user.displayName,...d})}catch(e){sErr(e.message)}sUp(false)}
function nx(){if(val()){if(st===3)fin();else sSt(s=>s+1)}}
const inp={width:"100%",padding:"14px 18px",borderRadius:14,background:T.input,border:`1.5px solid ${T.border}`,color:T.text,fontSize:14,fontFamily:"'Nunito'",outline:"none"};
return<div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",padding:20}}><div style={{width:"100%",maxWidth:420,animation:"fadeIn .5s"}}><div style={{textAlign:"center",marginBottom:28,paddingTop:24}}><div style={{fontSize:36,marginBottom:8}}>🔮</div><h1 style={{fontFamily:"'Playfair Display',serif",fontSize:26,background:T.accentGrad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:"0 0 4px"}}>Ton profil</h1></div>
<div style={{width:"100%",height:4,borderRadius:2,background:T.border,marginBottom:24,overflow:"hidden"}}><div style={{width:`${((st+1)/4)*100}%`,height:"100%",background:T.accentGrad,transition:"width .5s"}}/></div>
{err&&<div style={{padding:"12px",borderRadius:14,background:`${T.danger}10`,border:`1px solid ${T.danger}33`,color:T.danger,fontSize:13,fontFamily:"'Nunito'",marginBottom:16,textAlign:"center"}}>{err}</div>}
<Card style={{padding:28,marginBottom:24}}>
{st===0&&<><label style={{fontFamily:"'Nunito'",fontSize:13,fontWeight:600,color:T.textS,display:"block",marginBottom:8}}>Âge</label><input type="number" min={18} value={age} onChange={e=>sA(e.target.value)} placeholder="18" style={{...inp,width:120,marginBottom:18}}/><label style={{fontFamily:"'Nunito'",fontSize:13,fontWeight:600,color:T.textS,display:"block",marginBottom:8}}>Ville</label><div style={{display:"flex",gap:8}}><input value={city} onChange={e=>sC(e.target.value)} placeholder="Paris, Lyon..." style={{...inp,flex:1,marginBottom:0}}/><button onClick={detectCity} style={{padding:"12px 16px",borderRadius:14,background:T.accentSoft,border:`1px solid ${T.accent}33`,color:T.accent,fontSize:13,fontFamily:"'Nunito'",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>📍 Auto</button></div></>}
{st===1&&<><label style={{fontFamily:"'Nunito'",fontSize:13,fontWeight:600,color:T.textS,display:"block",marginBottom:12}}>2-5 intérêts ({ints.length}/5)</label><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{INTS.map(t=>{const a=ints.includes(t);return<button key={t} onClick={()=>sI(p=>a?p.filter(x=>x!==t):p.length<5?[...p,t]:p)} style={{padding:"9px 18px",borderRadius:24,fontSize:13,fontFamily:"'Nunito'",fontWeight:600,cursor:"pointer",border:`1.5px solid ${a?T.accent:T.border}`,background:a?T.accentSoft:"transparent",color:a?T.accent:T.textS}}>{t}</button>})}</div></>}
{st===2&&<><label style={{fontFamily:"'Nunito'",fontSize:13,fontWeight:600,color:T.textS,display:"block",marginBottom:8}}>Bio (150 max)</label><textarea value={bio} onChange={e=>sB(e.target.value.slice(0,150))} placeholder="Décris-toi..." rows={4} style={{...inp,resize:"none",lineHeight:1.6}}/></>}
{st===3&&<><label style={{fontFamily:"'Nunito'",fontSize:13,fontWeight:600,color:T.textS,display:"block",marginBottom:14}}>Ta photo</label><div onClick={()=>fr.current?.click()} style={{border:`2px dashed ${T.borderL}`,borderRadius:20,padding:pp?0:40,textAlign:"center",cursor:"pointer",overflow:"hidden"}}>{pp?<img src={pp} alt="" style={{width:"100%",maxHeight:260,objectFit:"cover",display:"block",borderRadius:18}}/>:<div><div style={{fontSize:48,marginBottom:8}}>📸</div><p style={{fontFamily:"'Nunito'",fontSize:14,color:T.textS}}>Clique pour choisir</p></div>}</div><input ref={fr} type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>5e6){sErr("Max 5Mo");return}sPf(f);sErr("");const r=new FileReader();r.onload=ev=>sPp(ev.target.result);r.readAsDataURL(f)}} style={{display:"none"}}/></>}
</Card>
<div style={{display:"flex",gap:12}}>{st>0&&<Btn variant="ghost" onClick={()=>sSt(s=>s-1)} style={{flex:1}}>←</Btn>}<Btn full onClick={nx} disabled={up} style={{flex:2}}>{up?"Upload...":st===3?"C'est parti 🚀":"Suivant →"}</Btn></div></div></div>}

// ═══ HOME ═══
function HomeTab({profile,onStart,onSpeedDate,bonuses}){const T=useT();
return<div style={{padding:20,maxWidth:440,margin:"0 auto",paddingBottom:90,animation:"fadeIn .5s"}}>
<div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>{profile.photos?.[0]&&<img src={profile.photos[0]} alt="" style={{width:52,height:52,borderRadius:"50%",objectFit:"cover",border:`2.5px solid ${T.accent}`,boxShadow:`0 0 16px ${T.accentGlow}`}}/>}<div style={{flex:1}}><div style={{fontFamily:"'Nunito'",fontSize:17,fontWeight:800,color:T.text}}>Salut {profile.name} 👋</div><div style={{fontFamily:"'Nunito'",fontSize:12,color:T.textD}}>{profile.city} · {profile.age} ans</div></div></div>
<Card style={{padding:"14px 18px",marginBottom:16}}><XPBar xp={profile.xp||0}/></Card>
<Btn full onClick={onStart} style={{padding:"22px",fontSize:18,marginBottom:12,animation:"glow 2s ease-in-out infinite"}}>⚡ Conversation (60s)</Btn>
<Btn variant="sec" full onClick={onSpeedDate} style={{padding:"18px",fontSize:16,marginBottom:24}}>🚀 Speed Dating (3×30s)</Btn>
<Card style={{padding:20,marginBottom:20}} hover glow={T.gold+"44"}>
<h3 style={{fontFamily:"'Nunito'",fontSize:11,fontWeight:800,color:T.textD,margin:"0 0 14px",textTransform:"uppercase",letterSpacing:2}}>🎁 Bonus</h3>
<div style={{display:"flex",flexWrap:"wrap",gap:8}}>{BONUS_TYPES.map(b=><div key={b.id} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:14,background:T.surfAlt,border:`1px solid ${T.border}`}}><span style={{fontSize:16}}>{b.icon}</span><span style={{fontFamily:"'Nunito'",fontSize:12,fontWeight:700,color:T.text}}>{b.name}</span><span style={{fontFamily:"'Nunito'",fontSize:14,fontWeight:800,color:(bonuses?.[b.id]||0)>0?T.gold:T.textD,marginLeft:4}}>{bonuses?.[b.id]||0}</span></div>)}</div></Card>
<Card style={{padding:24}} hover>
<h3 style={{fontFamily:"'Nunito'",fontSize:11,fontWeight:800,color:T.textD,margin:"0 0 16px",textTransform:"uppercase",letterSpacing:2}}>Modes de jeu</h3>
{[{i:"🎭",t:"Classique (60s)",d:"1 conversation, 1 minute"},{i:"🚀",t:"Speed Dating (3×30s)",d:"3 personnes en 30s, choisis ton préféré"},{i:"💕",t:"Matcher",d:"+20 XP par match réussi"}].map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 0",borderTop:i?`1px solid ${T.border}`:"none"}}><span style={{fontSize:24}}>{s.i}</span><div><div style={{fontFamily:"'Nunito'",fontSize:14,fontWeight:700,color:T.text}}>{s.t}</div><div style={{fontFamily:"'Nunito'",fontSize:12,color:T.textD}}>{s.d}</div></div></div>)}</Card></div>}

// ═══ MATCHES TAB — FIXED INPUT ═══
function MatchesTab({myUid,matches,onBlock}){const T=useT();const[sel,sS]=useState(null);const[msgs,sM]=useState([]);const[report,sReport]=useState(false);const cr=useRef(null);
useEffect(()=>{if(!sel){sM([]);return}const q=query(collection(db,"matches",sel.matchId,"messages"),orderBy("createdAt","asc"));const un=onSnapshot(q,s=>sM(s.docs.map(d=>({id:d.id,...d.data()}))));return()=>un()},[sel]);
useEffect(()=>{if(cr.current)cr.current.scrollTop=cr.current.scrollHeight},[msgs]);
async function send(text){await addDoc(collection(db,"matches",sel.matchId,"messages"),{senderId:myUid,text,createdAt:serverTimestamp()});await updateDoc(doc(db,"matches",sel.matchId),{lastMessage:text})}
async function handleReport(reason){await addDoc(collection(db,"reports"),{reporter:myUid,reported:sel.otherId,reason,matchId:sel.matchId,createdAt:serverTimestamp()});sReport(false);alert("Signalement envoyé")}
async function handleBlock(){if(!confirm(`Bloquer ${sel.name} ?`))return;await onBlock(sel.otherId);sS(null)}

// MATCH CHAT VIEW — full screen, no navbar
if(sel)return<div style={{display:"flex",flexDirection:"column",height:"100vh",position:"fixed",inset:0,zIndex:40,background:T.bg}}>
{report&&<ReportModal onClose={()=>sReport(false)} onReport={handleReport}/>}
<div style={{padding:"14px 18px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${T.border}`,background:T.surface,flexShrink:0}}>
<button onClick={()=>sS(null)} style={{background:"transparent",border:"none",color:T.textS,fontSize:20,cursor:"pointer"}}>←</button>
{sel.photos?.[0]&&<img src={sel.photos[0]} alt="" style={{width:40,height:40,borderRadius:"50%",objectFit:"cover",border:`2px solid ${T.accent}`}}/>}
<div style={{flex:1}}><div style={{fontFamily:"'Nunito'",fontSize:15,fontWeight:700,color:T.text}}>{sel.name}</div><div style={{fontFamily:"'Nunito'",fontSize:11,color:T.textD}}>{sel.city}</div></div>
<button onClick={()=>sReport(true)} style={{background:"transparent",border:"none",fontSize:16,cursor:"pointer",padding:4}}>🚩</button>
<button onClick={handleBlock} style={{background:"transparent",border:"none",fontSize:16,cursor:"pointer",padding:4}}>🚫</button></div>
<div ref={cr} style={{flex:1,overflowY:"auto",padding:16}}>
{msgs.length===0&&<div style={{textAlign:"center",padding:40,fontFamily:"'Nunito'",color:T.textD}}>Envoie le premier message ! 💬</div>}
{msgs.map(m=><div key={m.id} style={{display:"flex",justifyContent:m.senderId===myUid?"flex-end":"flex-start",marginBottom:8,animation:"slideUp .3s"}}><div style={{maxWidth:"75%",padding:"10px 16px",borderRadius:22,borderBottomRightRadius:m.senderId===myUid?6:22,borderBottomLeftRadius:m.senderId===myUid?22:6,background:m.senderId===myUid?T.accentGrad:T.surfAlt,color:m.senderId===myUid?"#fff":T.text,fontSize:14,lineHeight:1.5,fontFamily:"'Nunito'",boxShadow:m.senderId===myUid?`0 4px 16px ${T.accentGlow}`:"none"}}>{m.text}</div></div>)}</div>
<ChatInput onSend={send}/>
</div>;

// MATCHES LIST
return<div style={{padding:20,maxWidth:440,margin:"0 auto",paddingBottom:90,animation:"fadeIn .5s"}}><h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:T.text,margin:"0 0 20px"}}>💬 Tes Matchs</h2>
{matches.length===0&&<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:48,marginBottom:12,animation:"float 3s ease-in-out infinite"}}>🔮</div><p style={{fontFamily:"'Nunito'",fontSize:15,color:T.textD}}>Pas encore de matchs.<br/>Lance une conversation !</p></div>}
{matches.map(m=><Card key={m.matchId} hover style={{padding:"16px 20px",marginBottom:12,cursor:"pointer"}}><div onClick={()=>sS(m)} style={{display:"flex",alignItems:"center",gap:14}}>
{m.photos?.[0]?<img src={m.photos[0]} alt="" style={{width:52,height:52,borderRadius:"50%",objectFit:"cover",border:`2px solid ${T.accent}`}}/>:<div style={{width:52,height:52,borderRadius:"50%",background:T.accentGrad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:"#fff"}}>{m.name?.[0]}</div>}
<div style={{flex:1,minWidth:0}}><div style={{fontFamily:"'Nunito'",fontSize:15,fontWeight:700,color:T.text}}>{m.name}{m.age?`, ${m.age}`:""}</div><div style={{fontFamily:"'Nunito'",fontSize:13,color:T.textD,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.lastMessage||"Nouveau match ! 👋"}</div></div>
<span style={{fontSize:18,color:T.textD}}>›</span></div></Card>)}</div>}

// ═══ PROFILE ═══
function ProfileTab({user,profile,setProfile,onLogout}){const T=useT();const[ed,sEd]=useState(false);const[nm,sNm]=useState(profile.name||"");const[ag,sAg]=useState(profile.age||"");const[ct,sCt]=useState(profile.city||"");const[bi,sBi]=useState(profile.bio||"");const[it,sIt]=useState(profile.interests||[]);const[ph,sPh]=useState(profile.photos||[]);const[sv,sSv]=useState(false);const[ui,sUi]=useState(-1);
async function upPh(idx,f){sUi(idx);try{const url=await upImg(f);const np=[...ph];np[idx]=url;sPh(np);await updateDoc(doc(db,"users",user.uid),{photos:np});setProfile(p=>({...p,photos:np}))}catch(e){alert(e.message)}sUi(-1)}
function rmPh(idx){const np=ph.filter((_,i)=>i!==idx);sPh(np);updateDoc(doc(db,"users",user.uid),{photos:np});setProfile(p=>({...p,photos:np}))}
async function save(){sSv(true);try{const d={name:nm.trim(),age:parseInt(ag),city:ct.trim(),bio:bi.trim(),interests:it};await updateDoc(doc(db,"users",user.uid),d);setProfile(p=>({...p,...d}));sEd(false)}catch(e){alert(e.message)}sSv(false)}
const inp={width:"100%",padding:"12px 16px",borderRadius:14,background:T.input,border:`1.5px solid ${T.border}`,color:T.text,fontSize:14,fontFamily:"'Nunito'",outline:"none",marginBottom:14};
return<div style={{padding:20,maxWidth:440,margin:"0 auto",paddingBottom:90,animation:"fadeIn .5s"}}><h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:T.text,margin:"0 0 16px"}}>👤 Mon Profil</h2>
<Card style={{padding:"14px 18px",marginBottom:16}}><XPBar xp={profile.xp||0}/></Card>
<Card style={{padding:20,marginBottom:16}}><label style={{fontFamily:"'Nunito'",fontSize:12,fontWeight:800,color:T.textD,display:"block",marginBottom:12,textTransform:"uppercase",letterSpacing:1.5}}>Mes photos ({ph.length}/3)</label><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>{[0,1,2].map(i=><div key={i} style={{position:"relative"}}><PhotoSlot url={ph[i]} onUp={upPh} onRm={rmPh} idx={i}/>{ui===i&&<div style={{position:"absolute",inset:0,borderRadius:20,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:24,height:24,border:`2px solid ${T.border}`,borderTopColor:T.accent,borderRadius:"50%",animation:"spin .8s linear infinite"}}/></div>}</div>)}</div></Card>
<Card style={{padding:24,marginBottom:16}}>{!ed?<><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><label style={{fontFamily:"'Nunito'",fontSize:12,fontWeight:800,color:T.textD,textTransform:"uppercase",letterSpacing:1.5}}>Infos</label><button onClick={()=>sEd(true)} style={{fontFamily:"'Nunito'",fontSize:13,fontWeight:700,color:T.accent,background:"transparent",border:"none",cursor:"pointer"}}>Modifier ✏️</button></div><div style={{fontFamily:"'Nunito'",fontSize:16,fontWeight:700,color:T.text,marginBottom:4}}>{profile.name}, {profile.age}</div><div style={{fontFamily:"'Nunito'",fontSize:13,color:T.textD,marginBottom:12}}>📍 {profile.city}</div><p style={{fontFamily:"'Nunito'",fontSize:14,color:T.textS,lineHeight:1.6,marginBottom:16}}>{profile.bio}</p><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{profile.interests?.map(i=><span key={i} style={{padding:"6px 14px",borderRadius:20,fontSize:12,fontFamily:"'Nunito'",fontWeight:600,background:T.accentSoft,color:T.accent}}>{i}</span>)}</div></>:<><input value={nm} onChange={e=>sNm(e.target.value)} placeholder="Prénom" style={inp}/><div style={{display:"flex",gap:10}}><input type="number" value={ag} onChange={e=>sAg(e.target.value)} placeholder="Âge" style={{...inp,width:100}}/><input value={ct} onChange={e=>sCt(e.target.value)} placeholder="Ville" style={{...inp,flex:1}}/></div><textarea value={bi} onChange={e=>sBi(e.target.value.slice(0,150))} placeholder="Bio..." rows={3} style={{...inp,resize:"none"}}/><div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>{INTS.map(t=>{const a=it.includes(t);return<button key={t} onClick={()=>sIt(p=>a?p.filter(x=>x!==t):p.length<5?[...p,t]:p)} style={{padding:"7px 14px",borderRadius:20,fontSize:12,fontFamily:"'Nunito'",fontWeight:600,cursor:"pointer",border:`1px solid ${a?T.accent:T.border}`,background:a?T.accentSoft:"transparent",color:a?T.accent:T.textS}}>{t}</button>})}</div><div style={{display:"flex",gap:10}}><Btn full onClick={save} disabled={sv}>{sv?"...":"Sauvegarder ✓"}</Btn><Btn variant="ghost" onClick={()=>sEd(false)}>Annuler</Btn></div></>}</Card>
<Btn variant="danger" full onClick={onLogout}>Se déconnecter</Btn></div>}

// ═══ BLIND CHAT ═══
function BlindChat({chatId,myUid,partner,bonuses,onUseBonus,onTimeUp}){const T=useT();const[msgs,sM]=useState([]);const[tl,sTl]=useState(CHAT_DUR);const[reveals,sR]=useState([]);const[endTime,sET]=useState(null);const cr=useRef(null);const timedOut=useRef(false);
useEffect(()=>{const q=query(collection(db,"blindChats",chatId,"messages"),orderBy("createdAt","asc"));return onSnapshot(q,s=>sM(s.docs.map(d=>({id:d.id,...d.data()}))))},[chatId]);
useEffect(()=>{return onSnapshot(doc(db,"blindChats",chatId),sn=>{const d=sn.data();if(d?.endTime)sET(d.endTime)})},[chatId]);
useEffect(()=>{if(!endTime)return;const iv=setInterval(()=>{const left=Math.max(0,Math.round((new Date(endTime).getTime()-Date.now())/1000));sTl(left);if(left<=0&&!timedOut.current){timedOut.current=true;clearInterval(iv);onTimeUp()}},500);return()=>clearInterval(iv)},[endTime,onTimeUp]);
useEffect(()=>{if(cr.current)cr.current.scrollTop=cr.current.scrollHeight},[msgs,reveals]);
async function useBonus(id){const c=bonuses[id]||0;if(c<=0)return;onUseBonus(id);
if(id==="time"){const sn=await getDoc(doc(db,"blindChats",chatId));const cur=sn.data()?.endTime;if(cur){await updateDoc(doc(db,"blindChats",chatId),{endTime:new Date(new Date(cur).getTime()+30000).toISOString()})}await addDoc(collection(db,"blindChats",chatId,"messages"),{senderId:"system",text:"⏱️ +30 secondes !",createdAt:serverTimestamp()})}
if(id==="city"&&partner)sR(r=>[...r,`📍 Ville : ${partner.city||"?"}`]);
if(id==="peek"&&partner){const int=partner.interests?.[Math.floor(Math.random()*(partner.interests?.length||1))];sR(r=>[...r,`👀 Intérêt : ${int||"?"}`])}
if(id==="ice"){const q=ICEBREAKERS[Math.floor(Math.random()*ICEBREAKERS.length)];await addDoc(collection(db,"blindChats",chatId,"messages"),{senderId:"system",text:`🎲 ${q}`,createdAt:serverTimestamp()})}
if(id==="anon"&&partner){const a=partner.age;const range=a?a<22?"18-21":a<25?"22-24":a<28?"25-27":a<32?"28-31":"32+":"?";sR(r=>[...r,`🕶️ Tranche d'âge : ${range}`])}}
async function send(text){await addDoc(collection(db,"blindChats",chatId,"messages"),{senderId:myUid,text,createdAt:serverTimestamp()})}
return<div style={{display:"flex",flexDirection:"column",height:"100vh",maxWidth:440,margin:"0 auto"}}>
<div style={{padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${T.border}`,background:T.surface,flexShrink:0}}>
<div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:42,height:42,borderRadius:"50%",background:T.accentGrad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:"#fff",fontFamily:"'Nunito'",boxShadow:`0 0 16px ${T.accentGlow}`}}>?</div><div><div style={{fontFamily:"'Nunito'",fontSize:15,fontWeight:700,color:T.text}}>Inconnu·e</div><div style={{fontFamily:"'Nunito'",fontSize:11,color:T.success}}>● En ligne</div></div></div>
<Timer sec={tl} tot={CHAT_DUR+120}/></div>
<div style={{display:"flex",gap:6,padding:"8px 14px",overflowX:"auto",borderBottom:`1px solid ${T.border}`,background:T.surfAlt,flexShrink:0}}>
{BONUS_TYPES.map(b=>{const c=bonuses[b.id]||0;return<button key={b.id} disabled={c<=0} onClick={()=>useBonus(b.id)} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:14,border:`1px solid ${c>0?T.gold+"44":T.border}`,background:c>0?T.goldSoft:"transparent",cursor:c>0?"pointer":"not-allowed",opacity:c>0?1:.4,whiteSpace:"nowrap",flexShrink:0}}><span style={{fontSize:14}}>{b.icon}</span><span style={{fontFamily:"'Nunito'",fontSize:11,fontWeight:700,color:c>0?T.gold:T.textD}}>{c}</span></button>})}</div>
<div ref={cr} style={{flex:1,overflowY:"auto",padding:16}}>
{msgs.length===0&&reveals.length===0&&<div style={{textAlign:"center",padding:36,fontFamily:"'Nunito'",color:T.textD}}><div style={{fontSize:32,marginBottom:10}}>👋</div>Brise la glace !</div>}
{reveals.map((r,i)=><div key={"r"+i} style={{textAlign:"center",margin:"8px 0",padding:"10px 16px",borderRadius:16,background:T.goldSoft,border:`1px solid ${T.gold}33`,fontFamily:"'Nunito'",fontSize:13,fontWeight:600,color:T.gold}}>{r}</div>)}
{msgs.map(m=><div key={m.id} style={{display:"flex",justifyContent:m.senderId==="system"?"center":m.senderId===myUid?"flex-end":"flex-start",marginBottom:8,animation:"slideUp .3s"}}>
{m.senderId==="system"?<div style={{padding:"10px 18px",borderRadius:16,background:`${T.sec}15`,border:`1px solid ${T.sec}33`,fontFamily:"'Nunito'",fontSize:13,color:T.sec,fontWeight:600,maxWidth:"85%"}}>{m.text}</div>
:<div style={{maxWidth:"75%",padding:"10px 16px",borderRadius:22,borderBottomRightRadius:m.senderId===myUid?6:22,borderBottomLeftRadius:m.senderId===myUid?22:6,background:m.senderId===myUid?T.accentGrad:T.surfAlt,color:m.senderId===myUid?"#fff":T.text,fontSize:14,lineHeight:1.5,fontFamily:"'Nunito'",boxShadow:m.senderId===myUid?`0 4px 16px ${T.accentGlow}`:"none"}}>{m.text}</div>}</div>)}</div>
<ChatInput onSend={send}/></div>}

// ═══ SPEED DATING ═══
function SpeedDating({myUid,onFinish,addXP}){const T=useT();
const[phase,sPhase]=useState("waiting"); // waiting | chat | vote | results
const[round,sRound]=useState(0);
const[chatId,sChatId]=useState(null);
const[partners,setPartners]=useState([]); // [{uid, profile}]
const[msgs,sM]=useState([]);
const[tl,sTl]=useState(SPEED_DUR);
const[endTime,sET]=useState(null);
const[votes,setVotes]=useState({}); // {partnerUid: true/false}
const cr=useRef(null);const timedOut=useRef(false);
const uw=useRef(null);

// Find partner for current round
useEffect(()=>{if(phase!=="waiting")return;
timedOut.current=false;sTl(SPEED_DUR);sM([]);sChatId(null);sET(null);
async function find(){await setDoc(doc(db,"speedWaiting",myUid),{uid:myUid,round,joinedAt:serverTimestamp(),status:"waiting"});
uw.current?.();const q=query(collection(db,"speedWaiting"),where("status","==","waiting"));
uw.current=onSnapshot(q,async s=>{const w=s.docs.map(d=>d.data()).filter(x=>x.uid!==myUid&&!partners.some(p=>p.uid===x.uid));
if(!w.length)return;const p=w[0];uw.current?.();
const ps=await getDoc(doc(db,"users",p.uid));const pData=ps.exists()?ps.data():{name:"?"};
setPartners(prev=>[...prev,{uid:p.uid,profile:pData}]);
if(myUid<p.uid){const et=new Date(Date.now()+SPEED_DUR*1000).toISOString();const ref=await addDoc(collection(db,"speedChats"),{users:[myUid,p.uid],round,endTime:et,createdAt:serverTimestamp()});
await deleteDoc(doc(db,"speedWaiting",myUid)).catch(()=>{});await deleteDoc(doc(db,"speedWaiting",p.uid)).catch(()=>{});
sChatId(ref.id);sPhase("chat");addXP(3)}else{
const cq=query(collection(db,"speedChats"),where("users","array-contains",myUid));
const cu=onSnapshot(cq,cs=>{const f=cs.docs.find(d=>{const dt=d.data();return dt.users.includes(p.uid)&&dt.round===round});
if(f){cu();sChatId(f.id);sPhase("chat");addXP(3)}});setTimeout(()=>cu(),20000)}})}
find();return()=>{uw.current?.()}},[phase,round]);

// Listen messages + endTime
useEffect(()=>{if(!chatId)return;const q=query(collection(db,"speedChats",chatId,"messages"),orderBy("createdAt","asc"));const u1=onSnapshot(q,s=>sM(s.docs.map(d=>({id:d.id,...d.data()}))));const u2=onSnapshot(doc(db,"speedChats",chatId),sn=>{const d=sn.data();if(d?.endTime)sET(d.endTime)});return()=>{u1();u2()}},[chatId]);

// Timer
useEffect(()=>{if(!endTime||phase!=="chat")return;const iv=setInterval(()=>{const left=Math.max(0,Math.round((new Date(endTime).getTime()-Date.now())/1000));sTl(left);
if(left<=0&&!timedOut.current){timedOut.current=true;clearInterval(iv);
if(round<SPEED_ROUNDS-1){sRound(r=>r+1);sPhase("waiting")}else{sPhase("vote")}}},500);return()=>clearInterval(iv)},[endTime,phase,round]);

useEffect(()=>{if(cr.current)cr.current.scrollTop=cr.current.scrollHeight},[msgs]);
async function send(text){if(!chatId)return;await addDoc(collection(db,"speedChats",chatId,"messages"),{senderId:myUid,text,createdAt:serverTimestamp()})}

// VOTE PHASE
if(phase==="vote")return<div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",padding:"40px 20px",animation:"fadeIn .5s"}}>
<div style={{fontSize:48,marginBottom:16}}>🚀</div>
<h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:T.text,margin:"0 0 8px"}}>Speed Dating terminé !</h2>
<p style={{fontFamily:"'Nunito'",fontSize:14,color:T.textS,marginBottom:32}}>Choisis avec qui tu veux matcher</p>
{partners.map(p=>{const voted=votes[p.uid];return<Card key={p.uid} style={{padding:"18px 22px",marginBottom:12,width:"100%",maxWidth:400,cursor:"pointer"}} hover>
<div onClick={()=>setVotes(v=>({...v,[p.uid]:!v[p.uid]}))} style={{display:"flex",alignItems:"center",gap:14}}>
<div style={{width:50,height:50,borderRadius:"50%",background:T.accentGrad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:"#fff",border:voted?`3px solid ${T.success}`:`3px solid transparent`,transition:"all .3s"}}>?</div>
<div style={{flex:1}}><div style={{fontFamily:"'Nunito'",fontSize:15,fontWeight:700,color:T.text}}>Personne {partners.indexOf(p)+1}</div><div style={{fontFamily:"'Nunito'",fontSize:12,color:T.textD}}>Round {partners.indexOf(p)+1}</div></div>
<div style={{width:32,height:32,borderRadius:10,background:voted?T.success:`${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .3s",fontSize:16}}>{voted?"✓":""}</div>
</div></Card>})}
<Btn full onClick={async()=>{
// Create matches for voted partners
for(const[uid,v] of Object.entries(votes)){if(v&&myUid<uid){await addDoc(collection(db,"matches"),{users:[myUid,uid],createdAt:serverTimestamp(),lastMessage:null})}}
if(Object.values(votes).some(v=>v))await addXP(XP_MATCH);
// Cleanup
await deleteDoc(doc(db,"speedWaiting",myUid)).catch(()=>{});
onFinish()}} style={{marginTop:20,maxWidth:400}}>Confirmer mes choix 💕</Btn></div>;

// WAITING
if(phase==="waiting")return<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",padding:40,textAlign:"center",animation:"fadeIn .5s"}}>
<div style={{width:64,height:64,border:`3px solid ${T.border}`,borderTopColor:T.sec,borderRadius:"50%",animation:"spin 1s linear infinite",marginBottom:28}}/>
<h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:T.text,margin:"0 0 8px"}}>🚀 Speed Dating — Round {round+1}/{SPEED_ROUNDS}</h2>
<p style={{fontFamily:"'Nunito'",fontSize:14,color:T.textS,marginBottom:36}}>Recherche de la personne {round+1}...</p>
<Btn variant="ghost" onClick={()=>{deleteDoc(doc(db,"speedWaiting",myUid)).catch(()=>{});onFinish()}}>Quitter</Btn></div>;

// CHAT
return<div style={{display:"flex",flexDirection:"column",height:"100vh",maxWidth:440,margin:"0 auto"}}>
<div style={{padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${T.border}`,background:T.surface,flexShrink:0}}>
<div style={{display:"flex",alignItems:"center",gap:10}}>
<div style={{width:42,height:42,borderRadius:"50%",background:`linear-gradient(135deg,${T.sec},#a66bff)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#fff",fontFamily:"'Nunito'",boxShadow:`0 0 16px ${T.secGlow}`}}>{round+1}/{SPEED_ROUNDS}</div>
<div><div style={{fontFamily:"'Nunito'",fontSize:15,fontWeight:700,color:T.text}}>Speed Round {round+1}</div><div style={{fontFamily:"'Nunito'",fontSize:11,color:T.success}}>● En ligne</div></div></div>
<Timer sec={tl} tot={SPEED_DUR}/></div>
<div style={{padding:"6px 16px",textAlign:"center",background:`${T.sec}10`,borderBottom:`1px solid ${T.sec}20`,flexShrink:0}}>
<span style={{fontFamily:"'Nunito'",fontSize:12,color:T.sec,fontWeight:600}}>🚀 30 secondes — sois rapide !</span></div>
<div ref={cr} style={{flex:1,overflowY:"auto",padding:16}}>
{msgs.length===0&&<div style={{textAlign:"center",padding:36,fontFamily:"'Nunito'",color:T.textD}}><div style={{fontSize:32,marginBottom:10}}>⚡</div>Go go go !</div>}
{msgs.map(m=><div key={m.id} style={{display:"flex",justifyContent:m.senderId===myUid?"flex-end":"flex-start",marginBottom:8,animation:"slideUp .3s"}}><div style={{maxWidth:"75%",padding:"10px 16px",borderRadius:22,borderBottomRightRadius:m.senderId===myUid?6:22,borderBottomLeftRadius:m.senderId===myUid?22:6,background:m.senderId===myUid?`linear-gradient(135deg,${T.sec},#a66bff)`:T.surfAlt,color:m.senderId===myUid?"#fff":T.text,fontSize:14,lineHeight:1.5,fontFamily:"'Nunito'"}}>{m.text}</div></div>)}</div>
<ChatInput onSend={send}/></div>}

// ═══ MAIN ═══
export default function App(){const[thm,sThm]=useState(()=>{try{return window.matchMedia?.("(prefers-color-scheme:light)").matches?"light":"dark"}catch{return"dark"}});
const T2=thm==="dark"?dark:light;
const[scr,sScr]=useState("loading");const[tab,sTab]=useState("home");const[user,sUser]=useState(null);const[prof,sProf]=useState(null);const[cid,sCid]=useState(null);const[ouid,sOuid]=useState(null);const[oprof,sOprof]=useState(null);const[opartner,sOp]=useState(null);const[matches,sMatches]=useState([]);const[bonuses,sBonuses]=useState(DEF_BONUS);
const uw=useRef(null);const ud=useRef(null);const um=useRef(null);

useEffect(()=>onAuthStateChanged(auth,async u=>{if(u){sUser(u);const s=await getDoc(doc(db,"users",u.uid));if(s.exists()){const p={id:u.uid,name:u.displayName||s.data().name,...s.data()};sProf(p);sBonuses(p.bonuses||DEF_BONUS);sScr(p.profileComplete?"main":"setup");if(p.profileComplete)lm(u.uid)}else sScr("setup")}else{sUser(null);sProf(null);sMatches([]);sScr("auth")}}),[]);

function lm(uid){um.current?.();const q=query(collection(db,"matches"),where("users","array-contains",uid));um.current=onSnapshot(q,async s=>{const seen=new Set();const r=[];for(const d of s.docs){const dt=d.data();const oid=dt.users.find(id=>id!==uid);const key=[uid,oid].sort().join("-");if(seen.has(key))continue;seen.add(key);const us=await getDoc(doc(db,"users",oid));const ud2=us.exists()?us.data():{};if(ud2.blocked?.includes(uid))continue;const my=await getDoc(doc(db,"users",uid));if(my.exists()&&my.data().blocked?.includes(oid))continue;r.push({matchId:d.id,...dt,...ud2,otherId:oid})}sMatches(r)})}

async function blockUser(oid){await updateDoc(doc(db,"users",user.uid),{blocked:arrayUnion(oid)});sProf(p=>({...p,blocked:[...(p.blocked||[]),oid]}));lm(user.uid)}
async function addXPfn(amt){const nx=(prof?.xp||0)+amt;sProf(p=>({...p,xp:nx}));await updateDoc(doc(db,"users",user.uid),{xp:nx})}

async function startChat(){sScr("waiting");const myUid=user.uid;const blocked=prof?.blocked||[];
await setDoc(doc(db,"waitingRoom",myUid),{uid:myUid,joinedAt:serverTimestamp(),status:"waiting"});
uw.current?.();const q=query(collection(db,"waitingRoom"),where("status","==","waiting"));
uw.current=onSnapshot(q,async s=>{const w=s.docs.map(d=>d.data()).filter(x=>x.uid!==myUid&&!blocked.includes(x.uid));
if(!w.length)return;const p=w[0];uw.current?.();
const ps=await getDoc(doc(db,"users",p.uid));sOp(ps.exists()?ps.data():null);
if(myUid<p.uid){const endTime=new Date(Date.now()+CHAT_DUR*1000).toISOString();const ref=await addDoc(collection(db,"blindChats"),{users:[myUid,p.uid],status:"active",user1Decision:null,user2Decision:null,endTime,createdAt:serverTimestamp()});
await deleteDoc(doc(db,"waitingRoom",myUid)).catch(()=>{});await deleteDoc(doc(db,"waitingRoom",p.uid)).catch(()=>{});
await addXPfn(XP_CHAT);sCid(ref.id);sOuid(p.uid);sScr("chat")}else{
const cq=query(collection(db,"blindChats"),where("users","array-contains",myUid),where("status","==","active"));
const cu=onSnapshot(cq,cs=>{const f=cs.docs.find(d=>d.data().users.includes(p.uid));if(f){cu();addXPfn(XP_CHAT);sCid(f.id);sOuid(p.uid);sScr("chat")}});setTimeout(()=>cu(),20000)}})}

function cancelW(){uw.current?.();deleteDoc(doc(db,"waitingRoom",user.uid)).catch(()=>{});sScr("main")}
const onTU=useCallback(()=>sScr("decision"),[]);
async function consumeBonus(id){const nb={...bonuses,[id]:Math.max(0,(bonuses[id]||0)-1)};sBonuses(nb);await updateDoc(doc(db,"users",user.uid),{bonuses:nb})}

async function decide(d){const s=await getDoc(doc(db,"blindChats",cid));const dt=s.data();const is1=dt.users[0]===user.uid;const mf=is1?"user1Decision":"user2Decision";const of2=is1?"user2Decision":"user1Decision";
await updateDoc(doc(db,"blindChats",cid),{[mf]:d});const u2=(await getDoc(doc(db,"blindChats",cid))).data();
if(u2[of2])await resolve(d,u2[of2]);
else{sScr("waitDec");ud.current?.();ud.current=onSnapshot(doc(db,"blindChats",cid),async sn=>{const dd=sn.data();if(dd?.[of2]){ud.current?.();await resolve(d,dd[of2])}})}}

async function resolve(mine,theirs){if(mine==="match"&&theirs==="match"){if(user.uid<ouid)await addDoc(collection(db,"matches"),{users:[user.uid,ouid],createdAt:serverTimestamp(),lastMessage:null});
await addXPfn(XP_MATCH);const s=await getDoc(doc(db,"users",ouid));sOprof(s.exists()?s.data():{name:"?"});sScr("matchReveal")}else sScr("noMatch")}

return<TC.Provider value={T2}><div style={{minHeight:"100vh",background:T2.bg,backgroundImage:T2.bgGrad,color:T2.text,transition:"background .5s"}}>
<style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Playfair+Display:wght@700&display=swap');*{box-sizing:border-box;margin:0}body{background:${T2.bg};transition:background .5s}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:${T2.border};border-radius:4px}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}@keyframes scaleIn{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:none}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@keyframes glow{0%,100%{box-shadow:0 4px 28px ${T2.accentGlow}}50%{box-shadow:0 4px 40px ${T2.accentGlow},0 0 60px ${T2.accentGlow}}}input::placeholder,textarea::placeholder{color:${T2.textD}}`}</style>

<button onClick={()=>sThm(m=>m==="dark"?"light":"dark")} style={{position:"fixed",top:16,right:16,zIndex:60,width:44,height:44,borderRadius:14,background:T2.card,border:`1.5px solid ${T2.border}`,fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{T2.toggle}</button>

{scr==="loading"&&<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh"}}><div style={{width:44,height:44,border:`3px solid ${T2.border}`,borderTopColor:T2.accent,borderRadius:"50%",animation:"spin .8s linear infinite"}}/></div>}
{scr==="auth"&&<AuthScreen onAuth={u=>sUser(u)}/>}
{scr==="setup"&&user&&<Setup user={user} onDone={p=>{sProf(p);sBonuses(p.bonuses||DEF_BONUS);lm(user.uid);sScr("main")}}/>}
{scr==="main"&&prof&&<>{tab==="home"&&<HomeTab profile={prof} onStart={startChat} onSpeedDate={()=>sScr("speed")} bonuses={bonuses}/>}{tab==="matches"&&<MatchesTab myUid={user.uid} matches={matches} onBlock={blockUser}/>}{tab==="profile"&&<ProfileTab user={user} profile={prof} setProfile={sProf} onLogout={()=>signOut(auth)}/>}<NavBar tab={tab} setTab={sTab} n={matches.length}/></>}
{scr==="waiting"&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",padding:40,textAlign:"center",animation:"fadeIn .5s"}}><div style={{width:64,height:64,border:`3px solid ${T2.border}`,borderTopColor:T2.accent,borderRadius:"50%",animation:"spin 1s linear infinite",marginBottom:28}}/><h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:T2.text,margin:"0 0 10px"}}>Recherche...</h2><p style={{fontFamily:"'Nunito'",fontSize:14,color:T2.textS,marginBottom:36}}>On cherche quelqu'un !</p><Btn variant="ghost" onClick={cancelW}>Annuler</Btn></div>}
{scr==="chat"&&cid&&<BlindChat chatId={cid} myUid={user.uid} partner={opartner} bonuses={bonuses} onUseBonus={consumeBonus} onTimeUp={onTU}/>}
{scr==="speed"&&user&&<SpeedDating myUid={user.uid} onFinish={()=>{lm(user.uid);sScr("main")}} addXP={addXPfn}/>}
{scr==="decision"&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",padding:40,textAlign:"center",animation:"fadeIn .5s"}}><div style={{fontSize:56,marginBottom:24,animation:"float 2s ease-in-out infinite"}}>⏰</div><h2 style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:T2.text,margin:"0 0 10px"}}>Temps écoulé !</h2><p style={{fontFamily:"'Nunito'",fontSize:15,color:T2.textS,marginBottom:40}}>Tu veux découvrir qui se cache derrière ?</p><div style={{display:"flex",gap:16}}><Btn onClick={()=>decide("match")} style={{padding:"18px 40px",fontSize:17}}>💕 Matcher</Btn><Btn variant="ghost" onClick={()=>decide("pass")} style={{padding:"18px 40px",fontSize:17}}>Passer →</Btn></div></div>}
{scr==="waitDec"&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",padding:40,textAlign:"center"}}><div style={{width:50,height:50,border:`3px solid ${T2.border}`,borderTopColor:T2.accent,borderRadius:"50%",animation:"spin 1s linear infinite",marginBottom:24}}/><h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:T2.text,margin:"0 0 8px"}}>En attente...</h2><p style={{fontFamily:"'Nunito'",fontSize:14,color:T2.textS}}>L'autre personne décide</p></div>}
{scr==="matchReveal"&&oprof&&<div style={{position:"fixed",inset:0,zIndex:100,background:T2.overlay,backdropFilter:"blur(24px)",display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeIn .4s"}}><div style={{textAlign:"center",padding:40,animation:"scaleIn .5s cubic-bezier(.34,1.56,.64,1)"}}><div style={{fontSize:72,marginBottom:20,animation:"float 2s ease-in-out infinite"}}>💕</div><h2 style={{fontFamily:"'Playfair Display',serif",fontSize:38,background:T2.accentGrad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:"0 0 12px"}}>C'est un Match !</h2><p style={{fontFamily:"'Nunito'",fontSize:16,color:T2.textS,marginBottom:8}}>Toi et <strong style={{color:T2.accent}}>{oprof.name}</strong></p><p style={{fontFamily:"'Nunito'",fontSize:13,color:T2.gold,marginBottom:20}}>+{XP_MATCH} XP 🎉</p>{oprof.photos?.[0]&&<img src={oprof.photos[0]} alt="" style={{width:130,height:130,borderRadius:"50%",objectFit:"cover",border:`3px solid ${T2.accent}`,boxShadow:`0 0 60px ${T2.accentGlow}`,marginBottom:16}}/>}<p style={{fontFamily:"'Nunito'",fontSize:14,color:T2.textD,marginBottom:28}}>{oprof.city} · {oprof.age} ans</p><Btn onClick={()=>{lm(user.uid);sScr("main");sTab("matches")}} style={{padding:"16px 40px"}}>Super ! 🎉</Btn></div></div>}
{scr==="noMatch"&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",padding:40,textAlign:"center",animation:"fadeIn .5s"}}><div style={{fontSize:56,marginBottom:24,animation:"float 2s ease-in-out infinite"}}>😔</div><h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:T2.text,margin:"0 0 10px"}}>Pas cette fois...</h2><p style={{fontFamily:"'Nunito'",fontSize:15,color:T2.textS,marginBottom:36}}>La prochaine sera la bonne !</p><Btn onClick={()=>sScr("main")}>Réessayer ⚡</Btn></div>}
</div></TC.Provider>}