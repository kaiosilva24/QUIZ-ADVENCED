import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, Edit3, Trash2, ArrowRight, X, ChevronLeft, Save, GripVertical, Settings2, Home, Palette, 
  MessageCircle, BarChart2, MousePointerClick, CheckSquare, AlignLeft, ImageIcon, CheckCircle, 
  Users, TrendingUp, Shuffle, ToggleLeft, ToggleRight, LayoutTemplate, Layers, Eye, EyeOff, Plus, PlayCircle, 
  Video as VideoIcon, Volume2, Copy, ListTodo, Settings, CheckCircle2, Zap, LogOut, UserPlus, Lock, User,
  Trophy, Clock, Rocket
} from 'lucide-react';
import QuizBuilder from './QuizBuilder';
import QuizPreview from './QuizPreview';
const logoSrc = '/logo.svg';


const API = '/api';

// ─── Helpers: visitorId e trackEvent ──────────────────────────────────────────
function getVisitorId() {
  let vid = localStorage.getItem('quiz_saas_visitor_id');
  if (!vid) {
    vid = 'v_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('quiz_saas_visitor_id', vid);
  }
  return vid;
}

function stripHtml(html) {
  if (!html) return null;
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').trim() || null;
}

function trackEvent(quizId, eventType, stepId = null, answerValue = null, timeSpent = 0) {
  const visitorId = getVisitorId();
  // strip HTML tags from answer text (in case it came from rich-text buttons)
  const cleanAnswer = stripHtml(answerValue);
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quiz_id: quizId, visitor_id: visitorId, event_type: eventType, step_id: stepId, answer_value: cleanAnswer, time_spent_seconds: timeSpent })
  }).catch(() => {}); // fire-and-forget
}

