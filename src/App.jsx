import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, collection, query, where, orderBy, onSnapshot, serverTimestamp, arrayUnion, getDocs } from "firebase/firestore";

const app = initializeApp({ apiKey:"AIzaSyB02eHA3ZtfLj6DEIk1oTOgkzXexHLn_kY", authDomain:"love-at-first-sight-8c6d3.firebaseapp.com", projectId:"love-at-first-sight-8c6d3" });
const auth = getAuth(app);
const db = getFirestore(app);
const gProv = new GoogleAuthProvider();
const CLD = { c:"dgbcpuvgb", p:"blinddate_upload" };
const CHAT_DUR = 60;
const WAIT_TIMEOUT = 60;
const INTS = ["Cinéma","Musique","Sport","Voyages","Art","Tech","Cuisine","Lecture","Gaming","Photo","Nature","Mode","Humour","Science"];
const ICEBREAKERS = ["Tu préfères voyager dans le passé ou le futur ?","Guilty pleasure ?","Superpouvoir ?","Emoji préféré ?","Dernier fou rire ?","Lieu de rêve pour un date ?","Chien ou chat ?","Chanson du moment ?"];
const BONUS_TYPES = [{id:"city",icon:"📍",name:"Ville"},{id:"ice",icon:"🎲",name:"Brise-glace"},{id:"peek",icon:"👀",name:"Intérêt"},{id:"anon",icon:"🕶️",name:"Âge"}];
const DEF_BONUS = { city:3, ice:3, peek:3, anon:3 };
const XP_CHAT = 5;
const XP_MATCH = 20;
const DECISION_TIMEOUT = 30;

function getLv(xp) {
  if (xp<50) return {lv:1,n:"Débutant",nx:50};
  if (xp<150) return {lv:2,n:"Curieux",nx:150};
  if (xp<300) return {lv:3,n:"Sociable",nx:300};
  if (xp<500) return {lv:4,n:"Charmeur",nx:500};
  return {lv:5,n:"Légende",nx:9999};
}

const dark = {name:"dark",bg:"#06060b",surface:"#0d0d15",surfAlt:"#12121c",card:"#10101a",border:"#1a1a30",borderL:"#252545",input:"#0b0b14",accent:"#ff2d6b",accentGlow:"rgba(255,45,107,0.3)",accentSoft:"rgba(255,45,107,0.08)",accentGrad:"linear-gradient(135deg,#ff2d6b,#ff6b3d)",sec:"#6c5ce7",gold:"#fbbf24",goldSoft:"rgba(251,191,36,0.1)",success:"#00d68f",danger:"#ff4757",text:"#f0f0f8",textS:"#8888a4",textD:"#4a4a65",overlay:"rgba(3,3,8,0.92)",toggle:"🌙",bgGrad:"radial-gradient(ellipse at 20% 0%,#12102a 0%,#06060b 50%)",gBg:"rgba(255,255,255,0.06)",gC:"#fff",gB:"1px solid rgba(255,255,255,0.12)"};
const light = {name:"light",bg:"#faf8f5",surface:"#ffffff",surfAlt:"#f5f2ee",card:"#ffffff",border:"#e8e2da",borderL:"#d8d2ca",input:"#f5f2ee",accent:"#e6295f",accentGlow:"rgba(230,41,95,0.2)",accentSoft:"rgba(230,41,95,0.06)",accentGrad:"linear-gradient(135deg,#e6295f,#ff6b3d)",sec:"#5b4cdb",gold:"#d97706",goldSoft:"rgba(217,119,6,0.08)",success:"#059669",danger:"#dc2626",text:"#1a1a2e",textS:"#6b6b80",textD:"#9b9baa",overlay:"rgba(250,248,245,0.92)",toggle:"☀️",bgGrad:"radial-gradient(ellipse at 30% 0%,#fde8f0 0%,#faf8f5 50%)",gBg:"#fff",gC:"#333",gB:"1px solid #ddd"};

const TC = createContext(dark);
function useT() { return useContext(TC); }

