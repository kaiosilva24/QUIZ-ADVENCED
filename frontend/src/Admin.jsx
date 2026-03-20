import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, Edit3, Trash2, ArrowRight, X, ChevronLeft, ChevronDown, Save, GripVertical, Settings2, Home, Palette, 
  MessageCircle, BarChart2, MousePointerClick, CheckSquare, AlignLeft, ImageIcon, CheckCircle, 
  Users, TrendingUp, Shuffle, ToggleLeft, ToggleRight, LayoutTemplate, Layers, Eye, EyeOff, Plus, PlayCircle, 
  Video as VideoIcon, Volume2, Copy, ListTodo, Settings, CheckCircle2, Zap, LogOut, UserPlus, Lock, User
} from 'lucide-react';
import QuizBuilder from './QuizBuilder';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const logoSrc = '/logo3.svg';
const API = '/api';

export default function AdminModule() {
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
        <div style={{ textAlign: 'center', marginBottom: 40, display: 'flex', justifyContent: 'center' }}>
          <img src={logoSrc} alt="Logo" style={{ height: 64, objectFit: 'contain', display: 'block', margin: '0 auto', marginBottom: 12 }} />
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

  const fetchQuizzes = async () => {
    const r = await fetch(`${API}/quizzes`);
    const data = await r.json();
    setQuizzes(Array.isArray(data) ? data : []);
  };
  const fetchAllTasks = async () => {
    const r = await fetch(`${API}/tasks`); setTasks(await r.json());
  };

  useEffect(() => { fetchQuizzes(); fetchAllTasks(); }, []);

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
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 border-r border-white/5 bg-slate-900/60 backdrop-blur-xl flex flex-col shrink-0">
        <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-white/5">
          <img src={logoSrc} alt="Logo" className="h-10 object-contain" />
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
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 shrink-0 bg-slate-900/30 backdrop-blur-md">
          <h2 className="text-lg font-semibold text-slate-100">
            {tab==='quizzes'&&'Quizzes & Builder Visual'}
            {tab==='abteste'&&'Teste A/B · Round Robin'}
            {tab==='analytics'&&'Analytics & Métricas'}
            {tab==='integrations'&&'Integrações & Pixels'}
            {tab==='tasks'&&'Gestão de Tarefas'}
            {tab==='settings'&&'Configurações & Usuários'}
          </h2>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">PRO</span>
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" className="w-8 h-8 rounded-full border border-slate-700" alt="user"/>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {tab==='quizzes' && (
            <QuizzesView
              quizzes={quizzes}
              fetchQuizzes={fetchQuizzes}
              onEdit={(q) => setEditingQuiz(q)}
              onNew={() => setEditingQuiz({
                id: null,
                title: 'Novo Quiz',
                slug: '',
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
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left cursor-pointer focus:outline-none ${active ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[inset_0_0_12px_rgba(99,102,241,0.08)]' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
      <span className="shrink-0">{icon}</span>
      <span className="hidden lg:block text-sm font-medium truncate">{label}</span>
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
      const res = await fetch(`/api/quizzes/${quiz.id}`);
      if (!res.ok) throw new Error('Falha ao obter dados completos');
      const data = await res.json();
      await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title + ' (Cópia)',
          config_json: JSON.stringify(data.config || {})
        })
      });
      fetchQuizzes();
    } catch (e) {
      console.error('Erro ao duplicar:', e);
      alert('Erro ao duplicar o quiz.');
    }
  };

  const handleEdit = async (quiz) => {
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}`);
      if (!res.ok) throw new Error('Falha');
      const data = await res.json();
      onEdit({
        ...quiz,
        config_json: JSON.stringify(data.config || {})
      });
    } catch {
      alert('Erro ao carregar os dados do quiz para edição.');
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
                <button onClick={() => handleEdit(q)} aria-label="Editar" className="w-7 h-7 bg-slate-700 hover:bg-indigo-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer"><Edit3 size={13}/></button>
                <button onClick={() => handleDuplicate(q)} aria-label="Duplicar" className="w-7 h-7 bg-slate-700 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer"><Copy size={13}/></button>
                <button onClick={() => handleDelete(q.id)} aria-label="Deletar" className="w-7 h-7 bg-slate-700 hover:bg-red-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer"><Trash2 size={13}/></button>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-lg" style={{background: (cfg.theme?.accent||'#6366f1')+'20', border: `1px solid ${cfg.theme?.accent||'#6366f1'}30`}}>
                {['🧠','🎯','🔥','💡','⚡'][i % 5]}
              </div>
              <h4 className="font-semibold text-slate-100 mb-1">{q.title}</h4>
              <p className="text-xs text-slate-500 mb-3">{q.slug || ''}</p>

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

// ─── Analytics View (Luxury BI Dashboard) ───────────────────────────────────────────────────────────
function AnalyticsView({ quizzes }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [mediaMetrics, setMediaMetrics] = useState(null);
  const [intelData, setIntelData] = useState(null);
  const [activeTab, setActiveTab] = useState('geral');
  const [quizDetail, setQuizDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [expandedLeads, setExpandedLeads] = useState({});

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
    
    Promise.all([
      fetch(`/api/analytics/quiz/${quiz.id}`).then(r => r.json()),
      fetch(`/api/analytics/quiz/${quiz.id}/leads`).then(r => r.json()),
      fetch(`/api/quizzes/${quiz.id}`).then(r => r.json()),
      fetch(`/api/analytics/quiz/${quiz.id}/media`).then(r => r.json()),
      fetch(`/api/analytics/quiz/${quiz.id}/intel`).then(r => r.json()).catch(() => null)
    ])
    .then(([detailData, leadsData, quizData, mediaData, intel]) => {
      setMediaMetrics(mediaData);
      setIntelData(intel || null);
      setActiveTab('geral');
      const stepNaming = {};
      try {
        const configRaw = quizData?.config_json || quizData?.config;
        if (configRaw) {
          const config = typeof configRaw === 'string' ? JSON.parse(configRaw) : configRaw;
          quizData.config = config;
          if (config.steps) {
            config.steps.forEach(s => {
              const headerBlock = s.blocks?.find(b => b.type === 'heading' || b.type === 'text');
              if (headerBlock && headerBlock.text) {
                const tmp = document.createElement("DIV");
                tmp.innerHTML = headerBlock.text;
                stepNaming[s.id] = (tmp.textContent || tmp.innerText || "").trim() || s.label;
              } else {
                stepNaming[s.id] = s.label || s.id;
              }
            });
          }
        }
      } catch (e) { console.error(e); }

      setQuizDetail({ ...detailData, config: quizData?.config, stepNaming });
      setLeads(leadsData);
      setDetailLoading(false);
      setLeadsLoading(false);
    })
    .catch(() => { setDetailLoading(false); setLeadsLoading(false); });
  };

  const exportCsv = () => {
    const headers = ["Lead ID", "Data/Hora", "Status", "Dispositivo", "Plataforma/OS", "Origem", "Campanha", "Cidade", "Estado", "País", "Tempo Total (s)", "Nome", "E-mail", "Telefone", "Mensagem", "Respostas/Jornada"];
    
    let csvRows = [];
    csvRows.push(headers.map(h => `"${h}"`).join(","));

    leads.forEach(lead => {
      const intel = lead.intel || {};
      const status = lead.finished ? "Concluido" : "Drop-off";
      
      let name = '';
      let email = '';
      let phone = '';
      let message = '';

      const journeyStr = lead.journey.map(j => {
         let ans = j.answer || 'Visualizou';
         try {
           const parsed = JSON.parse(j.answer);
           if (parsed && typeof parsed === 'object') {
              if (parsed.name) name = parsed.name;
              if (parsed.email) email = parsed.email;
              if (parsed.phone) phone = parsed.phone;
              if (parsed.message) message = parsed.message;
              ans = Object.entries(parsed).map(([k,v]) => `${k}: ${v}`).join(' | ');
           }
         } catch(e) {}
         return `[${quizDetail.stepNaming?.[j.step_id] || j.step_id}] -> ${ans}`;
      }).join(' || ');

      const row = [
        lead.visitor_id,
        new Date(lead.start_time).toLocaleString('pt-BR'),
        status,
        intel.device_type || '',
        intel.os || '',
        intel.source || '',
        intel.utm_campaign || '',
        intel.city || '',
        intel.state || '',
        intel.country || '',
        lead.total_time,
        name,
        email,
        phone,
        message,
        journeyStr
      ];
      csvRows.push(row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","));
    });

    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `leads_auditoria_${selectedQuiz.slug || selectedQuiz.id}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderAnswer = (answer) => {
    if (!answer) return <span className="italic">Visualizou a etapa</span>;
    try {
      const parsed = JSON.parse(answer);
      if (parsed && typeof parsed === 'object') {
         return (
           <div className="flex flex-col gap-1 mt-1">
             {Object.entries(parsed).map(([k, v]) => (
               <div key={k} className="text-[11px] bg-slate-800/80 px-2 py-1 rounded text-slate-300 border border-slate-700/50 inline-block w-fit">
                 <span className="font-semibold text-indigo-300 capitalize mr-1">{k}:</span>
                 {v}
               </div>
             ))}
           </div>
         );
      }
    } catch (e) {}
    return <span>{answer}</span>;
  };

  const fmt = (s) => {
    if (!s || s === 0) return '0s';
    if (s < 60) return `${Number(s.toFixed(1))}s`;
    const m = Math.floor(s / 60);
    const secs = Number((s % 60).toFixed(1));
    return `${m}m ${secs > 0 ? secs + 's' : ''}`;
  };

  if (loading) return <div className="text-slate-400 p-8 flex justify-center mt-20 animate-pulse font-mono">⏳ CARREGANDO DATA WAREHOUSE...</div>;
  if (!metrics) return <div className="text-red-400 p-8 flex justify-center mt-20">Erro ao carregar o Data Warehouse</div>;

  // ─── Drill-Down de um Quiz Específico (Luxury BI) ──────────────────────────────────────
  if (selectedQuiz) {
    return (
      <div className="space-y-6">
        {/* Header Compacto */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-indigo-500/20 pb-4">
          <div className="flex items-center gap-4">
            <button onClick={() => { setSelectedQuiz(null); setQuizDetail(null); }}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer border border-slate-700">
              <ChevronLeft size={16}/>
            </button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                {selectedQuiz.title}
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono uppercase tracking-widest">DRILL-DOWN</span>
              </h2>
              <p className="text-xs text-slate-500 font-mono">/{selectedQuiz.slug || 'quiz-' + selectedQuiz.id}</p>
            </div>
          </div>
          
          {/* Navegação de Tabs */}
          <div className="flex p-1 bg-slate-900/60 border border-slate-800 rounded-lg">
            <button onClick={() => setActiveTab('geral')} className={`px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${activeTab === 'geral' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Visão Funil</button>
            <button onClick={() => setActiveTab('midia')} className={`px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${activeTab === 'midia' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Retenção de Mídia</button>
          </div>
        </div>

        {detailLoading ? (
          <div className="text-slate-500 font-mono text-center py-16 animate-pulse">PROCESSANDO CUBOS DE DADOS...</div>
        ) : quizDetail ? (
          <>
            {activeTab === 'midia' ? (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/5 border border-indigo-500/20 rounded-xl p-5 mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2"><PlayCircle size={18} className="text-indigo-400"/> Central de Retenção (Estilo Panda/Vimeo)</h3>
                  <p className="text-xs text-slate-400 mt-1">Acompanhe segundo a segundo onde os leads estão engajando ou abandonando seus Áudios e VSLs.</p>
                </div>
                
                {(!mediaMetrics || Object.keys(mediaMetrics).length === 0) ? (
                  <div className="py-20 text-center border border-dashed border-slate-700/50 rounded-2xl bg-slate-900/20">
                    <VideoIcon size={40} className="text-slate-700 mx-auto mb-3"/>
                    <p className="text-slate-400 font-medium">Nenhum dado de mídia captado ainda.</p>
                    <p className="text-xs text-slate-500 mt-1">Coloque um bloco de Áudio WhatsApp ou Vídeo nativo no funil e atraia leads.</p>
                  </div>
                ) : (
                  Object.entries(mediaMetrics).map(([blockId, mProps]) => {
                    const { curve, stats } = mProps;
                    let bName = 'Bloco de Mídia';
                    let typeIcon = <PlayCircle size={14}/>;
                    if (quizDetail.config && quizDetail.config.steps) {
                      for (const st of quizDetail.config.steps) {
                        const b = st.blocks?.find(x => x.id === blockId);
                        if (b) {
                          bName = b.type === 'audio' ? 'Áudio' : 'Vídeo';
                          typeIcon = b.type === 'audio' ? <Volume2 size={14}/> : <VideoIcon size={14}/>;
                          break;
                        }
                      }
                    }
                    
                    const maxViews = curve.length > 0 ? Math.max(...curve.map(c => c.views)) : 0;
                    const cData = curve.map(c => ({
                      timeFmt: fmt(c.time),
                      timeRaw: c.time,
                      views: c.views,
                      retention: maxViews > 0 ? Math.round((c.views / maxViews) * 100) : 0
                    }));

                    return (
                      <div key={blockId} className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-xl p-5 shadow-lg">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-white/5 pb-4 gap-4">
                          <h4 className="text-lg font-bold text-slate-200 flex items-center gap-2">{typeIcon} {bName}</h4>
                          <div className="flex gap-4">
                            <div className="text-right">
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Total Plays</p>
                              <p className="text-xl font-mono text-white font-bold">{stats.totalPlays}</p>
                            </div>
                            <div className="w-px bg-slate-800"></div>
                            <div className="text-right">
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Tempo Assistido</p>
                              <p className="text-xl font-mono text-cyan-400 font-bold">{fmt(stats.duration)}</p>
                            </div>
                          </div>
                        </div>

                        {cData.length > 0 ? (
                          <div className="h-72 w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={cData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                  <linearGradient id={`colorRet${blockId}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="timeRaw" tickFormatter={fmt} stroke="#64748b" tick={{fontSize: 11, fill: '#94a3b8'}} tickMargin={10} minTickGap={30}/>
                                <YAxis yAxisId="left" stroke="#64748b" tick={{fontSize: 11, fill: '#94a3b8'}} />
                                <YAxis yAxisId="right" orientation="right" stroke="#64748b" tick={{fontSize: 11, fill: '#94a3b8'}} tickFormatter={(v)=>v+'%'} />
                                <RechartsTooltip 
                                  contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', boxShadow: '0 10px 25px rgba(0,0,0,0.5)'}}
                                  itemStyle={{color: '#818cf8', fontWeight: 'bold'}}
                                  labelFormatter={(x) => 'Momento: ' + fmt(x)}
                                  formatter={(val, name) => [name === 'views' ? val : val+'%', name === 'views' ? 'Visualizações Únicas' : 'Retenção']}
                                />
                                <Area yAxisId="left" type="monotone" dataKey="views" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill={`url(#colorRet${blockId})`} activeDot={{r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2}} />
                                <Area yAxisId="right" type="monotone" dataKey="retention" stroke="none" fill="none" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="text-center py-10 text-slate-500 text-sm font-mono">Curva sendo calculada... Aguardando os primeiros leads.</div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Grid Superior: Executive Summary */}
            <div className="grid grid-cols-3 gap-5">
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-xl p-5 shadow-inner relative overflow-hidden group">
                <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all"></div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Volume de Leads</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-mono font-bold text-white">{quizDetail.total_starts}</p>
                  <p className="text-xs text-slate-500 font-mono">INICIADOS</p>
                </div>
              </div>
              
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-xl p-5 shadow-inner relative overflow-hidden group">
                <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all"></div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Conversão Final</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-mono font-bold text-emerald-400">{quizDetail.conversion_rate}%</p>
                  <p className="text-xs text-slate-500 font-mono">({quizDetail.total_finished} LEADS)</p>
                </div>
              </div>

              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-xl p-5 shadow-inner relative overflow-hidden group flex flex-col justify-between">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <svg preserveAspectRatio="none" viewBox="0 0 100 100" className="w-full h-full fill-none stroke-cyan-400 stroke-2"><path d="M0 80 Q 25 20, 50 60 T 100 30" /></svg>
                </div>
                <div className="relative z-10">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1" title="Média global de tempo que um lead gasta do início ao fim/abandono">Tempo Médio Global</p>
                  <p className="text-3xl font-mono font-bold text-cyan-400">{fmt(quizDetail.step_funnel.reduce((acc, s) => acc + (s.avg_time_seconds || 0), 0))}</p>
                </div>
              </div>
            </div>

            {/* ── Lead Intelligence Cards ── */}
            {intelData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Dispositivos */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-xl p-5">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">📱 Dispositivos</h3>
                  <div className="space-y-2.5">
                    {(intelData.devices || []).map(d => {
                      const icon = d.label === 'mobile' ? '📱' : d.label === 'tablet' ? '🖥️' : '💻';
                      const total = (intelData.devices || []).reduce((s,x) => s + x.count, 0);
                      const pct = total > 0 ? Math.round(d.count / total * 100) : 0;
                      return (
                        <div key={d.label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300 capitalize">{icon} {d.label}</span>
                            <span className="text-slate-500 font-mono">{d.count} <span className="text-indigo-400">({pct}%)</span></span>
                          </div>
                          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-400 rounded-full" style={{width:`${pct}%`}} />
                          </div>
                        </div>
                      );
                    })}
                    {(!intelData.devices || intelData.devices.length === 0) && <p className="text-slate-600 text-xs italic">Aguardando dados...</p>}
                  </div>
                </div>
                {/* Origens */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-xl p-5">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">🌐 Origens de Tráfego</h3>
                  <div className="space-y-2.5">
                    {(intelData.sources || []).map(s => {
                      const srcIcons = { instagram:'🟣', facebook:'🔵', youtube:'🔴', google:'🟡', tiktok:'⚫', whatsapp:'🟢', email:'📧', twitter:'❌', direct:'🔗', other:'🌐' };
                      const total = (intelData.sources || []).reduce((sum,x) => sum + x.count, 0);
                      const pct = total > 0 ? Math.round(s.count / total * 100) : 0;
                      return (
                        <div key={s.label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300 capitalize">{srcIcons[s.label] || '🌐'} {s.label}</span>
                            <span className="text-slate-500 font-mono">{s.count} <span className="text-indigo-400">({pct}%)</span></span>
                          </div>
                          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-500 to-pink-400 rounded-full" style={{width:`${pct}%`}} />
                          </div>
                        </div>
                      );
                    })}
                    {(!intelData.sources || intelData.sources.length === 0) && <p className="text-slate-600 text-xs italic">Aguardando dados...</p>}
                  </div>
                </div>
                {/* Localidades */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-xl p-5">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">📍 Top Localidades</h3>
                  <div className="space-y-2.5">
                    {(intelData.cities || []).map(c => {
                      const total = (intelData.cities || []).reduce((sum,x) => sum + x.count, 0);
                      const pct = total > 0 ? Math.round(c.count / total * 100) : 0;
                      return (
                        <div key={c.label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300 truncate max-w-[65%]">📍 {c.label}</span>
                            <span className="text-slate-500 font-mono">{c.count} <span className="text-indigo-400">({pct}%)</span></span>
                          </div>
                          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full" style={{width:`${pct}%`}} />
                          </div>
                        </div>
                      );
                    })}
                    {(!intelData.cities || intelData.cities.length === 0) && <p className="text-slate-600 text-xs italic">Aguardando dados de geo...</p>}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Raio-X de Retenção (Horizontal) */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-xl p-5 relative">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-5 flex justify-between items-center">
                  Raio-X de Retenção
                  <span className="text-[10px] text-slate-500 font-normal normal-case">Volume vs Tempo/Etapa</span>
                </h3>
                
                {quizDetail.step_funnel.length === 0 ? (
                  <p className="text-slate-500 text-xs italic">Nenhum dado registrado.</p>
                ) : (
                  <div className="space-y-4">
                    {/* ── Barra especial: PageView Only (Bounce) ── */}
                    {quizDetail.pageview_only > 0 && (
                      <div className="relative group pb-2 border-b border-slate-800/60">
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-xs font-medium text-rose-400 truncate pr-4 max-w-[70%] flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                            <span className="font-mono text-rose-700 mr-1">👁</span>
                            Só Visualizaram (PageView)
                          </span>
                          <span className="text-xs font-mono font-bold text-rose-300">{quizDetail.pageview_only} <span className="text-[10px] text-slate-600 font-sans">leads</span></span>
                        </div>
                        <div className="h-1.5 bg-slate-800/80 rounded-full overflow-hidden relative">
                          <div className="absolute top-0 left-0 h-full rounded-full transition-all"
                            style={{
                              width: `${Math.round((quizDetail.pageview_only / quizDetail.total_starts) * 100)}%`,
                              background: 'linear-gradient(90deg, rgba(244,63,94,0.4), rgba(244,63,94,0.9))'
                            }}>
                          </div>
                        </div>
                        <p className="text-[9px] text-rose-900 mt-1">Entraram mas saíram sem responder nenhuma pergunta</p>
                      </div>
                    )}
                    {quizDetail.step_funnel.map((step, i) => {
                      const maxVisitors = quizDetail.step_funnel[0]?.visitors || 1;
                      const pct = Math.round((step.visitors / maxVisitors) * 100);
                      const isHighTime = step.avg_time_seconds > 20;
                      return (
                        <div key={step.step_id} className="relative group">
                          <div className="flex justify-between items-end mb-1">
                            <span className="text-xs font-medium text-slate-300 truncate pr-4 max-w-[70%]">
                              <span className="font-mono text-slate-600 mr-2">{i+1}.</span>
                              {quizDetail.stepNaming?.[step.step_id] || step.step_id}
                            </span>
                            <span className="text-xs font-mono font-bold text-white">{step.visitors} <span className="text-[10px] text-slate-600 font-sans">leads</span></span>
                          </div>
                          <div className="h-1.5 bg-slate-800/80 rounded-full overflow-hidden relative">
                            <div className="absolute top-0 left-0 h-full bg-indigo-500/80 transition-all rounded-full" style={{ width: `${pct}%` }}></div>
                          </div>
                          {/* Floating Pill - Tempo Overlay */}
                          <div className={`absolute right-12 top-0 -mt-1 px-1.5 py-[2px] rounded border text-[9px] font-mono font-bold leading-none backdrop-blur-sm z-10 transition-colors ${isHighTime ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'} opacity-0 group-hover:opacity-100`}>
                            ⏱ {fmt(step.avg_time_seconds)}
                          </div>
                          {/* Top Answer Mini-Badge */}
                          {quizDetail.answers_by_step?.[step.step_id]?.[0] && (
                            <p className="text-[9px] text-slate-500 mt-1 truncate">
                              🏆 Fav: <span className="text-indigo-300">{quizDetail.answers_by_step[step.step_id][0].answer}</span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Matriz de Atrito (Vertical) */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-xl p-5 flex flex-col">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2 flex justify-between items-center" title="Mostra em qual etapa exata o usuário abandonou a página">
                  Matriz de Abandono
                  <span className="text-[10px] text-slate-500 font-normal normal-case">Onde perdemos leads?</span>
                </h3>
                
                <div className="flex-1 flex items-end gap-2 pt-10 pb-4 border-b border-slate-800">
                  {quizDetail.step_funnel.map((step, i) => {
                    // Calculando taxa de abandono (drop-off) exata NESTA etapa:
                    // Drop-off = (visitors da etapa autal) - (visitors da próxima etapa)
                    const nextStep = quizDetail.step_funnel[i+1];
                    let rawDrop = nextStep ? (step.visitors - nextStep.visitors) : (step.visitors - quizDetail.total_finished);
                    const dropOffCount = Math.max(0, rawDrop); // previne numero negativo caso leads pulem passos
                    const dropRate = step.visitors > 0 ? (dropOffCount / step.visitors) : 0;
                    
                    // Altura da barra baseada no número absoluto de desistências
                    const maxDrop = Math.max(...quizDetail.step_funnel.map((s, idx) => {
                      const ns = quizDetail.step_funnel[idx+1];
                      return Math.max(0, ns ? (s.visitors - ns.visitors) : (s.visitors - quizDetail.total_finished));
                    }));
                    const hPct = maxDrop > 0 ? (dropOffCount / maxDrop) * 100 : 0;
                    
                    // Cor baseada na taxa (dropRate). Acima de 30% vira amber/red
                    const isCritical = dropRate > 0.3;
                    
                    return (
                      <div key={step.step_id} className="flex-1 flex flex-col items-center justify-end group relative h-full">
                        {/* Tooltip */}
                        <div className="absolute -top-8 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20 border border-slate-600 shadow-xl font-mono">
                          {dropOffCount} abandonos ({(dropRate*100).toFixed(1)}%)
                        </div>
                        <div className="w-full mx-1 rounded-t-sm transition-all" 
                          style={{ 
                            height: `${Math.max(hPct, 5)}%`, 
                            background: isCritical ? 'linear-gradient(to top, rgba(245,158,11,0.2), rgba(245,158,11,0.8))' : 'linear-gradient(to top, rgba(99,102,241,0.2), rgba(99,102,241,0.8))',
                            boxShadow: isCritical ? 'inset 0 2px 4px rgba(245,158,11,0.5)' : 'none'
                          }} 
                        />
                        <span className="text-[9px] text-slate-500 mt-2 font-mono">{i+1}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 px-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest">Início</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest">Fim</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-700 bg-slate-800/60 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-300">Log de Auditoria Individual</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-mono text-right shrink-0">{leads.length} LEADS</span>
                  <button onClick={exportCsv} disabled={leads.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-lg text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50">
                    ⬇ Exportar CSV
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto w-full custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-900/80 sticky top-0 z-10 backdrop-blur-md border-b border-slate-700">
                    <tr>
                      <th className="py-3 px-4 text-xs font-semibold text-slate-400">Lead</th>
                      <th className="py-3 px-4 text-xs font-semibold text-slate-400">Intel</th>
                      <th className="py-3 px-4 text-xs font-semibold text-slate-400">Status</th>
                      <th className="py-3 px-4 text-xs font-semibold text-slate-400">Progresso & Respostas</th>
                      <th className="py-3 px-4 text-xs font-semibold text-slate-400 text-right">Tempo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leadsLoading ? (
                      <tr><td colSpan="4" className="text-center py-6 text-sm text-slate-500 font-mono animate-pulse">CARREGANDO REGISTROS...</td></tr>
                    ) : leads.length === 0 ? (
                      <tr><td colSpan="4" className="text-center py-6 text-sm text-slate-500 italic">Nenhum evento detalhado encontrado.</td></tr>
                    ) : (
                      leads.map((lead) => {

                        const isExpanded = !!expandedLeads[lead.visitor_id];
                        return (
                          <React.Fragment key={lead.visitor_id}>
                            {/* Lead Source Icons mapping */}
                            {(() => {
                              const srcIcons = { instagram:'🟣', facebook:'🔵', youtube:'🔴', google:'🟡', tiktok:'⚫', whatsapp:'🟢', email:'📧', twitter:'❌', direct:'🔗', other:'🌐' };
                              const devIcons = { mobile:'📱', tablet:'🖥️', desktop:'💻' };
                              const intel = lead.intel || {};
                              return (
                                <tr className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors align-middle cursor-pointer" onClick={() => setExpandedLeads(p => ({...p, [lead.visitor_id]: !p[lead.visitor_id]}))}>
                                  <td className="py-3 px-4">
                                    <p className="font-semibold text-sm text-slate-200">Lead {lead.visitor_id.substring(0,8)}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{new Date(lead.start_time).toLocaleString('pt-BR')}</p>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex flex-wrap gap-1">
                                      {intel.device_type && <span title={`${intel.browser || ''} / ${intel.os || ''}`} className="text-xs px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono cursor-help">{devIcons[intel.device_type] || '💻'} {intel.device_type}</span>}
                                      {intel.source && <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">{srcIcons[intel.source] || '🌐'} {intel.source}</span>}
                                      {intel.city && <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">📍 {intel.city}{intel.state ? `, ${intel.state}` : ''}</span>}
                                    </div>
                                    {intel.utm_campaign && <p className="text-[10px] text-indigo-400/70 mt-1 font-mono">🏷️ {intel.utm_campaign}</p>}
                                  </td>
                                  <td className="py-3 px-4">
                                    {lead.finished ? (
                                      <span className="inline-block px-2 py-1 rounded bg-emerald-500/10 text-xs font-medium text-emerald-400 border border-emerald-500/20">✔ Concluído</span>
                                    ) : (
                                      <span className="inline-block px-2 py-1 rounded bg-amber-500/10 text-xs font-medium text-amber-400 border border-amber-500/20">Drop-off</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-xs text-slate-400">{lead.journey.length} etapas percorridas</td>
                                  <td className="py-3 px-4 text-right">
                                    <span className="font-mono text-sm text-cyan-400 font-medium flex items-center justify-end gap-3">
                                      <span><span className="text-[10px]">⏱</span> {fmt(lead.total_time)}</span>
                                      <ChevronDown size={14} className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </span>
                                  </td>
                                </tr>
                              );
                            })()}
                            {isExpanded && (
                              <tr className="bg-slate-900/40 border-b border-slate-800/60">
                                <td colSpan="5" className="py-3 px-8">
                                  <div className="space-y-4 max-w-sm py-2">
                                    {lead.journey.map((p) => (
                                      <div key={p.step_id} className="text-xs border-l-2 border-slate-700 pl-4 relative ml-2 mt-1">
                                        <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                                        <p className="text-slate-300 font-medium">{quizDetail.stepNaming?.[p.step_id] || p.step_id}</p>
                                        <div className="flex justify-between items-end mt-1 gap-2">
                                          <div className="text-slate-500 break-words max-w-[80%]">{renderAnswer(p.answer)}</div>
                                          <span className="font-mono text-cyan-400/80 whitespace-nowrap bg-slate-800 px-1.5 py-0.5 rounded">{fmt(p.time_spent)}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
            )}
          </>
        ) : (
          <p className="text-slate-500 text-sm text-center py-12">Nenhum dado para este quiz ainda.</p>
        )}
      </div>
    );
  }

  // ─── Overview Geral (BI Luxury) ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Data Warehouse</h2>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Resumo de Performance Global</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { icon: <Users size={16}/>, label: 'TOTAL LEADS', value: metrics.overview.total_leads, sub: 'TRAFEGO INICIADO', color: 'blue' },
          { icon: <TrendingUp size={16}/>, label: 'CONVERSÃO MÉDIA', value: `${metrics.overview.conversion_rate}%`, sub: 'GLOBAL ACROSS FUNNELS', color: 'emerald' },
          { icon: <CheckCircle2 size={16}/>, label: 'QUIZZES ATIVOS', value: quizzes.filter(q=>q.is_active).length, sub: `DE ${quizzes.length} TOTAIS`, color: 'indigo' },
        ].map((s,i) => (
          <div key={i} className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-xl p-5 shadow-inner relative overflow-hidden group">
            <div className={`absolute -right-8 -top-8 w-24 h-24 bg-${s.color}-500/10 rounded-full blur-xl group-hover:bg-${s.color}-500/20 transition-all duration-500`}></div>
            <div className="flex justify-between items-start mb-4">
              <div className={`w-8 h-8 rounded-lg bg-${s.color}-500/10 flex items-center justify-center text-${s.color}-400 shadow-[inset_0_0_10px_rgba(var(--tw-colors-${s.color}-500),0.1)] border border-${s.color}-500/20`}>
                {s.icon}
              </div>
            </div>
            <p className="text-3xl font-mono font-bold text-white tracking-tight">{s.value}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{s.label}</p>
            <p className="text-[9px] text-slate-600 font-mono mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/40 rounded-xl overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-light/5 bg-slate-900/60">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-indigo-400" />
            RANKING DE PERFORMANCE POR FUNIL
          </h3>
          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">Clique em uma linha para abrir o Drill-Down detalhado do funil</p>
        </div>
        
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-900/80">
            <tr>
              <th className="py-3 px-5 text-[10px] uppercase font-bold text-slate-500 tracking-widest w-12 text-center">#</th>
              <th className="py-3 px-5 text-[10px] uppercase font-bold text-slate-500 tracking-widest">NOME DO FUNIL</th>
              <th className="py-3 px-5 text-[10px] uppercase font-bold text-slate-500 tracking-widest text-center">TEMPO DE SESSÃO</th>
              <th className="py-3 px-5 text-[10px] uppercase font-bold text-slate-500 tracking-widest text-right">VOLUME (LEADS)</th>
              <th className="py-3 px-5 text-[10px] uppercase font-bold text-slate-500 tracking-widest text-right">CONVERSÃO</th>
              <th className="py-3 px-5 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {metrics.quizzes.map((q, i) => {
              const rate = q.conversion_rate;
              return (
                <tr key={q.id} onClick={() => loadQuizDetail(q)} className="border-b border-white/5 hover:bg-slate-800/40 transition-colors cursor-pointer group">
                  <td className="py-3 px-5 text-center font-mono text-xs text-slate-600 font-bold">{i+1}</td>
                  <td className="py-3 px-5 text-sm font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors truncate max-w-[200px]">{q.title}</td>
                  <td className="py-3 px-5 text-center">
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 font-mono text-[10px] text-cyan-400">⏱ {fmt(q.avg_time_seconds)}</span>
                  </td>
                  <td className="py-3 px-5 text-right font-mono text-xs text-slate-300">{q.starts}</td>
                  <td className="py-3 px-5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <span className={`font-mono text-xs font-bold ${rate > 50 ? 'text-emerald-400' : 'text-indigo-400'}`}>{rate}%</span>
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden shrink-0 shadow-inner">
                        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400" style={{width: `${rate}%`}} />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-5 text-right">
                    <span className="text-slate-600 group-hover:text-slate-300 transition-colors">→</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {metrics.quizzes.length === 0 && <p className="text-slate-500 text-xs italic font-mono text-center py-8">NENHUM EVENTO REGISTRADO AINDA.</p>}
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

