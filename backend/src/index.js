require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

const { getDomains, createDomain } = require('./controllers/domainController');
const { getQuizzesByDomain, createQuiz, updateQuiz, deleteQuiz } = require('./controllers/quizController');
const { handleQuizRouting } = require('./controllers/routerController');
const { getTasks, createTask, updateTask, deleteTask } = require('./controllers/taskController');
const { getQuizAnalytics, trackEvent } = require('./controllers/analyticsController');

// --- Rotas API ---
app.post('/api/domains', createDomain);
app.get('/api/domains', getDomains);
app.get('/api/domains/:domainId/quizzes', getQuizzesByDomain);
app.post('/api/quizzes', createQuiz);
app.put('/api/quizzes/:id', updateQuiz);
app.delete('/api/quizzes/:id', deleteQuiz);

// Tasks
app.get('/api/tasks', getTasks);
app.post('/api/tasks', createTask);
app.put('/api/tasks/:id', updateTask);
app.delete('/api/tasks/:id', deleteTask);

// Analytics
app.get('/api/analytics/quiz/:quizId', getQuizAnalytics);
app.post('/api/analytics/track', trackEvent);

// --- Rota Principal Dinâmica (Motor Round Robin) ---
// Express 5 usa '/{*path}' para wildcard
app.all('/{*path}', handleQuizRouting);

const { getDB } = require('./db');

app.listen(PORT, async () => {
    try {
        await getDB();
        console.log(`[SERVER] Running on http://localhost:${PORT}`);
    } catch (error) {
        console.error('[SERVER] Startup failed:', error);
    }
});