async function upImg(f) {
  const fd = new FormData();
  fd.append("file",f); fd.append("upload_preset",CLD.p); fd.append("folder","blinddate");
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLD.c}/image/upload`,{method:"POST",body:fd});
  if (!r.ok) throw new Error("Upload failed");
  return (await r.json()).secure_url;
}

// ═══ COMPONENTS ═══

function Btn({children,variant="primary",disabled,onClick,style:sx,full}) {
  const [h,sH] = useState(false);
  const T = useT();
  const styles = {
    primary:{bg:T.accentGrad,c:"#fff",b:"none",s:`0 4px 24px ${T.accentGlow}`},
    ghost:{bg:"transparent",c:T.textS,b:`1px solid ${T.border}`,s:"none"},
    google:{bg:T.gBg,c:T.gC,b:T.gB,s:"none"},
    danger:{bg:`${T.danger}15`,c:T.danger,b:`1px solid ${T.danger}33`,s:"none"}
  };
  const v = styles[variant] || styles.primary;
  return <button disabled={disabled} onClick={onClick} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)} style={{padding:"14px 28px",fontSize:15,fontWeight:700,fontFamily:"'Nunito',sans-serif",borderRadius:16,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,background:v.bg,color:v.c,border:v.b,boxShadow:v.s,width:full?"100%":"auto",transition:"all .3s cubic-bezier(.34,1.56,.64,1)",transform:h&&!disabled?"translateY(-2px)":"none",...sx}}>{children}</button>;
}

function Card({children,style:sx}) {
  const T = useT();
  return <div style={{background:T.card,borderRadius:20,border:`1px solid ${T.border}`,boxShadow:"0 4px 16px rgba(0,0,0,.12)",...sx}}>{children}</div>;
}

function XPBar({xp}) {
  const T = useT();
  const l = getLv(xp||0);
  const pct = Math.min(((xp||0)/l.nx)*100,100);
  return <div style={{display:"flex",alignItems:"center",gap:10}}>
    <div style={{width:26,height:26,borderRadius:"50%",background:T.accentGrad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff",fontFamily:"'Nunito'"}}>{l.lv}</div>
    <div style={{flex:1}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
        <span style={{fontFamily:"'Nunito'",fontSize:11,fontWeight:700,color:T.text}}>{l.n}</span>
        <span style={{fontFamily:"'Nunito'",fontSize:10,color:T.textD}}>{xp||0}/{l.nx}</span>
      </div>
      <div style={{height:4,borderRadius:2,background:T.border,overflow:"hidden"}}>
        <div style={{width:`${pct}%`,height:"100%",background:T.accentGrad}}/>
      </div>
    </div>
  </div>;
}

function NavBar({tab,setTab,n}) {
  const T = useT();
  return <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:50,background:T.surface,borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"space-around",padding:"8px 0 14px"}}>
    {[{id:"home",i:"🔮",l:"Accueil"},{id:"matches",i:"💬",l:"Matchs"},{id:"profile",i:"👤",l:"Profil"}].map(t=>
      <button key={t.id} onClick={()=>setTab(t.id)} style={{background:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"6px 16px"}}>
        <span style={{fontSize:20,filter:tab===t.id?"none":"grayscale(.5) opacity(.5)",position:"relative"}}>{t.i}{t.id==="matches"&&n>0&&<span style={{position:"absolute",top:-2,right:-6,width:8,height:8,borderRadius:"50%",background:T.accent}}/>}</span>
        <span style={{fontFamily:"'Nunito'",fontSize:10,fontWeight:700,color:tab===t.id?T.accent:T.textD}}>{t.l}</span>
      </button>
    )}
  </div>;
}

function PhotoSlot({url,onUp,onRm,idx}) {
  const T = useT();
  const ref = useRef(null);
  const [h,sH] = useState(false);
  return <div onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)} onClick={()=>!url&&ref.current?.click()} style={{aspectRatio:"3/4",borderRadius:18,overflow:"hidden",position:"relative",cursor:"pointer",border:url?`2px solid ${T.border}`:`2px dashed ${T.borderL}`,background:T.surfAlt,transition:"all .3s",transform:h?"scale(1.03)":"none"}}>
    {url ? <>
      <img src={url} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
      {h && <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
        <button onClick={e=>{e.stopPropagation();ref.current?.click()}} style={{padding:"6px 12px",borderRadius:10,background:T.accentGrad,border:"none",color:"#fff",fontSize:11,fontFamily:"'Nunito'",fontWeight:700,cursor:"pointer"}}>📷</button>
        <button onClick={e=>{e.stopPropagation();onRm(idx)}} style={{padding:"6px 12px",borderRadius:10,background:`${T.danger}44`,border:"none",color:T.danger,fontSize:11,fontFamily:"'Nunito'",fontWeight:700,cursor:"pointer"}}>✕</button>
      </div>}
    </> : <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%"}}><span style={{fontSize:24,color:T.textD}}>＋</span></div>}
    <input ref={ref} type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f)onUp(idx,f)}} style={{display:"none"}}/>
  </div>;
}

// ═══ AUTH ═══

function AuthScreen() {
  const T = useT();
  const [mode,setMode] = useState("login");
  const [email,setEmail] = useState("");
  const [pass,setPass] = useState("");
  const [name,setName] = useState("");
  const [err,setErr] = useState("");
  const [ld,setLd] = useState(false);

  async function handleSubmit() {
    setErr(""); setLd(true);
    try {
      if (mode==="signup") {
        if (!name.trim()||pass.length<6) {setErr("Prénom + 6 car. min");setLd(false);return;}
        const c = await createUserWithEmailAndPassword(auth,email,pass);
        await updateProfile(c.user,{displayName:name.trim()});
        await setDoc(doc(db,"users",c.user.uid),{name:name.trim(),email,age:null,city:"",bio:"",photos:[],interests:[],profileComplete:false,bonuses:DEF_BONUS,xp:0,blocked:[],createdAt:serverTimestamp()});
      } else {
        await signInWithEmailAndPassword(auth,email,pass);
      }
    } catch(e) {
      setErr({"auth/email-already-in-use":"Email déjà utilisé","auth/user-not-found":"Aucun compte","auth/invalid-credential":"Email ou mdp incorrect"}[e.code]||e.message);
    }
    setLd(false);
  }

  async function handleGoogle() {
    setErr(""); setLd(true);
    try {
      const r = await signInWithPopup(auth,gProv);
      const s = await getDoc(doc(db,"users",r.user.uid));
      if (!s.exists()) await setDoc(doc(db,"users",r.user.uid),{name:r.user.displayName||"",email:r.user.email,age:null,city:"",bio:"",photos:r.user.photoURL?[r.user.photoURL]:[],interests:[],profileComplete:false,bonuses:DEF_BONUS,xp:0,blocked:[],createdAt:serverTimestamp()});
    } catch(e) {setErr(e.message);}
    setLd(false);
  }

  const inp = {width:"100%",padding:"14px 18px",borderRadius:14,background:T.input,border:`1.5px solid ${T.border}`,color:T.text,fontSize:14,fontFamily:"'Nunito'",outline:"none",marginBottom:14};

  return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <div style={{width:"100%",maxWidth:400,animation:"fadeIn .5s"}}>
      <div style={{textAlign:"center",marginBottom:36}}>
        <div style={{fontSize:52,marginBottom:12,animation:"float 3s ease-in-out infinite"}}>🔮</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:34,background:T.accentGrad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:"0 0 6px"}}>BlindDate</h1>
        <p style={{fontFamily:"'Nunito'",fontSize:14,color:T.textD}}>60 secondes pour une connexion</p>
      </div>
      {err&&<div style={{padding:12,borderRadius:14,background:`${T.danger}10`,border:`1px solid ${T.danger}33`,color:T.danger,fontSize:13,fontFamily:"'Nunito'",marginBottom:16,textAlign:"center"}}>{err}</div>}
      <Btn variant="google" full onClick={handleGoogle} disabled={ld} style={{marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        Google
      </Btn>
      <div style={{display:"flex",alignItems:"center",gap:12,margin:"16px 0"}}><div style={{flex:1,height:1,background:T.border}}/><span style={{fontFamily:"'Nunito'",fontSize:12,color:T.textD}}>ou</span><div style={{flex:1,height:1,background:T.border}}/></div>
      <Card style={{padding:24,marginBottom:20}}>
        {mode==="signup"&&<input value={name} onChange={e=>setName(e.target.value)} placeholder="Prénom" style={inp}/>}
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" style={inp}/>
        <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Mot de passe" onKeyDown={e=>e.key==="Enter"&&handleSubmit()} style={{...inp,marginBottom:0}}/>
      </Card>
      <Btn full onClick={handleSubmit} disabled={ld}>{ld?"...":mode==="login"?"Se connecter":"Créer mon compte 🚀"}</Btn>
      <p style={{textAlign:"center",marginTop:20,fontFamily:"'Nunito'",fontSize:14,color:T.textS}}>
        {mode==="login"?"Pas de compte ? ":"Déjà un compte ? "}
        <span onClick={()=>{setMode(mode==="login"?"signup":"login");setErr("");}} style={{color:T.accent,fontWeight:700,cursor:"pointer"}}>{mode==="login"?"S'inscrire":"Se connecter"}</span>
      </p>
    </div>
  </div>;
}

// ═══ SETUP ═══

function Setup({user,onDone}) {
  const T = useT();
  const [step,setStep] = useState(0);
  const [age,setAge] = useState("");
  const [city,setCity] = useState("");
  const [bio,setBio] = useState("");
  const [interests,setInterests] = useState([]);
  const [photoFile,setPhotoFile] = useState(null);
  const [preview,setPreview] = useState(null);
  const [uploading,setUploading] = useState(false);
  const [err,setErr] = useState("");
  const fileRef = useRef(null);

  function validate() {
    setErr("");
    if (step===0&&(!age||age<18||!city.trim())) {setErr("Âge (18+) et ville requis");return false;}
    if (step===1&&interests.length<2) {setErr("Minimum 2");return false;}
    if (step===2&&!bio.trim()) {setErr("Bio requise");return false;}
    if (step===3&&!photoFile) {setErr("Photo requise");return false;}
    return true;
  }

  async function finish() {
    if (!validate()) return;
    setUploading(true);
    try {
      const url = await upImg(photoFile);
      const data = {age:parseInt(age),city:city.trim(),bio:bio.trim(),interests,photos:[url],profileComplete:true,bonuses:DEF_BONUS,xp:0};
      await updateDoc(doc(db,"users",user.uid),data);
      onDone({name:user.displayName,...data});
    } catch(e) {setErr(e.message);}
    setUploading(false);
  }

  function next() {if (validate()) {step===3?finish():setStep(s=>s+1);}}

  const inp = {width:"100%",padding:"14px 18px",borderRadius:14,background:T.input,border:`1.5px solid ${T.border}`,color:T.text,fontSize:14,fontFamily:"'Nunito'",outline:"none"};

  return <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",padding:20}}>
    <div style={{width:"100%",maxWidth:420}}>
      <div style={{textAlign:"center",marginBottom:24,paddingTop:20}}>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:24,background:T.accentGrad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:0}}>Profil ({step+1}/4)</h1>
      </div>
      <div style={{width:"100%",height:4,borderRadius:2,background:T.border,marginBottom:20,overflow:"hidden"}}>
        <div style={{width:`${((step+1)/4)*100}%`,height:"100%",background:T.accentGrad,transition:"width .4s"}}/>
      </div>
      {err&&<div style={{padding:10,borderRadius:12,background:`${T.danger}10`,color:T.danger,fontSize:13,fontFamily:"'Nunito'",marginBottom:14,textAlign:"center"}}>{err}</div>}
      <Card style={{padding:24,marginBottom:20}}>
        {step===0&&<>
          <label style={{fontFamily:"'Nunito'",fontSize:13,fontWeight:600,color:T.textS,display:"block",marginBottom:6}}>Âge</label>
          <input type="number" min={18} value={age} onChange={e=>setAge(e.target.value)} style={{...inp,width:100,marginBottom:16}}/>
          <label style={{fontFamily:"'Nunito'",fontSize:13,fontWeight:600,color:T.textS,display:"block",marginBottom:6}}>Ville</label>
          <input value={city} onChange={e=>setCity(e.target.value)} placeholder="Paris..." style={inp}/>
        </>}
        {step===1&&<>
          <label style={{fontFamily:"'Nunito'",fontSize:13,fontWeight:600,color:T.textS,display:"block",marginBottom:10}}>Intérêts ({interests.length}/5)</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {INTS.map(t=>{const a=interests.includes(t);return<button key={t} onClick={()=>setInterests(p=>a?p.filter(x=>x!==t):p.length<5?[...p,t]:p)} style={{padding:"8px 16px",borderRadius:20,fontSize:13,fontFamily:"'Nunito'",fontWeight:600,cursor:"pointer",border:`1.5px solid ${a?T.accent:T.border}`,background:a?T.accentSoft:"transparent",color:a?T.accent:T.textS}}>{t}</button>;})}
          </div>
        </>}
        {step===2&&<>
          <label style={{fontFamily:"'Nunito'",fontSize:13,fontWeight:600,color:T.textS,display:"block",marginBottom:6}}>Bio</label>
          <textarea value={bio} onChange={e=>setBio(e.target.value.slice(0,150))} rows={4} style={{...inp,resize:"none",lineHeight:1.6}}/>
        </>}
        {step===3&&<>
          <div onClick={()=>fileRef.current?.click()} style={{border:`2px dashed ${T.borderL}`,borderRadius:18,padding:preview?0:36,textAlign:"center",cursor:"pointer",overflow:"hidden"}}>
            {preview?<img src={preview} style={{width:"100%",maxHeight:240,objectFit:"cover",display:"block",borderRadius:16}}/>:<div><span style={{fontSize:40}}>📸</span><p style={{fontFamily:"'Nunito'",fontSize:14,color:T.textS,marginTop:8}}>Clique pour choisir</p></div>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(!f)return;setPhotoFile(f);const r=new FileReader();r.onload=ev=>setPreview(ev.target.result);r.readAsDataURL(f);}} style={{display:"none"}}/>
        </>}
      </Card>
      <div style={{display:"flex",gap:10}}>
        {step>0&&<Btn variant="ghost" onClick={()=>setStep(s=>s-1)} style={{flex:1}}>←</Btn>}
        <Btn full onClick={next} disabled={uploading} style={{flex:2}}>{uploading?"...":step===3?"Go 🚀":"Suivant →"}</Btn>
      </div>
    </div>
  </div>;
}

// ═══ HOME ═══

function HomeTab({profile,onStart,bonuses}) {
  const T = useT();
  return <div style={{padding:20,maxWidth:440,margin:"0 auto",paddingBottom:80}}>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
      {profile.photos?.[0]&&<img src={profile.photos[0]} style={{width:48,height:48,borderRadius:"50%",objectFit:"cover",border:`2px solid ${T.accent}`}}/>}
      <div>
        <div style={{fontFamily:"'Nunito'",fontSize:16,fontWeight:800,color:T.text}}>{profile.name} 👋</div>
        <div style={{fontFamily:"'Nunito'",fontSize:12,color:T.textD}}>{profile.city}</div>
      </div>
    </div>
    <Card style={{padding:"12px 16px",marginBottom:14}}><XPBar xp={profile.xp||0}/></Card>
    <Btn full onClick={onStart} style={{padding:20,fontSize:17,marginBottom:20,animation:"glow 2s ease-in-out infinite"}}>⚡ Conversation (60s)</Btn>
    <Card style={{padding:18}}>
      <div style={{fontFamily:"'Nunito'",fontSize:11,fontWeight:800,color:T.textD,marginBottom:10,textTransform:"uppercase",letterSpacing:1.5}}>🎁 Bonus</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {BONUS_TYPES.map(b=><div key={b.id} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:12,background:T.surfAlt,border:`1px solid ${T.border}`,fontSize:13}}>
          <span>{b.icon}</span>
          <span style={{fontFamily:"'Nunito'",fontWeight:700,color:T.text}}>{b.name}</span>
          <span style={{fontFamily:"'Nunito'",fontWeight:800,color:(bonuses?.[b.id]||0)>0?T.gold:T.textD,marginLeft:2}}>{bonuses?.[b.id]||0}</span>
        </div>)}
      </div>
    </Card>
  </div>;
}

// ═══ MATCHES + CHAT ═══

function MatchesTab({myUid,matches,onBlock}) {
  const T = useT();
  const [openId,setOpenId] = useState(null);
  const [msgs,setMsgs] = useState([]);
  const [text,setText] = useState("");
  const [showReport,setShowReport] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const current = matches.find(m=>m.matchId===openId);

  useEffect(()=>{
    if (!openId) {setMsgs([]);return;}
    const q = query(collection(db,"matches",openId,"messages"),orderBy("createdAt","asc"));
    const unsub = onSnapshot(q,snap=>setMsgs(snap.docs.map(d=>({id:d.id,...d.data()}))));
    return ()=>unsub();
  },[openId]);

  useEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight;},[msgs]);

  async function send() {
    if (!text.trim()||!openId) return;
    const t=text.trim(); setText(""); inputRef.current?.focus();
    await addDoc(collection(db,"matches",openId,"messages"),{senderId:myUid,text:t,createdAt:serverTimestamp()});
    await updateDoc(doc(db,"matches",openId),{lastMessage:t});
  }

  async function handleReport(reason) {
    if (!current) return;
    await addDoc(collection(db,"reports"),{reporter:myUid,reported:current.otherId,reason,createdAt:serverTimestamp()});
    setShowReport(false);
    if (confirm("Signalement envoyé. Bloquer cette personne ?")) {
      await onBlock(current.otherId);
      setOpenId(null);
    }
  }

  // Chat view (fullscreen)
  if (openId && current) {
    return <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:999,background:T.bg,display:"flex",flexDirection:"column"}}>
      {showReport&&<div style={{position:"fixed",inset:0,zIndex:1000,background:T.overlay,backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <Card style={{padding:24,maxWidth:360,width:"100%"}}>
          <h3 style={{fontFamily:"'Nunito'",fontSize:17,fontWeight:800,color:T.text,marginBottom:14}}>🚩 Signaler</h3>
          {["Inapproprié","Spam","Faux profil","Harcèlement","Autre"].map(r=><button key={r} onClick={()=>handleReport(r)} style={{display:"block",width:"100%",padding:11,marginBottom:8,borderRadius:12,border:`1px solid ${T.border}`,background:"transparent",color:T.textS,fontFamily:"'Nunito'",fontSize:14,fontWeight:600,cursor:"pointer",textAlign:"left"}}>{r}</button>)}
          <button onClick={()=>setShowReport(false)} style={{marginTop:8,width:"100%",padding:11,borderRadius:12,border:`1px solid ${T.border}`,background:"transparent",color:T.textD,fontFamily:"'Nunito'",fontSize:14,cursor:"pointer"}}>Annuler</button>
        </Card>
      </div>}

      <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${T.border}`,background:T.surface,flexShrink:0}}>
        <button onClick={()=>setOpenId(null)} style={{background:"none",border:"none",color:T.textS,fontSize:20,cursor:"pointer"}}>←</button>
        {current.photos?.[0]&&<img src={current.photos[0]} style={{width:36,height:36,borderRadius:"50%",objectFit:"cover",border:`2px solid ${T.accent}`}}/>}
        <span style={{fontFamily:"'Nunito'",fontSize:15,fontWeight:700,color:T.text,flex:1}}>{current.name}</span>
        <button onClick={()=>setShowReport(true)} style={{background:"none",border:"none",fontSize:16,cursor:"pointer"}}>🚩</button>
      </div>

      <div ref={scrollRef} style={{flex:1,overflowY:"auto",padding:14}}>
        {msgs.length===0&&<div style={{textAlign:"center",padding:40,fontFamily:"'Nunito'",color:T.textD}}>💬 Envoie le premier message !</div>}
        {msgs.map(m=>{const mine=m.senderId===myUid;return<div key={m.id} style={{display:"flex",justifyContent:mine?"flex-end":"flex-start",marginBottom:7}}>
          <div style={{maxWidth:"75%",padding:"9px 15px",borderRadius:20,borderBottomRightRadius:mine?5:20,borderBottomLeftRadius:mine?20:5,background:mine?T.accentGrad:T.surfAlt,color:mine?"#fff":T.text,fontSize:14,lineHeight:1.5,fontFamily:"'Nunito'",boxShadow:mine?`0 3px 12px ${T.accentGlow}`:"none"}}>{m.text}</div>
        </div>;})}
      </div>

      <div style={{padding:"10px 12px",borderTop:`1px solid ${T.border}`,background:T.surface,display:"flex",gap:8,flexShrink:0}}>
        <input ref={inputRef} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();send();}}} placeholder="Message..." autoFocus style={{flex:1,padding:"11px 16px",borderRadius:14,background:T.input,border:`1.5px solid ${T.border}`,color:T.text,fontSize:14,fontFamily:"'Nunito'",outline:"none"}}/>
        <button onClick={send} style={{width:44,height:44,borderRadius:12,border:"none",background:text.trim()?T.accentGrad:T.input,color:"#fff",fontSize:17,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>↑</button>
      </div>
    </div>;
  }

  // Match list
  return <div style={{padding:20,maxWidth:440,margin:"0 auto",paddingBottom:80}}>
    <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:T.text,margin:"0 0 16px"}}>💬 Matchs</h2>
    {matches.length===0&&<div style={{textAlign:"center",padding:"50px 20px"}}><div style={{fontSize:44,marginBottom:10}}>🔮</div><p style={{fontFamily:"'Nunito'",fontSize:14,color:T.textD}}>Pas encore de matchs</p></div>}
    {matches.map(m=><div key={m.matchId} onClick={()=>setOpenId(m.matchId)} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 18px",marginBottom:10,borderRadius:20,background:T.card,border:`1px solid ${T.border}`,cursor:"pointer"}}>
      {m.photos?.[0]?<img src={m.photos[0]} style={{width:48,height:48,borderRadius:"50%",objectFit:"cover",border:`2px solid ${T.accent}`}}/>:<div style={{width:48,height:48,borderRadius:"50%",background:T.accentGrad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"#fff"}}>{m.name?.[0]}</div>}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:"'Nunito'",fontSize:14,fontWeight:700,color:T.text}}>{m.name}{m.age?`, ${m.age}`:""}</div>
        <div style={{fontFamily:"'Nunito'",fontSize:12,color:T.textD,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.lastMessage||"Nouveau match 👋"}</div>
      </div>
      <span style={{color:T.textD}}>›</span>
    </div>)}
  </div>;
}

