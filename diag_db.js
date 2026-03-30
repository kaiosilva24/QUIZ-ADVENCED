const { Pool } = require('pg');

async function test() {
    const pool = new Pool({
        host: 'aws-1-us-east-1.pooler.supabase.com',
        port: 6543,
        database: 'postgres',
        user: 'postgres.eptmqlnqdaljyxdfcuxg',
        password: '#Nk552446#Nk',
        min: 0, max: 3,
        connectionTimeoutMillis: 20000,
        ssl: { rejectUnauthorized: false }
    });

    const c = await pool.connect();
    console.log('[OK] Conexao estabelecida');

    try {
        const r = await c.query(`CREATE TABLE IF NOT EXISTS quizzes (id SERIAL PRIMARY KEY, title TEXT NOT NULL, slug TEXT UNIQUE, config_json TEXT NOT NULL DEFAULT '{}', is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        console.log('[OK] CREATE TABLE quizzes');
    } catch(e) {
        console.error('[ERRO CREATE] code:', e.code, 'msg:', e.message, 'detail:', e.detail, 'where:', e.where);
    }

    try {
        const r = await c.query(`SELECT id, title, is_active FROM quizzes ORDER BY id DESC LIMIT 10`);
        console.log('[OK] SELECT quizzes:', JSON.stringify(r.rows));
    } catch(e) {
        console.error('[ERRO SELECT] code:', e.code, 'msg:', e.message);
    }

    c.release();
    await pool.end();
}

test().catch(e => { console.error('[FATAL]', e.message, e.code); process.exit(1); });
