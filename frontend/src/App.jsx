import React, { useState, useEffect } from 'react';

const QuizPreview = React.lazy(() => import('./QuizPreview'));

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

// ─── Lead Intelligence: Coleta dispositivo, browser, OS, origem e geo ────────
async function collectLeadIntel() {
  const cached = localStorage.getItem('quiz_saas_lead_intel');
  if (cached) { 
    try { 
      const parsed = JSON.parse(cached); 
      if (parsed.city) return parsed;
    } catch {} 
  }

  const ua = navigator.userAgent || '';
  let device_type = 'desktop';
  if (/Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) device_type = 'mobile';
  else if (/Tablet|iPad/i.test(ua)) device_type = 'tablet';
  let browser = 'other';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome\/\d/i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
  else if (/Firefox\/\d/i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/MSIE|Trident/i.test(ua)) browser = 'IE';
  let os = 'other';
  if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  const params = new URLSearchParams(window.location.search);
  const utm_source = params.get('utm_source') || (params.get('fbclid') ? 'facebook' : null) || (params.get('igshid') ? 'instagram' : null) || null;
  const utm_medium = params.get('utm_medium') || null;
  const utm_campaign = params.get('utm_campaign') || null;
  const referrer = document.referrer || null;

  // Dados sem geo — salvamos primeiro para não atrasar o render
  const baseIntel = { device_type, browser, os, utm_source, utm_medium, utm_campaign, referrer, city: null, state: null, country: null };
  localStorage.setItem('quiz_saas_lead_intel', JSON.stringify(baseIntel));

  // Geo é buscado em background, sem bloquear nada
  fetch('https://get.geojs.io/v1/ip/geo.json', { signal: AbortSignal.timeout(4000) })
    .then(r => r.json())
    .then(geoJson => {
      if (geoJson.city) {
        const full = { ...baseIntel, city: geoJson.city || null, state: geoJson.region || null, country: geoJson.country_code || null };
        localStorage.setItem('quiz_saas_lead_intel', JSON.stringify(full));
      }
    })
    .catch(() => {});

  return baseIntel;
}

