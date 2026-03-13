import React, { useState, useEffect } from 'react';
import {
  Palette, Globe, BarChart2, ListTodo, Settings,
  PlusCircle, Trash2, Edit3, ArrowRight,
  CheckCircle2, Users, TrendingUp
} from 'lucide-react';
import QuizBuilder from './QuizBuilder';

const API = 'http://localhost:3000/api';

// ─── Componente Raiz ─────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('quizzes');
  const [domains, setDomains] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [editingQuiz, setEditingQuiz] = useState(null);

  useEffect(() => { fetchDomains(); fetchAllTasks(); }, []);
  useEffect(() => { if (selectedDomain) fetchQuizzes(selectedDomain.id); }, [selectedDomain]);

  const fetchDomains = async () => {
    const r = await fetch(`${API}/domains`); setDomains(await r.json());
  };
  const fetchQuizzes = async (did) => {
    const r = await fetch(`${API}/domains/${did}/quizzes`); setQuizzes(await r.json());
  };
  const fetchAllTasks = async () => {
    const r = await fetch(`${API}/tasks`); setTasks(await r.json());
  };

  // Quando editando quiz, renderiza o Builder fullscreen (substitui o layout inteiro)
  if (editingQuiz !== null) {
    return (
      <QuizBuilder
        quiz={editingQuiz}
        domain={selectedDomain}
        onBack={() => { setEditingQuiz(null); if (selectedDomain) fetchQuizzes(selectedDomain.id); }}
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
          <NavItem icon={<Globe size={20}/>} label="Domínios" active={tab==='domains'} onClick={()=>setTab('domains')}/>
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
            {tab==='domains'&&'Roteamento & Domínios'}
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
              domains={domains}
              quizzes={quizzes}
              selectedDomain={selectedDomain}
              setSelectedDomain={setSelectedDomain}
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
          {tab==='domains' && <DomainsView domains={domains} fetchDomains={fetchDomains}/>}
          {tab==='analytics' && <AnalyticsView quizzes={quizzes} domains={domains}/>}
          {tab==='tasks' && <TasksView tasks={tasks} setTasks={setTasks} fetchTasks={fetchAllTasks}/>}
        </div>
      </main>
    </div>
  );
}

// ─── NavItem ─────────────────────────────────────────────────────────────────
function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 ${active ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[inset_0_0_12px_rgba(99,102,241,0.08)]' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
      <span className="shrink-0">{icon}</span>
      <span className="hidden lg:block text-sm font-medium truncate">{label}</span>
    </button>
  );
}

