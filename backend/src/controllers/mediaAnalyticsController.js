const { getDB } = require('../db');

// Rastreamento de pulsos (Heartbeat) de áudio e vídeo
async function trackMediaPulse(req, res) {
    // Silently ignore aborted requests (user closed tab / navigated away).
    // These appear as BadRequestError: request aborted and are 100% expected.
    req.on('aborted', () => { /* do nothing — not a real error */ });
    req.on('close', () => {
        if (!res.headersSent) {
            // Request closed before we responded — normal with sendBeacon on slow connections
        }
    });

    const { quiz_id, step_id, block_id, visitor_id, media_type, watched_seconds, duration } = req.body;
    if (!quiz_id || !block_id || !visitor_id || !Array.isArray(watched_seconds)) {
        return res.status(400).json({ error: 'Faltando parâmetros obrigatórios' });
    }

    try {
        const db = await getDB();
        
        // 1. Obter progresso atual do visitante neste bloco
        const progressRow = await db.get(
            'SELECT watched_seconds FROM media_visitor_progress WHERE visitor_id = $1 AND block_id = $2',
            [visitor_id, block_id]
        );

        let previousSeconds = [];
        if (progressRow && progressRow.watched_seconds) {
            try { previousSeconds = JSON.parse(progressRow.watched_seconds); } catch (e) {}
        }

        // 2. Identificar quais segundos SÃO NOVOS
        const previousSet = new Set(previousSeconds);
        const newSeconds = watched_seconds.filter(sec => !previousSet.has(sec) && sec >= 0 && sec <= 36000); // mx 10 horas

        if (newSeconds.length > 0) {
            const mergedSeconds = Array.from(new Set([...previousSeconds, ...newSeconds]));
            
            // 3. Atualizar progresso do visitante via Upsert
            await db.run(`
                INSERT INTO media_visitor_progress (quiz_id, step_id, block_id, visitor_id, media_type, watched_seconds, duration)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (block_id, visitor_id) DO UPDATE SET 
                    watched_seconds = $6, 
                    duration = GREATEST(media_visitor_progress.duration, $7), 
                    last_update = CURRENT_TIMESTAMP
            `, [quiz_id, step_id, block_id, visitor_id, media_type, JSON.stringify(mergedSeconds), duration || 0]);

            // 4. Incrementar retenção global para os segundos inéditos assistidos
            for (const sec of newSeconds) {
                await db.run(`
                    INSERT INTO media_retention (quiz_id, block_id, second_mark, unique_views)
                    VALUES ($1, $2, $3, 1)
                    ON CONFLICT(block_id, second_mark) DO UPDATE SET unique_views = media_retention.unique_views + 1
                `, [quiz_id, block_id, sec]);
            }
        }

        res.json({ success: true, recorded_new_seconds: newSeconds.length });
    } catch (error) {
        console.error('[Media Analytics] Erro ao registrar pulso:', error);
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
}

async function getMediaRetention(req, res) {
    const { quizId } = req.params;
    try {
        const db = await getDB();
        
        // Busca a curva
        const retentionRows = await db.all(
            'SELECT block_id, second_mark, unique_views FROM media_retention WHERE quiz_id = $1 ORDER BY block_id, second_mark ASC',
            [quizId]
        );

        // Busca dados totais
        const statsRows = await db.all(`
            SELECT 
                block_id,
                COUNT(visitor_id) as total_plays,
                MAX(duration) as total_duration
            FROM media_visitor_progress 
            WHERE quiz_id = $1
            GROUP BY block_id
        `, [quizId]);

        const retentionByBlock = {};
        for (const row of retentionRows) {
            if (!retentionByBlock[row.block_id]) retentionByBlock[row.block_id] = { curve: [], stats: { totalPlays: 0, duration: 0 } };
            // Multiplicamos p/ facilitar graficos e formatação posterior
            retentionByBlock[row.block_id].curve.push({ time: row.second_mark, views: parseInt(row.unique_views, 10) });
        }

        for (const stat of statsRows) {
            if (!retentionByBlock[stat.block_id]) retentionByBlock[stat.block_id] = { curve: [], stats: { totalPlays: 0, duration: 0 } };
            retentionByBlock[stat.block_id].stats = { totalPlays: parseInt(stat.total_plays, 10), duration: parseInt(stat.total_duration || 0, 10) };
        }

        res.json(retentionByBlock);
    } catch (error) {
        console.error('[Media Analytics] Erro ao buscar retenção:', error);
        res.status(500).json({ error: error.message });
    }
}

module.exports = { trackMediaPulse, getMediaRetention };