// ═══ PROFILE ═══

function ProfileTab({user,profile,setProfile,onLogout}) {
  const T = useT();
  const [editing,setEditing] = useState(false);
  const [nm,setNm] = useState(profile.name||"");
  const [ag,setAg] = useState(profile.age||"");
  const [ct,setCt] = useState(profile.city||"");
  const [bi,setBi] = useState(profile.bio||"");
  const [it,setIt] = useState(profile.interests||[]);
  const [ph,setPh] = useState(profile.photos||[]);
  const [saving,setSaving] = useState(false);
  const [upIdx,setUpIdx] = useState(-1);

  async function uploadPhoto(idx,file) {
    setUpIdx(idx);
    try {const url=await upImg(file);const np=[...ph];np[idx]=url;setPh(np);await updateDoc(doc(db,"users",user.uid),{photos:np});setProfile(p=>({...p,photos:np}));}catch(e){alert(e.message);}
    setUpIdx(-1);
  }
  function removePhoto(idx) {const np=ph.filter((_,i)=>i!==idx);setPh(np);updateDoc(doc(db,"users",user.uid),{photos:np});setProfile(p=>({...p,photos:np}));}
  async function save() {
    setSaving(true);
    try {const d={name:nm.trim(),age:parseInt(ag),city:ct.trim(),bio:bi.trim(),interests:it};await updateDoc(doc(db,"users",user.uid),d);setProfile(p=>({...p,...d}));setEditing(false);}catch(e){alert(e.message);}
    setSaving(false);
  }

  const inp = {width:"100%",padding:"11px 14px",borderRadius:12,background:T.input,border:`1.5px solid ${T.border}`,color:T.text,fontSize:14,fontFamily:"'Nunito'",outline:"none",marginBottom:12};

  return <div style={{padding:20,maxWidth:440,margin:"0 auto",paddingBottom:80}}>
    <Card style={{padding:"12px 16px",marginBottom:14}}><XPBar xp={profile.xp||0}/></Card>
    <Card style={{padding:18,marginBottom:14}}>
      <div style={{fontFamily:"'Nunito'",fontSize:11,fontWeight:800,color:T.textD,marginBottom:10,textTransform:"uppercase"}}>Photos ({ph.length}/3)</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {[0,1,2].map(i=><div key={i} style={{position:"relative"}}>
          <PhotoSlot url={ph[i]} onUp={uploadPhoto} onRm={removePhoto} idx={i}/>
          {upIdx===i&&<div style={{position:"absolute",inset:0,borderRadius:18,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:20,height:20,border:`2px solid ${T.border}`,borderTopColor:T.accent,borderRadius:"50%",animation:"spin .8s linear infinite"}}/></div>}
        </div>)}
      </div>
    </Card>
    <Card style={{padding:20,marginBottom:14}}>
      {!editing ? <>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
          <span style={{fontFamily:"'Nunito'",fontSize:11,fontWeight:800,color:T.textD,textTransform:"uppercase"}}>Infos</span>
          <button onClick={()=>setEditing(true)} style={{fontFamily:"'Nunito'",fontSize:12,fontWeight:700,color:T.accent,background:"none",border:"none",cursor:"pointer"}}>✏️</button>
        </div>
        <div style={{fontFamily:"'Nunito'",fontSize:15,fontWeight:700,color:T.text,marginBottom:3}}>{profile.name}, {profile.age}</div>
        <div style={{fontFamily:"'Nunito'",fontSize:12,color:T.textD,marginBottom:10}}>📍 {profile.city}</div>
        <p style={{fontFamily:"'Nunito'",fontSize:13,color:T.textS,lineHeight:1.5,marginBottom:12}}>{profile.bio}</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{profile.interests?.map(i=><span key={i} style={{padding:"5px 12px",borderRadius:16,fontSize:11,fontFamily:"'Nunito'",fontWeight:600,background:T.accentSoft,color:T.accent}}>{i}</span>)}</div>
      </> : <>
        <input value={nm} onChange={e=>setNm(e.target.value)} placeholder="Prénom" style={inp}/>
        <div style={{display:"flex",gap:8}}>
          <input type="number" value={ag} onChange={e=>setAg(e.target.value)} style={{...inp,width:80}}/>
          <input value={ct} onChange={e=>setCt(e.target.value)} placeholder="Ville" style={{...inp,flex:1}}/>
        </div>
        <textarea value={bi} onChange={e=>setBi(e.target.value.slice(0,150))} rows={3} style={{...inp,resize:"none"}}/>
        <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:14}}>
          {INTS.map(t=>{const a=it.includes(t);return<button key={t} onClick={()=>setIt(p=>a?p.filter(x=>x!==t):p.length<5?[...p,t]:p)} style={{padding:"6px 12px",borderRadius:16,fontSize:11,fontFamily:"'Nunito'",fontWeight:600,cursor:"pointer",border:`1px solid ${a?T.accent:T.border}`,background:a?T.accentSoft:"transparent",color:a?T.accent:T.textS}}>{t}</button>;})}
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn full onClick={save} disabled={saving}>{saving?"...":"✓ Sauver"}</Btn>
          <Btn variant="ghost" onClick={()=>setEditing(false)}>✕</Btn>
        </div>
      </>}
    </Card>
    <Btn variant="danger" full onClick={onLogout}>Déconnexion</Btn>
  </div>;
}

