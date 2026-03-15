const { getDB } = require('../db');

async function getQuizAnalytics(req, res) {
    const { quizId } = req.params;
    try {
        const db = await getDB();
        const total = await db.get('SELECT COUNT(DISTINCT visitor_id) as count FROM quiz_events WHERE quiz_id=$1 AND event_type=\'start\'', [quizId]);
        const finished = await db.get('SELECT COUNT(DISTINCT visitor_id) as count FROM quiz_events WHERE quiz_id=$1 AND event_type=\'finished\'', [quizId]);
        const stepDropoffs = await db.all(
            'SELECT step_id, COUNT(DISTINCT visitor_id) as count FROM quiz_events WHERE quiz_id=$1 AND event_type=\'step_reached\' GROUP BY step_id ORDER BY count DESC',
            [quizId]
        );
        res.json({ total_starts: total.count, total_finished: finished.count, step_dropoffs: stepDropoffs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function trackEvent(req, res) {
    const { quiz_id, visitor_id, event_type, step_id, answer_value } = req.body;
    try {
        const db = await getDB();
        // Em bd analítico o RETURNING id raramente é usado no response, mas podemos omitir se não for usado. Mantemos .run pq mapeamos ok.
        await db.run(
            'INSERT INTO quiz_events (quiz_id, visitor_id, event_type, step_id, answer_value) VALUES ($1,$2,$3,$4,$5)',
            [quiz_id, visitor_id, event_type, step_id || null, answer_value || null]
        );
        res.status(201).json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getAnalyticsOverview(req, res) {
    try {
        const db = await getDB();
        
        // Global stats
        const globalStarts = await db.get("SELECT COUNT(DISTINCT visitor_id) as count FROM quiz_events WHERE event_type='start'");
        const globalFinishes = await db.get("SELECT COUNT(DISTINCT visitor_id) as count FROM quiz_events WHERE event_type='finished'");
        
        const total_leads = parseInt(globalStarts?.count || 0);
        const total_finished = parseInt(globalFinishes?.count || 0);
        const global_conversion_rate = total_leads > 0 ? Math.round((total_finished / total_leads) * 100) : 0;

        // Quiz specifics
        const quizzesStats = await db.all(`
            SELECT q.id, q.title, q.slug, 
                   COUNT(DISTINCT CASE WHEN e.event_type = 'start' THEN e.visitor_id END) as starts,
                   COUNT(DISTINCT CASE WHEN e.event_type = 'finished' THEN e.visitor_id END) as finishes
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
                conversion_rate: parseInt(q.starts || 0) > 0 ? Math.round((parseInt(q.finishes || 0) / parseInt(q.starts || 0)) * 100) : 0
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = { getQuizAnalytics, trackEvent, getAnalyticsOverview };
