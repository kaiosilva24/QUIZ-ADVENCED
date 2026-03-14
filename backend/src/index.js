require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', credentials: true }));
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

// --- Servir Frontend Estático ---
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

// --- Rota Principal Dinâmica (Motor Round Robin) ---
// Esta rota só serve quizzes para domínios externos. O painel admin é servido pelo React.
app.get('/{*path}', (req, res, next) => {
    const hostname = req.hostname;
    const isAdminDomain = hostname.includes('discloud.app') || hostname === 'localhost';
    
    if (isAdminDomain) {
        // Serve o painel React (index.html) para o domínio principal
        return res.sendFile(path.join(frontendPath, 'index.html'));
    }

    // Para outros domínios customizados, usa o roteador de quizzes
    return handleQuizRouting(req, res, next);
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