function trackEvent(quizId, eventType, stepId = null, answerValue = null, timeSpent = 0) {
  const visitorId = getVisitorId();
  const cleanAnswer = stripHtml(answerValue);
  const body = { quiz_id: quizId, visitor_id: visitorId, event_type: eventType, step_id: stepId, answer_value: cleanAnswer, time_spent_seconds: timeSpent };
  // Para 'start': envia o que já tem no cache (sem esperar geo)
  if (eventType === 'start') {
    try {
      const cached = localStorage.getItem('quiz_saas_lead_intel');
      if (cached) Object.assign(body, JSON.parse(cached));
    } catch {}
    // Dispara em background sem bloquear
    collectLeadIntel();
  }
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).catch(() => {}); // fire-and-forget
}
// ─── Componente Roteador de Quizzes por Slug (InLead Style) ──────────────────
function QuizRouter() {
  const [quizData, setQuizData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(null);
  const [scores, setScores] = useState({});
  const stepStartTime = React.useRef(Date.now());

  // Chaves slug-aware: /novo-quiz e /live não conflitam
  const pathSlug = window.location.pathname.replace(/^\//, '').replace(/\/.*$/, '') || 'root';
  const QUIZ_ID_KEY = `quiz_saas_lead_quiz_id_${pathSlug}`;
  const QUIZ_TIME_KEY = `quiz_saas_lead_quiz_time_${pathSlug}`;
  const STEP_KEY_PREFIX = 'quiz_saas_step_';
  const pixelInjected = React.useRef(false);

  useEffect(() => {
    const now = Date.now();
    const params = new URLSearchParams(window.location.search);
    const forceNew = params.get('novo') === '1'; // ?novo=1 limpa cache

    if (forceNew) {
      localStorage.removeItem(QUIZ_ID_KEY);
      localStorage.removeItem(QUIZ_TIME_KEY);
      // Limpa também chaves legadas sem slug
      localStorage.removeItem('quiz_saas_lead_quiz_id');
      localStorage.removeItem('quiz_saas_lead_quiz_time');
      window.history.replaceState(null, '', window.location.pathname);
    }

    const savedQuizId = localStorage.getItem(QUIZ_ID_KEY);
    const savedTime = localStorage.getItem(QUIZ_TIME_KEY);
    const isValid = !forceNew && savedQuizId && savedTime && (now - parseInt(savedTime)) < 7 * 24 * 60 * 60 * 1000;

    if (isValid) {
      fetch(`/api/quizzes/${savedQuizId}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setQuizData(data);
            const shouldSaveProgress = data.config?.settings?.saveProgress === true;
            const savedStep = localStorage.getItem(STEP_KEY_PREFIX + savedQuizId);
            if (shouldSaveProgress && savedStep) {
              setCurrentStep(parseInt(savedStep));
            } else {
              setCurrentStep(0);
            }
          } else {
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
    const slug = window.location.pathname.replace(/^\//, '').replace(/\/.*$/, '');
    const fastEndpoint = slug ? `/api/route/${encodeURIComponent(slug)}/fast` : null;
    const normalEndpoint = slug ? `/api/route/${encodeURIComponent(slug)}` : '/api/roundrobin/next';
    const now = Date.now();

    // Usa o prefetch que foi iniciado no HTML (enquanto o bundle JS carregava)
    // Se já estiver pronto: zero espera. Se ainda estiver em andamento: aguarda o resto.
    const prefetchPromise = window.__QUIZ_PREFETCH__ && slug && !slug.startsWith('admin')
      ? window.__QUIZ_PREFETCH__
      : fetch(fastEndpoint || normalEndpoint).then(r => r.ok ? r.json() : null);

    // Limpa para não reutilizar em navigate futuros
    window.__QUIZ_PREFETCH__ = null;

    prefetchPromise
      .then(data => {
        if (!data) {
          // fallback: tenta rota normal
          return fetch(normalEndpoint).then(r => r.ok ? r.json() : null);
        }
        return data;
      })
      .then(data => {
        if (!data) { setError('NO_QUIZ_CONFIGURED'); setLoading(false); return; }
        const quizId = data.quiz_id || data.id;
        localStorage.setItem(QUIZ_ID_KEY, String(quizId));
        localStorage.setItem(QUIZ_TIME_KEY, now.toString());
        setQuizData(data);
        setLoading(false);
        trackEvent(quizId, 'start', null, null, 0);
        const firstStep = data?.config?.steps?.[0];
        if (firstStep?.id) trackEvent(quizId, 'step_reached', firstStep.id, null, 0);
        // Busca o quiz completo em background imediatamente (has tempo enquanto lendo)
        if ((data._fast || data._stripped) && slug) {
          fetch(`/api/route/${encodeURIComponent(slug)}`)
            .then(r => r.ok ? r.json() : null)
            .then(fullData => { if (fullData) setQuizData(fullData); })
            .catch(() => {});
        }
      })
      .catch(() => {
        setError('SERVER_ERROR');
        setLoading(false);
      });
  };

  // Trava do botão voltar (agora dependendo da configuração)
  useEffect(() => {
    if (!quizData) return;
    const shouldSaveProgress = quizData.config?.settings?.saveProgress === true;
    
    if (shouldSaveProgress) {
      window.history.pushState(null, '', window.location.href);
      const handlePopState = () => window.history.pushState(null, '', window.location.href);
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [quizData]);

  // Persistir passo atual a cada mudança (mas apenas se a config permitir)
  useEffect(() => {
    if (quizData) {
      const quizId = quizData.quiz_id || quizData.id;
      const shouldSaveProgress = quizData.config?.settings?.saveProgress === true;
      if (shouldSaveProgress) {
        localStorage.setItem(STEP_KEY_PREFIX + quizId, currentStep.toString());
      } else {
        localStorage.removeItem(STEP_KEY_PREFIX + quizId);
      }
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

  const handleNavigate = (nextStepId, answerText = null, withLoading = false, scoreTarget = null) => {
    const steps = quizData?.config?.steps || [];
    const idx = steps.findIndex(s => s.id === nextStepId);
    
    if (scoreTarget) {
      setScores(prev => ({ ...prev, [scoreTarget]: (prev[scoreTarget] || 0) + 1 }));
    }

    if (idx >= 0) {
      const timeSpent = Math.round((Date.now() - stepStartTime.current) / 1000);
      const quizId = quizData.quiz_id || quizData.id;
      const currentStepObj = steps[currentStep];

      let finalAnswer = answerText;
      if (!finalAnswer && currentStepObj && currentStepObj.blocks) {
        const clickedBtn = currentStepObj.blocks.find(
          b => (b.type === 'button' || b.type === 'arrow_button') && b.nextStep === nextStepId
        );
        if (clickedBtn && clickedBtn.text) {
          finalAnswer = clickedBtn.text;
        }
      }

      trackEvent(quizId, 'step_reached', currentStepObj?.id, finalAnswer, timeSpent);
      stepStartTime.current = Date.now();

      if (idx === steps.length - 1) {
        trackEvent(quizId, 'finished', nextStepId, null, 0);
        if (window.fbq) window.fbq('track', 'Lead');
      }

      if (withLoading) {
        const cfg = typeof withLoading === 'object' ? withLoading : {};
        const dur = (cfg.loadingDuration || 3) * 1000;
        setLoadingConfig(cfg);
        setTransitionLoading(true);
        setTimeout(() => {
          setCurrentStep(idx);
          setTransitionLoading(false);
          setLoadingConfig(null);
        }, dur);
      } else {
        setCurrentStep(idx);
      }
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100%', backgroundColor: '#020617' }}>
      <div style={{ width: 40, height: 40, border: '4px solid rgba(99, 102, 241, 0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'globalSpin 1s linear infinite' }} />
      <style>{`@keyframes globalSpin { to { transform: rotate(360deg); } }`}</style>
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
    <div style={{minHeight:'100vh',width:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#000',position:'relative'}}>
      {transitionLoading && (() => {
        const cfg = loadingConfig || {};
        const style = cfg.loadingStyle || 'spinner';
        const color = cfg.loadingColor || '#6366f1';
        return (
          <div style={{
            position:'fixed', inset:0, zIndex:9999,
            display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:20,
            background:'rgba(2,6,23,0.95)',
            backdropFilter:'blur(8px)',
            animation:'fadeInOverlay 0.15s ease-out',
          }}>
            <style>{`
              @keyframes fadeInOverlay { from { opacity:0 } to { opacity:1 } }
              @keyframes spinRing { to { transform: rotate(360deg); } }
              @keyframes quizPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: .7; } }
              @keyframes quizBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
            `}</style>
            {style === 'spinner' && (
              <div style={{ width:48, height:48, border:`4px solid ${color}30`, borderTopColor:color, borderRadius:'50%', animation:'spinRing 0.7s linear infinite' }} />
            )}
            {style === 'pulse' && (
              <div style={{ width:56, height:56, background:`${color}20`, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', animation:'quizPulse 1.5s ease-in-out infinite' }}>
                <div style={{ width:'50%', height:'50%', background:color, borderRadius:'50%' }} />
              </div>
            )}
            {style === 'dots' && (
              <div style={{ display:'flex', gap:8 }}>
                {[0,1,2].map(i => <div key={i} style={{ width:12, height:12, background:color, borderRadius:'50%', animation:`quizBounce 0.6s infinite ${i*0.1}s alternate` }} />)}
              </div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:8, textAlign:'center' }}>
              {cfg.loadingText && <p style={{ color:'#fff', fontWeight:700, fontSize:18, margin:0 }}>{cfg.loadingText}</p>}
              {cfg.progressText && <p style={{ color:'#94a3b8', fontSize:14, margin:0 }}>{cfg.progressText}</p>}
            </div>
          </div>
        );
      })()}
      <div style={{width:'100%',maxWidth:'440px',minHeight:'100vh'}}>
        <React.Suspense fallback={<div style={{minHeight:'100vh',background:'#020617'}} />}>
          <QuizPreview
            config={quizData.config}
            stepIdx={currentStep}
            compact={false}
            onNavigate={handleNavigate}
            quizId={quizData.quiz_id || quizData.id}
            visitorId={getVisitorId()}
            scores={scores}
            isLive={true}
          />
        </React.Suspense>
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

  return (
    <React.Suspense fallback={<div style={{minHeight:'100vh',background:'#020617',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontFamily:'sans-serif'}}>Carregando painel...</div>}>
      <AdminApp />
    </React.Suspense>
  );
}


const AdminApp = React.lazy(() => import('./Admin'));
