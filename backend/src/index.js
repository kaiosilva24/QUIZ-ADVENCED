require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// GZIP DEVE vir ANTES de cors para comprimir todas as respostas
app.use(compression({ level: 6 }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(cookieParser());

const { getDomains, createDomain } = require('./controllers/domainController');
const { getQuizzes, createQuiz, updateQuiz, deleteQuiz, getQuizById } = require('./controllers/quizController');
const { handleQuizRouting, handleQuizFirstStep } = require('./controllers/routerController');
const { getTasks, createTask, updateTask, deleteTask } = require('./controllers/taskController');
const { getQuizAnalytics, trackEvent, getAnalyticsOverview, getQuizLeads, getLeadIntelStats } = require('./controllers/analyticsController');
const { getRoundRobin, updateRoundRobin, getNextRoundRobinQuiz } = require('./controllers/roundRobinController');
const { getIntegrations, setIntegration, setQuizPixel, getQuizPixel } = require('./controllers/integrationsController');
const { login, register, listUsers, deleteUser, authMiddleware } = require('./controllers/authController');
const { trackMediaPulse, getMediaRetention } = require('./controllers/mediaAnalyticsController');

// --- Auth routes (public) ---
app.post('/api/auth/login', login);

// --- Rotas API (protegidas por JWT) ---
app.use('/api/auth/users', authMiddleware);
app.post('/api/auth/register', authMiddleware, register);
app.get('/api/auth/users', listUsers);
app.delete('/api/auth/users/:id', authMiddleware, deleteUser);

// --- Outras rotas protegidas ---
app.post('/api/domains', authMiddleware, createDomain);
app.get('/api/domains', authMiddleware, getDomains);
app.get('/api/quizzes', getQuizzes);
app.get('/api/quizzes/:id', getQuizById);
app.post('/api/quizzes', createQuiz);
app.put('/api/quizzes/:id', updateQuiz);
app.delete('/api/quizzes/:id', deleteQuiz);

// Tasks
app.get('/api/tasks', getTasks);
app.post('/api/tasks', createTask);
app.put('/api/tasks/:id', updateTask);
app.delete('/api/tasks/:id', deleteTask);

// Analytics
app.get('/api/analytics/overview', getAnalyticsOverview);
app.get('/api/analytics/quiz/:quizId', getQuizAnalytics);
app.get('/api/analytics/quiz/:quizId/leads', getQuizLeads);
app.get('/api/analytics/quiz/:quizId/media', getMediaRetention);
app.get('/api/analytics/quiz/:quizId/intel', getLeadIntelStats);
app.post('/api/analytics/track', trackEvent);
app.post('/api/analytics/media/pulse', trackMediaPulse);

// Round Robin A/B Test
app.get('/api/roundrobin', getRoundRobin);
app.put('/api/roundrobin', updateRoundRobin);
app.get('/api/roundrobin/next', getNextRoundRobinQuiz);

// Integrations (Meta Pixel, etc)
app.get('/api/integrations', getIntegrations);
app.put('/api/integrations', setIntegration);
app.get('/api/quizzes/:id/pixel', getQuizPixel);
app.put('/api/quizzes/:id/pixel', setQuizPixel);

// --- Rota por Slug (InLead Style) ---
app.get('/api/route/:slug', handleQuizRouting);
// --- Rota ultra-leve: só 1ª etapa via RAM cache (<20KB, sem DB) ---
app.get('/api/route/:slug/fast', handleQuizFirstStep);

// --- Servir Frontend Estático para TODAS AS OUTRAS rotas ---
const frontendPath = path.join(__dirname, '../../frontend/dist');
// Arquivos com hash no nome (JS/CSS/etc): cache de 1 ano, imutável
app.use(express.static(frontendPath, {
  maxAge: '1y',
  immutable: true,
  index: false, // CRÍTICO: impede o Express de servir index.html direto, forçando cair no nosso SSR
  setHeaders(res, filePath) {
    // index.html nunca deve ser cacheado pelo browser
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));


app.get('/{*path}', async (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();

    try {
        const htmlPath = path.join(frontendPath, 'index.html');
        let html = require('fs').readFileSync(htmlPath, 'utf-8');

        // Tenta injetar dados da 1ª etapa direto no HTML (SSR-lite)
        // Elimina o waterfall HTML→JS→API→render
        const { handleQuizFirstStep: _, ...routerCtrl } = require('./controllers/routerController');
        const { resolveQuizForSSR } = require('./controllers/routerController');

        if (resolveQuizForSSR) {
            const slug = req.path.replace(/^\//, '').replace(/\/.*$/, '') || '';
            const fastData = await resolveQuizForSSR(slug).catch(() => null);
            if (fastData) {
                // Injeta no HTML como window.__QUIZ_SSR__ — React usa sem fetch
                const jsonStr = JSON.stringify(fastData).replace(/<\/script>/gi, '<\\/script>');
                html = html.replace(
                    '<script>',
                    `<script>window.__QUIZ_SSR__=${jsonStr};</script><script>`
                );
            }
        }

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(html);
    } catch (e) {
        // Fallback: serve estático normalmente
        res.sendFile(path.join(frontendPath, 'index.html'));
    }
});

// ─── Global error handler ─────────────────────────────────────────────────────
// Suppress "BadRequestError: request aborted" — this happens when the user
// closes the tab while a request body is still being parsed (e.g., analytics
// pings during video playback). It is 100% expected and not a real error.
app.use((err, req, res, next) => {
    if (
        err.type === 'request.aborted' ||
        err.message === 'request aborted' ||
        err.status === 400 && err.body === undefined
    ) {
        // Silent: don't respond and don't log
        return;
    }
    console.error('[SERVER] Unhandled error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
});


const { getDB } = require('./db');

// ─── Cache Warm-up: pré-carrega todos os quizzes ativos na RAM ao iniciar ──────
async function warmUpCache() {
    try {
        const db = await getDB();
        const quizzes = await db.all('SELECT id, title, slug, config_json FROM quizzes WHERE is_active = TRUE ORDER BY id');
        const { warmRouterCache } = require('./controllers/routerController');
        const { warmQuizCache } = require('./controllers/quizController');
        let count = 0;
        for (const quiz of quizzes) {
            const config = JSON.parse(quiz.config_json || '{}');
            const data = { quiz_id: quiz.id, id: quiz.id, title: quiz.title, slug: quiz.slug, config };
            warmQuizCache(String(quiz.id), data);
            if (quiz.slug) warmRouterCache(quiz.slug, { quiz_id: quiz.id, config });
            // também registra o slug quiz-{id}
            warmRouterCache(`quiz-${quiz.id}`, { quiz_id: quiz.id, config });
            count++;
        }
        console.log(`[CACHE] Warm-up concluído: ${count} quiz(zes) em RAM.`);
    } catch (e) {
        console.warn('[CACHE] Warm-up falhou (não crítico):', e.message);
    }
}

app.listen(PORT, async () => {
    try {
        await getDB();
        console.log(`[SERVER] Running on http://localhost:${PORT}`);
        // Warm-up async — não bloqueia o servidor de aceitar requests
        warmUpCache();
    } catch (error) {
        console.error('[SERVER] Startup failed:', error);
    }
});
