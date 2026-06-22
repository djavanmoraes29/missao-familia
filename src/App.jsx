import { useState, useEffect } from 'react'
import { db, auth } from './firebase'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'

// ─── config ──────────────────────────────────────────────────────────
const DOC_REF      = doc(db, 'familia', 'sofia')
const PARENT_EMAIL = 'thatiana@mae.com'
const COMBO_BONUS  = 15
const DOC_VERSION  = 3   // incrementar aqui para forçar atualização de tarefas/recompensas
const AVATARS        = ['😊','🦋','🌸','⭐','🦄','🐱','🐝','🌺','💫','🎀','🦊','🐰','🌙','🍀','💎']
const PARENT_AVATARS = ['👩','👨','👸','🤴','🌺','💫','🎩','🌸','💎','⭐','🦁','🦋']
const MOTIVATION_MSGS = [
  'Arrasou! Continue assim! 🔥',
  'Isso é responsabilidade de verdade! ⭐',
  'Mandou bem demais! 💪',
  'Que orgulho! Você tá crescendo! 🏆',
  'Que exemplo lindo! 💛',
  'Disciplina é superpoder! ✨',
  'Cada passo te aproxima do objetivo! 🚀',
  'Você é incrível, Kauanny! 🦋',
  'Isso faz toda a diferença! 💎',
  'Consistência é tudo! Vai lá! 🔥',
  'Missão cumprida! 🎯',
  'Família orgulhosa! ❤️',
]
const getFirstName = email => { const n=email.split('@')[0]; return n.charAt(0).toUpperCase()+n.slice(1) }

const TIPOS = [
  { key:'diaria',  label:'Diárias',  icon:'🔥', desc:'Renova todo dia'     },
  { key:'semanal', label:'Semanais', icon:'📅', desc:'Renova toda semana'  },
  { key:'mensal',  label:'Mensais',  icon:'🗓️', desc:'Renova todo mês'    },
]

// ─── datas ───────────────────────────────────────────────────────────
const getToday  = () => new Date().toISOString().split('T')[0]
const getMonth  = () => new Date().toISOString().slice(0,7)
const getMonday = () => {
  const d = new Date(), day = d.getDay()
  const m = new Date(d)
  m.setDate(d.getDate() - day + (day===0 ? -6 : 1))
  return m.toISOString().split('T')[0]
}

// ─── dados iniciais ──────────────────────────────────────────────────
const TASKS_INIT = [
  // Diárias
  { id:1,  title:'Arrumar a cama antes das 9h',              xp:3,  icon:'🛏️', tipo:'diaria'  },
  { id:2,  title:'Lavar a própria louça',                    xp:3,  icon:'🍽️', tipo:'diaria'  },
  { id:3,  title:'Manter o quarto arrumado',                 xp:4,  icon:'🧹', tipo:'diaria'  },
  { id:4,  title:'Cumprir horário de dormir (sem celular)',  xp:5,  icon:'⏰', tipo:'diaria'  },
  { id:5,  title:'Estudar 45 min sem ninguém pedir',        xp:12, icon:'📚', tipo:'diaria'  },
  { id:6,  title:'Sem celular nas refeições',               xp:4,  icon:'🚫', tipo:'diaria'  },
  { id:7,  title:'Ler pelo menos 15 páginas',               xp:8,  icon:'📖', tipo:'diaria'  },
  // Semanais
  { id:8,  title:'Faxina completa do quarto',               xp:20, icon:'✨', tipo:'semanal' },
  { id:9,  title:'Ajudar nas tarefas da casa (mín. 2x)',    xp:20, icon:'🏠', tipo:'semanal' },
  { id:10, title:'Atividade física 3× na semana',           xp:25, icon:'💪', tipo:'semanal' },
  { id:11, title:'Fazer algo gentil/prestativo espontâneo', xp:15, icon:'💛', tipo:'semanal' },
  { id:12, title:'Semana sem atraso ou compromisso perdido',xp:20, icon:'🎯', tipo:'semanal' },
  // Mensais
  { id:13, title:'Nota ≥ 7 em todas as provas/trabalhos',   xp:80, icon:'🎓', tipo:'mensal'  },
  { id:14, title:'Concluir meta de leitura (1 livro/80 pág)',xp:60, icon:'📚', tipo:'mensal'  },
  { id:15, title:'Mês sem conflito sério com a família',    xp:50, icon:'❤️', tipo:'mensal'  },
  { id:16, title:'Completar objetivo pessoal combinado',    xp:40, icon:'⭐', tipo:'mensal'  },
]

const REWARDS_INIT = [
  { id:1, title:'Escudo de Streak',     cost:200,  icon:'🛡️', shield:true  },
  { id:2, title:'Escolher o filme',     cost:400,  icon:'🎬', shield:false },
  { id:3, title:'Pizza especial',       cost:800,  icon:'🍕', shield:false },
  { id:4, title:'Ir ao cinema',         cost:1200, icon:'🎭', shield:false },
  { id:5, title:'R$ 30 bônus',          cost:2000, icon:'💰', shield:false },
  { id:6, title:'Algo muito desejado',  cost:3500, icon:'🎁', shield:false },
  { id:7, title:'Experiência especial', cost:6000, icon:'✨', shield:false },
]

const LEVELS = [
  { n:1, name:'Aprendiz',     icon:'🌱', min:0,    max:99       },
  { n:2, name:'Responsável',  icon:'⭐', min:100,  max:299      },
  { n:3, name:'Comprometida', icon:'🔥', min:300,  max:599      },
  { n:4, name:'Exemplo',      icon:'💎', min:600,  max:999      },
  { n:5, name:'Líder',        icon:'👑', min:1000, max:Infinity },
]

const BADGES = [
  { id:1, icon:'📚', title:'Estudiosa',   desc:'Estudou 10 dias sem lembrete'       },
  { id:2, icon:'🏅', title:'Organização', desc:'7 dias seguidos arrumando o quarto' },
  { id:3, icon:'🎖️', title:'Disciplina',  desc:'30 dias sem perder tarefas'         },
  { id:4, icon:'🏆', title:'Família',     desc:'50 tarefas domésticas concluídas'   },
]

const INITIAL_DOC = {
  tasks: TASKS_INIT, rewards: REWARDS_INIT, version: DOC_VERSION,
  done: [], xp: 0, streak: 0, shields: 0,
  history: [], profileIcon: '😊', profilePhoto: null, parentIcon: '👩', comboBonusToday: false,
  lastResetDiaria: getToday(), lastResetSemanal: getMonday(), lastResetMensal: getMonth(),
}

// ─── utils ───────────────────────────────────────────────────────────
const getLvl    = xp => LEVELS.find(l => xp>=l.min && (l.max===Infinity||xp<=l.max)) || LEVELS[0]
const getLvlPct = xp => { const l=getLvl(xp); if(l.n===5) return 100; return Math.min(100,Math.round(((xp-l.min)/(l.max-l.min+1))*100)) }

const compressImage = file => new Promise(resolve => {
  const reader = new FileReader()
  reader.onload = e => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 128; canvas.height = 128
      const ctx = canvas.getContext('2d')
      const min = Math.min(img.width, img.height)
      const sx  = (img.width  - min) / 2
      const sy  = (img.height - min) / 2
      ctx.drawImage(img, sx, sy, min, min, 0, 0, 128, 128)
      resolve(canvas.toDataURL('image/jpeg', 0.75))
    }
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
})

