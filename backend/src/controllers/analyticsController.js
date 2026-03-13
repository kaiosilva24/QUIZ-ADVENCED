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

module.exports = { getQuizAnalytics, trackEvent };
