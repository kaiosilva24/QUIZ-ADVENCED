const crypto = require('crypto');
const { getDB } = require('../db');
const { clearRouterCache } = require('./routerController');
const { clearRoundRobinCache } = require('./roundRobinController');
const { deepCompressObj } = require('../utils/imageUtils');

const memQuizCache = new Map();
const QUIZ_CACHE_TTL = 10 * 60 * 1000;

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
    let { title, config_json, slug } = req.body;
    try {
        const db = await getDB();
        
        let finalSlug = slug;
        if (!finalSlug && title) {
            finalSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        }
        if (!finalSlug) finalSlug = 'quiz-' + Date.now();

        // Compressão profunda caso o front tenha enviado base64 gigantes (logo, fundos, etc)
        if (config_json && typeof config_json === 'string') {
           const parsed = JSON.parse(config_json);
           await deepCompressObj(parsed);
           config_json = JSON.stringify(parsed);
        }

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
        
        // Compressão profunda para blindar o banco de imagens gigantes do BlockEditor
        let finalConfigJson = config_json;
        if (finalConfigJson && typeof finalConfigJson === 'string') {
             try {
                 const parsed = JSON.parse(finalConfigJson);
                 await deepCompressObj(parsed);
                 finalConfigJson = JSON.stringify(parsed);
             } catch(e) {
                 console.error('[COMPRESSOR] Parse error block in quiz update', e.message);
             }
        }
        
        const updated = await db.get(
            'UPDATE quizzes SET title=$1, config_json=$2, is_active=$3, slug=$4, updated_at=NOW() WHERE id=$5 RETURNING updated_at',
            [title, finalConfigJson, is_active !== undefined ? is_active : true, finalSlug, id]
        );
        
        // Invalidate in-memory caches instantly across all APIs
        clearRouterCache();
        clearRoundRobinCache();
        memQuizCache.clear();
        
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
    
    // Fast Path: bypass DB for returning visitors
    const cached = memQuizCache.get(id);
    if (cached && (Date.now() - cached.time < QUIZ_CACHE_TTL)) {
        res.setHeader('Content-Type', 'application/json');
        return res.json(cached.data);
    }

    try {
        const db = await getDB();
        const quiz = await db.get('SELECT id, title, slug, config_json FROM quizzes WHERE id = $1 AND is_active = TRUE', [id]);
        
        if (!quiz) return res.status(404).json({ error: 'Quiz não encontrado' });
        
        const responseData = { quiz_id: quiz.id, id: quiz.id, title: quiz.title, slug: quiz.slug, config: JSON.parse(quiz.config_json || '{}') };
        
        memQuizCache.set(id, { time: Date.now(), data: responseData });
        
        res.setHeader('Content-Type', 'application/json');
        res.json(responseData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

function warmQuizCache(id, data) {
    memQuizCache.set(id, { time: Date.now(), data: data });
}

module.exports = {
    getQuizzes: getQuizzes,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    getQuizById,
    warmQuizCache
};