// ═══ BLIND CHAT ═══

function BlindChat({chatId,myUid,partner,bonuses,onUseBonus,onTimeUp,onReport}) {
  const T = useT();
  const [msgs,setMsgs] = useState([]);
  const [text,setText] = useState("");
  const [timeLeft,setTimeLeft] = useState(CHAT_DUR);
  const [reveals,setReveals] = useState([]);
  const [endTime,setEndTime] = useState(null);
  const [showReport,setShowReport] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const doneRef = useRef(false);

  useEffect(()=>{
    const q = query(collection(db,"blindChats",chatId,"messages"),orderBy("createdAt","asc"));
    return onSnapshot(q,snap=>setMsgs(snap.docs.map(d=>({id:d.id,...d.data()}))));
  },[chatId]);

  useEffect(()=>{
    return onSnapshot(doc(db,"blindChats",chatId),snap=>{
      const d = snap.data();
      if (d?.endTime) setEndTime(d.endTime);
    });
  },[chatId]);

  useEffect(()=>{
    if (!endTime) return;
    const iv = setInterval(()=>{
      const left = Math.max(0,Math.round((new Date(endTime).getTime()-Date.now())/1000));
      setTimeLeft(left);
      if (left<=0 && !doneRef.current) {doneRef.current=true;clearInterval(iv);onTimeUp();}
    },500);
    return ()=>clearInterval(iv);
  },[endTime,onTimeUp]);

  useEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight;},[msgs,reveals]);

  async function useBonus(id) {
    const c = bonuses[id]||0; if (c<=0) return; onUseBonus(id);
    if (id==="city"&&partner) setReveals(r=>[...r,`📍 ${partner.city||"?"}`]);
    if (id==="peek"&&partner) {const int=partner.interests?.[Math.floor(Math.random()*(partner.interests?.length||1))];setReveals(r=>[...r,`👀 ${int||"?"}`]);}
    if (id==="ice") {const q=ICEBREAKERS[Math.floor(Math.random()*ICEBREAKERS.length)];await addDoc(collection(db,"blindChats",chatId,"messages"),{senderId:"system",text:`🎲 ${q}`,createdAt:serverTimestamp()});}
    if (id==="anon"&&partner) {const a=partner.age;setReveals(r=>[...r,`🕶️ ${a?a<22?"18-21":a<25?"22-24":a<28?"25-27":"28+":"?"}`]);}
  }

  async function send() {
    if (!text.trim()) return;
    const t=text.trim(); setText(""); inputRef.current?.focus();
    await addDoc(collection(db,"blindChats",chatId,"messages"),{senderId:myUid,text:t,createdAt:serverTimestamp()});
  }

  async function handleReport(reason) {
    await onReport(reason);
    setShowReport(false);
    if (confirm("Signalement envoyé. Bloquer ?")) {doneRef.current=true;onTimeUp();}
  }

  return <div style={{display:"flex",flexDirection:"column",height:"100vh",maxWidth:440,margin:"0 auto"}}>
    {showReport&&<div style={{position:"fixed",inset:0,zIndex:200,background:T.overlay,backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <Card style={{padding:24,maxWidth:340,width:"100%"}}>
        <h3 style={{fontFamily:"'Nunito'",fontSize:16,fontWeight:800,color:T.text,marginBottom:12}}>🚩 Signaler</h3>
        {["Inapproprié","Spam","Faux profil","Harcèlement","Autre"].map(r=><button key={r} onClick={()=>handleReport(r)} style={{display:"block",width:"100%",padding:10,marginBottom:6,borderRadius:10,border:`1px solid ${T.border}`,background:"transparent",color:T.textS,fontFamily:"'Nunito'",fontSize:13,cursor:"pointer",textAlign:"left"}}>{r}</button>)}
        <button onClick={()=>setShowReport(false)} style={{marginTop:6,width:"100%",padding:10,borderRadius:10,border:`1px solid ${T.border}`,background:"transparent",color:T.textD,fontFamily:"'Nunito'",fontSize:13,cursor:"pointer"}}>Annuler</button>
      </Card>
    </div>}

    <div style={{padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${T.border}`,background:T.surface,flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:T.accentGrad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff",fontFamily:"'Nunito'"}}>?</div>
        <div style={{fontFamily:"'Nunito'",fontSize:14,fontWeight:700,color:T.text}}>Inconnu·e</div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <button onClick={()=>setShowReport(true)} style={{background:"none",border:"none",fontSize:15,cursor:"pointer"}}>🚩</button>
        <div style={{width:80,height:5,borderRadius:3,background:T.border,overflow:"hidden"}}>
          <div style={{width:`${Math.min((timeLeft/CHAT_DUR)*100,100)}%`,height:"100%",borderRadius:3,background:timeLeft<=10?T.danger:T.accentGrad,transition:"width .5s"}}/>
        </div>
        <span style={{fontFamily:"'Nunito'",fontWeight:800,fontSize:13,color:timeLeft<=10?T.danger:T.accent,fontVariantNumeric:"tabular-nums",minWidth:30}}>{timeLeft}s</span>
      </div>
    </div>

    <div style={{display:"flex",gap:5,padding:"6px 10px",overflowX:"auto",borderBottom:`1px solid ${T.border}`,background:T.surfAlt,flexShrink:0}}>
      {BONUS_TYPES.map(b=>{const c=bonuses[b.id]||0;return<button key={b.id} disabled={c<=0} onClick={()=>useBonus(b.id)} style={{display:"flex",alignItems:"center",gap:3,padding:"5px 10px",borderRadius:10,border:`1px solid ${c>0?T.gold+"44":T.border}`,background:c>0?T.goldSoft:"transparent",cursor:c>0?"pointer":"not-allowed",opacity:c>0?1:0.4,whiteSpace:"nowrap",flexShrink:0,fontSize:12}}><span>{b.icon}</span><span style={{fontFamily:"'Nunito'",fontSize:10,fontWeight:700,color:c>0?T.gold:T.textD}}>{c}</span></button>;})}
    </div>

    <div ref={scrollRef} style={{flex:1,overflowY:"auto",padding:14}}>
      {msgs.length===0&&reveals.length===0&&<div style={{textAlign:"center",padding:30,fontFamily:"'Nunito'",color:T.textD}}>👋 Brise la glace !</div>}
      {reveals.map((r,i)=><div key={"r"+i} style={{textAlign:"center",margin:"6px 0",padding:"8px 14px",borderRadius:14,background:T.goldSoft,border:`1px solid ${T.gold}33`,fontFamily:"'Nunito'",fontSize:12,fontWeight:600,color:T.gold}}>{r}</div>)}
      {msgs.map(m=>{
        const mine=m.senderId===myUid; const sys=m.senderId==="system";
        if (sys) return <div key={m.id} style={{display:"flex",justifyContent:"center",marginBottom:7}}><div style={{padding:"8px 14px",borderRadius:14,background:`${T.sec}12`,border:`1px solid ${T.sec}22`,fontFamily:"'Nunito'",fontSize:12,color:T.sec,fontWeight:600}}>{m.text}</div></div>;
        return <div key={m.id} style={{display:"flex",justifyContent:mine?"flex-end":"flex-start",marginBottom:7}}>
          <div style={{maxWidth:"75%",padding:"9px 14px",borderRadius:20,borderBottomRightRadius:mine?5:20,borderBottomLeftRadius:mine?20:5,background:mine?T.accentGrad:T.surfAlt,color:mine?"#fff":T.text,fontSize:14,lineHeight:1.5,fontFamily:"'Nunito'"}}>{m.text}</div>
        </div>;
      })}
    </div>

    <div style={{padding:"8px 12px",borderTop:`1px solid ${T.border}`,background:T.surface,display:"flex",gap:8,flexShrink:0}}>
      <input ref={inputRef} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Écris..." autoFocus style={{flex:1,padding:"11px 16px",borderRadius:14,background:T.input,border:`1.5px solid ${T.border}`,color:T.text,fontSize:14,fontFamily:"'Nunito'",outline:"none"}}/>
      <button onClick={send} style={{width:44,height:44,borderRadius:12,border:"none",background:text.trim()?T.accentGrad:T.input,color:"#fff",fontSize:17,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>↑</button>
    </div>
  </div>;
}

// ═══ MAIN APP ═══

export default function App() {
  const [thm,setThm] = useState(()=>{try{return window.matchMedia?.("(prefers-color-scheme:light)").matches?"light":"dark";}catch{return"dark";}});
  const T = thm==="dark"?dark:light;

  const [screen,setScreen] = useState("loading");
  const [tab,setTab] = useState("home");
  const [user,setUser] = useState(null);
  const [profile,setProfile] = useState(null);
  const [chatId,setChatId] = useState(null);
  const [otherUid,setOtherUid] = useState(null);
  const [otherProfile,setOtherProfile] = useState(null);
  const [partner,setPartner] = useState(null);
  const [matches,setMatches] = useState([]);
  const [bonuses,setBonuses] = useState(DEF_BONUS);
  const cleanup = useRef([]);

  function addCleanup(fn) {cleanup.current.push(fn);}
  function runCleanup() {cleanup.current.forEach(fn=>fn());cleanup.current=[];}

  // Auth
  useEffect(()=>{
    return onAuthStateChanged(auth,async u=>{
      if (u) {
        setUser(u);
        const snap = await getDoc(doc(db,"users",u.uid));
        if (snap.exists()) {
          const p = {id:u.uid,name:u.displayName||snap.data().name,...snap.data()};
          setProfile(p); setBonuses(p.bonuses||DEF_BONUS);
          if (p.profileComplete) {setScreen("main");listenMatches(u.uid);}
          else setScreen("setup");
        } else setScreen("setup");
      } else {setUser(null);setProfile(null);setMatches([]);setScreen("auth");}
    });
  },[]);

  function listenMatches(uid) {
    const q = query(collection(db,"matches"),where("users","array-contains",uid));
    const unsub = onSnapshot(q,async snap=>{
      const seen = new Set();
      const results = [];
      for (const d of snap.docs) {
        const data = d.data();
        const otherId = data.users.find(id=>id!==uid);
        const key = [uid,otherId].sort().join("-");
        if (seen.has(key)) continue; seen.add(key);
        const uSnap = await getDoc(doc(db,"users",otherId));
        const uData = uSnap.exists()?uSnap.data():{};
        if (uData.blocked?.includes(uid)) continue;
        results.push({matchId:d.id,...data,...uData,otherId});
      }
      setMatches(results);
    });
    addCleanup(unsub);
  }

  async function blockUser(otherId) {
    await updateDoc(doc(db,"users",user.uid),{blocked:arrayUnion(otherId)});
    runCleanup(); listenMatches(user.uid);
  }

  async function addXP(amount) {
    const newXP = (profile?.xp||0)+amount;
    setProfile(p=>({...p,xp:newXP}));
    await updateDoc(doc(db,"users",user.uid),{xp:newXP});
  }

  async function consumeBonus(id) {
    const nb = {...bonuses,[id]:Math.max(0,(bonuses[id]||0)-1)};
    setBonuses(nb);
    await updateDoc(doc(db,"users",user.uid),{bonuses:nb});
  }

  // ═══ MATCHMAKING ═══
  async function startChat() {
    setScreen("waiting");
    const myUid = user.uid;
    const joinTime = Date.now();

    // Clean up any stale entry
    await deleteDoc(doc(db,"waitingRoom",myUid)).catch(()=>{});

    // Check if someone is waiting
    const waitSnap = await getDocs(query(collection(db,"waitingRoom"),where("status","==","waiting")));
    const waiters = waitSnap.docs.filter(d=>d.id!==myUid).map(d=>d.data());

    if (waiters.length > 0) {
      // Someone is waiting — I create the chat
      const other = waiters[0];
      // Remove them FIRST
      await deleteDoc(doc(db,"waitingRoom",other.uid)).catch(()=>{});
      // Load their profile
      const pSnap = await getDoc(doc(db,"users",other.uid));
      setPartner(pSnap.exists()?pSnap.data():null);
      // Create chat
      const endTime = new Date(Date.now()+CHAT_DUR*1000).toISOString();
      const chatRef = await addDoc(collection(db,"blindChats"),{
        users:[myUid,other.uid], status:"active",
        user1Decision:null, user2Decision:null,
        endTime, createdAt:serverTimestamp()
      });
      await addXP(XP_CHAT);
      setChatId(chatRef.id); setOtherUid(other.uid); setScreen("chat");

    } else {
      // Nobody waiting — I wait
      await setDoc(doc(db,"waitingRoom",myUid),{uid:myUid,status:"waiting",createdAt:serverTimestamp()});

      // Listen for a blindChat that includes me, created AFTER I joined
      const chatQ = query(collection(db,"blindChats"),where("users","array-contains",myUid),where("status","==","active"));
      const unsub = onSnapshot(chatQ,async snap=>{
        for (const d of snap.docs) {
          const data = d.data();
          // IGNORE old chats
          const chatCreated = data.createdAt?.toMillis?.() || 0;
          if (chatCreated < joinTime - 5000) continue;
          const otherId = data.users.find(id=>id!==myUid);
          if (otherId) {
            unsub();
            await deleteDoc(doc(db,"waitingRoom",myUid)).catch(()=>{});
            const pSnap = await getDoc(doc(db,"users",otherId));
            setPartner(pSnap.exists()?pSnap.data():null);
            await addXP(XP_CHAT);
            setChatId(d.id); setOtherUid(otherId); setScreen("chat");
            return;
          }
        }
      });

      const timeout = setTimeout(()=>{
        unsub();
        deleteDoc(doc(db,"waitingRoom",myUid)).catch(()=>{});
        setScreen("main");
        alert("Personne disponible. Réessaie !");
      },WAIT_TIMEOUT*1000);

      addCleanup(()=>{unsub();clearTimeout(timeout);});
    }
  }

  function cancelWaiting() {
    runCleanup();
    deleteDoc(doc(db,"waitingRoom",user.uid)).catch(()=>{});
    setScreen("main");
  }

  const handleTimeUp = useCallback(()=>setScreen("decision"),[]);

  // Decision
  async function decide(decision) {
    const chatSnap = await getDoc(doc(db,"blindChats",chatId));
    const data = chatSnap.data();
    const isUser1 = data.users[0]===user.uid;
    const myField = isUser1?"user1Decision":"user2Decision";
    const otherField = isUser1?"user2Decision":"user1Decision";

    await updateDoc(doc(db,"blindChats",chatId),{[myField]:decision});
    const updated = (await getDoc(doc(db,"blindChats",chatId))).data();

    if (updated[otherField]) {
      await resolveMatch(decision,updated[otherField]);
    } else {
      setScreen("waitDec");
      const timeout = setTimeout(()=>{setScreen("noMatch");},DECISION_TIMEOUT*1000);
      const unsub = onSnapshot(doc(db,"blindChats",chatId),async snap=>{
        const d = snap.data();
        if (d?.[otherField]) {unsub();clearTimeout(timeout);await resolveMatch(decision,d[otherField]);}
      });
      addCleanup(()=>{unsub();clearTimeout(timeout);});
    }
  }

  async function resolveMatch(mine,theirs) {
    if (mine==="match"&&theirs==="match") {
      if (user.uid<otherUid) await addDoc(collection(db,"matches"),{users:[user.uid,otherUid],createdAt:serverTimestamp(),lastMessage:null});
      await addXP(XP_MATCH);
      const snap = await getDoc(doc(db,"users",otherUid));
      setOtherProfile(snap.exists()?snap.data():{name:"?"});
      setScreen("matchReveal");
    } else {
      setScreen("noMatch");
    }
  }

  async function reportBlind(reason) {
    await addDoc(collection(db,"reports"),{reporter:user.uid,reported:otherUid,reason,chatId,createdAt:serverTimestamp()});
  }

  // ═══ RENDER ═══
  return <TC.Provider value={T}>
    <div style={{minHeight:"100vh",background:T.bg,backgroundImage:T.bgGrad,color:T.text,transition:"background .5s"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Playfair+Display:wght@700&display=swap');
        *{box-sizing:border-box;margin:0}body{background:${T.bg}}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes scaleIn{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes glow{0%,100%{box-shadow:0 4px 24px ${T.accentGlow}}50%{box-shadow:0 4px 36px ${T.accentGlow},0 0 50px ${T.accentGlow}}}
        input::placeholder,textarea::placeholder{color:${T.textD}}
      `}</style>

      <button onClick={()=>setThm(m=>m==="dark"?"light":"dark")} style={{position:"fixed",top:14,right:14,zIndex:60,width:40,height:40,borderRadius:12,background:T.card,border:`1px solid ${T.border}`,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{T.toggle}</button>

      {screen==="loading"&&<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh"}}><div style={{width:40,height:40,border:`3px solid ${T.border}`,borderTopColor:T.accent,borderRadius:"50%",animation:"spin .8s linear infinite"}}/></div>}

      {screen==="auth"&&<AuthScreen/>}

      {screen==="setup"&&user&&<Setup user={user} onDone={p=>{setProfile(p);setBonuses(p.bonuses||DEF_BONUS);listenMatches(user.uid);setScreen("main");}}/>}

      {screen==="main"&&profile&&<>
        {tab==="home"&&<HomeTab profile={profile} onStart={startChat} bonuses={bonuses}/>}
        {tab==="matches"&&<MatchesTab myUid={user.uid} matches={matches} onBlock={blockUser}/>}
        {tab==="profile"&&<ProfileTab user={user} profile={profile} setProfile={setProfile} onLogout={()=>signOut(auth)}/>}
        <NavBar tab={tab} setTab={setTab} n={matches.length}/>
      </>}

      {screen==="waiting"&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",padding:40,textAlign:"center"}}>
        <div style={{width:56,height:56,border:`3px solid ${T.border}`,borderTopColor:T.accent,borderRadius:"50%",animation:"spin 1s linear infinite",marginBottom:24}}/>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:T.text,margin:"0 0 8px"}}>Recherche...</h2>
        <p style={{fontFamily:"'Nunito'",fontSize:13,color:T.textD,marginBottom:4}}>En attente d'un autre joueur</p>
        <Btn variant="ghost" onClick={cancelWaiting} style={{marginTop:20}}>Annuler</Btn>
      </div>}

      {screen==="chat"&&chatId&&<BlindChat chatId={chatId} myUid={user.uid} partner={partner} bonuses={bonuses} onUseBonus={consumeBonus} onTimeUp={handleTimeUp} onReport={reportBlind}/>}

      {screen==="decision"&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",padding:40,textAlign:"center",animation:"fadeIn .5s"}}>
        <div style={{fontSize:52,marginBottom:20,animation:"float 2s ease-in-out infinite"}}>⏰</div>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:T.text,margin:"0 0 8px"}}>Temps écoulé !</h2>
        <p style={{fontFamily:"'Nunito'",fontSize:14,color:T.textS,marginBottom:32}}>Découvrir qui se cache derrière ?</p>
        <div style={{display:"flex",gap:14}}>
          <Btn onClick={()=>decide("match")} style={{padding:"16px 36px",fontSize:16}}>💕 Matcher</Btn>
          <Btn variant="ghost" onClick={()=>decide("pass")} style={{padding:"16px 36px",fontSize:16}}>Passer →</Btn>
        </div>
      </div>}

      {screen==="waitDec"&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",padding:40,textAlign:"center"}}>
        <div style={{width:44,height:44,border:`3px solid ${T.border}`,borderTopColor:T.accent,borderRadius:"50%",animation:"spin 1s linear infinite",marginBottom:20}}/>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:T.text,margin:"0 0 6px"}}>En attente...</h2>
        <p style={{fontFamily:"'Nunito'",fontSize:13,color:T.textD,marginBottom:24}}>L'autre décide (max {DECISION_TIMEOUT}s)</p>
        <Btn variant="ghost" onClick={()=>{runCleanup();setScreen("main");}}>← Retour</Btn>
      </div>}

      {screen==="matchReveal"&&otherProfile&&<div style={{position:"fixed",inset:0,zIndex:100,background:T.overlay,backdropFilter:"blur(20px)",display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeIn .4s"}}>
        <div style={{textAlign:"center",padding:36,animation:"scaleIn .5s cubic-bezier(.34,1.56,.64,1)"}}>
          <div style={{fontSize:64,marginBottom:16,animation:"float 2s ease-in-out infinite"}}>💕</div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:34,background:T.accentGrad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:"0 0 10px"}}>Match !</h2>
          <p style={{fontFamily:"'Nunito'",fontSize:13,color:T.gold,marginBottom:16}}>+{XP_MATCH} XP</p>
          {otherProfile.photos?.[0]&&<img src={otherProfile.photos[0]} style={{width:110,height:110,borderRadius:"50%",objectFit:"cover",border:`3px solid ${T.accent}`,boxShadow:`0 0 50px ${T.accentGlow}`,marginBottom:12}}/>}
          <p style={{fontFamily:"'Nunito'",fontSize:15,fontWeight:700,color:T.text,marginBottom:4}}>{otherProfile.name}, {otherProfile.age}</p>
          <p style={{fontFamily:"'Nunito'",fontSize:13,color:T.textD,marginBottom:24}}>📍 {otherProfile.city}</p>
          <Btn onClick={()=>{listenMatches(user.uid);setScreen("main");setTab("matches");}}>Super 🎉</Btn>
        </div>
      </div>}

      {screen==="noMatch"&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",padding:40,textAlign:"center",animation:"fadeIn .5s"}}>
        <div style={{fontSize:48,marginBottom:20}}>😔</div>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:T.text,margin:"0 0 8px"}}>Pas cette fois</h2>
        <p style={{fontFamily:"'Nunito'",fontSize:14,color:T.textS,marginBottom:28}}>La prochaine sera la bonne !</p>
        <Btn onClick={()=>setScreen("main")}>Réessayer ⚡</Btn>
      </div>}
    </div>
  </TC.Provider>;
}