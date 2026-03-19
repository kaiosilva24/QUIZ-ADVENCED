const fs = require('fs');
const path = require('path');

const adminFile = path.join(__dirname, 'frontend', 'src', 'Admin.jsx');
let content = fs.readFileSync(adminFile, 'utf8');

// 1. Injetar import do Recharts se não existir
if (!content.includes("from 'recharts'")) {
    content = content.replace(
        "import QuizBuilder from './QuizBuilder';",
        "import QuizBuilder from './QuizBuilder';\nimport { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';"
    );
}

// 2. Adicionar mediaMetrics ao AnalyticsView
if (!content.includes('const [mediaMetrics, setMediaMetrics] = useState(null);')) {
    content = content.replace(
        'const [selectedQuiz, setSelectedQuiz] = useState(null);',
        "const [selectedQuiz, setSelectedQuiz] = useState(null);\n  const [mediaMetrics, setMediaMetrics] = useState(null);\n  const [activeTab, setActiveTab] = useState('geral');"
    );
}

// 3. Atualizar o loadQuizDetail
if (!content.includes('fetch(`/api/analytics/quiz/${quiz.id}/media`)')) {
    content = content.replace(
        `fetch(\`/api/quizzes/\${quiz.id}\`).then(r => r.json())`,
        `fetch(\`/api/quizzes/\${quiz.id}\`).then(r => r.json()),\n      fetch(\`/api/analytics/quiz/\${quiz.id}/media\`).then(r => r.json())`
    );
    content = content.replace(
        `then(([detailData, leadsData, quizData]) => {`,
        `then(([detailData, leadsData, quizData, mediaData]) => {\n      setMediaMetrics(mediaData);\n      setActiveTab('geral');`
    );
}

// 4. Injetar as Tabs e a View de Mídia no AnalyticsView Header Computado
const injectTabsStr = `
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
            <button onClick={() => setActiveTab('geral')} className={\`px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer \${activeTab === 'geral' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}\`}>Visão Funil</button>
            <button onClick={() => setActiveTab('midia')} className={\`px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer \${activeTab === 'midia' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}\`}>Retenção de Mídia</button>
          </div>
        </div>
`;

if (!content.includes('setActiveTab(\'geral\')')) {
    content = content.replace(
        /<div className="flex items-center gap-4 border-b border-indigo-500\/20 pb-4">[\s\S]*?<\/div>[\s\S]*?<\/div>/,
        injectTabsStr
    );
}

// 5. Injetar renderização de Mídia (Panda Video View)
const mediaRenderCode = `
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
                    // Encontra a qual passo pertence e que tipo provavel
                    let bName = 'Bloco de Mídia';
                    let typeIcon = <PlayCircle size={14}/>;
                    if (quizDetail.config && quizDetail.config.steps) {
                      for (const st of quizDetail.config.steps) {
                        const b = st.blocks?.find(x => x.id === blockId);
                        if (b) {
                          bName = (quizDetail.stepNaming?.[st.id] || st.label) + ' - ' + (b.type === 'audio' ? 'Áudio (Wpp)' : 'Vídeo VSL');
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
                                  <linearGradient id={\`colorRet\${blockId}\`} x1="0" y1="0" x2="0" y2="1">
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
                                <Area yAxisId="left" type="monotone" dataKey="views" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill={\`url(#colorRet\${blockId})\`} activeDot={{r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2}} />
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
`;

if (!content.includes('Central de Retenção (Estilo Panda')) {
    content = content.replace(
        '{/* Grid Superior: Executive Summary */}',
        mediaRenderCode + '\n{/* Grid Superior: Executive Summary */}'
    );
    // Fechar o ternário }
    content = content.replace(
        '</>',
        '</>\n            )}'
    );
}

fs.writeFileSync(adminFile, content);
console.log('Admin.jsx patched successfully');
