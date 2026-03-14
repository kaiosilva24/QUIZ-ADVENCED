import React, { useState, useEffect } from 'react';
import {
  Palette, BarChart2, ListTodo, Settings,
  PlusCircle, Trash2, Edit3, ArrowRight,
  CheckCircle2, Users, TrendingUp, Shuffle, ToggleLeft, ToggleRight
} from 'lucide-react';
import QuizBuilder from './QuizBuilder';
import QuizPreview from './QuizPreview';

const API = '/api';

// ─── Componente Roteador de Quizzes por Slug (InLead Style) ──────────────────
function QuizRouter() {
  const [quizData, setQuizData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const pathSlug = window.location.pathname.replace(/^\//, '').replace(/\/.*$/, '');

    // Se é o root sem slug, tenta o round robin (rotação)
    const endpoint = pathSlug ? `/api/route/${encodeURIComponent(pathSlug)}` : '/api/roundrobin/next';

    fetch(endpoint)
      .then(r => {
        if (!r.ok) { window.location.href = '/admin'; throw new Error('redirect'); }
        return r.json();
      })
      .then(data => { setQuizData(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  if (loading) return <div style={{minHeight:'100vh',background:'#020617',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:18}}>Carregando quiz...</div>;
  if (error && error !== 'redirect') return <div style={{minHeight:'100vh',background:'#020617',display:'flex',alignItems:'center',justifyContent:'center',color:'#f87171',fontSize:18}}>{error}</div>;
  if (!quizData) return null;

  return (
    <div style={{minHeight:'100vh',width:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#000'}}>
      <div style={{width:'100%',maxWidth:'440px',minHeight:'100vh'}}>
        <QuizPreview
          config={quizData.config}
          stepIdx={currentStep}
          compact={false}
          onNavigate={(nextStepId) => {
            const steps = quizData.config?.steps || [];
            const idx = steps.findIndex(s => s.id === nextStepId);
            if (idx >= 0) setCurrentStep(idx);
          }}
        />
      </div>
    </div>
  );
}

// ─── Componente Raiz ──────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('quizzes');
  const [quizzes, setQuizzes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [editingQuiz, setEditingQuiz] = useState(null);

  const hostname = window.location.hostname;
  const isCustomDomain = !hostname.includes('discloud.app') && hostname !== 'localhost';
  const isAdminRoute = window.location.pathname.startsWith('/admin');

  if (isCustomDomain && !isAdminRoute) {
    return <QuizRouter />;
  }

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
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 border-r border-white/5 bg-slate-900/60 backdrop-blur-xl flex flex-col shrink-0">
        <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.5)] flex items-center justify-center font-bold text-white text-lg">Q</div>
          <span className="hidden lg:block ml-3 font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">QuizSaaS</span>
        </div>
        <nav className="flex-1 p-3 space-y-1 mt-2">
          <NavItem icon={<Palette size={20}/>} label="Quizzes & Builder" active={tab==='quizzes'} onClick={()=>setTab('quizzes')}/>
          <NavItem icon={<Shuffle size={20}/>} label="Teste A/B · Round Robin" active={tab==='abteste'} onClick={()=>setTab('abteste')}/>
          <NavItem icon={<BarChart2 size={20}/>} label="Analytics" active={tab==='analytics'} onClick={()=>setTab('analytics')}/>
          <NavItem icon={<ListTodo size={20}/>} label="Tarefas da Equipe" active={tab==='tasks'} onClick={()=>setTab('tasks')}/>
        </nav>
        <div className="p-3 border-t border-white/5">
          <NavItem icon={<Settings size={20}/>} label="Configurações"/>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 shrink-0 bg-slate-900/30 backdrop-blur-md">
          <h2 className="text-lg font-semibold text-slate-100">
            {tab==='quizzes'&&'Quizzes & Builder Visual'}
            {tab==='abteste'&&'Teste A/B · Round Robin'}
            {tab==='analytics'&&'Analytics & Métricas'}
            {tab==='tasks'&&'Gestão de Tarefas'}
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
                config_json: JSON.stringify({
                  theme: { bg: '#0f172a', accent: '#6366f1', text: '#f8fafc', bgImage: '', overlay: true },
                  steps: [{ id: 'step_1', label: 'Etapa 1', blocks: [] }]
                })
              })}
            />
          )}
          {tab==='abteste' && <RoundRobinView quizzes={quizzes}/>}
          {tab==='analytics' && <AnalyticsView quizzes={quizzes}/>}
          {tab==='tasks' && <TasksView tasks={tasks} fetchTasks={fetchAllTasks}/>}
        </div>
      </main>
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
    await fetch(`${API}/roundrobin`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(rrConfig)
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

// ─── Analytics View ───────────────────────────────────────────────────────────
function AnalyticsView({ quizzes }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { icon: <Users size={22}/>, label: 'Total de Leads', value: '—', sub: 'Em produção' },
          { icon: <TrendingUp size={22}/>, label: 'Taxa de Conversão', value: '—', sub: 'Requer rastreamento' },
          { icon: <CheckCircle2 size={22}/>, label: 'Quizzes Ativos', value: quizzes.filter(q=>q.is_active).length, sub: `de ${quizzes.length} total` },
        ].map((s,i) => (
          <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4">{s.icon}</div>
            <p className="text-2xl font-bold text-white mb-1">{s.value}</p>
            <p className="text-sm font-medium text-slate-300">{s.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-800/30 border border-slate-700/40 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-5">Performance por Quiz</h3>
        {quizzes.map((q, i) => {
          const rate = Math.floor(Math.random() * 40) + 20;
          return (
            <div key={q.id} className="flex items-center gap-4 py-3 border-b border-slate-700/30 last:border-0">
              <span className="text-slate-400 text-sm w-4">{i+1}</span>
              <span className="flex-1 text-sm font-medium text-slate-200 truncate">{q.title}</span>
              <span className="text-xs font-medium text-indigo-400 w-10 text-right">{rate}%</span>
              <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden shrink-0">
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{width: `${rate}%`}}/>
              </div>
            </div>
          );
        })}
        {quizzes.length === 0 && <p className="text-slate-500 text-sm">Crie quizzes para ver as métricas.</p>}
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