// ─── Componente Roteador de Quizzes por Slug (InLead Style) ──────────────────
function QuizRouter() {
  const [quizData, setQuizData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const stepStartTime = React.useRef(Date.now());

  const QUIZ_ID_KEY = 'quiz_saas_lead_quiz_id';
  const QUIZ_TIME_KEY = 'quiz_saas_lead_quiz_time';
  const STEP_KEY_PREFIX = 'quiz_saas_step_';
  const pixelInjected = React.useRef(false);

  useEffect(() => {
    const now = Date.now();
    const params = new URLSearchParams(window.location.search);
    const forceNew = params.get('novo') === '1'; // ?novo=1 simula novo lead (limpa cache)

    if (forceNew) {
      localStorage.removeItem(QUIZ_ID_KEY);
      localStorage.removeItem(QUIZ_TIME_KEY);
      // Remove ?novo=1 da URL sem recarregar
      const cleanUrl = window.location.pathname;
      window.history.replaceState(null, '', cleanUrl);
    }

    const savedQuizId = localStorage.getItem(QUIZ_ID_KEY);
    const savedTime = localStorage.getItem(QUIZ_TIME_KEY);
    const isValid = !forceNew && savedQuizId && savedTime && (now - parseInt(savedTime)) < 7 * 24 * 60 * 60 * 1000;

    // Se lead já tem um quiz atribuído nos últimos 7 dias, recarrega ESSE quiz diretamente
    if (isValid) {
      fetch(`/api/quizzes/${savedQuizId}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setQuizData(data);
            // Restaura passo salvo
            const savedStep = localStorage.getItem(STEP_KEY_PREFIX + savedQuizId);
            if (savedStep) setCurrentStep(parseInt(savedStep));
          } else {
            // Quiz removido, limpa localStorage e busca novo
            localStorage.removeItem(QUIZ_ID_KEY);
            loadNewQuiz();
          }
          setLoading(false);
        })
        .catch(() => { loadNewQuiz(); });
      return;
    }

    loadNewQuiz();
  }, []);

  const loadNewQuiz = () => {
    const pathSlug = window.location.pathname.replace(/^\//, '').replace(/\/.*$/, '');
    const endpoint = pathSlug ? `/api/route/${encodeURIComponent(pathSlug)}` : '/api/roundrobin/next';
    const now = Date.now();

    fetch(endpoint)
      .then(r => {
        if (r.status === 404) {
          // Sem quiz/Round Robin configurado — mostra tela amigável
          setError('NO_QUIZ_CONFIGURED');
          setLoading(false);
          throw new Error('no_quiz');
        }
        if (!r.ok) {
          setError('SERVER_ERROR');
          setLoading(false);
          throw new Error('server_error');
        }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        const quizId = data.quiz_id || data.id;
        // Salva o quiz ID por 7 dias (a chave para persistência)
        localStorage.setItem(QUIZ_ID_KEY, String(quizId));
        localStorage.setItem(QUIZ_TIME_KEY, now.toString());
        setQuizData(data);
        setLoading(false);
        // Dispara evento de início
        trackEvent(quizId, 'start', null, null, 0);
      })
      .catch(() => {}); // erros já tratados acima
  };

  // Trava do botão voltar
  useEffect(() => {
    if (!quizData) return;
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [quizData]);

  // Persistir passo atual a cada mudança
  useEffect(() => {
    if (quizData) {
      const quizId = quizData.quiz_id || quizData.id;
      localStorage.setItem(STEP_KEY_PREFIX + quizId, currentStep.toString());
    }
  }, [currentStep, quizData]);

  // Inject Meta Pixel once quizData is available
  useEffect(() => {
    if (!quizData || pixelInjected.current) return;
    const quizId = quizData.quiz_id || quizData.id;

    const inject = (pixelId) => {
      if (!pixelId) return;
      if (document.getElementById('meta-pixel-script')) return;
      pixelInjected.current = true;
      const s = document.createElement('script');
      s.id = 'meta-pixel-script';
      s.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`;
      document.head.appendChild(s);
    };

    // Per-quiz pixel takes priority, fallback to global
    fetch(`/api/quizzes/${quizId}/pixel`)
      .then(r => r.json())
      .then(d => {
        if (d.meta_pixel_id) { inject(d.meta_pixel_id); return; }
        return fetch('/api/integrations').then(r => r.json()).then(cfg => inject(cfg['meta_pixel_global']));
      }).catch(() => {});
  }, [quizData]);

  const handleNavigate = (nextStepId, answerText = null) => {
    const steps = quizData?.config?.steps || [];
    const idx = steps.findIndex(s => s.id === nextStepId);
    if (idx >= 0) {
      const timeSpent = Math.round((Date.now() - stepStartTime.current) / 1000);
      const quizId = quizData.quiz_id || quizData.id;
      const currentStepObj = steps[currentStep];

      // BULLETPROOF: Se answerText não veio pelo callback, busca o texto do botão
      // que aponta para nextStepId dentro dos blocos da etapa atual
      let finalAnswer = answerText;
      if (!finalAnswer && currentStepObj && currentStepObj.blocks) {
        const clickedBtn = currentStepObj.blocks.find(
          b => (b.type === 'button' || b.type === 'arrow_button') && b.nextStep === nextStepId
        );
        if (clickedBtn && clickedBtn.text) {
          finalAnswer = clickedBtn.text;
        }
      }

      // Track step completado com tempo e última resposta
      trackEvent(quizId, 'step_reached', currentStepObj?.id, finalAnswer, timeSpent);
      stepStartTime.current = Date.now();
      setCurrentStep(idx);
      if (idx === steps.length - 1) {
        trackEvent(quizId, 'finished', nextStepId, null, 0);
        // Fire Lead event on Meta Pixel if loaded
        if (window.fbq) window.fbq('track', 'Lead');
      }
    }
  };

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#020617',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:18}}>
      Carregando quiz...
    </div>
  );

  if (error === 'NO_QUIZ_CONFIGURED') return (
    <div style={{minHeight:'100vh',background:'#020617',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'white',textAlign:'center',padding:24}}>
      <div style={{fontSize:48,marginBottom:16}}>🔧</div>
      <h2 style={{fontSize:20,fontWeight:'bold',marginBottom:8}}>Quiz em configuração</h2>
      <p style={{color:'#94a3b8',fontSize:14,maxWidth:280}}>Nenhum quiz está ativo neste domínio ainda. Configure a rotação no painel administrativo.</p>
    </div>
  );

  if (error) return (
    <div style={{minHeight:'100vh',background:'#020617',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'#f87171',textAlign:'center',padding:24}}>
      <div style={{fontSize:48,marginBottom:16}}>⚠️</div>
      <h2 style={{fontSize:18,fontWeight:'bold',marginBottom:8}}>Erro ao carregar o funil</h2>
      <p style={{fontSize:13,color:'#94a3b8',marginBottom:20}}>Tente novamente ou contate o suporte.</p>
      <button onClick={() => window.location.reload()} style={{background:'#4f46e5',color:'white',border:'none',borderRadius:12,padding:'10px 24px',cursor:'pointer',fontSize:14}}>🔄 Tentar novamente</button>
    </div>
  );

  if (!quizData) return null;

  return (
    <div style={{minHeight:'100vh',width:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#000'}}>
      <div style={{width:'100%',maxWidth:'440px',minHeight:'100vh'}}>
        <QuizPreview
          config={quizData.config}
          stepIdx={currentStep}
          compact={false}
          onNavigate={handleNavigate}
        />
      </div>
    </div>
  );
}

// ─── Componente Raiz ──────────────────────────────────────────────────────────
export default function App() {
  const hostname = window.location.hostname;
  const ADMIN_HOSTS = ['localhost', '127.0.0.1'];
  const isAdminHost = ADMIN_HOSTS.some(h => hostname === h || hostname.includes('discloud.app'));
  const isAdminRoute = window.location.pathname.startsWith('/admin');

  // Funil para leads: qualquer domínio que não seja o admin
  if (!isAdminHost && !isAdminRoute) {
    return <QuizRouter />;
  }

  return <AdminApp />;
}

// ─── AdminApp: gerencia auth antes de exibir o painel ─────────────────────────
function AdminApp() {
  const [token, setToken] = useState(() => localStorage.getItem('admin_jwt') || '');

  const handleLogin = (newToken) => {
    localStorage.setItem('admin_jwt', newToken);
    setToken(newToken);
  };
  const handleLogout = () => {
    localStorage.removeItem('admin_jwt');
    setToken('');
  };

  if (!token) return <LoginPage onLogin={handleLogin} />;
  return <AdminPanel token={token} onLogout={handleLogout} />;
}

// ─── LoginPage ────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || 'Erro ao fazer login'); setLoading(false); return; }
      onLogin(data.token);
    } catch { setError('Erro de conexão'); setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 16px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img src={logoSrc} alt="Logo" style={{ height: 64, objectFit: 'contain', marginBottom: 12 }} />
        </div>

        <form onSubmit={handleSubmit} style={{ background: 'rgba(30,27,75,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20, padding: '40px 36px' }}>
          <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 22, marginBottom: 8, textAlign: 'center' }}>Painel Administrativo</h2>
          <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', marginBottom: 28 }}>Entre com suas credenciais para acessar</p>

          {/* Username */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>USUÁRIO</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6366f1' }} />
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" autoComplete="username"
                style={{ width: '100%', padding: '12px 12px 12px 40px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>SENHA</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6366f1' }} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password"
                style={{ width: '100%', padding: '12px 12px 12px 40px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          {error && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{error}</p>}

          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '13px', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: loading ? 0.7 : 1, boxShadow: '0 0 20px rgba(99,102,241,0.4)', transition: 'opacity 0.2s' }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Painel Admin (separado para respeitar Rules of Hooks) ───────────────────
function AdminPanel({ token, onLogout }) {
  const [tab, setTab] = useState('quizzes');
  const [quizzes, setQuizzes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [editingQuiz, setEditingQuiz] = useState(null);

  useEffect(() => { fetchQuizzes(); fetchAllTasks(); }, []);

  const fetchQuizzes = async () => {
    const r = await fetch(`${API}/quizzes`);
    const data = await r.json();
    setQuizzes(Array.isArray(data) ? data : []);
  };
  const fetchAllTasks = async () => {
    const r = await fetch(`${API}/tasks`); setTasks(await r.json());
  };

  if (editingQuiz !== null) {
    return (
      <QuizBuilder
        quiz={editingQuiz}
        domain={null}
        onBack={() => { setEditingQuiz(null); fetchQuizzes(); }}
      />
    );
  }

  return (
    <div className="flex h-screen bg-[#030712] text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Sidebar background glow effect */}
      <div className="fixed top-0 left-0 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>
      
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 border-r border-white/5 bg-slate-900/40 backdrop-blur-2xl flex flex-col shrink-0 relative z-10 shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
        <div className="h-20 flex items-center justify-center lg:justify-start lg:px-7 border-b border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent"></div>
          <img src={logoSrc} alt="Logo" className="max-h-12 w-auto object-contain relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
        </div>
        <nav className="flex-1 p-3 space-y-1 mt-2">
          <NavItem icon={<Palette size={20}/>} label="Quizzes & Builder" active={tab==='quizzes'} onClick={()=>setTab('quizzes')}/>
          <NavItem icon={<Shuffle size={20}/>} label="Teste A/B · Round Robin" active={tab==='abteste'} onClick={()=>setTab('abteste')}/>
          <NavItem icon={<BarChart2 size={20}/>} label="Analytics" active={tab==='analytics'} onClick={()=>setTab('analytics')}/>
          <NavItem icon={<Zap size={20}/>} label="Integrações" active={tab==='integrations'} onClick={()=>setTab('integrations')}/>
          <NavItem icon={<ListTodo size={20}/>} label="Tarefas da Equipe" active={tab==='tasks'} onClick={()=>setTab('tasks')}/>
          <NavItem icon={<Settings size={20}/>} label="Configurações" active={tab==='settings'} onClick={()=>setTab('settings')}/>
        </nav>
        <div className="p-3 border-t border-white/5">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent transition-all text-left cursor-pointer focus:outline-none">
            <LogOut size={20} className="shrink-0" />
            <span className="hidden lg:block text-sm font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Main background ambient light */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        <div className="absolute bottom-0 right-[20%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 shrink-0 bg-slate-900/40 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {tab==='quizzes'&&'Quizzes & Builder Visual'}
              {tab==='abteste'&&'Teste A/B · Round Robin'}
              {tab==='analytics'&&'Analytics & KPIs'}
              {tab==='integrations'&&'Integrações & Pixels'}
              {tab==='tasks'&&'Gestão de Tarefas'}
              {tab==='settings'&&'Configurações de Acesso'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1.5 rounded-lg text-xs font-bold leading-none bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]">PRO PLAN</span>
            <div className="relative group cursor-pointer">
              <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur group-hover:bg-indigo-500/40 transition-colors"></div>
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" className="relative w-10 h-10 rounded-full border-2 border-slate-700 group-hover:border-indigo-500/50 transition-colors shadow-lg" alt="user"/>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {tab==='quizzes' && (
            <QuizzesView
              quizzes={quizzes}
              fetchQuizzes={fetchQuizzes}
              onEdit={(q) => setEditingQuiz(q)}
              onNew={() => setEditingQuiz({
                id: null,
                title: 'Novo Quiz',
                config_json: JSON.stringify({
                  theme: { bg: '#0f172a', accent: '#6366f1', text: '#f8fafc', bgImage: '', overlay: true },
                  steps: [{ id: 'step_1', label: 'Etapa 1', blocks: [] }]
                })
              })}
            />
          )}
          {tab==='abteste' && <RoundRobinView quizzes={quizzes}/>}
          {tab==='analytics' && <AnalyticsView quizzes={quizzes}/>}
          {tab==='integrations' && <IntegrationsView quizzes={quizzes}/>}
          {tab==='tasks' && <TasksView tasks={tasks} fetchTasks={fetchAllTasks}/>}
          {tab==='settings' && <SettingsView token={token} />}
        </div>
      </main>
    </div>
  );
}

// ─── Settings View (User Management) ─────────────────────────────────────────
function SettingsView({ token }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', password: '', email: '', role: 'admin' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const hdr = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchUsers = () => fetch('/api/auth/users', { headers: hdr }).then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : []));

  useEffect(() => { fetchUsers(); }, []);

  const createUser = async () => {
    setMsg(''); setErr('');
    if (!form.username || !form.password) { setErr('Usuário e senha obrigatórios'); return; }
    const r = await fetch('/api/auth/register', { method: 'POST', headers: hdr, body: JSON.stringify(form) });
    const d = await r.json();
    if (!r.ok) { setErr(d.error); return; }
    setMsg('Usuário criado com sucesso!'); setForm({ username: '', password: '', email: '', role: 'admin' }); fetchUsers();
    setTimeout(() => setMsg(''), 3000);
  };

  const removeUser = async (id) => {
    if (!confirm('Remover este usuário?')) return;
    const r = await fetch(`/api/auth/users/${id}`, { method: 'DELETE', headers: hdr });
    if (!r.ok) { const d = await r.json(); setErr(d.error); return; }
    fetchUsers();
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center text-2xl">⚙️</div>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Configurações & Usuários</h2>
          <p className="text-sm text-slate-400 mt-0.5">Gerencie os usuários com acesso ao painel administrativo.</p>
        </div>
      </div>

      {/* Criar novo usuário */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2"><UserPlus size={17}/> Criar Novo Usuário</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={form.username} onChange={e => setForm(f => ({...f, username: e.target.value}))} placeholder="Usuário*"
            className="bg-slate-800/60 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors" />
          <input type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} placeholder="Senha*"
            className="bg-slate-800/60 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors" />
          <input value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="E-mail (opcional)"
            className="bg-slate-800/60 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors" />
          <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}
            className="bg-slate-800/60 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none cursor-pointer transition-colors">
            <option value="admin">Admin</option>
            <option value="viewer">Visualizador</option>
          </select>
        </div>
        {err && <p className="text-xs text-red-400">{err}</p>}
        {msg && <p className="text-xs text-emerald-400">{msg}</p>}
        <button onClick={createUser} className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all cursor-pointer shadow-[0_0_15px_rgba(99,102,241,0.3)]">
          Criar Usuário
        </button>
      </div>

      {/* Lista de usuários */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 space-y-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2"><Users size={17}/> Usuários Cadastrados</h3>
        {users.length === 0 ? <p className="text-slate-500 text-sm italic">Nenhum usuário cadastrado.</p> : (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-4 py-3 border-b border-slate-800/60 last:border-0">
                <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold text-sm shrink-0">
                  {u.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-100">{u.username}</p>
                  <p className="text-xs text-slate-500">{u.email || '—'} · <span className="text-indigo-400">{u.role}</span></p>
                </div>
                <button onClick={() => removeUser(u.id)} className="px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/30 text-red-400 rounded-lg border border-red-500/20 transition-colors cursor-pointer">
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── NavItem ──────────────────────────────────────────────────────────────────
function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group cursor-pointer border focus:outline-none overflow-hidden ${
        active 
          ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]' 
          : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/50 hover:border-slate-700/50'
      }`}
    >
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.6)]"></div>}
      <div className={`shrink-0 transition-transform duration-300 ${active ? 'scale-110 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'group-hover:scale-110'}`}>
        {icon}
      </div>
      <span className="hidden lg:block text-sm font-semibold tracking-wide truncate">{label}</span>
    </button>
  );
}

// ─── Quizzes View (InLead Style) ──────────────────────────────────────────────
function QuizzesView({ quizzes, fetchQuizzes, onEdit, onNew }) {
  const host = window.location.host;
  const protocol = window.location.protocol;

  const handleDelete = async (id) => {
    if (!confirm('Deletar este quiz permanentemente?')) return;
    await fetch(`${API}/quizzes/${id}`, { method: 'DELETE' });
    fetchQuizzes();
  };

  const handleDuplicate = async (quiz) => {
    if (!confirm('Deseja duplicar este quiz?')) return;
    try {
      await fetch(`${API}/quizzes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quiz.title + ' (Cópia)',
          config_json: quiz.config_json
          // slug será gerado automaticamente pelo backend baseado no título novo
        })
      });
      fetchQuizzes();
    } catch (e) {
      console.error('Erro ao duplicar:', e);
      alert('Erro ao duplicar o quiz.');
    }
  };

  const copyLink = (slug) => {
    const url = `${protocol}//${host}/${slug}`;
    navigator.clipboard.writeText(url).then(() => alert('Link copiado! ✔'));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-white">Meus Quizzes</h3>
          <p className="text-sm text-slate-500 mt-1">
            Link direto: <span className="font-mono text-indigo-400">{protocol}//{host}/<span className="text-emerald-400">nome-do-quiz</span></span>
          </p>
        </div>
        <button onClick={onNew} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] active:scale-95 text-sm cursor-pointer">
          <PlusCircle size={16}/> Novo Quiz
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {quizzes.map((q, i) => {
          const cfg = (() => { try { return JSON.parse(q.config_json || '{}'); } catch { return {}; } })();
          const stepCount = cfg.steps?.length || 0;
          const slug = q.slug || ('quiz-' + q.id);
          const quizUrl = `${protocol}//${host}/${slug}`;
          return (
            <div key={q.id} className="group relative bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 hover:border-indigo-500/40 transition-all overflow-hidden">
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-indigo-500/5 group-hover:bg-indigo-500/15 blur-xl transition-all"/>
              <div className="absolute top-3 right-3 flex gap-2">
                <button onClick={() => onEdit(q)} aria-label="Editar" className="w-7 h-7 bg-slate-700 hover:bg-indigo-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer"><Edit3 size={13}/></button>
                <button onClick={() => handleDuplicate(q)} aria-label="Duplicar" className="w-7 h-7 bg-slate-700 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer"><Copy size={13}/></button>
                <button onClick={() => handleDelete(q.id)} aria-label="Deletar" className="w-7 h-7 bg-slate-700 hover:bg-red-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer"><Trash2 size={13}/></button>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-lg" style={{background: (cfg.theme?.accent||'#6366f1')+'20', border: `1px solid ${cfg.theme?.accent||'#6366f1'}30`}}>
                {['🧠','🎯','🔥','💡','⚡'][i % 5]}
              </div>
              <h4 className="font-semibold text-slate-100 mb-1">{q.title}</h4>
              <p className="text-xs text-slate-500 mb-3">{stepCount} etapa{stepCount !== 1 ? 's' : ''}</p>

              {/* Link compartilhável */}
              <div className="flex items-center gap-2 p-2.5 bg-slate-900/60 rounded-xl border border-slate-700/50 mb-4">
                <span className="text-xs font-mono text-emerald-400 truncate flex-1" title={quizUrl}>/{slug}</span>
                <button onClick={() => copyLink(slug)} className="shrink-0 px-2 py-1 text-xs bg-indigo-600/30 hover:bg-indigo-600/60 text-indigo-300 rounded-lg transition-colors cursor-pointer">Copiar</button>
              </div>

              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${q.is_active ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-slate-400 bg-slate-700/30 border-slate-600/20'}`}>
                  {q.is_active ? '🟢 Ativo' : '⚫ Inativo'}
                </span>
                <a href={quizUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-white flex items-center gap-1 transition-colors">Abrir <ArrowRight size={11}/></a>
              </div>
            </div>
          );
        })}
        {quizzes.length === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-700/50 rounded-2xl">
            <Palette size={40} className="text-slate-600 mb-4"/>
            <p className="text-slate-400 font-medium">Nenhum quiz criado ainda</p>
            <p className="text-sm text-slate-600 mt-1">Clique em &quot;Novo Quiz&quot; para começar</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Round Robin A/B Test View ────────────────────────────────────────────────
function RoundRobinView({ quizzes }) {
  const [rrConfig, setRrConfig] = useState({ quiz_ids: [], is_active: true });
  const [saved, setSaved] = useState(false);
  const host = window.location.host;
  const protocol = window.location.protocol;

  useEffect(() => {
    fetch(`${API}/roundrobin`)
      .then(r => r.json())
      .then(d => setRrConfig({ quiz_ids: d.quiz_ids || [], is_active: d.is_active !== false }))
      .catch(() => {});
  }, []);

  const isSelected = (id) => rrConfig.quiz_ids.includes(id);

  const toggleQuiz = (id) => {
    setRrConfig(c => ({
      ...c,
      quiz_ids: c.quiz_ids.includes(id)
        ? c.quiz_ids.filter(x => x !== id)
        : [...c.quiz_ids, id]
    }));
  };

  const moveUp = (id) => {
    const ids = [...rrConfig.quiz_ids];
    const idx = ids.indexOf(id);
    if (idx <= 0) return;
    [ids[idx-1], ids[idx]] = [ids[idx], ids[idx-1]];
    setRrConfig(c => ({...c, quiz_ids: ids}));
  };

  const moveDown = (id) => {
    const ids = [...rrConfig.quiz_ids];
    const idx = ids.indexOf(id);
    if (idx < 0 || idx >= ids.length - 1) return;
    [ids[idx], ids[idx+1]] = [ids[idx+1], ids[idx]];
    setRrConfig(c => ({...c, quiz_ids: ids}));
  };

  const save = async () => {
    // Apenas salva IDs de quizzes que realmente existem ainda
    const validIds = rrConfig.quiz_ids.filter(id => quizzes.some(q => q.id === id));
    
    await fetch(`${API}/roundrobin`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ ...rrConfig, quiz_ids: validIds })
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const orderedSelected = rrConfig.quiz_ids
    .map(id => quizzes.find(q => q.id === id))
    .filter(Boolean);
  const unselected = quizzes.filter(q => !rrConfig.quiz_ids.includes(q.id));

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div className="p-5 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-500/20 rounded-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <Shuffle size={20} className="text-indigo-400"/>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Rotação Round Robin</h3>
            <p className="text-xs text-slate-400">Quem acessar <span className="font-mono text-indigo-300">{protocol}//{host}/</span> (sem slug) vê quizzes em rotação</p>
          </div>
          {/* Toggle ativo */}
          <button onClick={() => setRrConfig(c => ({...c, is_active: !c.is_active}))} className="ml-auto cursor-pointer">
            {rrConfig.is_active
              ? <ToggleRight size={34} className="text-emerald-400"/>
              : <ToggleLeft size={34} className="text-slate-600"/>}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          💡 Os links diretos <span className="font-mono text-emerald-400">/slug</span> continuam funcionando normalmente. O Round Robin só aplica ao domínio raiz.
        </p>
      </div>

      {/* Quizzes selecionados (ordem de rotação) */}
      <div>
        <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center font-bold">{orderedSelected.length}</span>
          Quizzes na rotação (em ordem)
        </h4>
        <div className="space-y-2">
          {orderedSelected.map((q, i) => (
            <div key={q.id} className="flex items-center gap-3 p-3.5 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
              <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center font-bold shrink-0">{i+1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{q.title}</p>
                <p className="text-xs font-mono text-emerald-400">/{q.slug || 'quiz-'+q.id}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => moveUp(q.id)} disabled={i===0} className="w-6 h-6 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30 flex items-center justify-center text-slate-300 cursor-pointer text-xs">↑</button>
                <button onClick={() => moveDown(q.id)} disabled={i===orderedSelected.length-1} className="w-6 h-6 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30 flex items-center justify-center text-slate-300 cursor-pointer text-xs">↓</button>
                <button onClick={() => toggleQuiz(q.id)} className="w-6 h-6 rounded-lg bg-red-500/10 hover:bg-red-500/30 flex items-center justify-center text-red-400 cursor-pointer">✕</button>
              </div>
            </div>
          ))}
          {orderedSelected.length === 0 && (
            <p className="text-sm text-slate-500 py-4 text-center border border-dashed border-slate-700 rounded-xl">Nenhum quiz selecionado ainda. Adicione abaixo ↓</p>
          )}
        </div>
      </div>

      {/* Quizzes disponíveis para adicionar */}
      {unselected.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-3">Adicionar à rotação</h4>
          <div className="space-y-2">
            {unselected.map(q => (
              <div key={q.id} className="flex items-center gap-3 p-3.5 bg-slate-800/30 border border-slate-700/40 rounded-xl hover:border-indigo-500/30 transition-all">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-300 truncate">{q.title}</p>
                  <p className="text-xs font-mono text-slate-500">/{q.slug || 'quiz-'+q.id}</p>
                </div>
                <button onClick={() => toggleQuiz(q.id)} className="shrink-0 px-3 py-1.5 text-xs bg-indigo-600/20 hover:bg-indigo-600/50 text-indigo-300 hover:text-white rounded-lg border border-indigo-500/20 transition-colors cursor-pointer">
                  + Adicionar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botão salvar */}
      <button onClick={save} className={`w-full py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer ${saved ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]'}`}>
        {saved ? '✓ Configuração salva!' : 'Salvar Configuração de Round Robin'}
      </button>
    </div>
  );
}

// ─── Integrations View ────────────────────────────────────────────────────────
function IntegrationsView({ quizzes }) {
  const [globalPixel, setGlobalPixel] = useState('');
  const [quizPixels, setQuizPixels] = useState({});
  const [saved, setSaved] = useState({});

  useEffect(() => {
    fetch('/api/integrations').then(r => r.json()).then(data => {
      setGlobalPixel(data['meta_pixel_global'] || '');
    });
    // load per-quiz pixels
    quizzes.forEach(q => {
      fetch(`/api/quizzes/${q.id}/pixel`).then(r => r.json()).then(d => {
        setQuizPixels(prev => ({ ...prev, [q.id]: d.meta_pixel_id || '' }));
      });
    });
  }, [quizzes]);

  const saveGlobal = async () => {
    await fetch('/api/integrations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'meta_pixel_global', value: globalPixel })
    });
    setSaved(s => ({ ...s, global: true }));
    setTimeout(() => setSaved(s => ({ ...s, global: false })), 2000);
  };

  const saveQuizPixel = async (quizId) => {
    await fetch(`/api/quizzes/${quizId}/pixel`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meta_pixel_id: quizPixels[quizId] || null })
    });
    setSaved(s => ({ ...s, [quizId]: true }));
    setTimeout(() => setSaved(s => ({ ...s, [quizId]: false })), 2000);
  };

  return (
    <div className="space-y-8 max-w-3xl">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/20 flex items-center justify-center text-2xl">⚡</div>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Integrações</h2>
          <p className="text-sm text-slate-400 mt-0.5">Configure o Pixel do Meta Ads globalmente ou por quiz individual.</p>
        </div>
      </div>

      {/* Card: Pixel Global (Round Robin) */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="#1877F2" className="w-5 h-5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Pixel do Meta Ads — Global (Round Robin)</h3>
            <p className="text-xs text-slate-400 mt-0.5">Este pixel será disparado em <span className="text-indigo-400 font-semibold">todos os quizzes</span> distribuídos pelo Round Robin. Ideal para rastrear toda a base de leads.</p>
          </div>
        </div>
        <div className="flex gap-3 mt-2">
          <input
            value={globalPixel}
            onChange={e => setGlobalPixel(e.target.value)}
            placeholder="Ex: 1234567890123456"
            className="flex-1 bg-slate-800/60 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-white font-mono outline-none transition-colors"
          />
          <button onClick={saveGlobal}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer shrink-0 ${saved.global ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'}`}>
            {saved.global ? '✓ Salvo!' : 'Salvar'}
          </button>
        </div>
        {globalPixel && (
          <p className="text-xs text-emerald-400 flex items-center gap-1.5">
            <span>✓</span> Pixel <span className="font-mono">{globalPixel}</span> configurado — disparará em todos os funis do Round Robin.
          </p>
        )}
      </div>

      {/* Card: Pixels Individuais por Quiz */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="#1877F2" className="w-5 h-5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Pixel por Quiz Individual</h3>
            <p className="text-xs text-slate-400 mt-0.5">Configure um Pixel <span className="text-indigo-400 font-semibold">específico</span> por quiz. Tem prioridade sobre o Pixel Global quando preenchido.</p>
          </div>
        </div>

        {quizzes.length === 0 ? (
          <p className="text-slate-500 text-sm italic">Nenhum quiz criado ainda.</p>
        ) : (
          <div className="space-y-3">
            {quizzes.map(q => (
              <div key={q.id} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-slate-800/60 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-100 truncate">{q.title}</p>
                  <p className="text-xs font-mono text-slate-500">/{q.slug || 'quiz-' + q.id}</p>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    value={quizPixels[q.id] || ''}
                    onChange={e => setQuizPixels(prev => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="ID do Pixel (opcional)"
                    className="w-52 bg-slate-800/60 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none transition-colors"
                  />
                  <button onClick={() => saveQuizPixel(q.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${saved[q.id] ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
                    {saved[q.id] ? '✓' : 'Salvar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 flex gap-3">
        <span className="text-xl shrink-0">ℹ️</span>
        <div className="text-sm text-slate-300 space-y-1">
          <p className="font-semibold text-amber-400">Como funciona o disparo do Pixel?</p>
          <p>• O evento <code className="bg-black/30 px-1 rounded text-xs">PageView</code> é disparado automaticamente quando o lead acessa o quiz.</p>
          <p>• O evento <code className="bg-black/30 px-1 rounded text-xs">Lead</code> é disparado quando o lead conclui o funil (chega na tela de resultado).</p>
          <p>• Se um quiz tiver seu próprio Pixel configurado, ele substitui o Global naquele funil específico.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Analytics View ───────────────────────────────────────────────────────────
function AnalyticsView({ quizzes }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizDetail, setQuizDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [expandedLead, setExpandedLead] = useState(null);

  useEffect(() => {
    fetch('/api/analytics/overview')
      .then(r => r.json())
      .then(data => { setMetrics(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const loadQuizDetail = (quiz) => {
    setSelectedQuiz(quiz);
    setDetailLoading(true);
    setLeadsLoading(true);
    setExpandedLead(null);
    
    Promise.all([
      fetch(`/api/analytics/quiz/${quiz.id}`).then(r => r.json()),
      fetch(`/api/analytics/quiz/${quiz.id}/leads`).then(r => r.json()),
      fetch(`/api/quizzes/${quiz.id}`).then(r => r.json())
    ])
    .then(([detailData, leadsData, quizData]) => {
      // Build a map of step_id -> Question text from config
      const stepNaming = {};
      try {
        if (quizData && quizData.config) {
          const config = typeof quizData.config === 'string' ? JSON.parse(quizData.config) : quizData.config;
          if (config.steps) {
            config.steps.forEach(s => {
              const headerBlock = s.blocks?.find(b => b.type === 'heading' || b.type === 'text');
              if (headerBlock && headerBlock.text) {
                // Strip HTML from rich text
                const tmp = document.createElement("DIV");
                tmp.innerHTML = headerBlock.text;
                stepNaming[s.id] = (tmp.textContent || tmp.innerText || "").trim() || s.label;
              } else {
                stepNaming[s.id] = s.label || s.id;
              }
            });
          }
        }
      } catch (e) {
        console.error("Failed to parse quiz config for analytics naming", e);
      }

      setQuizDetail({ ...detailData, stepNaming });
      setLeads(leadsData);
      setDetailLoading(false);
      setLeadsLoading(false);
    })
    .catch(() => {
      setDetailLoading(false);
      setLeadsLoading(false);
    });
  };

  const fmt = (s) => {
    if (!s || s === 0) return '0s';
    if (s < 60) return `${Number(s.toFixed(1))}s`;
    const m = Math.floor(s / 60);
    const secs = Number((s % 60).toFixed(1));
    return `${m}m ${secs > 0 ? secs + 's' : ''}`;
  };

  if (loading) return <div className="text-slate-400 p-8 flex justify-center mt-20 animate-pulse">⏳ Carregando métricas globais...</div>;
  if (!metrics) return <div className="text-red-400 p-8 flex justify-center mt-20">Erro ao carregar o Dashboard</div>;

  // ─── Drill-Down de um Quiz Específico ──────────────────────────────────────
  if (selectedQuiz) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedQuiz(null); setQuizDetail(null); }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors cursor-pointer flex items-center gap-2">
            ← Voltar para Overview
          </button>
          <div>
            <h2 className="text-xl font-bold text-white">{selectedQuiz.title}</h2>
            <p className="text-sm text-slate-400 font-mono">/{selectedQuiz.slug || 'quiz-' + selectedQuiz.id}</p>
          </div>
        </div>

        {detailLoading ? (
          <div className="text-slate-400 text-center py-16 animate-pulse">Carregando dados detalhados...</div>
        ) : quizDetail ? (
          <>
            {/* Resumo do funil */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total de Leads', value: quizDetail.total_starts, color: 'indigo', icon: <Users size={28} className="text-indigo-400" />, glow: 'shadow-[0_0_15px_rgba(99,102,241,0.2)]' },
                { label: 'Concluíram', value: quizDetail.total_finished, color: 'emerald', icon: <Trophy size={28} className="text-emerald-400" />, glow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]' },
                { label: 'Conversão', value: `${quizDetail.conversion_rate}%`, color: 'cyan', icon: <Zap size={28} className="text-cyan-400" />, glow: 'shadow-[0_0_15px_rgba(34,211,238,0.2)]' },
              ].map((s, i) => (
                <div key={i} className={`relative overflow-hidden bg-slate-900/60 backdrop-blur-xl border border-${s.color}-500/20 rounded-2xl p-6 ${s.glow} transition-all hover:border-${s.color}-500/40 hover:-translate-y-1`}>
                  <div className={`absolute -right-4 -top-4 w-24 h-24 bg-${s.color}-500/10 rounded-full blur-2xl`}></div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`p-3 bg-slate-950/50 rounded-xl border border-${s.color}-500/10 shrink-0`}>
                      {s.icon}
                    </div>
                    <p className={`text-sm font-semibold tracking-wider text-${s.color}-400/80 uppercase`}>{s.label}</p>
                  </div>
                  <p className="text-4xl font-black text-white px-1 tracking-tight">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Funil por Etapa */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 shadow-2xl rounded-3xl p-8 mt-6">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                  <BarChart2 size={24} className="text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Performance por Funil (Ranking)</h3>
                  <p className="text-sm text-slate-400 mt-0.5">Clique em um quiz para ver o detalhamento completo por etapa</p>
                </div>
              </div>
              {quizDetail.step_funnel.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl">
                  <Rocket size={32} className="text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm font-medium">Nenhum dado de funil registrado ainda.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {quizDetail.step_funnel.map((step, i) => {
                    const maxVisitors = quizDetail.step_funnel[0]?.visitors || 1;
                    const pct = Math.round((step.visitors / maxVisitors) * 100);
                    const answers = quizDetail.answers_by_step?.[step.step_id] || [];
                    const topAnswer = answers[0];
                    return (
                      <div key={step.step_id} className="group flex flex-col gap-3 p-4 rounded-2xl hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/5 cursor-default relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] rounded-full group-hover:bg-indigo-500/10 transition-colors"></div>
                        <div className="flex items-center gap-4 relative z-10 w-full">
                          <div className="w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700/50 text-slate-300 text-sm flex items-center justify-center font-bold shrink-0 shadow-inner">
                            {i+1}
                          </div>
                          
                          <div className="flex-1 min-w-0 pr-4">
                            <h4 className="text-base font-semibold text-slate-200 truncate flex items-center gap-2">
                              <span className="font-mono text-xs text-indigo-400/70 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{step.step_id}</span>
                              {quizDetail.stepNaming?.[step.step_id] || ''}
                            </h4>
                          </div>

                          <div className="flex items-center gap-6 shrink-0 ml-auto">
                            <div className="flex items-center gap-2 text-xs bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-800 text-cyan-400 font-semibold shadow-inner">
                              <Clock size={14} className="opacity-70" />
                              {fmt(step.avg_time_seconds)}
                            </div>
                            
                            <div className="text-right w-24">
                              <span className="text-sm font-bold text-white bg-slate-800/80 px-3 py-1 rounded-md border border-slate-700">{step.visitors} leads</span>
                            </div>
                            
                            <div className="flex items-center gap-3 w-40 justify-end">
                              <span className="text-sm font-bold text-indigo-300 w-10 text-right">{pct}%</span>
                              <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner flex-shrink-0">
                                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 origin-left transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Resposta mais popular desta etapa */}
                        {topAnswer && (
                          <div className="ml-12 flex flex-wrap gap-2 pt-1 relative z-10 w-[calc(100%-3rem)]">
                            {answers.slice(0, 4).map((a, ai) => (
                              <span key={ai} className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md font-medium whitespace-nowrap overflow-hidden text-ellipsis ${ai === 0 ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-[0_0_8px_rgba(99,102,241,0.15)] ring-1 ring-white/5' : 'bg-slate-800/50 border border-slate-700/50 text-slate-400'}`}>
                                {ai === 0 && <Trophy size={10} className="text-indigo-400" />}
                                <span className="truncate max-w-[150px]">{a.answer}</span>
                                <span className="opacity-60 bg-black/20 px-1 rounded ml-1">{a.count}x</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Lista de Leads Individual (Drill-down) */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 shadow-2xl rounded-3xl p-8 mt-6">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <UserCircle2 size={24} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Lista de Leads (Jornada)</h3>
                    <p className="text-sm text-slate-400 mt-0.5">Clique em um lead para ver o caminho exato que ele percorreu</p>
                  </div>
                </div>
              </div>
              
              {leadsLoading ? (
                 <div className="flex justify-center py-12">
                   <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
                 </div>
              ) : leads.length === 0 ? (
                 <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl">
                   <Users size={32} className="text-slate-600 mx-auto mb-3" />
                   <p className="text-slate-500 text-sm font-medium">Nenhum evento detalhado de lead encontrado.</p>
                 </div>
              ) : (
                <div className="space-y-4">
                  {leads.map((lead, idx) => {
                    const isExpanded = expandedLead === lead.visitor_id;
                    const startTime = new Date(lead.start_time).toLocaleString('pt-BR');
                    
                    return (
                      <div key={lead.visitor_id} className={`border ${isExpanded ? 'border-indigo-500/30 bg-slate-800/40 shadow-xl' : 'border-slate-800/80 bg-slate-900/50 hover:bg-slate-800/40 hover:border-white/10'} rounded-2xl overflow-hidden transition-all duration-300`}>
                        {/* Header do Accordion */}
                        <div 
                          className="flex items-center gap-5 p-5 cursor-pointer"
                          onClick={() => setExpandedLead(isExpanded ? null : lead.visitor_id)}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 transition-colors ${isExpanded ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'bg-slate-800 text-slate-400'}`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-bold text-slate-200 truncate group-hover:text-white transition-colors">
                              Lead <span className="font-mono text-indigo-300">{lead.visitor_id.substring(0,8)}</span>
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5"><Calendar size={12}/> {startTime}</p>
                          </div>
                          
                          <div className="flex items-center gap-4 shrink-0">
                            {lead.finished ? (
                              <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 shadow-inner">
                                <CheckCircle2Icon size={14} /> Concluído
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20 shadow-inner">
                                <Flag size={14} /> Drop-off
                              </span>
                            )}
                            <div className="flex items-center gap-2 text-xs bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-800 text-cyan-400 font-semibold shadow-inner w-24 justify-center">
                              <Clock size={14} className="opacity-70" />
                              {fmt(lead.total_time)}
                            </div>
                            <div className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </div>
                          </div>
                        </div>
                        
                        {/* Corpo Expandido - Jornada */}
                        {isExpanded && (
                          <div className="p-6 border-t border-indigo-500/10 bg-slate-950/50 space-y-4">
                            <h4 className="text-xs font-bold text-indigo-400/80 uppercase tracking-wider mb-4 flex items-center gap-2"><Layers size={14} /> Histórico da Jornada</h4>
                            
                            {(!lead.events || lead.events.length === 0) ? (
                              <div className="bg-slate-900/80 rounded-xl p-6 text-center border border-white/5">
                                <p className="text-sm text-slate-500 italic">Lead visualizou a tela mas não percorreu nenhuma pergunta antes do tempo acabar.</p>
                              </div>
                            ) : (
                              <div className="relative border-l border-indigo-500/30 ml-[23px] space-y-6 pb-2">
                                {lead.events.map((ev, sIdx) => {
                                  const evTime = new Date(ev.timestamp).toLocaleTimeString('pt-BR');
                                  return (
                                    <div key={sIdx} className="relative pl-8 group">
                                      {/* Timeline Glowing Dot */}
                                      <div className="absolute -left-[5px] top-1.5 w-[9px] h-[9px] rounded-full bg-slate-950 border-2 border-indigo-400 group-hover:scale-125 group-hover:bg-indigo-400 transition-all shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                                      
                                      <div className="bg-slate-900/80 rounded-xl border border-white/5 p-4 shadow-sm group-hover:border-indigo-500/20 transition-colors relative top-[-6px]">
                                        <div className="flex items-center justify-between mb-3">
                                          <p className="text-[13px] font-bold text-slate-300 flex items-center gap-2">
                                            <span className="font-mono text-xs text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">{ev.step_id}</span>
                                            {quizDetail?.stepNaming?.[ev.step_id] || ''}
                                          </p>
                                          <span className="text-[11px] font-mono text-slate-500 bg-slate-950/50 px-2 py-1 rounded-md border border-slate-800">{evTime}</span>
                                        </div>
                                        
                                        {ev.answers && Object.keys(ev.answers).length > 0 && (
                                          <div className="bg-slate-950/80 rounded-lg p-3 border border-slate-800/80 mt-2 space-y-2">
                                            {Object.entries(ev.answers).map(([qId, ansContent], i) => (
                                              <div key={i} className="text-sm">
                                                <div className="text-[10px] font-bold text-slate-500 mb-1 tracking-wider uppercase">Selecionou</div>
                                                <div className="flex items-start gap-2">
                                                  <Trophy size={14} className="text-indigo-400/70 mt-0.5 shrink-0" />
                                                  <span className="font-medium text-indigo-200">{String(ansContent)}</span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                                
                                {lead.finished && (
                                  <div className="relative pl-8 mt-8">
                                    <div className="absolute -left-[14px] top-1 w-7 h-7 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                                      <CheckCircle2Icon size={14} className="text-emerald-400" />
                                    </div>
                                    <div className="bg-emerald-500/5 rounded-xl border border-emerald-500/20 p-4 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                                      <p className="text-emerald-400 font-bold text-sm tracking-wide">FINALIZOU O QUIZ E VIROU LEAD 🏆</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-slate-500 text-sm text-center py-12">Nenhum dado para este quiz ainda.</p>
        )}
      </div>
    );
  }

  // ─── Overview Geral ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { 
            icon: <Users size={28}/>, label: 'Total de Leads', value: metrics.overview.total_leads, sub: 'Visitaram um funil',
            cardClass: 'border-indigo-500/20 hover:border-indigo-500/40',
            blobClass: 'bg-indigo-500/10 group-hover:bg-indigo-500/20',
            iconBox: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
          },
          { 
            icon: <TrendingUp size={28}/>, label: 'Conversão Média', value: `${metrics.overview.conversion_rate}%`, sub: 'Chegaram ao final',
            cardClass: 'border-emerald-500/20 hover:border-emerald-500/40',
            blobClass: 'bg-emerald-500/10 group-hover:bg-emerald-500/20',
            iconBox: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
          },
          { 
            icon: <Target size={28}/>, label: 'Quizzes Ativos', value: quizzes.filter(q=>q.is_active).length, sub: `de ${quizzes.length} total`,
            cardClass: 'border-cyan-500/20 hover:border-cyan-500/40',
            blobClass: 'bg-cyan-500/10 group-hover:bg-cyan-500/20',
            iconBox: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
          },
        ].map((s,i) => (
          <div key={i} className={`bg-slate-900/60 backdrop-blur-xl border rounded-3xl p-6 shadow-[0_0_20px_rgba(0,0,0,0.2)] relative overflow-hidden group transition-all hover:-translate-y-1 ${s.cardClass}`}>
            <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl transition-all duration-700 ${s.blobClass}`}></div>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 border group-hover:scale-110 transition-transform ${s.iconBox}`}>{s.icon}</div>
            <p className="text-3xl font-bold text-white mb-1 tracking-tight">{s.value}</p>
            <p className="text-sm font-semibold text-slate-300">{s.label}</p>
            <p className="text-xs text-slate-500 mt-1 font-medium">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 shadow-2xl rounded-3xl p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
            <BarChart2 size={24} className="text-indigo-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Performance por Funil (Ranking)</h3>
            <p className="text-sm text-slate-400 mt-0.5">Clique em um quiz para ver o detalhamento completo por etapa</p>
          </div>
        </div>
        
        <div className="space-y-3">
          {metrics.quizzes.map((q, i) => {
            const rate = q.conversion_rate;
            return (
              <div key={q.id} onClick={() => loadQuizDetail(q)}
                className="group flex items-center gap-4 py-4 px-5 bg-slate-800/20 border border-transparent hover:border-white/5 hover:bg-slate-800/40 rounded-2xl cursor-pointer transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] rounded-full group-hover:bg-indigo-500/10 transition-colors"></div>
                
                <div className="w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700/50 text-slate-300 text-sm flex items-center justify-center font-bold shrink-0 shadow-inner relative z-10">
                  {i+1}
                </div>
                
                <div className="flex-1 min-w-0 pr-4 relative z-10">
                  <h4 className="text-base font-semibold text-slate-200 truncate group-hover:text-white transition-colors">
                    {q.title}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono mt-0.5 opacity-70">/ {q.id}</p>
                </div>
                
                <div className="flex items-center gap-6 shrink-0 relative z-10 ml-auto">
                  <div className="flex items-center gap-2 text-xs bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-800 text-cyan-400 font-semibold shadow-inner hidden md:flex">
                    <Clock size={14} className="opacity-70" />
                    {fmt(q.avg_time_seconds)}
                  </div>
                  
                  <div className="text-right w-24">
                    <span className="text-sm font-bold text-white bg-slate-800/80 px-3 py-1 rounded-md border border-slate-700">{q.starts} leads</span>
                  </div>
                  
                  <div className="flex items-center gap-3 w-40 justify-end">
                    <span className="text-sm font-bold text-indigo-300 w-10 text-right">{rate}%</span>
                    <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner flex-shrink-0">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 origin-left transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{width: `${rate}%`}} />
                    </div>
                  </div>
                  
                  <span className="w-6 text-slate-600 group-hover:text-indigo-400 transition-colors text-sm shrink-0 flex justify-end">
                    <MoveRight size={18} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {metrics.quizzes.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl">
            <Rocket size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">Nenhum evento registrado ainda. Rode o quiz para ver métricas.</p>
          </div>
        )}
      </div>
    </div>
  );
}


// ─── Tasks View (Kanban) ──────────────────────────────────────────────────────
const STATUSES = [
  { key: 'todo', label: '📋 A Fazer', color: 'slate' },
  { key: 'in_progress', label: '⚡ Em Progresso', color: 'blue' },
  { key: 'done', label: '✅ Concluído', color: 'emerald' },
];
const PRIORITIES = [
  { key: 'high', label: 'Alta', color: 'red' },
  { key: 'medium', label: 'Média', color: 'yellow' },
  { key: 'low', label: 'Baixa', color: 'slate' },
];

function TasksView({ tasks, fetchTasks }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', status: 'todo', priority: 'medium' });

  const create = async () => {
    if (!form.title) return;
    await fetch(`${API}/tasks`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(form) });
    setForm({ title: '', description: '', status: 'todo', priority: 'medium' });
    setShowForm(false); fetchTasks();
  };
  const changeStatus = async (task, status) => {
    await fetch(`${API}/tasks/${task.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ ...task, status }) });
    fetchTasks();
  };
  const del = async (id) => { await fetch(`${API}/tasks/${id}`, { method: 'DELETE' }); fetchTasks(); };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-white">Gestão de Tarefas da Equipe</h3>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] cursor-pointer focus:outline-none">
          <PlusCircle size={15}/> Nova Tarefa
        </button>
      </div>

      {showForm && (
        <div className="p-5 bg-slate-800/50 border border-slate-700/50 rounded-2xl space-y-3 max-w-xl">
          <input value={form.title} onChange={e => setForm(f=>({...f, title:e.target.value}))} placeholder="Título da tarefa..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500 transition-colors"/>
          <textarea value={form.description} onChange={e => setForm(f=>({...f, description:e.target.value}))} placeholder="Descrição (opcional)..." rows={2}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500 resize-none transition-colors"/>
          <div className="flex gap-3">
            <select value={form.priority} onChange={e => setForm(f=>({...f, priority:e.target.value}))}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none cursor-pointer">
              {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            <button onClick={create} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer focus:outline-none">Criar</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {STATUSES.map(s => (
          <div key={s.key} className="bg-slate-800/30 border border-slate-700/40 rounded-2xl p-4 space-y-3 min-h-48">
            <h4 className="text-sm font-semibold text-slate-300 mb-4">{s.label} <span className="ml-1 text-xs text-slate-500">({tasks.filter(t=>t.status===s.key).length})</span></h4>
            {tasks.filter(t => t.status === s.key).map(t => {
              const prio = PRIORITIES.find(p => p.key === t.priority);
              return (
                <div key={t.id} className="p-4 bg-slate-900/70 border border-slate-700/50 rounded-xl space-y-2 group hover:border-slate-600 transition-all">
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-sm font-medium text-slate-200 leading-snug">{t.title}</p>
                    <button onClick={() => del(t.id)} aria-label="Deletar" className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all shrink-0 cursor-pointer"><Trash2 size={13}/></button>
                  </div>
                  {t.description && <p className="text-xs text-slate-500 leading-relaxed">{t.description}</p>}
                  <div className="flex items-center justify-between pt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full bg-${prio?.color}-500/10 text-${prio?.color}-400 border border-${prio?.color}-500/20 font-medium`}>{prio?.label}</span>
                    <div className="flex gap-1">
                      {STATUSES.filter(x => x.key !== s.key).map(ns => (
                        <button key={ns.key} onClick={() => changeStatus(t, ns.key)}
                          className="text-xs px-2 py-0.5 rounded-lg bg-slate-700/40 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer">→{ns.label.split(' ')[1]}</button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
