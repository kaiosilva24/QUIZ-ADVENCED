const { getDB } = require('../db');

// POST /api/analytics/track — Registra evento de lead (start, step_reached, finished, dropped)
async function trackEvent(req, res) {
    const { quiz_id, visitor_id, event_type, step_id, answer_value, time_spent_seconds } = req.body;
    try {
        const db = await getDB();
        await db.run(
            'INSERT INTO quiz_events (quiz_id, visitor_id, event_type, step_id, answer_value, time_spent_seconds) VALUES ($1,$2,$3,$4,$5,$6)',
            [quiz_id, visitor_id, event_type, step_id || null, answer_value || null, time_spent_seconds || 0]
        );
        res.status(201).json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// GET /api/analytics/quiz/:quizId — Detalhes de um quiz específico
async function getQuizAnalytics(req, res) {
    const { quizId } = req.params;
    try {
        const db = await getDB();
        
        const total = await db.get(
            "SELECT COUNT(DISTINCT visitor_id) as count FROM quiz_events WHERE quiz_id=$1 AND event_type='start'",
            [quizId]
        );
        const finished = await db.get(
            "SELECT COUNT(DISTINCT visitor_id) as count FROM quiz_events WHERE quiz_id=$1 AND event_type='finished'",
            [quizId]
        );
        
        // Drop-off por etapa (quantos chegaram até cada step)
        const stepFunnel = await db.all(
            `SELECT step_id,
                COUNT(DISTINCT visitor_id) as visitors,
                ROUND(AVG(time_spent_seconds), 1) as avg_time_seconds
             FROM quiz_events
             WHERE quiz_id=$1 AND event_type='step_reached'
             GROUP BY step_id
             ORDER BY visitors DESC`,
            [quizId]
        );

        // Contagem de respostas por etapa (qual opção foi mais selecionada)
        const answerCounts = await db.all(
            `SELECT step_id, answer_value,
                COUNT(*) as count
             FROM quiz_events
             WHERE quiz_id=$1 AND event_type='step_reached' AND answer_value IS NOT NULL
             GROUP BY step_id, answer_value
             ORDER BY step_id, count DESC`,
            [quizId]
        );
        
        // Agrupa respostas por etapa
        const answersByStep = {};
        for (const row of answerCounts) {
            if (!answersByStep[row.step_id]) answersByStep[row.step_id] = [];
            answersByStep[row.step_id].push({ answer: row.answer_value, count: parseInt(row.count) });
        }

        res.json({
            total_starts: parseInt(total?.count || 0),
            total_finished: parseInt(finished?.count || 0),
            conversion_rate: parseInt(total?.count || 0) > 0 ? Math.round((parseInt(finished?.count || 0) / parseInt(total?.count || 0)) * 100) : 0,
            step_funnel: stepFunnel.map(s => ({
                step_id: s.step_id,
                visitors: parseInt(s.visitors),
                avg_time_seconds: parseFloat(s.avg_time_seconds || 0)
            })),
            answers_by_step: answersByStep
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// GET /api/analytics/overview — Visão global de todos os quizzes
async function getAnalyticsOverview(req, res) {
    try {
        const db = await getDB();

        // Global stats
        const globalStarts = await db.get("SELECT COUNT(DISTINCT visitor_id) as count FROM quiz_events WHERE event_type='start'");
        const globalFinishes = await db.get("SELECT COUNT(DISTINCT visitor_id) as count FROM quiz_events WHERE event_type='finished'");

        const total_leads = parseInt(globalStarts?.count || 0);
        const total_finished = parseInt(globalFinishes?.count || 0);
        const global_conversion_rate = total_leads > 0 ? Math.round((total_finished / total_leads) * 100) : 0;

        // Stats por quiz
        const quizzesStats = await db.all(`
            SELECT q.id, q.title, q.slug,
                   COUNT(DISTINCT CASE WHEN e.event_type = 'start' THEN e.visitor_id END) as starts,
                   COUNT(DISTINCT CASE WHEN e.event_type = 'finished' THEN e.visitor_id END) as finishes,
                   ROUND(AVG(CASE WHEN e.event_type = 'step_reached' THEN e.time_spent_seconds END), 1) as avg_time
            FROM quizzes q
            LEFT JOIN quiz_events e ON q.id = e.quiz_id
            GROUP BY q.id, q.title, q.slug
            ORDER BY starts DESC
        `);

        res.json({
            overview: {
                total_leads,
                total_finished,
                conversion_rate: global_conversion_rate
            },
            quizzes: quizzesStats.map(q => ({
                id: q.id,
                title: q.title,
                slug: q.slug,
                starts: parseInt(q.starts || 0),
                finishes: parseInt(q.finishes || 0),
                avg_time_seconds: parseFloat(q.avg_time || 0),
                conversion_rate: parseInt(q.starts || 0) > 0 ? Math.round((parseInt(q.finishes || 0) / parseInt(q.starts || 0)) * 100) : 0
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = { getQuizAnalytics, trackEvent, getAnalyticsOverview };
