require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({ origin: '*', credentials: true }));
app.use(compression()); // Shrink 20MB duplicate base64 down to 1MB!
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(cookieParser());

const { getDomains, createDomain } = require('./controllers/domainController');
const { getQuizzes, createQuiz, updateQuiz, deleteQuiz, getQuizById } = require('./controllers/quizController');
const { handleQuizRouting } = require('./controllers/routerController');
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

// --- Servir Frontend Estático para TODAS AS OUTRAS rotas ---
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

app.get('/{*path}', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(frontendPath, 'index.html'));
});

const { getDB } = require('./db');

app.listen(PORT, async () => {
    try {
        await getDB();
        console.log(`[SERVER] Running on http://localhost:${PORT}`);
    } catch (error) {
        console.error('[SERVER] Startup failed:', error);
    }
});
