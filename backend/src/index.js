require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use(cookieParser());

const { getDomains, createDomain } = require('./controllers/domainController');
const { getQuizzes, createQuiz, updateQuiz, deleteQuiz, getQuizById } = require('./controllers/quizController');
const { handleQuizRouting } = require('./controllers/routerController');
const { getTasks, createTask, updateTask, deleteTask } = require('./controllers/taskController');
const { getQuizAnalytics, trackEvent, getAnalyticsOverview } = require('./controllers/analyticsController');
const { getRoundRobin, updateRoundRobin, getNextRoundRobinQuiz } = require('./controllers/roundRobinController');

// --- Rotas API ---
app.post('/api/domains', createDomain);
app.get('/api/domains', getDomains);
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
app.post('/api/analytics/track', trackEvent);

// Round Robin A/B Test
app.get('/api/roundrobin', getRoundRobin);
app.put('/api/roundrobin', updateRoundRobin);
app.get('/api/roundrobin/next', getNextRoundRobinQuiz);

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
