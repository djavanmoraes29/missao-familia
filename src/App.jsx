import { useState, useEffect } from 'react'
import { db, auth } from './firebase'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'

// ─── config ──────────────────────────────────────────────────────────
const DOC_REF      = doc(db, 'familia', 'sofia')
const PARENT_EMAIL = 'thatiana@mae.com'
const DAYS         = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const getToday     = () => new Date().toISOString().split('T')[0]

const getWeekChart = (history, done, tasks) => {
  const maxXp    = tasks.reduce((s,t) => s+t.xp, 0) || 1
  const todayXp  = tasks.filter(t => done.includes(t.id)).reduce((s,t) => s+t.xp, 0)
  return Array.from({length:7}, (_,i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6-i))
    const dateStr = d.toISOString().split('T')[0]
    const isToday = i === 6
    const entry   = history.find(h => h.date === dateStr)
    const xpVal   = isToday ? todayXp : (entry?.xp ?? 0)
    return { day: DAYS[d.getDay()], pct: Math.round((xpVal/maxXp)*100), isToday, xp: xpVal }
  })
}

// ─── dados iniciais ──────────────────────────────────────────────────
const TASKS_INIT = [
  { id: 1, title: 'Arrumar a cama',       xp: 5,  icon: '🛏️' },
  { id: 2, title: 'Organizar o quarto',   xp: 10, icon: '🧹' },
  { id: 3, title: 'Lavar própria louça',  xp: 10, icon: '🍽️' },
  { id: 4, title: 'Ajudar em casa',       xp: 15, icon: '🏠' },
  { id: 5, title: 'Cumprir horários',     xp: 10, icon: '⏰' },
  { id: 6, title: 'Estudar sem lembrete', xp: 15, icon: '📚' },
  { id: 7, title: 'Atividade física',     xp: 15, icon: '💪' },
  { id: 8, title: 'Ler 10 páginas',       xp: 10, icon: '📖' },
]

const REWARDS_INIT = [
  { id: 1, title: 'Escolher o filme',     cost: 100,  icon: '🎬' },
  { id: 2, title: 'Pizza especial',       cost: 150,  icon: '🍕' },
  { id: 3, title: 'Ir ao cinema',         cost: 200,  icon: '🎭' },
  { id: 4, title: 'R$ 30 bônus',          cost: 300,  icon: '💰' },
  { id: 5, title: 'Algo desejado',        cost: 500,  icon: '🎁' },
  { id: 6, title: 'Experiência especial', cost: 1000, icon: '⭐' },
]

const LEVELS = [
  { n:1, name:'Aprendiz',     icon:'🌱', min:0,    max:99       },
  { n:2, name:'Responsável',  icon:'⭐', min:100,  max:299      },
  { n:3, name:'Comprometida', icon:'🔥', min:300,  max:599      },
  { n:4, name:'Exemplo',      icon:'💎', min:600,  max:999      },
  { n:5, name:'Líder',        icon:'👑', min:1000, max:Infinity },
]

const BADGES = [
  { id:1, icon:'📚', title:'Estudiosa',   desc:'Estudou 10 dias sem lembrete',       earned:false },
  { id:2, icon:'🏅', title:'Organização', desc:'7 dias seguidos arrumando o quarto', earned:false },
  { id:3, icon:'🎖️', title:'Disciplina',  desc:'30 dias sem perder tarefas',         earned:false },
  { id:4, icon:'🏆', title:'Família',     desc:'50 tarefas domésticas concluídas',   earned:false },
]

// ─── utils ──────────────────────────────────────────────────────────
const getLvl    = (xp) => LEVELS.find(l => xp >= l.min && (l.max === Infinity || xp <= l.max)) || LEVELS[0]
const getLvlPct = (xp) => {
  const l = getLvl(xp)
  if (l.n === 5) return 100
  return Math.min(100, Math.round(((xp - l.min) / (l.max - l.min + 1)) * 100))
}

// ─── paletas ─────────────────────────────────────────────────────────
const T = {
  bg:'#0C0B16', surface:'#1C1A2E', surface2:'#252340', border:'#2E2C48',
  pri:'#7C5CFC', priL:'#A688FF', acc:'#FF6F3C', ok:'#00D68F',
  txt:'#F2F0FF', muted:'#9896B4',
}
const P = {
  bg:'#08111F', surface:'#0F1E35', surface2:'#162843', border:'#1E334F',
  pri:'#3D7FFF', priL:'#7AAAFF', acc:'#F59E0B', ok:'#22C55E',
  txt:'#EFF6FF', muted:'#6B84A8',
}

