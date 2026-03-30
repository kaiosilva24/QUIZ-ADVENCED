const { getDB } = require('../db');

async function getQuizzes(req, res) {
    try {
        const db = await getDB();
        // Otimização: Não traz config_json inteiro, filtra só os dados necessários
        const quizzes = await db.all(`
            SELECT 
                id, title, slug, is_active, created_at,
                CASE WHEN config_json LIKE '%"saveProgress":true%' THEN true ELSE false END AS save_progress_enabled,
                CASE WHEN config_json LIKE '%"accent":"%' THEN substring(config_json from '"accent":"([^"]+)"') ELSE null END AS accent_color
            FROM quizzes 
            ORDER BY id DESC
        `);
        res.json(quizzes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function createQuiz(req, res) {
    const { title, config_json, slug } = req.body;
    try {
        const db = await getDB();
        
        // Se a pessoa não mandou um slug, a gente cria um a partir do titulo
        let finalSlug = slug;
        if (!finalSlug && title) {
            finalSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        }
        if (!finalSlug) finalSlug = 'quiz-' + Date.now();

        const row = await db.get(
            'INSERT INTO quizzes (title, slug, config_json) VALUES ($1, $2, $3) RETURNING id',
            [title || 'Novo Quiz', finalSlug, config_json || '{}']
        );
        res.status(201).json({ id: row.id, title, slug: finalSlug });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function updateQuiz(req, res) {
    const { id } = req.params;
    const { title, config_json, is_active, slug, client_updated_at } = req.body;
    try {
        const db = await getDB();
        const current = await db.get('SELECT slug, updated_at FROM quizzes WHERE id=$1', [id]);
        
        // Optimistic locking: se o cliente tem uma versao mais velha que o banco, rejeita
        if (client_updated_at && current?.updated_at) {
            const clientTs = new Date(client_updated_at).getTime();
            const dbTs = new Date(current.updated_at).getTime();
            if (dbTs > clientTs + 2000) { // 2s de tolerancia para clock skew
                const fresh = await db.get('SELECT id, title, slug, config_json, updated_at FROM quizzes WHERE id=$1', [id]);
                return res.status(409).json({
                    error: 'conflict',
                    message: 'Este quiz foi editado por outra pessoa. Salve sus alterações manualmente e recarregue.',
                    server_updated_at: fresh.updated_at,
                    server_config: JSON.parse(fresh.config_json || '{}'),
                    server_title: fresh.title
                });
            }
        }

        const finalSlug = slug !== undefined ? slug : current?.slug;
        const updated = await db.get(
            'UPDATE quizzes SET title=$1, config_json=$2, is_active=$3, slug=$4, updated_at=NOW() WHERE id=$5 RETURNING updated_at',
            [title, config_json, is_active !== undefined ? is_active : true, finalSlug, id]
        );
        res.json({ success: true, updated_at: updated?.updated_at });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function deleteQuiz(req, res) {
    const { id } = req.params;
    try {
        const db = await getDB();
        await db.run('DELETE FROM quizzes WHERE id=$1', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getQuizById(req, res) {
    const { id } = req.params;
    try {
        const db = await getDB();
        const quiz = await db.get('SELECT id, title, slug, config_json FROM quizzes WHERE id = $1 AND is_active = TRUE', [id]);
        console.log('[API] GET /api/quizzes/' + id + ' ->', quiz ? 'FOUND' : 'NOT FOUND');
        if (!quiz) return res.status(404).json({ error: 'Quiz não encontrado' });
        res.json({ quiz_id: quiz.id, id: quiz.id, title: quiz.title, slug: quiz.slug, config: JSON.parse(quiz.config_json || '{}') });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    getQuizzes: getQuizzes,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    getQuizById
};
