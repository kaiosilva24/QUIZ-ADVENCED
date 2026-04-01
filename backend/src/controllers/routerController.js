const { getDB } = require('../db');

const routeCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache

async function handleQuizRouting(req, res) {
    const slug = req.params.slug;

    // Fast-path: RAM Cache (bypassa o DB instantaneamente)
    const cached = routeCache.get(slug);
    if (cached && (Date.now() - cached.time < CACHE_TTL)) {
        res.setHeader('Content-Type', 'application/json');
        return res.json(cached.data);
    }

    try {
        const db = await getDB();

        let quiz = await db.get('SELECT id, config_json FROM quizzes WHERE slug = $1 AND is_active = TRUE', [slug]);

        if (!quiz && slug.startsWith('quiz-')) {
            const id = slug.replace('quiz-', '');
            if (!isNaN(id)) {
                quiz = await db.get('SELECT id, config_json FROM quizzes WHERE id = $1 AND is_active = TRUE', [id]);
            }
        }

        if (!quiz) {
            return res.status(404).json({ error: 'Quiz não encontrado ou inativo.' });
        }

        // Parse do JSON para enviar bonitinho pro front
        res.setHeader('Content-Type', 'application/json');
        const responseData = {
            quiz_id: quiz.id,
            config: JSON.parse(quiz.config_json || '{}')
        };
        
        // Save to Ram Cache
        routeCache.set(slug, { time: Date.now(), data: responseData });
        
        return res.json(responseData);

    } catch (error) {
        return res.status(500).json({ error: 'Erro interno no Roteador' });
    }
}

function clearRouterCache() {
    routeCache.clear();
}

module.exports = {
    handleQuizRouting,
    clearRouterCache
};