// ─── animações ───────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap');

  * { font-family: 'Space Grotesk', sans-serif; box-sizing: border-box; }

  .bar        { transition: width .7s cubic-bezier(.34,1.3,.64,1); }
  .card-hover { transition: transform .15s, box-shadow .15s; }
  .card-hover:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,.3); }
  .btn        { transition: transform .1s, opacity .1s; cursor: pointer; }
  .btn:active { transform: scale(.95); }
  .btn:focus-visible { outline: 2px solid #7C5CFC; outline-offset: 2px; }

  @keyframes fadeUp  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  .fade-up { animation: fadeUp .3s ease both; }

  @keyframes xpPop   { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
  .xp-pop { animation: xpPop .35s ease; }

  @keyframes floatUp { from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(-36px)} }
  .float-up { animation: floatUp .8s ease forwards; }

  @keyframes checkIn { 0%{transform:scale(0) rotate(-45deg)} 70%{transform:scale(1.2)} 100%{transform:scale(1)} }
  .check-in { animation: checkIn .3s ease; }

  input::placeholder { color: #6B7280; }
  input:focus { border-color: #7C5CFC !important; }

  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
`

// ════════════════════════════════════════════════════════════════════
// LOGIN
// ════════════════════════════════════════════════════════════════════

function LoginScreen() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async () => {
    if (!email || !password) return
    setLoading(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch {
      setError('E-mail ou senha incorretos.')
    }
    setLoading(false)
  }

  return (
    <div style={{ background:'#07080F', minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:28 }}>
      <div style={{ textAlign:'center', marginBottom:44 }}>
        <div style={{ fontSize:60, marginBottom:14 }}>🏠</div>
        <h1 style={{ color:'#F2F0FF', fontSize:32, fontWeight:800, letterSpacing:'-0.5px', margin:0 }}>Missão Família</h1>
        <p style={{ color:'#6B7280', fontSize:14, marginTop:8 }}>Responsabilidade que vira conquista</p>
      </div>

      <div style={{ width:'100%', maxWidth:320, display:'flex', flexDirection:'column', gap:12 }}>
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ background:'#1C1A2E', border:'1px solid #2E2C48', borderRadius:12, padding:'14px 16px', color:'#F2F0FF', fontSize:15, outline:'none', width:'100%' }}
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{ background:'#1C1A2E', border:'1px solid #2E2C48', borderRadius:12, padding:'14px 16px', color:'#F2F0FF', fontSize:15, outline:'none', width:'100%' }}
        />
        {error && <div style={{ color:'#FF4D6D', fontSize:13, textAlign:'center' }}>{error}</div>}
        <button
          className="btn"
          onClick={handleLogin}
          disabled={loading}
          style={{ background:'linear-gradient(135deg,#7C5CFC,#A688FF)', border:'none', borderRadius:12, padding:'14px', color:'white', fontWeight:700, fontSize:16, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// COMPONENTES COMPARTILHADOS
// ════════════════════════════════════════════════════════════════════

function XpBar({ xp, C }) {
  const lvl  = getLvl(xp)
  const pct  = getLvlPct(xp)
  const next = LEVELS.find(l => l.n === lvl.n + 1)
  return (
    <div style={{ background:C.surface, borderRadius:14, padding:'12px 16px', border:`1px solid ${C.border}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:20 }}>{lvl.icon}</span>
          <span style={{ color:C.txt, fontWeight:700, fontSize:15 }}>{lvl.name}</span>
          <span style={{ background:C.pri+'28', color:C.priL, fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99 }}>Nv.{lvl.n}</span>
        </div>
        {next  && <span style={{ color:C.muted, fontSize:12 }}>{next.min - xp} XP → {next.name}</span>}
        {!next && <span style={{ color:C.acc, fontSize:12, fontWeight:700 }}>Nível máximo! 🎉</span>}
      </div>
      <div style={{ background:C.surface2, borderRadius:99, height:7, overflow:'hidden' }}>
        <div className="bar" style={{ width:`${pct}%`, height:'100%', background:`linear-gradient(90deg,${C.pri},${C.acc})`, borderRadius:99 }} />
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// TELAS DO ADOLESCENTE
// ════════════════════════════════════════════════════════════════════

function TeenMissoes({ tasks, done, onDone }) {
  const [popId, setPopId] = useState(null)
  const todayXp = tasks.filter(t => done.includes(t.id)).reduce((s,t) => s+t.xp, 0)
  const totalXp = tasks.reduce((s,t) => s+t.xp, 0)
  const pct     = totalXp ? Math.round((todayXp/totalXp)*100) : 0

  const handle = (task) => {
    if (done.includes(task.id)) return
    setPopId(task.id)
    setTimeout(() => setPopId(null), 800)
    onDone(task)
  }

  return (
    <div style={{ padding:'16px 16px 100px' }}>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:16, marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ color:T.txt, fontWeight:600 }}>Missões de hoje</span>
          <span style={{ color:T.pri, fontWeight:700 }}>{todayXp} / {totalXp} XP</span>
        </div>
        <div style={{ background:T.surface2, borderRadius:99, height:8, overflow:'hidden' }}>
          <div className="bar" style={{ width:`${pct}%`, height:'100%', background:`linear-gradient(90deg,${T.pri},${T.acc})`, borderRadius:99 }} />
        </div>
        <div style={{ color:T.muted, fontSize:12, marginTop:6 }}>{done.length} de {tasks.length} tarefas concluídas hoje</div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {tasks.map((task, i) => {
          const isDone    = done.includes(task.id)
          const isPopping = popId === task.id
          return (
            <div key={task.id}
              className={`card-hover fade-up${isPopping ? ' xp-pop' : ''}`}
              style={{ animationDelay:`${i*0.04}s`, background: isDone ? 'rgba(0,214,143,.08)' : T.surface, border:`1px solid ${isDone ? 'rgba(0,214,143,.3)' : T.border}`, borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', gap:12, cursor: isDone ? 'default' : 'pointer', position:'relative', overflow:'hidden' }}
              onClick={() => handle(task)}
            >
              <span style={{ fontSize:26 }}>{task.icon}</span>
              <span style={{ flex:1, color: isDone ? T.muted : T.txt, fontWeight:600, fontSize:15, textDecoration: isDone ? 'line-through' : 'none' }}>{task.title}</span>
              <span style={{ color: isDone ? T.ok : T.pri, fontWeight:700, fontSize:14, minWidth:48, textAlign:'right' }}>+{task.xp} XP</span>
              <div style={{ width:28, height:28, borderRadius:'50%', background: isDone ? T.ok : 'transparent', border:`2px solid ${isDone ? T.ok : T.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color:'white', transition:'all .25s', flexShrink:0 }}>
                {isDone && <span className="check-in">✓</span>}
              </div>
              {isPopping && (
                <div className="float-up" style={{ position:'absolute', right:52, top:8, color:T.ok, fontWeight:800, fontSize:18, pointerEvents:'none' }}>
                  +{task.xp}✨
                </div>
              )}
            </div>
          )
        })}
      </div>

      {done.length === tasks.length && tasks.length > 0 && (
        <div className="fade-up" style={{ marginTop:20, background:`linear-gradient(135deg,rgba(124,92,252,.15),rgba(255,111,60,.1))`, border:`1px solid rgba(255,111,60,.3)`, borderRadius:16, padding:20, textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🎉</div>
          <div style={{ color:T.txt, fontWeight:700, fontSize:17 }}>Todas as missões do dia concluídas!</div>
          <div style={{ color:T.muted, fontSize:14, marginTop:4 }}>Você ganhou {todayXp} XP hoje. Incrível!</div>
        </div>
      )}
    </div>
  )
}

function TeenLoja({ rewards, totalXp }) {
  const [claimed, setClaimed] = useState([])
  return (
    <div style={{ padding:'16px 16px 100px' }}>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, padding:'12px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:26 }}>💎</span>
        <div>
          <div style={{ color:T.muted, fontSize:12 }}>Pontos disponíveis</div>
          <div style={{ color:T.txt, fontWeight:800, fontSize:26 }}>{totalXp} XP</div>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {rewards.map((r, i) => {
          const canAfford = totalXp >= r.cost
          const isClaimed = claimed.includes(r.id)
          return (
            <div key={r.id} className="card-hover fade-up"
              style={{ animationDelay:`${i*0.06}s`, background: isClaimed ? 'rgba(0,214,143,.07)' : T.surface, border:`1px solid ${isClaimed ? 'rgba(0,214,143,.3)' : canAfford ? T.pri+'44' : T.border}`, borderRadius:16, padding:16, cursor: canAfford && !isClaimed ? 'pointer' : 'default', opacity: !canAfford && !isClaimed ? .42 : 1 }}
              onClick={() => canAfford && !isClaimed && setClaimed(p => [...p, r.id])}
            >
              <div style={{ fontSize:36, marginBottom:8 }}>{r.icon}</div>
              <div style={{ color:T.txt, fontWeight:700, fontSize:14, marginBottom:4 }}>{r.title}</div>
              {isClaimed
                ? <div style={{ color:T.ok, fontWeight:700, fontSize:13 }}>✓ Resgatado!</div>
                : <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <span style={{ color: canAfford ? T.acc : T.muted, fontWeight:700, fontSize:13 }}>{r.cost} XP</span>
                    {canAfford && <span style={{ fontSize:11, color:T.ok }}>• disponível</span>}
                  </div>
              }
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TeenTrofeus({ xp, streak }) {
  const lvl = getLvl(xp)
  const pct = getLvlPct(xp)
  return (
    <div style={{ padding:'16px 16px 100px' }}>
      <div style={{ background:`linear-gradient(135deg,${T.pri}22,${T.acc}12)`, border:`1px solid ${T.pri}40`, borderRadius:18, padding:'18px 20px', marginBottom:16 }}>
        <div style={{ fontSize:48, marginBottom:8 }}>{lvl.icon}</div>
        <div style={{ color:T.txt, fontWeight:800, fontSize:22 }}>{lvl.name}</div>
        <div style={{ color:T.muted, fontSize:14, marginTop:2 }}>Nível {lvl.n} • {xp} XP acumulados</div>
        <div style={{ background:T.surface, borderRadius:99, height:6, overflow:'hidden', marginTop:12 }}>
          <div className="bar" style={{ width:`${pct}%`, height:'100%', background:`linear-gradient(90deg,${T.pri},${T.acc})`, borderRadius:99 }} />
        </div>
      </div>

      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:'14px 18px', marginBottom:16, display:'flex', alignItems:'center', gap:14 }}>
        <span style={{ fontSize:32 }}>🔥</span>
        <div>
          <div style={{ color:T.txt, fontWeight:700, fontSize:16 }}>{streak} dias seguidos</div>
          <div style={{ color:T.muted, fontSize:13 }}>Sequência atual de missões</div>
        </div>
      </div>

      <div style={{ color:T.txt, fontWeight:700, fontSize:15, marginBottom:12 }}>🎖️ Medalhas</div>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {BADGES.map((b, i) => (
          <div key={b.id} className="fade-up" style={{ animationDelay:`${i*0.07}s`, background: b.earned ? `linear-gradient(135deg,rgba(255,111,60,.1),rgba(124,92,252,.07))` : T.surface, border:`1px solid ${b.earned ? 'rgba(255,111,60,.3)' : T.border}`, borderRadius:16, padding:'14px 16px', display:'flex', alignItems:'center', gap:14, opacity: b.earned ? 1 : .4 }}>
            <span style={{ fontSize:38, filter: b.earned ? 'none' : 'grayscale(1)' }}>{b.icon}</span>
            <div>
              <div style={{ color:T.txt, fontWeight:700, fontSize:15 }}>{b.title}</div>
              <div style={{ color:T.muted, fontSize:13, marginTop:2 }}>{b.desc}</div>
              {b.earned  && <div style={{ color:T.acc, fontWeight:600, fontSize:12, marginTop:4 }}>✨ Conquistado!</div>}
              {!b.earned && <div style={{ color:T.muted, fontWeight:500, fontSize:12, marginTop:4 }}>🔒 Em progresso...</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TeenApp({ tasks, rewards, done, onDone, xp, streak, onLogout }) {
  const [tab, setTab] = useState('missoes')
  return (
    <div style={{ background:T.bg, minHeight:'100vh', maxWidth:440, margin:'0 auto', position:'relative' }}>
      <div style={{ background:`linear-gradient(180deg,#1A1535 0%,${T.bg} 100%)`, padding:'20px 20px 16px', borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:46, height:46, borderRadius:'50%', background:`linear-gradient(135deg,${T.pri},${T.acc})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>😊</div>
            <div>
              <div style={{ color:T.muted, fontSize:12 }}>Bem-vinda de volta,</div>
              <div style={{ color:T.txt, fontWeight:700, fontSize:17 }}>Kauanny</div>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ color:T.priL, fontWeight:800, fontSize:26 }}>{xp}</div>
            <div style={{ color:T.muted, fontSize:11 }}>pontos totais</div>
          </div>
        </div>
        <XpBar xp={xp} C={T} />
      </div>

      {tab === 'missoes' && <TeenMissoes tasks={tasks} done={done} onDone={onDone} />}
      {tab === 'loja'    && <TeenLoja rewards={rewards} totalXp={xp} />}
      {tab === 'trofeus' && <TeenTrofeus xp={xp} streak={streak} />}

      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:440, background:T.surface, borderTop:`1px solid ${T.border}`, display:'flex', padding:'8px 0 16px' }}>
        {[['missoes','⚡','Missões'],['loja','🛒','Loja'],['trofeus','🏆','Troféus']].map(([id,ic,label]) => (
          <button key={id} className="btn" onClick={() => setTab(id)} style={{ flex:1, background:'none', border:'none', display:'flex', flexDirection:'column', alignItems:'center', gap:2, padding:'6px 0' }}>
            <span style={{ fontSize:22 }}>{ic}</span>
            <span style={{ fontSize:11, fontWeight: tab===id ? 700 : 500, color: tab===id ? T.pri : T.muted }}>{label}</span>
            {tab === id && <div style={{ width:18, height:3, background:T.pri, borderRadius:99, marginTop:2 }} />}
          </button>
        ))}
      </div>
      <button className="btn" onClick={onLogout} style={{ position:'fixed', top:14, right:14, background:T.surface2, border:`1px solid ${T.border}`, borderRadius:8, padding:'5px 12px', color:T.muted, fontSize:13 }}>Sair</button>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// TELAS DOS PAIS
// ════════════════════════════════════════════════════════════════════

function ParentHome({ tasks, done, xp, rewards, streak, history }) {
  const todayXp  = tasks.filter(t => done.includes(t.id)).reduce((s,t) => s+t.xp, 0)
  const totalXp  = tasks.reduce((s,t) => s+t.xp, 0)
  const pct      = totalXp ? Math.round((done.length/tasks.length)*100) : 0
  const lvl      = getLvl(xp)
  const nextRwd  = rewards.filter(r => r.cost > xp).sort((a,b) => a.cost-b.cost)[0]
  const weekData = getWeekChart(history, done, tasks)

  return (
    <div style={{ padding:'16px 16px 100px', display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ background:`linear-gradient(135deg,${P.pri}1A,${P.acc}0D)`, border:`1px solid ${P.pri}40`, borderRadius:18, padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
          <div style={{ width:52, height:52, borderRadius:'50%', background:`linear-gradient(135deg,${P.pri},#6366F1)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>😊</div>
          <div style={{ flex:1 }}>
            <div style={{ color:P.txt, fontWeight:700, fontSize:18 }}>Kauanny</div>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
              <span style={{ fontSize:15 }}>{lvl.icon}</span>
              <span style={{ color:P.muted, fontSize:13 }}>{lvl.name} · Nível {lvl.n}</span>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ color:P.priL, fontWeight:800, fontSize:28 }}>{xp}</div>
            <div style={{ color:P.muted, fontSize:11 }}>XP total</div>
          </div>
        </div>
        <XpBar xp={xp} C={P} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10 }}>
        {[
          { icon:'✅', val:done.length,  label:'Feitas hoje' },
          { icon:'📊', val:`${pct}%`,    label:'Progresso'  },
          { icon:'⚡', val:todayXp,      label:'XP hoje'    },
          { icon:'🔥', val:streak,       label:'Sequência'  },
        ].map((s,i) => (
          <div key={i} style={{ background:P.surface, border:`1px solid ${P.border}`, borderRadius:14, padding:'12px 8px', textAlign:'center' }}>
            <div style={{ fontSize:20, marginBottom:4 }}>{s.icon}</div>
            <div style={{ color:P.txt, fontWeight:800, fontSize:18 }}>{s.val}</div>
            <div style={{ color:P.muted, fontSize:10, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background:P.surface, border:`1px solid ${P.border}`, borderRadius:18, padding:'18px 20px' }}>
        <div style={{ color:P.txt, fontWeight:700, fontSize:15, marginBottom:16 }}>📅 XP dos últimos 7 dias</div>
        <div style={{ display:'flex', gap:6, alignItems:'flex-end', height:70 }}>
          {weekData.map((v, i) => (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
              <div style={{ width:'100%', height: v.pct>0 ? `${Math.round(v.pct*0.62)}px` : '3px', background: v.pct>0 ? `linear-gradient(180deg,${P.pri},${P.pri}77)` : P.surface2, borderRadius:'6px 6px 3px 3px', transition:'height .3s' }} />
              <span style={{ color: v.isToday ? P.priL : P.muted, fontSize:11, fontWeight: v.isToday ? 700 : 400 }}>{v.day}</span>
            </div>
          ))}
        </div>
      </div>

      {nextRwd && (
        <div style={{ background:P.surface, border:`1px solid ${P.border}`, borderRadius:18, padding:16 }}>
          <div style={{ color:P.muted, fontSize:12, marginBottom:8 }}>🎯 Próxima meta da Kauanny</div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:30 }}>{nextRwd.icon}</span>
            <div style={{ flex:1 }}>
              <div style={{ color:P.txt, fontWeight:700 }}>{nextRwd.title}</div>
              <div style={{ color:P.muted, fontSize:13 }}>{nextRwd.cost - xp} XP faltando</div>
            </div>
            <div style={{ background:P.acc+'1A', border:`1px solid ${P.acc}44`, borderRadius:8, padding:'5px 12px' }}>
              <span style={{ color:P.acc, fontWeight:700, fontSize:13 }}>{nextRwd.cost} XP</span>
            </div>
          </div>
          <div style={{ background:P.surface2, borderRadius:99, height:5, overflow:'hidden', marginTop:12 }}>
            <div className="bar" style={{ width:`${Math.min(100,Math.round((xp/nextRwd.cost)*100))}%`, height:'100%', background:`linear-gradient(90deg,${P.pri},${P.acc})`, borderRadius:99 }} />
          </div>
        </div>
      )}

      <div style={{ background:P.surface, border:`1px solid ${P.border}`, borderRadius:18, padding:16 }}>
        <div style={{ color:P.txt, fontWeight:700, fontSize:14, marginBottom:12 }}>✅ Tarefas de hoje</div>
        {tasks.map(t => (
          <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <span style={{ fontSize:18 }}>{t.icon}</span>
            <span style={{ flex:1, color: done.includes(t.id) ? P.muted : P.txt, fontSize:13, textDecoration: done.includes(t.id) ? 'line-through' : 'none' }}>{t.title}</span>
            {done.includes(t.id) && <span style={{ color:P.ok, fontSize:12, fontWeight:700 }}>✓ +{t.xp}xp</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

const TASK_ICONS = ['🛏️','🧹','🍽️','🏠','⏰','📚','💪','📖','🌱','🎯','🧺','🐕','🚿','🌿','🍳']

function ParentTarefas({ tasks, setTasks }) {
  const [title,   setTitle]   = useState('')
  const [xpVal,   setXpVal]   = useState(10)
  const [iconIdx, setIconIdx] = useState(0)

  const add = () => {
    if (!title.trim()) return
    setTasks(p => [...p, { id: Date.now(), title: title.trim(), xp: xpVal, icon: TASK_ICONS[iconIdx] }])
    setTitle('')
    setIconIdx(i => (i+1) % TASK_ICONS.length)
  }

  return (
    <div style={{ padding:'16px 16px 100px' }}>
      <div style={{ background:P.surface, border:`1px solid ${P.border}`, borderRadius:18, padding:16, marginBottom:20 }}>
        <div style={{ color:P.txt, fontWeight:700, fontSize:15, marginBottom:12 }}>➕ Nova tarefa</div>
        <div style={{ display:'flex', gap:8, marginBottom:10 }}>
          <button className="btn" onClick={() => setIconIdx(i => (i+1)%TASK_ICONS.length)} style={{ background:P.surface2, border:`1px solid ${P.border}`, borderRadius:10, padding:'10px 12px', fontSize:22 }}>
            {TASK_ICONS[iconIdx]}
          </button>
          <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key==='Enter'&&add()} placeholder="Nome da tarefa..." style={{ flex:1, background:P.surface2, border:`1px solid ${P.border}`, borderRadius:10, padding:'10px 14px', color:P.txt, fontSize:14, outline:'none' }} />
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <span style={{ color:P.muted, fontSize:13 }}>XP:</span>
          {[5,10,15,20].map(v => (
            <button key={v} className="btn" onClick={() => setXpVal(v)} style={{ background: xpVal===v ? P.pri : P.surface2, border:`1px solid ${xpVal===v ? P.pri : P.border}`, borderRadius:8, padding:'6px 12px', color: xpVal===v ? 'white' : P.muted, fontSize:13, fontWeight:600 }}>{v}</button>
          ))}
          <button className="btn" onClick={add} style={{ marginLeft:'auto', background:P.pri, border:'none', borderRadius:10, padding:'8px 18px', color:'white', fontWeight:700, fontSize:14 }}>Adicionar</button>
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {tasks.map(t => (
          <div key={t.id} className="card-hover" style={{ background:P.surface, border:`1px solid ${P.border}`, borderRadius:14, padding:'13px 16px', display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:24 }}>{t.icon}</span>
            <span style={{ flex:1, color:P.txt, fontWeight:600, fontSize:14 }}>{t.title}</span>
            <span style={{ color:P.priL, fontWeight:700, fontSize:13, minWidth:42 }}>{t.xp} XP</span>
            <button className="btn" onClick={() => setTasks(p => p.filter(x => x.id!==t.id))} style={{ background:'rgba(255,77,109,.12)', border:'none', borderRadius:8, width:30, height:30, color:'#FF4D6D', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
          </div>
        ))}
      </div>
    </div>
  )
}

const RWD_ICONS = ['🎬','🍕','🎭','💰','🎁','⭐','🏖️','👗','🎮','🎵','🎂','🛍️']

function ParentRecompensas({ rewards, setRewards }) {
  const [title,   setTitle]   = useState('')
  const [cost,    setCost]    = useState(100)
  const [iconIdx, setIconIdx] = useState(0)

  const add = () => {
    if (!title.trim()) return
    setRewards(p => [...p, { id: Date.now(), title: title.trim(), cost, icon: RWD_ICONS[iconIdx] }])
    setTitle('')
    setIconIdx(i => (i+1)%RWD_ICONS.length)
  }

  return (
    <div style={{ padding:'16px 16px 100px' }}>
      <div style={{ background:P.surface, border:`1px solid ${P.border}`, borderRadius:18, padding:16, marginBottom:20 }}>
        <div style={{ color:P.txt, fontWeight:700, fontSize:15, marginBottom:12 }}>🎁 Nova recompensa</div>
        <div style={{ display:'flex', gap:8, marginBottom:10 }}>
          <button className="btn" onClick={() => setIconIdx(i => (i+1)%RWD_ICONS.length)} style={{ background:P.surface2, border:`1px solid ${P.border}`, borderRadius:10, padding:'10px 12px', fontSize:22 }}>{RWD_ICONS[iconIdx]}</button>
          <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key==='Enter'&&add()} placeholder="Nome da recompensa..." style={{ flex:1, background:P.surface2, border:`1px solid ${P.border}`, borderRadius:10, padding:'10px 14px', color:P.txt, fontSize:14, outline:'none' }} />
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <span style={{ color:P.muted, fontSize:13 }}>Custo:</span>
          {[50,100,150,200,300,500].map(v => (
            <button key={v} className="btn" onClick={() => setCost(v)} style={{ background: cost===v ? P.acc : P.surface2, border:`1px solid ${cost===v ? P.acc : P.border}`, borderRadius:8, padding:'5px 10px', color: cost===v ? 'white' : P.muted, fontSize:12, fontWeight:600 }}>{v}</button>
          ))}
          <button className="btn" onClick={add} style={{ marginLeft:'auto', background:P.pri, border:'none', borderRadius:10, padding:'8px 18px', color:'white', fontWeight:700, fontSize:14 }}>Adicionar</button>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {rewards.map(r => (
          <div key={r.id} className="card-hover" style={{ background:P.surface, border:`1px solid ${P.border}`, borderRadius:16, padding:16, position:'relative' }}>
            <button className="btn" onClick={() => setRewards(p => p.filter(x => x.id!==r.id))} style={{ position:'absolute', top:8, right:8, background:'rgba(255,77,109,.12)', border:'none', borderRadius:6, width:24, height:24, color:'#FF4D6D', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
            <div style={{ fontSize:32, marginBottom:8 }}>{r.icon}</div>
            <div style={{ color:P.txt, fontWeight:700, fontSize:14, marginBottom:4, paddingRight:24 }}>{r.title}</div>
            <div style={{ color:P.acc, fontWeight:700, fontSize:13 }}>{r.cost} XP</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ParentApp({ tasks, setTasks, rewards, setRewards, xp, done, streak, history, onLogout }) {
  const [tab, setTab] = useState('home')
  return (
    <div style={{ background:P.bg, minHeight:'100vh', maxWidth:440, margin:'0 auto', position:'relative' }}>
      <div style={{ background:`linear-gradient(180deg,#0D1B38 0%,${P.bg} 100%)`, padding:'20px 20px 16px', borderBottom:`1px solid ${P.border}` }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ color:P.muted, fontSize:12 }}>Painel dos Pais</div>
            <div style={{ color:P.txt, fontWeight:800, fontSize:20 }}>👨‍👩‍👧 Família Moraes</div>
          </div>
          <div style={{ background:P.surface, border:`1px solid ${P.border}`, borderRadius:12, padding:'8px 14px', textAlign:'right' }}>
            <div style={{ color:P.priL, fontWeight:800, fontSize:22 }}>{xp} XP</div>
            <div style={{ color:P.muted, fontSize:11 }}>Kauanny (total)</div>
          </div>
        </div>
      </div>

      {tab === 'home'        && <ParentHome tasks={tasks} done={done} xp={xp} rewards={rewards} streak={streak} history={history} />}
      {tab === 'tarefas'     && <ParentTarefas tasks={tasks} setTasks={setTasks} />}
      {tab === 'recompensas' && <ParentRecompensas rewards={rewards} setRewards={setRewards} />}

      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:440, background:P.surface, borderTop:`1px solid ${P.border}`, display:'flex', padding:'8px 0 16px' }}>
        {[['home','📊','Visão Geral'],['tarefas','✅','Tarefas'],['recompensas','🎁','Recompensas']].map(([id,ic,label]) => (
          <button key={id} className="btn" onClick={() => setTab(id)} style={{ flex:1, background:'none', border:'none', display:'flex', flexDirection:'column', alignItems:'center', gap:2, padding:'6px 0' }}>
            <span style={{ fontSize:22 }}>{ic}</span>
            <span style={{ fontSize:11, fontWeight: tab===id ? 700 : 500, color: tab===id ? P.pri : P.muted }}>{label}</span>
            {tab === id && <div style={{ width:18, height:3, background:P.pri, borderRadius:99, marginTop:2 }} />}
          </button>
        ))}
      </div>
      <button className="btn" onClick={onLogout} style={{ position:'fixed', top:14, right:14, background:P.surface2, border:`1px solid ${P.border}`, borderRadius:8, padding:'5px 12px', color:P.muted, fontSize:13 }}>Sair</button>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// APP PRINCIPAL
// ════════════════════════════════════════════════════════════════════

export default function App() {
  const [user,    setUser]    = useState(undefined) // undefined = verificando auth
  const [tasks,   setTasksSt] = useState(TASKS_INIT)
  const [rewards, setRwdSt]   = useState(REWARDS_INIT)
  const [done,    setDone]    = useState([])
  const [xp,      setXp]      = useState(0)
  const [streak,  setStreak]  = useState(0)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  // Observa autenticação
  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u ?? null))
  }, [])

  // Observa dados do Firestore (apenas se logado)
  useEffect(() => {
    if (!user) return
    const todayDate = getToday()

    const unsub = onSnapshot(DOC_REF, async (snap) => {
      if (snap.exists()) {
        const d = snap.data()

        // Reset diário: se lastReset for diferente de hoje
        if (d.lastReset && d.lastReset !== todayDate) {
          const dailyXp  = (d.tasks || []).filter(t => (d.done || []).includes(t.id)).reduce((s,t) => s+t.xp, 0)
          const hadTasks = (d.done || []).length > 0
          const newStreak  = hadTasks ? (d.streak || 0) + 1 : 0
          const newHistory = [...(d.history || []).slice(-13), { date: d.lastReset, xp: dailyXp }]
          await setDoc(DOC_REF, { done: [], lastReset: todayDate, streak: newStreak, history: newHistory }, { merge: true })
          return // onSnapshot dispara novamente com dados atualizados
        }

        if (d.tasks)   setTasksSt(d.tasks)
        if (d.rewards) setRwdSt(d.rewards)
        setDone(d.done    || [])
        setXp(d.xp        ?? 0)
        setStreak(d.streak || 0)
        setHistory(d.history || [])

        if (!d.lastReset) {
          await setDoc(DOC_REF, { lastReset: todayDate }, { merge: true })
        }
      } else {
        // Primeiro acesso: inicializa documento
        await setDoc(DOC_REF, {
          tasks: TASKS_INIT, rewards: REWARDS_INIT,
          done: [], xp: 0, streak: 0, history: [], lastReset: todayDate,
        })
      }
      setLoading(false)
    })

    return () => unsub()
  }, [user])

  const save = (patch) => setDoc(DOC_REF, patch, { merge: true })

  const handleSetTasks = (updater) => {
    setTasksSt(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      save({ tasks: next })
      return next
    })
  }

  const handleSetRewards = (updater) => {
    setRwdSt(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      save({ rewards: next })
      return next
    })
  }

  const handleDone = (task) => {
    if (done.includes(task.id)) return
    const newDone = [...done, task.id]
    const newXp   = xp + task.xp
    setDone(newDone)
    setXp(newXp)
    save({ done: newDone, xp: newXp })
  }

  const handleLogout = () => signOut(auth)

  // Estados de carregamento
  if (user === undefined) return (
    <div style={{ background:'#07080F', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#6B7280', fontSize:16 }}>Carregando...</div>
    </div>
  )

  if (!user) return <><style>{CSS}</style><LoginScreen /></>

  if (loading) return (
    <div style={{ background:'#07080F', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#6B7280', fontSize:16 }}>Carregando dados...</div>
    </div>
  )

  const isParent = user.email === PARENT_EMAIL

  return (
    <>
      <style>{CSS}</style>
      {isParent
        ? <ParentApp tasks={tasks} setTasks={handleSetTasks} rewards={rewards} setRewards={handleSetRewards} xp={xp} done={done} streak={streak} history={history} onLogout={handleLogout} />
        : <TeenApp   tasks={tasks} rewards={rewards} done={done} onDone={handleDone} xp={xp} streak={streak} onLogout={handleLogout} />
      }
    </>
  )
}
