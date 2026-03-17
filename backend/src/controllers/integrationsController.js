const { getDB } = require('../db');

// GET /api/integrations - retorna todas as configurações
async function getIntegrations(req, res) {
  try {
    const db = await getDB();
    const rows = await db.all(`SELECT key, value FROM integrations`, []);
    const result = {};
    rows.forEach(r => { result[r.key] = r.value; });
    res.json(result);
  } catch (e) {
    console.error('[Integrations] getIntegrations error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// PUT /api/integrations - salva { key, value }
async function setIntegration(req, res) {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'key is required' });
  try {
    const db = await getDB();
    await db.run(
      `INSERT INTO integrations (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, value]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('[Integrations] setIntegration error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// PUT /api/quizzes/:id/pixel - salva pixel individual por quiz
async function setQuizPixel(req, res) {
  const { id } = req.params;
  const { meta_pixel_id } = req.body;
  try {
    const db = await getDB();
    await db.run(`UPDATE quizzes SET meta_pixel_id = $1 WHERE id = $2`, [meta_pixel_id || null, id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('[Integrations] setQuizPixel error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/quizzes/:id/pixel - retorna pixel do quiz
async function getQuizPixel(req, res) {
  const { id } = req.params;
  try {
    const db = await getDB();
    const row = await db.get(`SELECT meta_pixel_id FROM quizzes WHERE id = $1`, [id]);
    res.json({ meta_pixel_id: row?.meta_pixel_id || null });
  } catch (e) {
    console.error('[Integrations] getQuizPixel error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getIntegrations, setIntegration, setQuizPixel, getQuizPixel };
