const { getDB } = require('../db');

let MemRRCache = { time: 0, activeQuizIds: [], currentIdx: 0, isActive: true };
const rrQuizCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache

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
    // Invalidate caches completely so they reload hot
    MemRRCache.time = 0;
    rrQuizCache.clear();
    res.json({ success: true });
  } catch (err) {
    console.error('[RoundRobin] PUT error:', err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/roundrobin/next — Retorna o próximo quiz em round robin (chamado pelo roteador do domínio raiz)
async function getNextRoundRobinQuiz(req, res) {
  try {
    // 1. FAST-PATH: Bypassa o banco de dados completamente se o Cache estiver quente
    if (Date.now() - MemRRCache.time < CACHE_TTL && MemRRCache.activeQuizIds.length > 0) {
      if (!MemRRCache.isActive) return res.status(404).json({ error: 'Round Robin inativo' });
      
      const idx = MemRRCache.currentIdx % MemRRCache.activeQuizIds.length;
      const nextIdx = (idx + 1) % MemRRCache.activeQuizIds.length;
      const quizId = MemRRCache.activeQuizIds[idx];
      MemRRCache.currentIdx = nextIdx; // Update Memoria na hora
      
      // Sincroniza em background, nao trava (fire-and-forget)
      getDB()
        .then(db => db.run('UPDATE round_robin SET current_index = $1 WHERE id = (SELECT id FROM round_robin LIMIT 1)', [nextIdx]))
        .catch(() => {});

      const cachedQuiz = rrQuizCache.get(quizId);
      if (cachedQuiz) {
        res.setHeader('Content-Type', 'application/json');
        return res.json(cachedQuiz);
      }
    }

    // 2. SLOW-PATH: Pula pra cá só quando o cache esfria (a cada 10 min) ou servidor reiniciou
    const db = await getDB();
    const rr = await db.get('SELECT * FROM round_robin ORDER BY id LIMIT 1');
    if (!rr) return res.status(404).json({ error: 'Nenhum round robin configurado' });

    const quizIds = JSON.parse(rr.quiz_ids || '[]');
    
    if (!rr.is_active || quizIds.length === 0) {
      return res.status(404).json({ error: 'Round Robin inativo ou sem quizzes configurados' });
    }

    const idx = rr.current_index % quizIds.length;
    const nextIdx = (idx + 1) % quizIds.length;
    const quizId = parseInt(quizIds[idx], 10);

    // Update in background
    db.run('UPDATE round_robin SET current_index = $1 WHERE id = $2', [nextIdx, rr.id]).catch(() => {});

    // Populate RAM Memory index
    MemRRCache = { time: Date.now(), activeQuizIds: quizIds.map(Number), currentIdx: nextIdx, isActive: rr.is_active };

    const quiz = await db.get('SELECT * FROM quizzes WHERE id = $1 AND is_active = TRUE', [quizId]);
    if (!quiz) {
      return res.status(404).json({ error: `Quiz id ${quizId} não encontrado ou inativo` });
    }

    let config = {};
    try { config = JSON.parse(quiz.config_json || '{}'); } catch {}

    const responseData = { id: quiz.id, quiz_id: quiz.id, title: quiz.title, slug: quiz.slug, config };
    
    // Save to Ram Cache
    rrQuizCache.set(quizId, responseData);
    
    res.json(responseData);
  } catch (err) {
    console.error('[RoundRobin] NEXT error:', err);
    res.status(500).json({ error: err.message });
  }
}

function clearRoundRobinCache() {
  MemRRCache.time = 0;
  rrQuizCache.clear();
}

module.exports = { getRoundRobin, updateRoundRobin, getNextRoundRobinQuiz, clearRoundRobinCache };
