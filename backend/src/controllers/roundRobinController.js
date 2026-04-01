const { getDB } = require('../db');

const rrCache = new Map();
const CACHE_TTL = 30000;

// GET /api/roundrobin — Retorna config atual (lista de IDs e index)
async function getRoundRobin(req, res) {
  try {
    const db = await getDB();
    const row = await db.get('SELECT * FROM round_robin ORDER BY id LIMIT 1');
    if (!row) {
      return res.json({ quiz_ids: [], current_index: 0 });
    }
    res.json({
      id: row.id,
      quiz_ids: JSON.parse(row.quiz_ids || '[]'),
      current_index: row.current_index,
      is_active: row.is_active
    });
  } catch (err) {
    console.error('[RoundRobin] GET error:', err);
    res.status(500).json({ error: err.message });
  }
}

// PUT /api/roundrobin — Salva lista de IDs do round robin
async function updateRoundRobin(req, res) {
  try {
    const db = await getDB();
    const { quiz_ids, is_active } = req.body;
    const quizIdsJson = JSON.stringify(quiz_ids || []);
    await db.run(
      'UPDATE round_robin SET quiz_ids = $1, is_active = $2, current_index = 0 WHERE id = (SELECT id FROM round_robin ORDER BY id LIMIT 1)',
      [quizIdsJson, is_active !== undefined ? is_active : true]
    );
    // Limpar cache ao atualizar
    rrCache.clear();
    res.json({ success: true });
  } catch (err) {
    console.error('[RoundRobin] PUT error:', err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/roundrobin/next — Retorna o próximo quiz em round robin (chamado pelo roteador do domínio raiz)
async function getNextRoundRobinQuiz(req, res) {
  try {
    const db = await getDB();
    const rr = await db.get('SELECT * FROM round_robin ORDER BY id LIMIT 1');
    if (!rr) return res.status(404).json({ error: 'Nenhum round robin configurado' });

    const quizIds = JSON.parse(rr.quiz_ids || '[]');
    console.log('[RR] quiz_ids:', quizIds, '| is_active:', rr.is_active, '| current_index:', rr.current_index);

    if (!rr.is_active || quizIds.length === 0) {
      return res.status(404).json({ error: 'Round Robin inativo ou sem quizzes configurados' });
    }

    const idx = rr.current_index % quizIds.length;
    const nextIdx = (idx + 1) % quizIds.length;
    const quizId = parseInt(quizIds[idx], 10); // garante que é inteiro

    // Fire and forget (nao bloqueia a requisição!)
    db.run('UPDATE round_robin SET current_index = $1 WHERE id = $2', [nextIdx, rr.id]).catch(e => console.error(e));

    // Cache lookup do Quiz JSON
    const cached = rrCache.get(quizId);
    if (cached && (Date.now() - cached.time < CACHE_TTL)) {
      return res.json(cached.data);
    }

    const quiz = await db.get('SELECT * FROM quizzes WHERE id = $1 AND is_active = TRUE', [quizId]);
    if (!quiz) {
      return res.status(404).json({ error: `Quiz id ${quizId} não encontrado ou inativo` });
    }

    let config = {};
    try { config = JSON.parse(quiz.config_json || '{}'); } catch {}

    const responseData = { id: quiz.id, quiz_id: quiz.id, title: quiz.title, slug: quiz.slug, config };
    rrCache.set(quizId, { time: Date.now(), data: responseData });

    res.json(responseData);
  } catch (err) {
    console.error('[RoundRobin] NEXT error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getRoundRobin, updateRoundRobin, getNextRoundRobinQuiz };
