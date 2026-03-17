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
        
        // Concurrency pra melhorar o ping
        const [total, finished, stepFunnel, answerCounts] = await Promise.all([
            db.get(
                "SELECT COUNT(DISTINCT visitor_id) as count FROM quiz_events WHERE quiz_id=$1 AND event_type='start'",
                [quizId]
            ),
            db.get(
                "SELECT COUNT(DISTINCT visitor_id) as count FROM quiz_events WHERE quiz_id=$1 AND event_type='finished'",
                [quizId]
            ),
            db.all(
                `SELECT step_id,
                    COUNT(DISTINCT visitor_id) as visitors,
                    ROUND(AVG(max_time), 1) as avg_time_seconds
                 FROM (
                   SELECT step_id, visitor_id, MAX(time_spent_seconds) as max_time
                   FROM quiz_events
                   WHERE quiz_id=$1 AND event_type='step_reached'
                   GROUP BY step_id, visitor_id
                 ) sub
                 GROUP BY step_id
                 ORDER BY visitors DESC`,
                [quizId]
            ),
            db.all(
                `SELECT step_id, answer_value,
                    COUNT(*) as count
                 FROM quiz_events
                 WHERE quiz_id=$1 AND event_type='step_reached' AND answer_value IS NOT NULL
                 GROUP BY step_id, answer_value
                 ORDER BY step_id, count DESC`,
                [quizId]
            )
        ]);
        
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

        // Rodar as 3 queries em paralelo com Promise.all para evitar gargalo de ping com servidor
        const [globalStarts, globalFinishes, quizzesStats] = await Promise.all([
             db.get("SELECT COUNT(DISTINCT visitor_id) as count FROM quiz_events WHERE event_type='start'"),
             db.get("SELECT COUNT(DISTINCT visitor_id) as count FROM quiz_events WHERE event_type='finished'"),
             db.all(`
                 SELECT q.id, q.title, q.slug,
                        COUNT(DISTINCT CASE WHEN e.event_type = 'start' THEN e.visitor_id END) as starts,
                        COUNT(DISTINCT CASE WHEN e.event_type = 'finished' THEN e.visitor_id END) as finishes,
                        ROUND(AVG(CASE WHEN e.event_type = 'step_reached' THEN e.time_spent_seconds END), 1) as avg_time
                 FROM quizzes q
                 LEFT JOIN quiz_events e ON q.id = e.quiz_id
                 GROUP BY q.id, q.title, q.slug
                 ORDER BY starts DESC
             `)
        ]);

        const total_leads = parseInt(globalStarts?.count || 0);
        const total_finished = parseInt(globalFinishes?.count || 0);
        const global_conversion_rate = total_leads > 0 ? Math.round((total_finished / total_leads) * 100) : 0;

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

// GET /api/analytics/quiz/:quizId/leads — Jornada detalhada por lead
async function getQuizLeads(req, res) {
    const { quizId } = req.params;
    try {
        const db = await getDB();
        
        // Fetch all events for this quiz, grouped by visitor
        const events = await db.all(`
            SELECT visitor_id, event_type, step_id, answer_value, time_spent_seconds, created_at
            FROM quiz_events
            WHERE quiz_id = $1
            ORDER BY created_at ASC
        `, [quizId]);

        // Aggregate by visitor_id
        const leadsMap = {};
        for (const row of events) {
            if (!leadsMap[row.visitor_id]) {
                leadsMap[row.visitor_id] = {
                    visitor_id: row.visitor_id,
                    start_time: null,
                    total_time: 0,
                    finished: false,
                    journey: []
                };
            }
            
            const lead = leadsMap[row.visitor_id];
            
            if (row.event_type === 'start' && !lead.start_time) {
                lead.start_time = row.created_at;
            }
            
            if (row.event_type === 'finished') {
                lead.finished = true;
            }
            
            if (row.event_type === 'step_reached' || row.event_type === 'dropped') {
                const existingStep = lead.journey.find(s => s.step_id === row.step_id);
                if (existingStep) {
                    // Update existing step with answer and max time
                    if (row.answer_value) existingStep.answer = row.answer_value;
                    if ((row.time_spent_seconds || 0) > existingStep.time_spent) {
                        existingStep.time_spent = row.time_spent_seconds || 0;
                    }
                } else {
                    lead.journey.push({
                        step_id: row.step_id,
                        answer: row.answer_value,
                        time_spent: row.time_spent_seconds || 0,
                        timestamp: row.created_at
                    });
                }
            }
        }
        
        // Recalculate total_time based on merged steps
        for (const lead of Object.values(leadsMap)) {
            lead.total_time = lead.journey.reduce((sum, step) => sum + step.time_spent, 0);
        }
        
        // Convert to array and sort by most recent start_time (or those that have steps)
        const leadsArray = Object.values(leadsMap).sort((a, b) => {
            const timeA = a.start_time ? new Date(a.start_time).getTime() : 0;
            const timeB = b.start_time ? new Date(b.start_time).getTime() : 0;
            return timeB - timeA;
        });

        res.json(leadsArray);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}


module.exports = { getQuizAnalytics, trackEvent, getAnalyticsOverview, getQuizLeads };
