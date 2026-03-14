const { getDB } = require('../db');

// GET /api/roundrobin — Retorna config atual (lista de IDs e index)
async function getRoundRobin(req, res) {
  try {
    const db = getDB();
    const result = await db.query('SELECT * FROM round_robin ORDER BY id LIMIT 1');
    if (result.rows.length === 0) {
      return res.json({ quiz_ids: [], current_index: 0 });
    }
    const row = result.rows[0];
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
    const db = getDB();
    const { quiz_ids, is_active } = req.body;
    const quizIdsJson = JSON.stringify(quiz_ids || []);
    await db.query(
      'UPDATE round_robin SET quiz_ids = $1, is_active = $2, current_index = 0 WHERE id = (SELECT id FROM round_robin ORDER BY id LIMIT 1)',
      [quizIdsJson, is_active !== undefined ? is_active : true]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[RoundRobin] PUT error:', err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/roundrobin/next — Retorna o próximo quiz em round robin (chamado pelo roteador do domínio raiz)
async function getNextRoundRobinQuiz(req, res) {
  try {
    const db = getDB();
    // Busca config
    const rrResult = await db.query('SELECT * FROM round_robin ORDER BY id LIMIT 1');
    if (rrResult.rows.length === 0) return res.status(404).json({ error: 'Nenhum round robin configurado' });

    const rr = rrResult.rows[0];
    const quizIds = JSON.parse(rr.quiz_ids || '[]');

    if (!rr.is_active || quizIds.length === 0) {
      return res.status(404).json({ error: 'Round Robin inativo ou sem quizzes configurados' });
    }

    // Pega o índice atual e avança (wrap around)
    const idx = rr.current_index % quizIds.length;
    const nextIdx = (idx + 1) % quizIds.length;
    const quizId = quizIds[idx];

    // Atualiza o índice
    await db.query('UPDATE round_robin SET current_index = $1 WHERE id = $2', [nextIdx, rr.id]);

    // Busca o quiz
    const quizResult = await db.query('SELECT * FROM quizzes WHERE id = $1 AND is_active = TRUE', [quizId]);
    if (quizResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz não encontrado ou inativo' });
    }

    const quiz = quizResult.rows[0];
    let config = {};
    try { config = JSON.parse(quiz.config_json || '{}'); } catch {}

    res.json({ id: quiz.id, title: quiz.title, slug: quiz.slug, config });
  } catch (err) {
    console.error('[RoundRobin] NEXT error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getRoundRobin, updateRoundRobin, getNextRoundRobinQuiz };