// ─── paletas ─────────────────────────────────────────────────────────
const T = { bg:'#0C0B16', surface:'#1C1A2E', surface2:'#252340', border:'#2E2C48', pri:'#7C5CFC', priL:'#A688FF', acc:'#FF6F3C', ok:'#00D68F', err:'#FF4D6D', txt:'#F2F0FF', muted:'#9896B4' }
const P = { bg:'#08111F', surface:'#0F1E35', surface2:'#162843', border:'#1E334F', pri:'#3D7FFF', priL:'#7AAAFF', acc:'#F59E0B', ok:'#22C55E', err:'#FF4D6D', txt:'#EFF6FF', muted:'#6B84A8' }

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
  * { font-family:'Space Grotesk',sans-serif; box-sizing:border-box; }
  .bar { transition:width .7s cubic-bezier(.34,1.3,.64,1); }
  .card-hover { transition:transform .15s,box-shadow .15s; }
  .card-hover:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(0,0,0,.3); }
  .btn { transition:transform .1s,opacity .1s; cursor:pointer; }
  .btn:active { transform:scale(.95); }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  .fade-up { animation:fadeUp .3s ease both; }
  @keyframes xpPop   { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
  .xp-pop { animation:xpPop .35s ease; }
  @keyframes floatUp { from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(-36px)} }
  .float-up { animation:floatUp .8s ease forwards; }
  @keyframes checkIn { 0%{transform:scale(0) rotate(-45deg)} 70%{transform:scale(1.2)} 100%{transform:scale(1)} }
  .check-in { animation:checkIn .3s ease; }
  @keyframes comboPop { 0%{opacity:0;transform:scale(.6)} 20%{opacity:1;transform:scale(1.1)} 80%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(.9)} }
  .combo-pop { animation:comboPop 2s ease forwards; }
  @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(124,92,252,.4)} 50%{box-shadow:0 0 0 10px rgba(124,92,252,0)} }
  .pulse { animation:pulse 2s infinite; }
  input::placeholder { color:#6B7280; }
  input:focus { border-color:#7C5CFC !important; outline:none; }
  ::-webkit-scrollbar { width:3px; }
  ::-webkit-scrollbar-thumb { background:#333; border-radius:3px; }
`

// ════════════════════════════════════════════════════════════════════
// LOGIN
// ════════════════════════════════════════════════════════════════════
function LoginScreen() {
  const [email, setEmail] = useState('')
  const [pw,    setPw]    = useState('')
  const [err,   setErr]   = useState('')
  const [load,  setLoad]  = useState(false)

  const handle = async () => {
    if (!email||!pw) return
    setLoad(true); setErr('')
    try { await signInWithEmailAndPassword(auth, email.trim(), pw) }
    catch { setErr('E-mail ou senha incorretos.') }
    setLoad(false)
  }

  return (
    <div style={{background:'#07080F',minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:28}}>
      <div style={{textAlign:'center',marginBottom:44}}>
        <div style={{fontSize:64,marginBottom:14}}>🏠</div>
        <h1 style={{color:'#F2F0FF',fontSize:32,fontWeight:800,letterSpacing:'-0.5px',margin:0}}>Missão Família</h1>
        <p style={{color:'#6B7280',fontSize:14,marginTop:8}}>Responsabilidade que vira conquista</p>
      </div>
      <div style={{width:'100%',maxWidth:320,display:'flex',flexDirection:'column',gap:12}}>
        <input type="email" placeholder="E-mail" value={email} onChange={e=>setEmail(e.target.value)}
          style={{background:'#1C1A2E',border:'1px solid #2E2C48',borderRadius:12,padding:'14px 16px',color:'#F2F0FF',fontSize:15,width:'100%'}} />
        <input type="password" placeholder="Senha" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handle()}
          style={{background:'#1C1A2E',border:'1px solid #2E2C48',borderRadius:12,padding:'14px 16px',color:'#F2F0FF',fontSize:15,width:'100%'}} />
        {err && <div style={{color:'#FF4D6D',fontSize:13,textAlign:'center'}}>{err}</div>}
        <button className="btn" onClick={handle} disabled={load}
          style={{background:'linear-gradient(135deg,#7C5CFC,#A688FF)',border:'none',borderRadius:12,padding:'14px',color:'white',fontWeight:700,fontSize:16,opacity:load?.7:1}}>
          {load?'Entrando...':'Entrar'}
        </button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// SHARED
// ════════════════════════════════════════════════════════════════════
function Confirm({ msg, onYes, onNo, danger }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:99,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{background:'#1C1A2E',border:'1px solid #2E2C48',borderRadius:20,padding:28,maxWidth:320,width:'100%',textAlign:'center'}}>
        <div style={{fontSize:36,marginBottom:12}}>⚠️</div>
        <div style={{color:'#F2F0FF',fontWeight:700,fontSize:16,marginBottom:8}}>Tem certeza?</div>
        <div style={{color:'#9896B4',fontSize:14,marginBottom:24}}>{msg}</div>
        <div style={{display:'flex',gap:10}}>
          <button className="btn" onClick={onNo}  style={{flex:1,background:'#252340',border:'1px solid #2E2C48',borderRadius:12,padding:'12px',color:'#9896B4',fontWeight:600,fontSize:14}}>Cancelar</button>
          <button className="btn" onClick={onYes} style={{flex:1,background:danger?'#FF4D6D':'#7C5CFC',border:'none',borderRadius:12,padding:'12px',color:'white',fontWeight:700,fontSize:14}}>Confirmar</button>
        </div>
      </div>
    </div>
  )
}

function XpBar({ xp, C }) {
  const lvl=getLvl(xp), pct=getLvlPct(xp), next=LEVELS.find(l=>l.n===lvl.n+1)
  return (
    <div style={{background:C.surface,borderRadius:14,padding:'12px 16px',border:`1px solid ${C.border}`}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:20}}>{lvl.icon}</span>
          <span style={{color:C.txt,fontWeight:700,fontSize:15}}>{lvl.name}</span>
          <span style={{background:C.pri+'28',color:C.priL,fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:99}}>Nv.{lvl.n}</span>
        </div>
        {next  && <span style={{color:C.muted,fontSize:12}}>{next.min-xp} XP → {next.name}</span>}
        {!next && <span style={{color:C.acc,fontSize:12,fontWeight:700}}>Nível máximo! 🎉</span>}
      </div>
      <div style={{background:C.surface2,borderRadius:99,height:7,overflow:'hidden'}}>
        <div className="bar" style={{width:`${pct}%`,height:'100%',background:`linear-gradient(90deg,${C.pri},${C.acc})`,borderRadius:99}} />
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// TELAS DA FILHA
// ════════════════════════════════════════════════════════════════════
function AvatarPicker({ current, onSelect, onClose, onPhoto, avatarList = AVATARS, title = 'Escolha seu avatar' }) {
  const fileRef = useState(null)[0]
  const inputRef = { current: null }

  const handleFile = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    const b64 = await compressImage(file)
    onPhoto && onPhoto(b64)
    onClose()
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',zIndex:99,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div style={{background:'#1C1A2E',borderRadius:'24px 24px 0 0',padding:'24px 20px 40px',width:'100%',maxWidth:440}}>
        <div style={{color:'#F2F0FF',fontWeight:700,fontSize:17,marginBottom:16,textAlign:'center'}}>{title}</div>
        {onPhoto && (
          <label style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,background:'rgba(124,92,252,.15)',border:'1px dashed rgba(124,92,252,.5)',borderRadius:14,padding:'14px',marginBottom:16,cursor:'pointer'}}>
            <span style={{fontSize:22}}>📷</span>
            <span style={{color:'#A688FF',fontWeight:600,fontSize:14}}>Carregar foto da galeria</span>
            <input type="file" accept="image/*" style={{display:'none'}} onChange={handleFile} />
          </label>
        )}
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:16}}>
          {avatarList.map(a=>(
            <button key={a} className="btn" onClick={()=>{ onSelect(a); onClose() }}
              style={{fontSize:34,background:a===current?'rgba(124,92,252,.3)':'rgba(255,255,255,.05)',border:`2px solid ${a===current?'#7C5CFC':'transparent'}`,borderRadius:14,padding:'8px',lineHeight:1}}>
              {a}
            </button>
          ))}
        </div>
        <button className="btn" onClick={onClose} style={{width:'100%',background:'#252340',border:'none',borderRadius:12,padding:'13px',color:'#9896B4',fontWeight:600,fontSize:15}}>Cancelar</button>
      </div>
    </div>
  )
}

function ComboOverlay() {
  return (
    <div style={{position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,pointerEvents:'none'}}>
      <div className="combo-pop" style={{background:'linear-gradient(135deg,#7C5CFC,#FF6F3C)',borderRadius:24,padding:'24px 40px',textAlign:'center',boxShadow:'0 20px 60px rgba(124,92,252,.5)'}}>
        <div style={{fontSize:48,marginBottom:6}}>⚡</div>
        <div style={{color:'white',fontWeight:800,fontSize:26,letterSpacing:'-0.5px'}}>COMBO!</div>
        <div style={{color:'rgba(255,255,255,.85)',fontSize:15,marginTop:4}}>+{COMBO_BONUS} XP bônus</div>
      </div>
    </div>
  )
}

function MotivationToast({ msg, onClose }) {
  return (
    <div style={{position:'fixed',top:74,left:'50%',transform:'translateX(-50%)',zIndex:60,width:'92%',maxWidth:360}}>
      <div className="fade-up" style={{background:'linear-gradient(135deg,#1C1A2E,#2A2050)',border:'1px solid rgba(124,92,252,.5)',borderRadius:18,padding:'16px 20px',display:'flex',alignItems:'flex-start',gap:12,boxShadow:'0 12px 40px rgba(0,0,0,.6)'}}>
        <span style={{fontSize:30,lineHeight:1,flexShrink:0}}>💬</span>
        <span style={{flex:1,color:'#F2F0FF',fontWeight:600,fontSize:15,lineHeight:1.5}}>{msg}</span>
        <button className="btn" onClick={onClose}
          style={{background:'rgba(255,255,255,.1)',border:'none',borderRadius:'50%',width:30,height:30,color:'#9896B4',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:-2}}>×</button>
      </div>
    </div>
  )
}

function TaskGroup({ tipo, tasks, done, onToggle }) {
  const [popId, setPopId] = useState(null)
  const info     = TIPOS.find(t=>t.key===tipo)
  const myTasks  = tasks.filter(t=>t.tipo===tipo)
  if (myTasks.length===0) return null
  const doneCount= myTasks.filter(t=>done.includes(t.id)).length
  const totalXp  = myTasks.reduce((s,t)=>s+t.xp,0)
  const doneXp   = myTasks.filter(t=>done.includes(t.id)).reduce((s,t)=>s+t.xp,0)
  const pct      = myTasks.length ? Math.round((doneCount/myTasks.length)*100) : 0
  const allDone  = doneCount===myTasks.length

  const handle = task => {
    if (!done.includes(task.id)) { setPopId(task.id); setTimeout(()=>setPopId(null),800) }
    onToggle(task)
  }

  return (
    <div style={{marginBottom:20}}>
      {/* header do grupo */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:18}}>{info.icon}</span>
          <span style={{color:T.txt,fontWeight:700,fontSize:15}}>{info.label}</span>
          {allDone && <span style={{background:'rgba(0,214,143,.15)',color:T.ok,fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:99}}>✓ Completo!</span>}
        </div>
        <span style={{color:T.muted,fontSize:12}}>{doneXp}/{totalXp} XP</span>
      </div>
      {/* barra do grupo */}
      <div style={{background:T.surface2,borderRadius:99,height:4,overflow:'hidden',marginBottom:10}}>
        <div className="bar" style={{width:`${pct}%`,height:'100%',background:`linear-gradient(90deg,${T.pri},${T.acc})`,borderRadius:99}} />
      </div>
      {/* tarefas */}
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {myTasks.map((task,i)=>{
          const isDone=done.includes(task.id), isPop=popId===task.id
          return (
            <div key={task.id} className={`card-hover fade-up${isPop?' xp-pop':''}`}
              style={{animationDelay:`${i*0.04}s`,background:isDone?'rgba(0,214,143,.08)':T.surface,border:`1px solid ${isDone?'rgba(0,214,143,.3)':T.border}`,borderRadius:14,padding:'13px 16px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',position:'relative',overflow:'hidden'}}
              onClick={()=>handle(task)}>
              <span style={{fontSize:24}}>{task.icon}</span>
              <span style={{flex:1,color:isDone?T.muted:T.txt,fontWeight:600,fontSize:14,textDecoration:isDone?'line-through':'none'}}>{task.title}</span>
              <span style={{color:isDone?T.ok:T.pri,fontWeight:700,fontSize:13,minWidth:44,textAlign:'right'}}>+{task.xp}xp</span>
              <div style={{width:26,height:26,borderRadius:'50%',background:isDone?T.ok:'transparent',border:`2px solid ${isDone?T.ok:T.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'white',transition:'all .25s',flexShrink:0}}>
                {isDone&&<span className="check-in">✓</span>}
              </div>
              {isPop&&<div className="float-up" style={{position:'absolute',right:52,top:8,color:T.ok,fontWeight:800,fontSize:17,pointerEvents:'none'}}>+{task.xp}✨</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TeenMissoes({ tasks, done, onToggle, showCombo, motivationMsg, onCloseMotivation }) {
  const dailyTasks = tasks.filter(t=>t.tipo==='diaria')
  const todayXp    = dailyTasks.filter(t=>done.includes(t.id)).reduce((s,t)=>s+t.xp,0)
  const totalDayXp = dailyTasks.reduce((s,t)=>s+t.xp,0)
  const pct        = totalDayXp ? Math.round((todayXp/totalDayXp)*100) : 0

  return (
    <div style={{padding:'16px 16px 100px',position:'relative'}}>
      {showCombo && <ComboOverlay />}
      {motivationMsg && <MotivationToast msg={motivationMsg} onClose={onCloseMotivation} />}

      {/* progresso das diárias */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:16,marginBottom:20}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
          <span style={{color:T.txt,fontWeight:600}}>Progresso das diárias</span>
          <span style={{color:T.pri,fontWeight:700}}>{todayXp}/{totalDayXp} XP</span>
        </div>
        <div style={{background:T.surface2,borderRadius:99,height:8,overflow:'hidden'}}>
          <div className="bar" style={{width:`${pct}%`,height:'100%',background:`linear-gradient(90deg,${T.pri},${T.acc})`,borderRadius:99}} />
        </div>
        {pct<100
          ? <div style={{color:T.muted,fontSize:12,marginTop:6}}>{dailyTasks.filter(t=>done.includes(t.id)).length} de {dailyTasks.length} diárias • complete todas para +{COMBO_BONUS} XP bônus!</div>
          : <div style={{color:T.ok,fontSize:12,marginTop:6,fontWeight:600}}>🎉 Todas as diárias concluídas!</div>
        }
      </div>

      {TIPOS.map(t=><TaskGroup key={t.key} tipo={t.key} tasks={tasks} done={done} onToggle={onToggle} />)}
    </div>
  )
}

function TeenLoja({ rewards, xp, shields, onBuyShield }) {
  const [claimed, setClaimed] = useState([])

  const handleClick = r => {
    if (xp < r.cost) return
    if (r.shield) { onBuyShield(r.cost); return }
    if (!claimed.includes(r.id)) setClaimed(p=>[...p,r.id])
  }

  return (
    <div style={{padding:'16px 16px 100px'}}>
      {/* XP destaque */}
      <div className="pulse" style={{background:`linear-gradient(135deg,${T.pri},${T.acc})`,borderRadius:20,padding:'20px 24px',marginBottom:12,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{color:'rgba(255,255,255,.8)',fontSize:13,fontWeight:600}}>Seus pontos</div>
          <div style={{color:'white',fontWeight:800,fontSize:42,lineHeight:1}}>{xp}</div>
          <div style={{color:'rgba(255,255,255,.7)',fontSize:13}}>XP acumulados</div>
        </div>
        <div style={{fontSize:52}}>💎</div>
      </div>

      {/* escudos ativos */}
      {shields>0 && (
        <div style={{background:'rgba(0,214,143,.1)',border:'1px solid rgba(0,214,143,.3)',borderRadius:14,padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:24}}>🛡️</span>
          <span style={{color:'#00D68F',fontWeight:600,fontSize:14}}>{shields} escudo{shields>1?'s':''} de streak ativo{shields>1?'s':''}</span>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        {rewards.map((r,i)=>{
          const canAfford=xp>=r.cost
          const isClaimed=r.shield ? false : claimed.includes(r.id)
          return (
            <div key={r.id} className="card-hover fade-up"
              style={{animationDelay:`${i*0.06}s`,background:isClaimed?'rgba(0,214,143,.07)':T.surface,border:`1px solid ${isClaimed?'rgba(0,214,143,.3)':canAfford?T.pri+'44':T.border}`,borderRadius:16,padding:16,cursor:canAfford&&!isClaimed?'pointer':'default',opacity:!canAfford&&!isClaimed?.42:1}}
              onClick={()=>!isClaimed&&handleClick(r)}>
              <div style={{fontSize:36,marginBottom:8}}>{r.icon}</div>
              <div style={{color:T.txt,fontWeight:700,fontSize:13,marginBottom:4}}>{r.title}</div>
              {r.shield && <div style={{color:T.muted,fontSize:11,marginBottom:6}}>Protege 1 dia de streak</div>}
              {isClaimed
                ? <div style={{color:T.ok,fontWeight:700,fontSize:13}}>✓ Resgatado!</div>
                : <div style={{display:'flex',alignItems:'center',gap:4}}>
                    <span style={{color:canAfford?T.acc:T.muted,fontWeight:700,fontSize:13}}>{r.cost} XP</span>
                    {canAfford&&<span style={{fontSize:11,color:T.ok}}>• disponível</span>}
                  </div>
              }
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TeenTrofeus({ xp, streak, shields }) {
  const lvl=getLvl(xp), pct=getLvlPct(xp)
  return (
    <div style={{padding:'16px 16px 100px'}}>
      <div style={{background:`linear-gradient(135deg,${T.pri}22,${T.acc}12)`,border:`1px solid ${T.pri}40`,borderRadius:18,padding:'18px 20px',marginBottom:16}}>
        <div style={{fontSize:48,marginBottom:8}}>{lvl.icon}</div>
        <div style={{color:T.txt,fontWeight:800,fontSize:22}}>{lvl.name}</div>
        <div style={{color:T.muted,fontSize:14,marginTop:2}}>Nível {lvl.n} • {xp} XP acumulados</div>
        <div style={{background:T.surface,borderRadius:99,height:6,overflow:'hidden',marginTop:12}}>
          <div className="bar" style={{width:`${pct}%`,height:'100%',background:`linear-gradient(90deg,${T.pri},${T.acc})`,borderRadius:99}} />
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:28}}>{streak>0?'🔥':'💀'}</span>
          <div>
            <div style={{color:streak>0?T.acc:T.muted,fontWeight:800,fontSize:22}}>{streak}</div>
            <div style={{color:T.muted,fontSize:12}}>dias seguidos</div>
          </div>
        </div>
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:28}}>🛡️</span>
          <div>
            <div style={{color:shields>0?T.ok:T.muted,fontWeight:800,fontSize:22}}>{shields}</div>
            <div style={{color:T.muted,fontSize:12}}>escudo{shields!==1?'s':''}</div>
          </div>
        </div>
      </div>

      <div style={{color:T.txt,fontWeight:700,fontSize:15,marginBottom:12}}>🎖️ Medalhas</div>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {BADGES.map((b,i)=>(
          <div key={b.id} className="fade-up" style={{animationDelay:`${i*0.07}s`,background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:'14px 16px',display:'flex',alignItems:'center',gap:14,opacity:.4}}>
            <span style={{fontSize:38,filter:'grayscale(1)'}}>{b.icon}</span>
            <div>
              <div style={{color:T.txt,fontWeight:700,fontSize:15}}>{b.title}</div>
              <div style={{color:T.muted,fontSize:13,marginTop:2}}>{b.desc}</div>
              <div style={{color:T.muted,fontWeight:500,fontSize:12,marginTop:4}}>🔒 Em progresso...</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TeenApp({ tasks, rewards, done, onToggle, xp, streak, shields, showCombo, motivationMsg, onCloseMotivation, profileIcon, profilePhoto, onProfileIcon, onProfilePhoto, onBuyShield, onLogout }) {
  const [tab, setTab]       = useState('missoes')
  const [showAv, setShowAv] = useState(false)

  return (
    <div style={{background:T.bg,minHeight:'100vh',maxWidth:440,margin:'0 auto',position:'relative'}}>
      {showAv && <AvatarPicker current={profileIcon} avatarList={AVATARS} title="Seu avatar"
        onSelect={v=>{onProfileIcon(v);onProfilePhoto(null)}}
        onPhoto={onProfilePhoto}
        onClose={()=>setShowAv(false)} />}

      <div style={{background:`linear-gradient(180deg,#1A1535 0%,${T.bg} 100%)`,padding:'20px 20px 16px',borderBottom:`1px solid ${T.border}`}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <button className="btn" onClick={()=>setShowAv(true)}
              style={{width:50,height:50,borderRadius:'50%',background:`linear-gradient(135deg,${T.pri},${T.acc})`,border:'none',fontSize:26,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',padding:0}}>
              {profilePhoto
                ? <img src={profilePhoto} style={{width:50,height:50,objectFit:'cover'}} />
                : profileIcon}
            </button>
            <div>
              <div style={{color:T.muted,fontSize:12}}>Bem-vinda,</div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{color:T.txt,fontWeight:700,fontSize:17}}>Kauanny</span>
                {streak>0 && <span style={{fontSize:13}}>🔥{streak}</span>}
                {shields>0 && <span style={{fontSize:13}}>🛡️{shields}</span>}
              </div>
            </div>
          </div>
          <div style={{background:`linear-gradient(135deg,${T.pri}33,${T.acc}22)`,border:`1px solid ${T.pri}55`,borderRadius:14,padding:'8px 14px',textAlign:'right'}}>
            <div style={{color:T.priL,fontWeight:800,fontSize:28,lineHeight:1}}>{xp}</div>
            <div style={{color:T.muted,fontSize:11}}>pontos totais</div>
          </div>
        </div>
        <XpBar xp={xp} C={T} />
      </div>

      {tab==='missoes' && <TeenMissoes tasks={tasks} done={done} onToggle={onToggle} showCombo={showCombo} motivationMsg={motivationMsg} onCloseMotivation={onCloseMotivation} />}
      {tab==='loja'    && <TeenLoja rewards={rewards} xp={xp} shields={shields} onBuyShield={onBuyShield} />}
      {tab==='trofeus' && <TeenTrofeus xp={xp} streak={streak} shields={shields} />}

      <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:440,background:T.surface,borderTop:`1px solid ${T.border}`,display:'flex',padding:'8px 0 16px'}}>
        {[['missoes','⚡','Missões'],['loja','🛒','Loja'],['trofeus','🏆','Troféus']].map(([id,ic,label])=>(
          <button key={id} className="btn" onClick={()=>setTab(id)} style={{flex:1,background:'none',border:'none',display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'6px 0'}}>
            <span style={{fontSize:22}}>{ic}</span>
            <span style={{fontSize:11,fontWeight:tab===id?700:500,color:tab===id?T.pri:T.muted}}>{label}</span>
            {tab===id&&<div style={{width:18,height:3,background:T.pri,borderRadius:99,marginTop:2}} />}
          </button>
        ))}
      </div>
      <button className="btn" onClick={onLogout} style={{position:'fixed',top:14,right:14,background:T.surface2,border:`1px solid ${T.border}`,borderRadius:8,padding:'5px 12px',color:T.muted,fontSize:13}}>Sair</button>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// TELAS DOS PAIS
// ════════════════════════════════════════════════════════════════════
function ParentHome({ tasks, done, xp, rewards, streak, shields, history, profileIcon, profilePhoto, onUndoTask }) {
  const dailyTasks = tasks.filter(t=>t.tipo==='diaria')
  const todayXp    = tasks.filter(t=>done.includes(t.id)).reduce((s,t)=>s+t.xp,0)
  const pct        = tasks.length ? Math.round((done.length/tasks.length)*100) : 0
  const lvl        = getLvl(xp)
  const nextRwd    = rewards.filter(r=>r.cost>xp).sort((a,b)=>a.cost-b.cost)[0]
  const maxXp      = tasks.reduce((s,t)=>s+t.xp,0) || 1

  // gráfico: últimos 7 dias
  const weekData = Array.from({length:7},(_,i)=>{
    const d = new Date(); d.setDate(d.getDate()-(6-i))
    const dateStr = d.toISOString().split('T')[0]
    const isToday = i===6
    const entry   = history.find(h=>h.date===dateStr)
    const xpVal   = isToday ? todayXp : (entry?.xp??0)
    const anyDone = isToday ? done.length>0 : (entry?.anyDone??false)
    return { day:['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d.getDay()], pct:Math.round((xpVal/maxXp)*100), isToday, anyDone, xp:xpVal }
  })

  return (
    <div style={{padding:'16px 16px 100px',display:'flex',flexDirection:'column',gap:16}}>
      {/* card Kauanny */}
      <div style={{background:`linear-gradient(135deg,${P.pri}1A,${P.acc}0D)`,border:`1px solid ${P.pri}40`,borderRadius:18,padding:20}}>
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:16}}>
          <div style={{width:52,height:52,borderRadius:'50%',background:`linear-gradient(135deg,${P.pri},#6366F1)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,overflow:'hidden'}}>
            {profilePhoto
              ? <img src={profilePhoto} style={{width:52,height:52,objectFit:'cover'}} />
              : (profileIcon||'😊')}
          </div>
          <div style={{flex:1}}>
            <div style={{color:P.txt,fontWeight:700,fontSize:18}}>Kauanny</div>
            <div style={{display:'flex',alignItems:'center',gap:6,marginTop:2}}>
              <span style={{fontSize:15}}>{lvl.icon}</span>
              <span style={{color:P.muted,fontSize:13}}>{lvl.name} · Nível {lvl.n}</span>
            </div>
          </div>
          <div style={{background:`linear-gradient(135deg,${P.pri},#6366F1)`,borderRadius:14,padding:'10px 16px',textAlign:'right'}}>
            <div style={{color:'white',fontWeight:800,fontSize:28,lineHeight:1}}>{xp}</div>
            <div style={{color:'rgba(255,255,255,.75)',fontSize:11}}>XP total</div>
          </div>
        </div>
        <XpBar xp={xp} C={P} />
      </div>

      {/* stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
        {[
          {icon:'✅', val:done.length,  label:'Feitas hoje'},
          {icon:'📊', val:`${pct}%`,    label:'Progresso'  },
          {icon:'🔥', val:streak,       label:'Sequência'  },
          {icon:'🛡️', val:shields,      label:'Escudos'    },
        ].map((s,i)=>(
          <div key={i} style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:14,padding:'12px 8px',textAlign:'center'}}>
            <div style={{fontSize:18,marginBottom:4}}>{s.icon}</div>
            <div style={{color:P.txt,fontWeight:800,fontSize:18}}>{s.val}</div>
            <div style={{color:P.muted,fontSize:10,marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* gráfico com dias vermelhos */}
      <div style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:18,padding:'18px 20px'}}>
        <div style={{color:P.txt,fontWeight:700,fontSize:15,marginBottom:4}}>📅 Últimos 7 dias</div>
        <div style={{color:P.muted,fontSize:12,marginBottom:14}}>
          <span style={{color:'#FF4D6D'}}>■</span> sem tarefas &nbsp;
          <span style={{color:P.pri}}>■</span> com tarefas
        </div>
        <div style={{display:'flex',gap:6,alignItems:'flex-end',height:70}}>
          {weekData.map((v,i)=>(
            <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
              <div style={{width:'100%',height:v.pct>0?`${Math.round(v.pct*0.62)}px`:'4px',
                background: v.pct>0 ? (v.anyDone ? `linear-gradient(180deg,${P.pri},${P.pri}77)` : '#FF4D6D88') : P.surface2,
                borderRadius:'6px 6px 3px 3px',transition:'height .3s'}} />
              <span style={{color:v.isToday?P.priL:P.muted,fontSize:11,fontWeight:v.isToday?700:400}}>{v.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* próxima meta */}
      {nextRwd && (
        <div style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:18,padding:16}}>
          <div style={{color:P.muted,fontSize:12,marginBottom:8}}>🎯 Próxima meta</div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:28}}>{nextRwd.icon}</span>
            <div style={{flex:1}}>
              <div style={{color:P.txt,fontWeight:700}}>{nextRwd.title}</div>
              <div style={{color:P.muted,fontSize:13}}>{nextRwd.cost-xp} XP faltando</div>
            </div>
          </div>
          <div style={{background:P.surface2,borderRadius:99,height:5,overflow:'hidden',marginTop:12}}>
            <div className="bar" style={{width:`${Math.min(100,Math.round((xp/nextRwd.cost)*100))}%`,height:'100%',background:`linear-gradient(90deg,${P.pri},${P.acc})`,borderRadius:99}} />
          </div>
        </div>
      )}

      {/* tarefas por categoria com botão de cancelar */}
      <div style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:18,padding:16}}>
        <div style={{color:P.txt,fontWeight:700,fontSize:14,marginBottom:4}}>Tarefas marcadas pela Kauanny</div>
        <div style={{color:P.muted,fontSize:12,marginBottom:12}}>Toque em ✕ para cancelar caso não tenha sido feita</div>
        {TIPOS.map(tipo=>{
          const tks = tasks.filter(t=>t.tipo===tipo.key)
          if (tks.length===0) return null
          return (
            <div key={tipo.key} style={{marginBottom:12}}>
              <div style={{color:P.muted,fontSize:12,fontWeight:600,marginBottom:6}}>{tipo.icon} {tipo.label}</div>
              {tks.map(t=>{
                const isDone = done.includes(t.id)
                return (
                  <div key={t.id} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,padding:'6px 8px',borderRadius:10,background:isDone?'rgba(34,197,94,.06)':'transparent'}}>
                    <span style={{fontSize:16}}>{t.icon}</span>
                    <span style={{flex:1,color:isDone?P.ok:P.muted,fontSize:13,fontWeight:isDone?600:400,textDecoration:isDone?'none':'none'}}>{t.title}</span>
                    {isDone
                      ? <>
                          <span style={{color:P.ok,fontSize:12,fontWeight:700}}>✓ +{t.xp}xp</span>
                          <button className="btn" onClick={()=>onUndoTask(t)}
                            style={{background:'rgba(255,77,109,.12)',border:'1px solid rgba(255,77,109,.25)',borderRadius:7,padding:'3px 8px',color:'#FF4D6D',fontSize:12,fontWeight:700,lineHeight:1}}>✕</button>
                        </>
                      : <span style={{color:P.surface2,fontSize:12}}>pendente</span>
                    }
                  </div>
                )
              })}
            </div>
          )
        })}
        {tasks.length===0&&<div style={{color:P.muted,fontSize:13}}>Nenhuma tarefa cadastrada.</div>}
      </div>
    </div>
  )
}

const TASK_ICONS = ['🛏️','🧹','🍽️','🏠','⏰','📚','💪','📖','🌱','🎯','🧺','🚿','🌿','🍳','✏️','🎒','🏃','🐕','💊','🪥','🛒','🌸','💡','🎨','🏋️','🧘','🚴','🎹','🎸','🌙','⭐','❤️','🎓','🔑','🏆']
const RWD_ICONS  = ['🎬','🍕','🎭','💰','🎁','⭐','🏖️','👗','🎮','🎵','🎂','🛍️','🍦','🎪','🎡','🏄','🎠','🧁','🍔','🌮','🎀','💄','👟','🎟️','🎯','🎲','🚗','✈️','🏩','🌺']

function IconPickerInline({ icons, selected, onSelect, C }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{position:'relative'}}>
      <button className="btn" onClick={()=>setOpen(o=>!o)}
        style={{background:C.surface2,border:`1px solid ${open?C.pri:C.border}`,borderRadius:10,padding:'9px 12px',fontSize:24,display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
        <span>{selected}</span>
        <span style={{color:C.muted,fontSize:11}}>{open?'▲':'▼'}</span>
      </button>
      {open && (
        <div style={{position:'absolute',top:'calc(100% + 6px)',left:0,zIndex:30,background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:10,display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,boxShadow:'0 12px 40px rgba(0,0,0,.6)',minWidth:260}}>
          {icons.map(ic=>(
            <button key={ic} className="btn" onClick={()=>{onSelect(ic);setOpen(false)}}
              style={{fontSize:22,background:ic===selected?C.pri+'33':'transparent',border:`1px solid ${ic===selected?C.pri:'transparent'}`,borderRadius:8,padding:'5px',lineHeight:1}}>
              {ic}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function EditRow({ item, icons, isXp, onSave, onCancel, C }) {
  const [title,   setTitle]   = useState(item.title)
  const [val,     setVal]     = useState(isXp?item.xp:item.cost)
  const [tipo,    setTipo]    = useState(item.tipo||'diaria')
  const [selIcon, setSelIcon] = useState(item.icon||icons[0])
  return (
    <div style={{background:C.surface2,border:`1px solid ${C.pri}44`,borderRadius:14,padding:'12px 14px',display:'flex',flexDirection:'column',gap:10}}>
      <div style={{display:'flex',gap:8}}>
        <IconPickerInline icons={icons} selected={selIcon} onSelect={setSelIcon} C={C} />
        <input value={title} onChange={e=>setTitle(e.target.value)}
          style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:'8px 12px',color:C.txt,fontSize:14}} />
      </div>
      {isXp && (
        <div style={{display:'flex',gap:6}}>
          {TIPOS.map(t=>(
            <button key={t.key} className="btn" onClick={()=>setTipo(t.key)}
              style={{flex:1,background:tipo===t.key?C.pri:C.surface,border:`1px solid ${tipo===t.key?C.pri:C.border}`,borderRadius:8,padding:'5px 0',color:tipo===t.key?'white':C.muted,fontSize:12,fontWeight:600}}>{t.icon}{t.label}</button>
          ))}
        </div>
      )}
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <span style={{color:C.muted,fontSize:12}}>{isXp?'XP:':'Custo:'}</span>
        <input type="number" min="1" value={val} onChange={e=>setVal(Number(e.target.value)||1)}
          style={{width:90,background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:'6px 10px',color:C.txt,fontSize:13,fontWeight:700}} />
        <div style={{marginLeft:'auto',display:'flex',gap:8}}>
          <button className="btn" onClick={onCancel} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:'6px 12px',color:C.muted,fontSize:13}}>Cancelar</button>
          <button className="btn" onClick={()=>onSave({...item,title:title.trim()||item.title,icon:selIcon,tipo,...(isXp?{xp:val}:{cost:val})})}
            style={{background:C.pri,border:'none',borderRadius:8,padding:'6px 14px',color:'white',fontWeight:700,fontSize:13}}>Salvar</button>
        </div>
      </div>
    </div>
  )
}

function ParentTarefas({ tasks, setTasks }) {
  const [title,    setTitle]   = useState('')
  const [xpVal,    setXpVal]   = useState(10)
  const [tipo,     setTipo]    = useState('diaria')
  const [selIcon,  setSelIcon] = useState(TASK_ICONS[0])
  const [editId,   setEditId]  = useState(null)

  const add = () => {
    if (!title.trim()) return
    setTasks(p=>[...p,{id:Date.now(),title:title.trim(),xp:xpVal,icon:selIcon,tipo}])
    setTitle('')
  }

  return (
    <div style={{padding:'16px 16px 100px'}}>
      <div style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:18,padding:16,marginBottom:20}}>
        <div style={{color:P.txt,fontWeight:700,fontSize:15,marginBottom:12}}>➕ Nova tarefa</div>
        <div style={{display:'flex',gap:8,marginBottom:10}}>
          <IconPickerInline icons={TASK_ICONS} selected={selIcon} onSelect={setSelIcon} C={P} />
          <input value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()} placeholder="Nome da tarefa..."
            style={{flex:1,background:P.surface2,border:`1px solid ${P.border}`,borderRadius:10,padding:'10px 14px',color:P.txt,fontSize:14}} />
        </div>
        {/* seletor de tipo */}
        <div style={{display:'flex',gap:6,marginBottom:10}}>
          {TIPOS.map(t=>(
            <button key={t.key} className="btn" onClick={()=>setTipo(t.key)}
              style={{flex:1,background:tipo===t.key?P.pri:P.surface2,border:`1px solid ${tipo===t.key?P.pri:P.border}`,borderRadius:8,padding:'7px 4px',color:tipo===t.key?'white':P.muted,fontSize:12,fontWeight:600}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{color:P.muted,fontSize:13}}>XP:</span>
          <input type="number" min="1" value={xpVal} onChange={e=>setXpVal(Number(e.target.value)||1)}
            style={{width:90,background:P.surface2,border:`1px solid ${P.border}`,borderRadius:10,padding:'8px 12px',color:P.txt,fontSize:14,fontWeight:700}} />
          <button className="btn" onClick={add} style={{marginLeft:'auto',background:P.pri,border:'none',borderRadius:10,padding:'8px 18px',color:'white',fontWeight:700,fontSize:14}}>Adicionar</button>
        </div>
      </div>

      {TIPOS.map(t=>{
        const tks=tasks.filter(tk=>tk.tipo===t.key)
        if(tks.length===0) return null
        return (
          <div key={t.key} style={{marginBottom:20}}>
            <div style={{color:P.muted,fontWeight:700,fontSize:13,marginBottom:8}}>{t.icon} {t.label} — {t.desc}</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {tks.map(tk=>(
                editId===tk.id
                  ? <EditRow key={tk.id} item={tk} icons={TASK_ICONS} isXp={true} C={P}
                      onSave={u=>{setTasks(p=>p.map(x=>x.id===tk.id?u:x));setEditId(null)}}
                      onCancel={()=>setEditId(null)} />
                  : <div key={tk.id} className="card-hover" style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:14,padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
                      <span style={{fontSize:22}}>{tk.icon}</span>
                      <span style={{flex:1,color:P.txt,fontWeight:600,fontSize:14}}>{tk.title}</span>
                      <span style={{color:P.priL,fontWeight:700,fontSize:13}}>{tk.xp} XP</span>
                      <button className="btn" onClick={()=>setEditId(tk.id)} style={{background:'rgba(61,127,255,.12)',border:'none',borderRadius:8,width:30,height:30,color:P.priL,display:'flex',alignItems:'center',justifyContent:'center'}}>✏️</button>
                      <button className="btn" onClick={()=>setTasks(p=>p.filter(x=>x.id!==tk.id))} style={{background:'rgba(255,77,109,.12)',border:'none',borderRadius:8,width:30,height:30,color:'#FF4D6D',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
                    </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ParentRecompensas({ rewards, setRewards }) {
  const [title,   setTitle]   = useState('')
  const [cost,    setCost]    = useState(100)
  const [selIcon, setSelIcon] = useState(RWD_ICONS[0])
  const [editId,  setEditId]  = useState(null)

  const add = () => {
    if (!title.trim()) return
    setRewards(p=>[...p,{id:Date.now(),title:title.trim(),cost,icon:selIcon,shield:false}])
    setTitle('')
  }

  return (
    <div style={{padding:'16px 16px 100px'}}>
      <div style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:18,padding:16,marginBottom:20}}>
        <div style={{color:P.txt,fontWeight:700,fontSize:15,marginBottom:12}}>🎁 Nova recompensa</div>
        <div style={{display:'flex',gap:8,marginBottom:10}}>
          <IconPickerInline icons={RWD_ICONS} selected={selIcon} onSelect={setSelIcon} C={P} />
          <input value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()} placeholder="Nome da recompensa..."
            style={{flex:1,background:P.surface2,border:`1px solid ${P.border}`,borderRadius:10,padding:'10px 14px',color:P.txt,fontSize:14}} />
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{color:P.muted,fontSize:13}}>Custo:</span>
          <input type="number" min="1" value={cost} onChange={e=>setCost(Number(e.target.value)||1)}
            style={{width:100,background:P.surface2,border:`1px solid ${P.border}`,borderRadius:10,padding:'8px 12px',color:P.txt,fontSize:14,fontWeight:700}} />
          <span style={{color:P.muted,fontSize:13}}>XP</span>
          <button className="btn" onClick={add} style={{marginLeft:'auto',background:P.pri,border:'none',borderRadius:10,padding:'8px 18px',color:'white',fontWeight:700,fontSize:14}}>Adicionar</button>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        {rewards.map(r=>(
          editId===r.id
            ? <div key={r.id} style={{gridColumn:'1 / -1'}}>
                <EditRow item={r} icons={RWD_ICONS} isXp={false} C={P}
                  onSave={u=>{setRewards(p=>p.map(x=>x.id===r.id?u:x));setEditId(null)}}
                  onCancel={()=>setEditId(null)} />
              </div>
            : <div key={r.id} className="card-hover" style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:16,padding:16,position:'relative'}}>
                <div style={{position:'absolute',top:8,right:8,display:'flex',gap:4}}>
                  {!r.shield&&<button className="btn" onClick={()=>setEditId(r.id)} style={{background:'rgba(61,127,255,.12)',border:'none',borderRadius:6,width:26,height:26,color:P.priL,display:'flex',alignItems:'center',justifyContent:'center'}}>✏️</button>}
                  {!r.shield&&<button className="btn" onClick={()=>setRewards(p=>p.filter(x=>x.id!==r.id))} style={{background:'rgba(255,77,109,.12)',border:'none',borderRadius:6,width:26,height:26,color:'#FF4D6D',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>}
                </div>
                <div style={{fontSize:30,marginBottom:6}}>{r.icon}</div>
                <div style={{color:P.txt,fontWeight:700,fontSize:13,marginBottom:4,paddingRight:r.shield?0:56}}>{r.title}</div>
                {r.shield&&<div style={{color:P.muted,fontSize:11,marginBottom:4}}>Protege 1 streak</div>}
                <div style={{color:P.acc,fontWeight:700,fontSize:13}}>{r.cost} XP</div>
              </div>
        ))}
      </div>
    </div>
  )
}

function ParentConfig({ onResetDay, onResetAll }) {
  const [confirm, setConfirm] = useState(null)
  return (
    <div style={{padding:'16px 16px 100px'}}>
      {confirm&&<Confirm
        msg={confirm==='day'?'As tarefas de hoje serão desmarcadas. O XP total não muda.':'Todo o progresso será zerado: XP, sequência, histórico e tarefas do dia.'}
        danger={confirm==='all'}
        onYes={()=>{confirm==='day'?onResetDay():onResetAll();setConfirm(null)}}
        onNo={()=>setConfirm(null)} />}
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <div style={{color:P.txt,fontWeight:700,fontSize:15,marginBottom:4}}>⚙️ Configurações</div>
        <div style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:18,padding:20}}>
          <div style={{fontSize:28,marginBottom:10}}>🔄</div>
          <div style={{color:P.txt,fontWeight:700,fontSize:16,marginBottom:6}}>Zerar tarefas do dia</div>
          <div style={{color:P.muted,fontSize:13,marginBottom:16}}>Desmarca todas as tarefas de hoje. O XP total acumulado permanece.</div>
          <button className="btn" onClick={()=>setConfirm('day')} style={{background:P.pri,border:'none',borderRadius:12,padding:'12px 20px',color:'white',fontWeight:700,fontSize:14,width:'100%'}}>Zerar dia atual</button>
        </div>
        <div style={{background:P.surface,border:'1px solid rgba(255,77,109,.3)',borderRadius:18,padding:20}}>
          <div style={{fontSize:28,marginBottom:10}}>🗑️</div>
          <div style={{color:P.txt,fontWeight:700,fontSize:16,marginBottom:6}}>Zerar tudo</div>
          <div style={{color:P.muted,fontSize:13,marginBottom:16}}>Reseta XP, sequência, escudos e histórico. As tarefas e recompensas cadastradas são mantidas.</div>
          <button className="btn" onClick={()=>setConfirm('all')} style={{background:'rgba(255,77,109,.15)',border:'1px solid rgba(255,77,109,.4)',borderRadius:12,padding:'12px 20px',color:'#FF4D6D',fontWeight:700,fontSize:14,width:'100%'}}>Zerar tudo</button>
        </div>
      </div>
    </div>
  )
}

function ParentApp({ tasks, setTasks, rewards, setRewards, xp, done, streak, shields, history, profileIcon, profilePhoto, parentIcon, onParentIcon, onResetDay, onResetAll, onUndoTask, onLogout, userName }) {
  const [tab,    setTab]    = useState('home')
  const [showAv, setShowAv] = useState(false)
  return (
    <div style={{background:P.bg,minHeight:'100vh',maxWidth:440,margin:'0 auto',position:'relative'}}>
      {showAv && <AvatarPicker current={parentIcon} avatarList={PARENT_AVATARS} title="Seu avatar" onSelect={v=>{onParentIcon(v);setShowAv(false)}} onClose={()=>setShowAv(false)} />}
      <div style={{background:`linear-gradient(180deg,#0D1B38 0%,${P.bg} 100%)`,padding:'20px 20px 16px',borderBottom:`1px solid ${P.border}`}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <button className="btn" onClick={()=>setShowAv(true)}
              style={{width:46,height:46,borderRadius:'50%',background:`linear-gradient(135deg,${P.pri},#6366F1)`,border:'none',fontSize:24,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {parentIcon||'👩'}
            </button>
            <div>
              <div style={{color:P.muted,fontSize:12}}>Bem-vinda,</div>
              <div style={{color:P.txt,fontWeight:800,fontSize:19}}>{userName}</div>
            </div>
          </div>
          <div style={{background:`linear-gradient(135deg,${P.pri},#6366F1)`,borderRadius:14,padding:'10px 16px',textAlign:'right'}}>
            <div style={{color:'white',fontWeight:800,fontSize:26,lineHeight:1}}>{xp}</div>
            <div style={{color:'rgba(255,255,255,.75)',fontSize:11}}>XP da Kauanny</div>
          </div>
        </div>
      </div>

      {tab==='home'        && <ParentHome tasks={tasks} done={done} xp={xp} rewards={rewards} streak={streak} shields={shields} history={history} profileIcon={profileIcon} profilePhoto={profilePhoto} onUndoTask={onUndoTask} />}
      {tab==='tarefas'     && <ParentTarefas tasks={tasks} setTasks={setTasks} />}
      {tab==='recompensas' && <ParentRecompensas rewards={rewards} setRewards={setRewards} />}
      {tab==='config'      && <ParentConfig onResetDay={onResetDay} onResetAll={onResetAll} />}

      <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:440,background:P.surface,borderTop:`1px solid ${P.border}`,display:'flex',padding:'8px 0 16px'}}>
        {[['home','📊','Visão Geral'],['tarefas','✅','Tarefas'],['recompensas','🎁','Recompensas'],['config','⚙️','Config']].map(([id,ic,label])=>(
          <button key={id} className="btn" onClick={()=>setTab(id)} style={{flex:1,background:'none',border:'none',display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'6px 0'}}>
            <span style={{fontSize:20}}>{ic}</span>
            <span style={{fontSize:10,fontWeight:tab===id?700:500,color:tab===id?P.pri:P.muted}}>{label}</span>
            {tab===id&&<div style={{width:18,height:3,background:P.pri,borderRadius:99,marginTop:2}} />}
          </button>
        ))}
      </div>
      <button className="btn" onClick={onLogout} style={{position:'fixed',top:14,right:14,background:P.surface2,border:`1px solid ${P.border}`,borderRadius:8,padding:'5px 12px',color:P.muted,fontSize:13}}>Sair</button>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// APP PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export default function App() {
  const [user,           setUser]          = useState(null)
  const [tasks,          setTasksSt]       = useState(TASKS_INIT)
  const [rewards,        setRwdSt]         = useState(REWARDS_INIT)
  const [done,           setDone]          = useState([])
  const [xp,             setXp]            = useState(0)
  const [streak,         setStreak]        = useState(0)
  const [shields,        setShields]       = useState(0)
  const [history,        setHistory]       = useState([])
  const [profileIcon,    setProfileIconSt]  = useState('😊')
  const [profilePhoto,   setProfilePhotoSt] = useState(null)
  const [parentIcon,     setParentIconSt]   = useState('👩')
  const [comboBonusToday,setComboBT]       = useState(false)
  const [showCombo,      setShowCombo]     = useState(false)
  const [motivationMsg,  setMotivation]    = useState('')
  const [loading,        setLoading]       = useState(true)

  useEffect(() => onAuthStateChanged(auth, u => setUser(u??null)), [])

  useEffect(() => {
    if (!user) return
    const todayDate  = getToday()
    const thisMonday = getMonday()
    const thisMonth  = getMonth()

    const unsub = onSnapshot(DOC_REF, async snap => {
      if (snap.exists()) {
        const d = snap.data()

        // Migração de versão: atualiza tarefas e recompensas se estiverem desatualizadas
        if (!d.version || d.version < DOC_VERSION) {
          await setDoc(DOC_REF, { tasks: TASKS_INIT, rewards: REWARDS_INIT, version: DOC_VERSION }, { merge: true })
          return
        }

        let updates = {}, newDone = [...(d.done||[])]
        let needsUpdate = false

        // Reset DIÁRIAS
        if ((d.lastResetDiaria||'') !== todayDate) {
          const dailyTasks = (d.tasks||[]).filter(t=>t.tipo==='diaria')
          const dailyDone  = dailyTasks.filter(t=>(d.done||[]).includes(t.id))
          const dailyXp    = dailyDone.reduce((s,t)=>s+t.xp,0)
          const anyDone    = dailyDone.length>0

          // Streak: usa escudo se não fez nada mas tem escudo
          let newStreak = d.streak||0
          let newShields = d.shields||0
          if (!anyDone) {
            if (newShields>0) { newShields--; } // escudo ativa: mantém streak
            else { newStreak = 0 }              // sem escudo: zera
          } else { newStreak++ }

          const newHist = [...(d.history||[]).slice(-27), {date:d.lastResetDiaria||todayDate, xp:dailyXp, anyDone}]
          const dailyIds = dailyTasks.map(t=>t.id)
          newDone = newDone.filter(id=>!dailyIds.includes(id))
          updates = {...updates, lastResetDiaria:todayDate, streak:newStreak, shields:newShields, history:newHist, comboBonusToday:false}
          needsUpdate = true
        }

        // Reset SEMANAIS
        if ((d.lastResetSemanal||'') !== thisMonday) {
          const weekIds = (d.tasks||[]).filter(t=>t.tipo==='semanal').map(t=>t.id)
          newDone = newDone.filter(id=>!weekIds.includes(id))
          updates = {...updates, lastResetSemanal:thisMonday}
          needsUpdate = true
        }

        // Reset MENSAIS
        if ((d.lastResetMensal||'') !== thisMonth) {
          const monIds = (d.tasks||[]).filter(t=>t.tipo==='mensal').map(t=>t.id)
          newDone = newDone.filter(id=>!monIds.includes(id))
          updates = {...updates, lastResetMensal:thisMonth}
          needsUpdate = true
        }

        if (needsUpdate) {
          await setDoc(DOC_REF, {...updates, done:newDone}, {merge:true})
          return
        }

        // Carrega estado
        if (d.tasks)   setTasksSt(d.tasks)
        if (d.rewards) setRwdSt(d.rewards)
        setDone(d.done||[])
        setXp(d.xp??0)
        setStreak(d.streak||0)
        setShields(d.shields||0)
        setHistory(d.history||[])
        setProfileIconSt(d.profileIcon||'😊')
        setProfilePhotoSt(d.profilePhoto||null)
        setParentIconSt(d.parentIcon||'👩')
        setComboBT(d.comboBonusToday||false)
      } else {
        await setDoc(DOC_REF, INITIAL_DOC)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [user])

  const save = patch => setDoc(DOC_REF, patch, {merge:true})

  const handleSetTasks = updater => {
    setTasksSt(prev => { const next=typeof updater==='function'?updater(prev):updater; save({tasks:next}); return next })
  }
  const handleSetRewards = updater => {
    setRwdSt(prev => { const next=typeof updater==='function'?updater(prev):updater; save({rewards:next}); return next })
  }

  const showMotivation  = () => setMotivation(MOTIVATION_MSGS[Math.floor(Math.random()*MOTIVATION_MSGS.length)])
  const closeMotivation = () => setMotivation('')

  const handleToggle = task => {
    const isDone   = done.includes(task.id)
    const newDone  = isDone ? done.filter(id=>id!==task.id) : [...done, task.id]
    let   newXp    = isDone ? Math.max(0,xp-task.xp) : xp+task.xp

    // Mensagem de incentivo ao marcar
    if (!isDone) showMotivation()

    // Verifica combo bônus (só diárias)
    let newCombo = comboBonusToday
    if (!isDone && task.tipo==='diaria' && !comboBonusToday) {
      const dailyTasks = tasks.filter(t=>t.tipo==='diaria')
      const allDone    = dailyTasks.every(t=>newDone.includes(t.id))
      if (allDone) {
        newXp += COMBO_BONUS
        newCombo = true
        setShowCombo(true)
        setTimeout(()=>setShowCombo(false), 2200)
      }
    }

    setDone(newDone); setXp(newXp); setComboBT(newCombo)
    save({done:newDone, xp:newXp, comboBonusToday:newCombo})
  }

  const handleBuyShield = cost => {
    if (xp < cost) return
    const newXp = xp - cost
    const newShields = shields + 1
    setXp(newXp); setShields(newShields)
    save({xp:newXp, shields:newShields})
  }

  const handleProfileIcon  = icon => { setProfileIconSt(icon); save({profileIcon:icon}) }
  const handleProfilePhoto = b64  => { setProfilePhotoSt(b64); save({profilePhoto:b64}) }
  const handleParentIcon   = icon => { setParentIconSt(icon);  save({parentIcon:icon})  }
  const handleLogout      = ()   => signOut(auth)

  const handleUndoTask = task => {
    const newDone = done.filter(id=>id!==task.id)
    const newXp   = Math.max(0, xp - task.xp)
    setDone(newDone); setXp(newXp)
    save({done:newDone, xp:newXp})
  }

  const handleResetDay = async () => {
    const dailyIds = tasks.filter(t=>t.tipo==='diaria').map(t=>t.id)
    const newDone  = done.filter(id=>!dailyIds.includes(id))
    setDone(newDone)
    await setDoc(DOC_REF, {done:newDone}, {merge:true})
  }

  const handleResetAll = async () => {
    setDone([]); setXp(0); setStreak(0); setShields(0); setHistory([]); setComboBT(false)
    await setDoc(DOC_REF, {
      done:[], xp:0, streak:0, shields:0, history:[], comboBonusToday:false,
      lastResetDiaria:getToday(), lastResetSemanal:getMonday(), lastResetMensal:getMonth(),
      tasks:TASKS_INIT, rewards:REWARDS_INIT, version:DOC_VERSION,
    }, {merge:true})
  }

  if (!user) return <><style>{CSS}</style><LoginScreen /></>
  if (loading) return (
    <div style={{background:'#07080F',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{color:'#6B7280',fontSize:16}}>Carregando dados...</div>
    </div>
  )

  const isParent = user.email === PARENT_EMAIL

  return (
    <>
      <style>{CSS}</style>
      {isParent
        ? <ParentApp tasks={tasks} setTasks={handleSetTasks} rewards={rewards} setRewards={handleSetRewards}
            xp={xp} done={done} streak={streak} shields={shields} history={history}
            profileIcon={profileIcon} profilePhoto={profilePhoto}
            parentIcon={parentIcon} onParentIcon={handleParentIcon}
            onResetDay={handleResetDay} onResetAll={handleResetAll} onUndoTask={handleUndoTask}
            onLogout={handleLogout} userName={getFirstName(user.email)} />
        : <TeenApp tasks={tasks} rewards={rewards} done={done} onToggle={handleToggle}
            xp={xp} streak={streak} shields={shields} showCombo={showCombo}
            motivationMsg={motivationMsg} onCloseMotivation={closeMotivation}
            profileIcon={profileIcon} profilePhoto={profilePhoto}
            onProfileIcon={handleProfileIcon} onProfilePhoto={handleProfilePhoto}
            onBuyShield={handleBuyShield} onLogout={handleLogout} />
      }
    </>
  )
}
