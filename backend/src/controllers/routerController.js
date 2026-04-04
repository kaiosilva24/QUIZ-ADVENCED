const { getDB } = require('../db');

const routeCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache

// ─── Helpers ──────────────────────────────────────────────────────────────────
function stripImagesDeep(obj) {
    if (!obj || typeof obj !== 'object') return;
    for (const k of Object.keys(obj)) {
        if (typeof obj[k] === 'string' && obj[k].startsWith('data:image/')) {
            obj[k] = ''; // placeholder — será preenchido pelo prefetch completo
        } else if (typeof obj[k] === 'object') {
            stripImagesDeep(obj[k]);
        }
    }
}

// Obtém dados do cache RAM ou DB, preenchendo o cache se necessário
async function resolveQuizBySlug(slug) {
    // Fast-path: RAM cache
    const cached = routeCache.get(slug);
    if (cached && (Date.now() - cached.time < CACHE_TTL)) {
        return cached.data;
    }

    // Slow-path: DB
    const db = await getDB();
    let quiz = await db.get('SELECT id, config_json FROM quizzes WHERE slug = $1 AND is_active = TRUE', [slug]);

    if (!quiz && slug.startsWith('quiz-')) {
        const id = slug.replace('quiz-', '');
        if (!isNaN(id)) {
            quiz = await db.get('SELECT id, config_json FROM quizzes WHERE id = $1 AND is_active = TRUE', [id]);
        }
    }
    if (!quiz) return null;

    const responseData = {
        quiz_id: quiz.id,
        config: JSON.parse(quiz.config_json || '{}')
    };
    routeCache.set(slug, { time: Date.now(), data: responseData });
    return responseData;
}

// ─── Rota full: quiz completo (para o prefetch background e visitors com cache) ─
async function handleQuizRouting(req, res) {
    const slug = req.params.slug;
    try {
        const data = await resolveQuizBySlug(slug);
        if (!data) return res.status(404).json({ error: 'Quiz não encontrado ou inativo.' });
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
        return res.json(data);
    } catch (error) {
        return res.status(500).json({ error: 'Erro interno no Roteador' });
    }
}

// ─── Rota ultra-leve: entrega apenas a 1ª etapa (sem imagens) via RAM cache ──
// Resposta típica: ~10-20 KB em vez de 1+ MB — renderiza em <100ms
async function handleQuizFirstStep(req, res) {
    const slug = req.params.slug;
    try {
        const fullData = await resolveQuizBySlug(slug);
        if (!fullData) return res.status(404).json({ error: 'Quiz não encontrado.' });

        const steps = fullData.config?.steps || [];
        const firstStep = steps[0] ? JSON.parse(JSON.stringify(steps[0])) : null; // deep clone
        const settings = fullData.config?.settings || {};
        const theme = fullData.config?.theme || {};

        // Envia só o necessário para renderizar a 1ª tela sem imagens das etapas extras
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'public, max-age=10, stale-while-revalidate=60');
        return res.json({
            quiz_id: fullData.quiz_id,
            _fast: true,          // flag para o front saber que é resposta parcial
            config: {
                settings,
                theme,
                steps: firstStep ? [firstStep] : [],
                totalSteps: steps.length,
            }
        });
    } catch (error) {
        return res.status(500).json({ error: 'Erro interno no Roteador Fast' });
    }
}

function clearRouterCache() {
    routeCache.clear();
}

function warmRouterCache(slug, data) {
    routeCache.set(slug, { time: Date.now(), data: data });
}

// ─── SSR helper: resolve quiz da 1ª etapa para injeção no HTML ──────────────
// Suporta slug direto OU roundrobin (slug vazio = URL raiz)
async function resolveQuizForSSR(slug) {
    try {
        let fullData = null;

        if (slug) {
            // Slug direto
            fullData = await resolveQuizBySlug(slug);
        } else {
            // Roundrobin: pega o ID do quiz ativo
            const db = await getDB();
            const rr = await db.get('SELECT * FROM round_robin ORDER BY id LIMIT 1');
            if (!rr || !rr.is_active) return null;
            const quizIds = JSON.parse(rr.quiz_ids || '[]');
            if (!quizIds.length) return null;
            const idx = (rr.current_index || 0) % quizIds.length;
            const quizId = quizIds[idx];
            fullData = await resolveQuizBySlug(`quiz-${quizId}`);
        }

        if (!fullData) return null;

        // Retorna só a 1ª etapa (igual ao /fast)
        const steps = fullData.config?.steps || [];
        const firstStep = steps[0] ? JSON.parse(JSON.stringify(steps[0])) : null;
        return {
            quiz_id: fullData.quiz_id,
            _fast: true,
            _ssr: true,
            config: {
                settings: fullData.config?.settings || {},
                theme: fullData.config?.theme || {},
                steps: firstStep ? [firstStep] : [],
                totalSteps: steps.length,
            }
        };
    } catch (e) {
        return null;
    }
}

module.exports = {
    handleQuizRouting,
    handleQuizFirstStep,
    resolveQuizForSSR,
    clearRouterCache,
    warmRouterCache
};