// ─── Quizzes View ─────────────────────────────────────────────────────────────
function QuizzesView({ domains, quizzes, selectedDomain, setSelectedDomain, fetchQuizzes, onEdit, onNew }) {
  const handleDelete = async (id) => {
    await fetch(`${API}/quizzes/${id}`, { method: 'DELETE' });
    if (selectedDomain) fetchQuizzes(selectedDomain.id);
  };

  return (
    <div className="space-y-8">
      {/* Domain Selector */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Selecione o Domínio</h3>
        <div className="flex flex-wrap gap-3">
          {domains.map(d => (
            <button key={d.id} onClick={() => setSelectedDomain(d)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border cursor-pointer focus:outline-none ${selectedDomain?.id===d.id ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' : 'text-slate-400 hover:text-white border-slate-700 hover:border-slate-500 bg-slate-800/40'}`}>
              🌐 {d.hostname}
            </button>
          ))}
          {domains.length === 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-slate-500">Nenhum domínio cadastrado ainda. Cadastre na aba Domínios.</p>
              <button onClick={onNew}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-400 hover:text-white transition-all w-fit cursor-pointer focus:outline-none">
                🎨 Testar o Builder (Demo)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quiz Grid */}
      {selectedDomain && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">Quizzes de <span className="text-indigo-400">{selectedDomain.hostname}</span></h3>
            <button onClick={onNew}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] active:scale-95 text-sm cursor-pointer">
              <PlusCircle size={16}/> Novo Quiz
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {quizzes.map((q, i) => {
              const cfg = (() => { try { return JSON.parse(q.config_json || '{}'); } catch { return {}; } })();
              const stepCount = cfg.steps?.length || cfg.nodes?.length || 0;
              return (
                <div key={q.id} className="group relative bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 hover:border-indigo-500/40 transition-all overflow-hidden cursor-pointer">
                  <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-indigo-500/5 group-hover:bg-indigo-500/15 blur-xl transition-all"/>
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all flex gap-2 z-10">
                    <button onClick={() => onEdit(q)} aria-label="Editar quiz" className="w-7 h-7 bg-slate-700 hover:bg-indigo-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer"><Edit3 size={13}/></button>
                    <button onClick={() => handleDelete(q.id)} aria-label="Deletar quiz" className="w-7 h-7 bg-slate-700 hover:bg-red-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer"><Trash2 size={13}/></button>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-lg" style={{background: (cfg.theme?.accent||'#6366f1')+'20', border: `1px solid ${cfg.theme?.accent||'#6366f1'}30`}}>
                    {['🧠','🎯','🔥','💡','⚡'][i % 5]}
                  </div>
                  <h4 className="font-semibold text-slate-100 mb-1">{q.title}</h4>
                  <p className="text-xs text-slate-500">{stepCount} {stepCount === 1 ? 'etapa' : 'etapas'} criadas</p>
                  <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-700/50">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${q.is_active ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-slate-400 bg-slate-700/30 border-slate-600/20'}`}>
                      {q.is_active ? '🟢 Ativo' : '⚫ Inativo'}
                    </span>
                    <div className="text-xs text-slate-500 flex items-center gap-1">Roleta #{i+1} <ArrowRight size={11}/></div>
                  </div>
                </div>
              );
            })}
            {quizzes.length === 0 && (
              <div className="col-span-3 flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-700/50 rounded-2xl">
                <Palette size={40} className="text-slate-600 mb-4"/>
                <p className="text-slate-400 font-medium">Nenhum quiz neste domínio</p>
                <p className="text-sm text-slate-600 mt-1">Clique em &quot;Novo Quiz&quot; para começar</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Domains View ─────────────────────────────────────────────────────────────
function DomainsView({ domains, fetchDomains }) {
  const [hostname, setHostname] = useState('');
  const create = async () => {
    if (!hostname) return;
    await fetch(`${API}/domains`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ hostname }) });
    setHostname(''); fetchDomains();
  };
  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h3 className="text-2xl font-bold text-white mb-1">Gerenciar Domínios</h3>
        <p className="text-slate-400 text-sm">Cada domínio possui sua própria roleta Round Robin de quizzes.</p>
      </div>
      <div className="flex gap-3">
        <input value={hostname} onChange={e => setHostname(e.target.value)} placeholder="quiz.meusite.com.br"
          onKeyDown={e => e.key === 'Enter' && create()}
          className="flex-1 bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500 transition-colors"/>
        <button onClick={create} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] cursor-pointer focus:outline-none">
          Adicionar
        </button>
      </div>
      <div className="space-y-3">
        {domains.map(d => (
          <div key={d.id} className="flex items-center gap-4 p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center"><Globe size={18} className="text-indigo-400"/></div>
            <div className="flex-1">
              <p className="font-semibold text-white">{d.hostname}</p>
              <p className="text-xs text-slate-500 mt-0.5">Aponte seu CNAME para o IP deste servidor via Cloudflare</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">🟢 Ativo</span>
          </div>
        ))}
        {domains.length === 0 && <p className="text-slate-500 text-sm">Nenhum domínio cadastrado ainda.</p>}
      </div>
    </div>
  );
}

// ─── Analytics View ───────────────────────────────────────────────────────────
function AnalyticsView({ quizzes }) {
  const [analytics, setAnalytics] = useState({});
  useEffect(() => {
    quizzes.forEach(async q => {
      const r = await fetch(`${API}/analytics/quiz/${q.id}`);
      const data = await r.json();
      setAnalytics(prev => ({ ...prev, [q.id]: data }));
    });
  }, [quizzes]);

  const totalStarts = Object.values(analytics).reduce((a,b) => a + (b.total_starts || 0), 0);
  const totalFinished = Object.values(analytics).reduce((a,b) => a + (b.total_finished || 0), 0);
  const convRate = totalStarts > 0 ? ((totalFinished/totalStarts)*100).toFixed(1) : 0;

  return (
    <div className="space-y-8">
      <h3 className="text-2xl font-bold text-white">Analytics & Métricas de Funil</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { label: 'Total Iniciou', value: totalStarts, icon: <Users size={22}/>, color: 'indigo' },
          { label: 'Total Finalizou', value: totalFinished, icon: <CheckCircle2 size={22}/>, color: 'emerald' },
          { label: 'Taxa Conversão', value: `${convRate}%`, icon: <TrendingUp size={22}/>, color: 'purple' },
        ].map(kpi => (
          <div key={kpi.label} className="p-6 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-${kpi.color}-500/15 text-${kpi.color}-400 border border-${kpi.color}-500/20`}>{kpi.icon}</div>
            <p className="text-3xl font-bold text-white">{kpi.value}</p>
            <p className="text-sm text-slate-400 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {quizzes.map(q => {
          const a = analytics[q.id] || {};
          const rate = a.total_starts > 0 ? Math.round((a.total_finished / a.total_starts) * 100) : 0;
          return (
            <div key={q.id} className="p-6 bg-slate-800/40 border border-slate-700/50 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-white">{q.title}</h4>
                  <p className="text-xs text-slate-500">Quiz ID #{q.id}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-indigo-400">{rate}%</span>
                  <p className="text-xs text-slate-500">conclusão</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="text-center p-3 bg-slate-900/50 rounded-xl"><div className="font-bold text-blue-400 text-lg">{a.total_starts||0}</div><div className="text-slate-500 text-xs">Iniciaram</div></div>
                <div className="text-center p-3 bg-slate-900/50 rounded-xl"><div className="font-bold text-orange-400 text-lg">{Math.max(0,(a.total_starts||0)-(a.total_finished||0))}</div><div className="text-slate-500 text-xs">Abandonaram</div></div>
                <div className="text-center p-3 bg-slate-900/50 rounded-xl"><div className="font-bold text-emerald-400 text-lg">{a.total_finished||0}</div><div className="text-slate-500 text-xs">Finalizaram</div></div>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all" style={{width: `${rate}%`}}/>
              </div>
            </div>
          );
        })}
        {quizzes.length === 0 && <p className="text-slate-500 text-sm">Selecione um domínio e crie quizzes para ver as métricas.</p>}
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
                    <button onClick={() => del(t.id)} aria-label="Deletar tarefa" className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all shrink-0 cursor-pointer"><Trash2 size={13}/></button>
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
