const { getDB } = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'quizsaas_secret_2025';
const JWT_EXPIRES = '12h';

// POST /api/auth/login
async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username e password obrigatórios' });
  try {
    const db = await getDB();
    const user = await db.get(`SELECT * FROM users WHERE username = $1`, [username]);
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Senha incorreta' });
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({ token, username: user.username, role: user.role });
  } catch (e) {
    console.error('[Auth] login error:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// POST /api/auth/register  (admin only)
async function register(req, res) {
  const { username, email, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username e password obrigatórios' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const db = await getDB();
    await db.run(
      `INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)`,
      [username, email || null, hash, role || 'admin']
    );
    res.json({ ok: true });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Usuário já existe' });
    console.error('[Auth] register error:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// GET /api/auth/users
async function listUsers(req, res) {
  try {
    const db = await getDB();
    const rows = await db.all(`SELECT id, username, email, role, created_at FROM users ORDER BY created_at ASC`, []);
    res.json(rows);
  } catch (e) {
    console.error('[Auth] listUsers error:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// DELETE /api/auth/users/:id
async function deleteUser(req, res) {
  const { id } = req.params;
  if (String(req.user?.id) === String(id)) return res.status(400).json({ error: 'Não pode deletar o próprio usuário' });
  try {
    const db = await getDB();
    await db.run(`DELETE FROM users WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('[Auth] deleteUser error:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// Middleware JWT
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Token ausente' });
  try {
    const token = auth.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

module.exports = { login, register, listUsers, deleteUser, authMiddleware };
