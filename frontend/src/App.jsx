import React, { useState, useEffect } from 'react';


import QuizPreview from './QuizPreview';

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

// ─── Lead Intelligence: Coleta dispositivo, browser, OS e origem ──────────────
function collectLeadIntel() {
  const cached = localStorage.getItem('quiz_saas_lead_intel');
  if (cached) { try { return JSON.parse(cached); } catch {} }

  const ua = navigator.userAgent || '';
  // Device type
  let device_type = 'desktop';
  if (/Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) device_type = 'mobile';
  else if (/Tablet|iPad/i.test(ua)) device_type = 'tablet';
  // Browser
  let browser = 'other';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome\/\d/i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
  else if (/Firefox\/\d/i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/MSIE|Trident/i.test(ua)) browser = 'IE';
  // OS
  let os = 'other';
  if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  // UTM params
  const params = new URLSearchParams(window.location.search);
  const utm_source = params.get('utm_source') || (params.get('fbclid') ? 'facebook' : null) || (params.get('igshid') ? 'instagram' : null) || null;
  const utm_medium = params.get('utm_medium') || null;
  const utm_campaign = params.get('utm_campaign') || null;
  const referrer = document.referrer || null;

  const intel = { device_type, browser, os, utm_source, utm_medium, utm_campaign, referrer };
  localStorage.setItem('quiz_saas_lead_intel', JSON.stringify(intel));
  return intel;
}

function trackEvent(quizId, eventType, stepId = null, answerValue = null, timeSpent = 0) {
  const visitorId = getVisitorId();
  const cleanAnswer = stripHtml(answerValue);
  const body = { quiz_id: quizId, visitor_id: visitorId, event_type: eventType, step_id: stepId, answer_value: cleanAnswer, time_spent_seconds: timeSpent };
  // Include intel data on 'start' event
  if (eventType === 'start') {
    Object.assign(body, collectLeadIntel());
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
        // Dispara step_reached para o primeiro passo IMEDIATAMENTE ao carregar
        // Isso garante que leads que abandonam na primeira pergunta apareçam no Raio-X e Matriz
        const firstStep = data?.config?.steps?.[0];
        if (firstStep?.id) {
          trackEvent(quizId, 'step_reached', firstStep.id, null, 0);
        }
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

  const handleNavigate = (nextStepId, answerText = null, withLoading = false) => {
    const steps = quizData?.config?.steps || [];
    const idx = steps.findIndex(s => s.id === nextStepId);
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
        setTransitionLoading(true);
        setTimeout(() => {
          setCurrentStep(idx);
          setTransitionLoading(false);
        }, 600);
      } else {
        setCurrentStep(idx);
      }
    }
  };

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#020617',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:18}}>
      Carregando...
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
      {transitionLoading && (
        <div style={{
          position:'fixed', inset:0, zIndex:9999,
          display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:20,
          background:'rgba(2,6,23,0.92)',
          backdropFilter:'blur(8px)',
          animation:'fadeInOverlay 0.15s ease-out',
        }}>
          <style>{`
            @keyframes fadeInOverlay { from { opacity:0 } to { opacity:1 } }
            @keyframes spinRing { to { transform: rotate(360deg); } }
          `}</style>
          <div style={{
            width: 48, height: 48,
            border: '4px solid rgba(99,102,241,0.2)',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spinRing 0.7s linear infinite',
          }} />
        </div>
      )}
      <div style={{width:'100%',maxWidth:'440px',minHeight:'100vh'}}>
        <QuizPreview
          config={quizData.config}
          stepIdx={currentStep}
          compact={false}
          onNavigate={handleNavigate}
          quizId={quizData.quiz_id || quizData.id}
          visitorId={getVisitorId()}
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

  return (
    <React.Suspense fallback={<div style={{minHeight:'100vh',background:'#020617',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontFamily:'sans-serif'}}>Carregando painel...</div>}>
      <AdminApp />
    </React.Suspense>
  );
}


const AdminApp = React.lazy(() => import('./Admin'));
