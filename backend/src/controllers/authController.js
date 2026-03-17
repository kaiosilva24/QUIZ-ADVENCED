const { getDB } = require('../db');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'quizsaas_secret_2025';
const JWT_EXPIRES_MS = 12 * 60 * 60 * 1000; // 12h em ms

// ─── JWT manual (zero dependências externas) ──────────────────────────────────
function base64url(str) {
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function signJWT(payload) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({ ...payload, exp: Math.floor((Date.now() + JWT_EXPIRES_MS) / 1000) }));
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyJWT(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  if (expected !== sig) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

// ─── Hash & Verify com crypto nativo ────────────────────────────────────────
function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, buf) => {
      if (err) reject(err);
      else resolve(`${salt}:${buf.toString('hex')}`);
    });
  });
}

function verifyPassword(password, stored) {
  return new Promise((resolve, reject) => {
    const [salt, hash] = (stored || '').split(':');
    if (!salt || !hash) { resolve(false); return; }
    crypto.scrypt(password, salt, 64, (err, buf) => {
      if (err) reject(err);
      else resolve(buf.toString('hex') === hash);
    });
  });
}

// POST /api/auth/login
async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username e password obrigatórios' });
  try {
    const db = await getDB();
    const result = await db.query(`SELECT * FROM users WHERE username = $1`, [username]);
    const user = result.rows ? result.rows[0] : null;
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Senha incorreta' });
    const token = signJWT({ id: user.id, username: user.username, role: user.role });
    res.json({ token, username: user.username, role: user.role });
  } catch (e) {
    console.error('[Auth] login error:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// POST /api/auth/register
async function register(req, res) {
  const { username, email, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username e password obrigatórios' });
  try {
    const hash = await hashPassword(password);
    const db = await getDB();
    await db.query(
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
    const result = await db.query(`SELECT id, username, email, role, created_at FROM users ORDER BY created_at ASC`);
    res.json(result.rows || []);
  } catch (e) {
    console.error('[Auth] listUsers error:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// DELETE /api/auth/users/:id
async function deleteUser(req, res) {
  const { id } = req.params;
  if (req.user && String(req.user.id) === String(id)) return res.status(400).json({ error: 'Não pode deletar o próprio usuário' });
  try {
    const db = await getDB();
    await db.query(`DELETE FROM users WHERE id = $1`, [id]);
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
  const payload = verifyJWT(auth.split(' ')[1]);
  if (!payload) return res.status(401).json({ error: 'Token inválido ou expirado' });
  req.user = payload;
  next();
}

module.exports = { login, register, listUsers, deleteUser, authMiddleware };
